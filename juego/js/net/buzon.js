/* ============ buzon.js — (mod) conexión cifrada con el buzón de salas ============
 * Sólo del mod. El buzón (servidor/buzon, Cloudflare, plan gratuito) sólo sirve
 * para que los jugadores de una sala se encuentren y negocien la conexión
 * directa; la partida no pasa por él. Lo usa sala-mod.js.
 *
 * El código de la sala (ABCDE-FGHJK, 10 letras y números al azar: unos 50 bits)
 * NO sale del aparato. Con él (PBKDF2, 200.000 vueltas) se sacan:
 *   - el nombre de la sala en el buzón (una huella: del nombre no se saca el código),
 *   - la clave AES-GCM con la que va cifrado todo lo que se mandan por el buzón,
 *     junto con quién lo manda y para quién (no se puede reenviar a otro).
 * Así, ni quien controle el buzón puede leerlo ni hacerse pasar por nadie.
 *
 * Para probar con el buzón en el PC (npx.cmd wrangler dev en servidor/buzon):
 * dev.html?buzon=local
 */
G.Buzon = (() => {
  const SERVIDOR = 'wss://buzon.psdesmod.workers.dev/v1/';
  const LOCAL = 'ws://127.0.0.1:8787/v1/';
  const ALFA = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';     // sin 0/O, 1/I/L (se confunden)
  const LARGO = 10, VUELTAS = 200000, PING_MS = 25000;
  const enc = new TextEncoder(), dec = new TextDecoder();
  const url = () => (/[?&]buzon=local\b/.test(location.search) ? LOCAL : SERVIDOR);
  const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
  const azar = n => hex(crypto.getRandomValues(new Uint8Array(n)));
  const b64 = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192)); return btoa(s); };
  const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));

  // ---------------- el código ----------------

  function nuevoCodigo() {
    let s = '';
    const r = new Uint8Array(32);
    while (s.length < LARGO) {
      crypto.getRandomValues(r);
      // 248 = 31 * 8: así todas las letras salen igual de a menudo.
      for (const v of r) if (v < 248 && s.length < LARGO) s += ALFA[v % ALFA.length];
    }
    return s;
  }

  /** Lo que escribe el jugador -> el código limpio, o null si no vale. */
  function normalizar(t) {
    const s = String(t || '').toUpperCase().replace(/[^0-9A-Z]/g, '');
    return s.length === LARGO && [...s].every(c => ALFA.includes(c)) ? s : null;
  }

  const bonito = c => c.slice(0, 5) + '-' + c.slice(5);

  async function derivar(code) {
    const base = await crypto.subtle.importKey('raw', enc.encode(code), 'PBKDF2', false, ['deriveBits']);
    const bits = new Uint8Array(await crypto.subtle.deriveBits(
      { name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode('pokesurvivor-mod/sala/v1'), iterations: VUELTAS }, base, 384));
    const clave = await crypto.subtle.importKey('raw', bits.slice(16, 48), 'AES-GCM', false, ['encrypt', 'decrypt']);
    return { sala: hex(bits.slice(0, 16)), clave };
  }

  // ---------------- lo que llega de otros jugadores ----------------

  /**
   * Copia limpia de un mensaje de otro jugador: sin claves raras (__proto__...),
   * textos sin < > y de largo limitado, números finitos y poca profundidad.
   */
  function limpiar(v, maxTxt = 2000, d = 0) {
    if (d > 8) return null;
    if (typeof v === 'string') return (v.length > maxTxt ? v.slice(0, maxTxt) : v).replace(/[<>]/g, '');
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
    if (typeof v === 'boolean' || v === null) return v;
    if (Array.isArray(v)) return v.length > 5000 ? [] : v.map(x => limpiar(x, maxTxt, d + 1));
    if (typeof v === 'object') {
      const o = {};
      for (const k of Object.keys(v)) {
        if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
        o[k] = limpiar(v[k], maxTxt, d + 1);
      }
      return o;
    }
    return null;
  }

  // ---------------- la conexión ----------------

  /**
   * Entra en la sala del código.
   * @param rol  'a' anfitrión (la crea) | 'i' invitado
   * @param cb   { hola(m), msg(de, obj), evt(m), fin(motivo) }
   * Devuelve { id, sala, anf, send(a, obj), abrir(v), echar(id), cerrar() }.
   * Si se corta la red, vuelve a entrar sola con el mismo id.
   */
  async function conectar(code, rol, cb) {
    const { sala, clave } = await derivar(code);
    const c = { id: azar(16), tk: azar(16), sala, anf: null, ws: null, cerrada: false, dentro: false, intentos: 0, ping: 0, motivo: null };
    let cola = Promise.resolve();

    async function cifrar(o, a) {
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, clave, enc.encode(JSON.stringify({ de: c.id, a, o }))));
      const out = new Uint8Array(12 + ct.length);
      out.set(iv); out.set(ct, 12);
      return b64(out);
    }
    async function descifrar(d, de) {
      try {
        const u = unb64(d);
        const p = JSON.parse(dec.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: u.slice(0, 12) }, clave, u.slice(12))));
        return p && p.de === de && p.a === c.id ? p.o : null;
      } catch (e) { return null; }     // no es de esta sala (o lo han tocado por el camino)
    }

    function abrirWs() {
      const ws = c.ws = new WebSocket(url() + sala + '?rol=' + rol + '&id=' + c.id + '&tk=' + c.tk);
      ws.onopen = () => { clearInterval(c.ping); c.ping = setInterval(() => { try { ws.send('ping'); } catch (e) { /* nada */ } }, PING_MS); };
      // En fila: descifrar es asíncrono y los mensajes deben llegar en orden.
      ws.onmessage = e => { cola = cola.then(() => recibir(e.data)).catch(err => console.warn('[Buzón]', err)); };
      async function recibir(data) {
        if (typeof data !== 'string' || data === 'pong') return;
        let m;
        try { m = JSON.parse(data); } catch (err) { return; }
        if (!m || typeof m !== 'object') return;
        if (m.t === 'hola') { c.intentos = 0; c.dentro = true; c.anf = String(m.anf); cb.hola(m); }
        else if (m.t === 'm') {
          if (typeof m.de !== 'string' || typeof m.d !== 'string') return;
          const o = await descifrar(m.d, m.de);
          if (o && typeof o === 'object') cb.msg(m.de, limpiar(o, 8000));
        } else if (m.t === 'error') {
          // El buzón dice por qué se acaba (y luego cierra): se acaba aquí mismo.
          c.motivo = String(m.e);
          if (!c.cerrada) { c.cerrada = true; clearInterval(c.ping); try { ws.close(); } catch (err) { /* nada */ } cb.fin(c.motivo); }
        } else cb.evt(m);
      }
      // También en la fila: el motivo ('error') llega justo antes del cierre.
      ws.onclose = e => { cola = cola.then(() => cerrado(e)); };
      function cerrado(e) {
        clearInterval(c.ping);
        if (c.cerrada || c.ws !== ws) return;
        // Motivos sin vuelta atrás (sala que no existe, llena, te han echado...).
        const motivo = c.motivo || (e.code === 4003 ? 'echado' : e.code === 4001 ? 'ocupada' : null);
        // Si nunca se llegó a entrar, se prueba pocas veces; si ya se estaba dentro, más.
        if (motivo || c.intentos >= (c.dentro ? 12 : 3)) { c.cerrada = true; cb.fin(motivo || 'red'); return; }
        cb.evt({ t: 'corte' });
        setTimeout(() => { if (!c.cerrada) abrirWs(); }, Math.min(15000, 1000 * 2 ** c.intentos++));
      }
    }
    abrirWs();

    c.send = async (a, o) => {
      if (c.cerrada || !c.ws || c.ws.readyState !== 1) return false;
      const d = await cifrar(o, a);
      try { c.ws.send(JSON.stringify({ t: 'm', a, d })); return true; } catch (e) { return false; }
    };
    const raw = o => { try { if (c.ws && c.ws.readyState === 1) c.ws.send(JSON.stringify(o)); } catch (e) { /* nada */ } };
    c.abrir = v => raw({ t: 'abrir', v: !!v });
    c.echar = a => raw({ t: 'echar', a });
    c.cerrar = () => { c.cerrada = true; clearInterval(c.ping); try { if (c.ws) c.ws.close(1000); } catch (e) { /* nada */ } };
    return c;
  }

  return { nuevoCodigo, normalizar, bonito, conectar, limpiar, LARGO };
})();
