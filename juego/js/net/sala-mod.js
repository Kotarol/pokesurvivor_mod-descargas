/* ============ sala-mod.js — (mod) salas con código y conexión directa ============
 * Sólo del mod. El cooperativo del original (coop.js) va igual: lo que cambia
 * es cómo se encuentran los jugadores. En vez de amigos e invitaciones por
 * Firebase (social.js, net.js), el anfitrión crea una sala con un código y los
 * demás lo escriben. Se encuentran por el buzón del mod (buzon.js) y la partida
 * va directa entre los jugadores (WebRTC, STUN de Google).
 *
 * En estrella, como en el original: cada invitado sólo se conecta con el
 * anfitrión (los invitados no ven la IP de los demás).
 *
 *   - El anfitrión acepta o rechaza a cada uno (ve su nombre y su Pokémon).
 *   - Misma versión del juego obligatoria (si no, se rechaza solo).
 *   - Máximo 4. Mientras se juega la sala no admite a nadie nuevo.
 *   - Todo lo que llega de los demás pasa por G.Buzon.limpiar.
 *
 * Mensajes por el buzón (cifrados):
 *   invitado -> anfitrión   { k:'hola', name, dex, shiny, ver } · { k:'yo', dex, shiny } · { k:'adios' } · { k:'sig', s }
 *   anfitrión -> invitado   { k:'si' } · { k:'no', why } · { k:'sala', m:[miembros], open } · { k:'sig', s }
 *
 * Sustituye las salas de G.Social y todo G.Net (misma API que net.js). Se carga
 * después de net.js y antes de coop.js.
 */
(() => {
  const S = G.Social, B = G.Buzon;
  const MAX = S.MAX_PLAYERS;
  const PROTO = 1;                      // súbelo si cambia lo que se mandan las salas del mod
  const HEX32 = /^[0-9a-f]{32}$/;
  const ESPERA_MS = 3 * 60 * 1000;      // invitado: lo que se espera a que el anfitrión acepte
  const HOLA_MS = 30 * 1000;            // anfitrión: quien entra y no dice quién es, fuera
  const listeners = new Set();
  let room = null, con = null, espera = null, esperaT = 0;
  const holaT = new Map();

  const MOTIVOS = {
    'no-existe': 'No hay ninguna sala con ese código.',
    cerrada: 'La partida de esa sala ya ha empezado.',
    llena: 'La sala está llena (máximo 4).',
    ocupada: 'No se pudo entrar en la sala. Prueba otra vez.',
    echado: 'El anfitrión te ha sacado de la sala.',
    rechazo: 'El anfitrión no te ha aceptado.',
    version: 'Tu juego y el del anfitrión no tienen la misma versión. Actualizad los dos y probad otra vez.',
    tiempo: 'El anfitrión no ha respondido.',
    red: 'No se pudo conectar con el servidor de salas. Comprueba tu conexión a internet.',
    fin: 'La sala se ha cerrado'
  };
  const motivo = m => MOTIVOS[m] || MOTIVOS.fin;

  function emit(what) { listeners.forEach(fn => { try { fn(what); } catch (e) { console.error('[Sala]', e); } }); }

  // ---------------- versión del juego ----------------

  let verP = null;
  /** Huellas de esta versión: juego.json (programa de escritorio) y version.json (web). */
  function miVersion() {
    const v = f => fetch(f + '?t=' + Date.now(), { cache: 'no-store' }).then(r => (r.ok ? r.json() : null)).then(j => (j && typeof j.v === 'string' ? j.v : null)).catch(() => null);
    const D = !!window.PS_DESKTOP;
    if (!verP) verP = Promise.all([D ? v('juego.json') : null, D ? null : v('version.json')]).then(([jv, vv]) => ({ p: PROTO, jv, vv }));
    return verP;
  }
  function compatible(a, b) {
    if (!a || !b || a.p !== b.p) return false;
    if (a.jv && b.jv) return a.jv === b.jv;
    if (a.vv && b.vv) return a.vv === b.vv;
    return true;
  }

  // ---------------- miembros ----------------

  function yo() {
    const s = G.DB.save || {};
    return {
      name: S.VALID.test(G.DB.user || '') ? G.DB.user : 'Jugador',
      dex: s.partner, shiny: !!s.partnerShiny && G.DB.ownsShiny(s.partner)
    };
  }

  /** Lo que dice otro jugador de sí mismo, comprobado. */
  function info(o) {
    const name = o && typeof o.name === 'string' && S.VALID.test(o.name) ? o.name : 'Jugador';
    const dex = o && Number.isInteger(o.dex) && G.DEX_BY[o.dex] ? o.dex : 25;
    return { name, dex, shiny: !!(o && o.shiny === true) };
  }

  function quitarTimers() { for (const t of holaT.values()) clearTimeout(t); holaT.clear(); clearTimeout(esperaT); }

  function todoFuera() {
    quitarTimers();
    if (con) con.cerrar();
    con = null; room = null;
  }

  // ---------------- anfitrión ----------------

  async function createRoom() {
    if (room) return room;
    const code = B.nuevoCodigo();
    const c = await B.conectar(code, 'a', avisos());
    con = c;
    room = { id: c.sala, host: c.id, isHost: true, code, open: true, ready: false, pending: [], fuera: new Set(),
             members: [Object.assign({ uid: c.id, at: Date.now() }, yo())] };
    emit('room');
    return room;
  }

  /** A cada invitado: quién está en la sala y si admite gente. */
  function difundir() {
    if (!room || !room.isHost) return;
    const m = room.members.map(x => ({ uid: x.uid, name: x.name, dex: x.dex, shiny: x.shiny, at: x.at }));
    for (const x of room.members) if (x.uid !== room.host) con.send(x.uid, { k: 'sala', m, open: room.open });
  }

  function decir(uid, o) { return con ? con.send(uid, o) : Promise.resolve(false); }
  function rechazarCon(uid, why) {
    decir(uid, { k: 'no', why });
    setTimeout(() => { if (con) con.echar(uid); }, 400);
  }

  async function deInvitado(de, o) {
    const mem = room.members.find(m => m.uid === de);
    if (o.k === 'hola') {
      clearTimeout(holaT.get(de)); holaT.delete(de);
      room.fuera.delete(de);
      const i = info(o);
      if (mem) { Object.assign(mem, i); difundir(); emit('room'); return; }     // ha vuelto a entrar tras un corte
      if (!compatible(await miVersion(), o.ver)) { rechazarCon(de, 'version'); return; }
      if (!room.open) { rechazarCon(de, 'cerrada'); return; }
      if (room.members.length >= MAX) { rechazarCon(de, 'llena'); return; }
      if (room.pending.some(p => p.uid === de) || room.pending.length >= MAX) return;
      room.pending.push(Object.assign({ uid: de, at: Date.now() }, i));
      G.Audio.sfx('confirm');
      if (!G.UI.isOpen('scr-lobby')) G.UI.toast(i.name + ' quiere entrar en tu sala', 4000);
      emit('room');
    } else if (!mem) {
      // Quien no ha sido aceptado sólo puede decir quién es.
    } else if (o.k === 'yo') {
      const i = info(Object.assign({ name: mem.name }, o));
      mem.dex = i.dex; mem.shiny = i.shiny;
      difundir(); emit('room');
    } else if (o.k === 'adios') quitar(de);
    else if (o.k === 'sig' && o.s && typeof o.s === 'object') G.Net._signal(de, o.s);
  }

  function accept(uid) {
    if (!room || !room.isHost) return;
    const p = room.pending.find(x => x.uid === uid);
    if (!p) return;
    room.pending = room.pending.filter(x => x !== p);
    if (room.members.length >= MAX || !room.open) { rechazarCon(uid, room.open ? 'llena' : 'cerrada'); emit('room'); return; }
    p.at = Date.now();
    room.members.push(p);
    decir(uid, { k: 'si' });
    difundir();
    emit('room');
  }

  function reject(uid) {
    if (!room || !room.isHost) return;
    room.pending = room.pending.filter(x => x.uid !== uid);
    rechazarCon(uid, 'rechazo');
    emit('room');
  }

  /** Anfitrión: alguien se ha ido de la sala. */
  function quitar(uid) {
    if (!room) return;
    const antes = room.members.length + room.pending.length;
    room.members = room.members.filter(m => m.uid !== uid || m.uid === room.host);
    room.pending = room.pending.filter(m => m.uid !== uid);
    if (room.members.length + room.pending.length !== antes) { difundir(); emit('room'); }
  }

  // ---------------- invitado ----------------

  async function joinRoom(texto) {
    const code = B.normalizar(texto);
    if (!code) return { ok: false, error: 'Ese código no es válido. Son 10 letras y números, como ABCDE-FGHJK.' };
    if (room) await leaveRoom();
    if (espera) cancelJoin();
    const ver = await miVersion();
    return new Promise(async res => {
      espera = res;
      let c;
      try { c = await B.conectar(code, 'i', avisos()); }
      catch (e) { espera = null; res({ ok: false, error: motivo('red') }); return; }
      if (espera !== res) { c.cerrar(); return; }                // se canceló mientras tanto
      con = c;
      room = { id: c.sala, host: null, isHost: false, code: null, open: true, ready: false, pending: [], members: [], dentro: false, ver };
      esperaT = setTimeout(() => terminar('tiempo'), ESPERA_MS);
    });
  }

  /** El invitado deja de esperar a que le acepten. */
  function cancelJoin() {
    const r = espera;
    espera = null;
    if (room && !room.isHost && !room.dentro) { if (con) decir(room.host || con.anf, { k: 'adios' }); todoFuera(); }
    if (r) r({ ok: false, cancel: true });
  }

  function deAnfitrion(de, o) {
    if (de !== con.anf) return;
    if (o.k === 'si') {
      room.dentro = true; room.host = de;
      clearTimeout(esperaT);
      const r = espera; espera = null;
      emit('room');
      if (r) r({ ok: true });
    } else if (o.k === 'no') terminar(MOTIVOS[o.why] ? o.why : 'rechazo');
    else if (o.k === 'sala' && Array.isArray(o.m)) {
      const ms = [];
      for (const x of o.m.slice(0, MAX)) {
        if (!x || !HEX32.test(x.uid) || ms.some(m => m.uid === x.uid)) continue;
        ms.push(Object.assign({ uid: x.uid, at: Number(x.at) || 0 }, info(x)));
      }
      room.host = de;
      room.members = ms.sort((a, b) => (a.uid === de ? -1 : b.uid === de ? 1 : a.at - b.at));
      room.open = o.open === true;
      if (room.dentro && !ms.some(m => m.uid === con.id)) { terminar('echado'); return; }
      emit('room');
    } else if (o.k === 'sig' && o.s && typeof o.s === 'object' && room.dentro) G.Net._signal(de, o.s);
  }

  // ---------------- avisos del buzón ----------------

  function avisos() {
    return {
      hola(m) {
        if (!room) return;
        room.ready = true;
        room.hostAway = !m.anfOn;
        if (room.isHost) { difundir(); for (const id of m.ids || []) if (!room.members.some(x => x.uid === id)) esperarHola(id); }
        else decir(con.anf, Object.assign({ k: 'hola', ver: room.ver }, yo()));
        emit('room');
      },
      msg(de, o) {
        if (!room || !con) return;
        if (room.isHost) deInvitado(de, o); else deAnfitrion(de, o);
      },
      evt(m) {
        if (!room) return;
        if (m.t === 'entra' && room.isHost && HEX32.test(m.id)) esperarHola(m.id);
        else if (m.t === 'sale' && room.isHost) {
          // Si sigue conectado directo (sólo se le ha cortado el buzón), sigue en la sala.
          if (G.Net.mode(m.id) !== 'direct') quitar(m.id); else room.fuera.add(m.id);
        } else if (m.t === 'anf' && !room.isHost) { room.hostAway = !m.on; emit('room'); }
        else if (m.t === 'corte') { room.ready = false; emit('room'); }
      },
      fin(m) { terminar(m); }
    };
  }

  /** Anfitrión: quien entra en el buzón tiene que decir quién es enseguida. */
  function esperarHola(id) {
    clearTimeout(holaT.get(id));
    holaT.set(id, setTimeout(() => {
      holaT.delete(id);
      if (room && room.isHost && !room.members.some(m => m.uid === id) && !room.pending.some(m => m.uid === id) && con) con.echar(id);
    }, HOLA_MS));
  }

  /** Se acabó la sala (o no se pudo entrar). */
  function terminar(m) {
    if (espera) { const r = espera; espera = null; todoFuera(); r({ ok: false, error: motivo(m) }); return; }
    if (!room) return;
    // Invitado en plena partida y aún conectado con el anfitrión: se cierra al acabarla.
    if (!room.isHost && G.Coop.active && G.Net.mode(room.host) === 'direct' && m !== 'echado') { room.muerta = m; return; }
    todoFuera();
    emit('room-closed');
    if (m !== 'fin') G.UI.toast(motivo(m), 4000);
  }

  async function leaveRoom() {
    if (espera) { cancelJoin(); return; }
    if (!room) return;
    if (!room.isHost && con) await decir(room.host, { k: 'adios' });
    todoFuera();
    emit('room');
  }

  function setOpen(open) {
    if (!room || !room.isHost) return;
    room.open = !!open;
    if (con) con.abrir(room.open);
    difundir();
  }

  function refreshMember() {
    if (!room) return;
    const i = yo();
    if (room.isHost) { Object.assign(room.members[0], i); difundir(); }
    else if (room.dentro) decir(room.host, { k: 'yo', dex: i.dex, shiny: i.shiny });
  }

  // ---------------- G.Social: las salas son éstas ----------------

  Object.assign(S, {
    createRoom, joinRoom, leaveRoom, setOpen, refreshMember,
    setPlaying() { /* sin "en línea" en el mod */ },
    refreshPresence() { /* nada */ },
    async invite() { return { ok: false, error: 'En el mod se entra con el código de la sala.' }; }
  });
  const on0 = S.on, off0 = S.off;
  S.on = fn => { listeners.add(fn); on0(fn); };
  S.off = fn => { listeners.delete(fn); off0(fn); };
  Object.defineProperty(S, 'room', {
    configurable: true,
    get() {
      if (room && room.muerta && !G.Coop.active) {
        // La sala se cerró durante la partida: ahora que ha acabado, fuera.
        const m = room.muerta;
        room.muerta = null;
        setTimeout(() => terminar(m), 0);
        return null;
      }
      return room && (room.isHost || room.dentro) ? room : null;
    }
  });
  Object.defineProperty(S, 'uid', { configurable: true, get: () => (con ? con.id : null) });

  G.SalaMod = {
    accept, reject, cancelJoin,
    get esperando() { return !!espera; },
    /** Para la pantalla de la sala: el código (anfitrión), si el buzón está y los que piden entrar. */
    get code() { return room && room.isHost ? B.bonito(room.code) : null; },
    get ready() { return !!(room && room.ready); },
    get pending() { return room && room.isHost ? room.pending.slice() : []; },
    get hostAway() { return !!(room && room.hostAway); },
    _signal(to, sig) { if (con && room) decir(to, { k: 'sig', s: sig }); },
    /** Anfitrión: se ha cortado la conexión directa con alguien que ya no está en el buzón: fuera de la sala. */
    _peer(u, mode) { if (room && room.isHost && mode !== 'direct' && mode !== 'connecting' && room.fuera.has(u)) { room.fuera.delete(u); quitar(u); } }
  };
})();

/* ============ G.Net (mod) — conexión directa entre los jugadores de una sala ============
 * Como net.js del original (misma API), pero la negociación va por el buzón
 * cifrado (sala-mod.js) y sin relé: si la red no deja conectar directo, esa
 * pareja no puede jugar junta (se reintenta cada 15 s).
 * Lo que llega por el canal directo pasa por G.Buzon.limpiar, con límite de
 * tamaño y de mensajes por segundo.
 */
G.Net = (() => {
  const ICE = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];
  const DIRECT_TIMEOUT = 12000, RETRY_MS = 15000;
  const MAX_BYTES = 512 * 1024, MAX_POR_S = 120;

  let uid = null, roomId = null, isHost = false, hostUid = null;
  const peers = new Map();         // uid -> { pc, dc, mode, timer, n, t0 }
  const handlers = new Set(), peerHandlers = new Set();
  const stats = { sent: 0, recv: 0, relaySent: 0 };

  function emitPeer(u) {
    const p = peers.get(u);
    peerHandlers.forEach(fn => { try { fn(u, p ? p.mode : 'closed'); } catch (e) { console.warn(e); } });
  }

  function open(id, host, hostId) {
    if (roomId === id) return;
    close();
    uid = G.Social.uid;
    roomId = id; isHost = host; hostUid = hostId;
    // Invitado: hueco para el anfitrión desde ya (se sustituye al llegar su oferta).
    if (!isHost) {
      const p = { pc: null, dc: null, mode: 'connecting', timer: 0 };
      p.timer = setTimeout(() => { if (p.mode === 'connecting') { p.mode = 'failed'; emitPeer(hostId); } }, DIRECT_TIMEOUT + 3000);
      peers.set(hostId, p);
    }
  }

  function close() {
    for (const u of [...peers.keys()]) drop(u);
    roomId = null; isHost = false; hostUid = null;
  }

  function syncMembers(uids) {
    if (!roomId) return;
    if (isHost) {
      for (const u of uids) if (u !== uid && !peers.has(u)) connect(u);
      for (const u of [...peers.keys()]) if (!uids.includes(u)) drop(u);
    } else if (!uids.includes(hostUid)) drop(hostUid);
  }

  function newPeer(u) {
    const p = { pc: null, dc: null, mode: 'connecting', timer: 0, n: 0, t0: 0 };
    peers.set(u, p);
    let pc;
    try { pc = p.pc = new RTCPeerConnection({ iceServers: ICE }); }
    catch (e) { p.mode = 'failed'; emitPeer(u); return p; }
    pc.onicecandidate = e => { if (e.candidate) signal(u, { c: e.candidate.toJSON() }); };
    pc.onconnectionstatechange = () => { if (pc.connectionState === 'failed' && p.mode !== 'closed') fail(u); };
    p.timer = setTimeout(() => { if (p.mode === 'connecting') fail(u); }, DIRECT_TIMEOUT);
    emitPeer(u);
    return p;
  }

  function wireChannel(u, p, dc) {
    p.dc = dc;
    dc.onopen = () => { clearTimeout(p.timer); p.mode = 'direct'; emitPeer(u); };
    dc.onclose = () => { if (p.mode === 'direct') { p.mode = 'connecting'; fail(u); } };
    dc.onmessage = e => {
      if (typeof e.data !== 'string' || e.data.length > MAX_BYTES) return;
      const t = performance.now();
      if (t - p.t0 > 1000) { p.t0 = t; p.n = 0; }
      if (++p.n > MAX_POR_S) return;
      let m;
      try { m = JSON.parse(e.data); } catch (err) { return; }
      deliver(u, G.Buzon.limpiar(m));
    };
  }

  /** No hay conexión directa con `u`: el anfitrión lo reintenta. */
  function fail(u) {
    const p = peers.get(u);
    if (!p || p.mode === 'direct' || p.mode === 'closed' || p.mode === 'failed') return;
    clearTimeout(p.timer);
    p.mode = 'failed';
    try { if (p.pc) p.pc.close(); } catch (e) { /* nada */ }
    emitPeer(u);
    if (isHost) p.timer = setTimeout(() => { if (peers.get(u) === p && p.mode === 'failed' && roomId) { drop(u, true); connect(u); } }, RETRY_MS);
  }

  async function connect(u) {
    if (!roomId || peers.has(u)) return;
    const p = newPeer(u);
    if (!p.pc) return;
    wireChannel(u, p, p.pc.createDataChannel('g', { ordered: true }));
    try {
      const offer = await p.pc.createOffer();
      await p.pc.setLocalDescription(offer);
      signal(u, { sdp: p.pc.localDescription.toJSON() });
    } catch (e) { fail(u); }
  }

  const pendingIce = new Map();

  /** Llega una señal (ya descifrada y limpia) por el buzón. */
  async function onSignal(from, sig) {
    if (!roomId) return;
    // El invitado sólo negocia con el anfitrión; el anfitrión, con los que él ha llamado.
    if (!isHost && from !== hostUid) return;
    if (isHost && !peers.has(from)) return;
    let p = peers.get(from);
    const sdp = sig.sdp && typeof sig.sdp.sdp === 'string' ? { type: sig.sdp.type, sdp: sig.sdp.sdp } : null;
    try {
      if (sdp && sdp.type === 'offer') {
        if (isHost) return;
        if (p) drop(from, true);
        p = newPeer(from);
        if (!p.pc) return;
        p.pc.ondatachannel = e => wireChannel(from, p, e.channel);
        await p.pc.setRemoteDescription(sdp);
        const ans = await p.pc.createAnswer();
        await p.pc.setLocalDescription(ans);
        signal(from, { sdp: p.pc.localDescription.toJSON() });
        for (const c of pendingIce.get(from) || []) await p.pc.addIceCandidate(c).catch(() => {});
        pendingIce.delete(from);
      } else if (sdp && sdp.type === 'answer') {
        if (isHost && p && p.pc) await p.pc.setRemoteDescription(sdp);
      } else if (sig.c && typeof sig.c.candidate === 'string') {
        const c = { candidate: sig.c.candidate, sdpMid: sig.c.sdpMid, sdpMLineIndex: sig.c.sdpMLineIndex, usernameFragment: sig.c.usernameFragment };
        if (p && p.pc && p.pc.remoteDescription) await p.pc.addIceCandidate(c).catch(() => {});
        else {
          if (!pendingIce.has(from)) pendingIce.set(from, []);
          if (pendingIce.get(from).length < 40) pendingIce.get(from).push(c);
        }
      }
    } catch (e) {
      console.warn('[Net] señalización:', e.message);
      fail(from);
    }
  }

  function signal(to, sig) { G.SalaMod._signal(to, sig); }

  function drop(u, silent) {
    const p = peers.get(u);
    if (!p) return;
    clearTimeout(p.timer);
    p.mode = 'closed';
    try { if (p.dc) p.dc.close(); } catch (e) { /* nada */ }
    try { if (p.pc) p.pc.close(); } catch (e) { /* nada */ }
    peers.delete(u);
    pendingIce.delete(u);
    if (!silent) emitPeer(u);
  }

  function send(to, msg) {
    if (!roomId) return;
    const p = peers.get(to);
    stats.sent++;
    if (p && p.dc && p.dc.readyState === 'open') { try { p.dc.send(JSON.stringify(msg)); } catch (e) { /* se pierde */ } }
  }

  function toHost(msg) { if (!isHost && hostUid) send(hostUid, msg); }
  function broadcast(msg, except) { for (const u of peers.keys()) if (u !== except) send(u, msg); }

  function deliver(from, msg) {
    stats.recv++;
    handlers.forEach(fn => { try { fn(from, msg); } catch (e) { console.error('[Net] mensaje:', e); } });
  }

  return {
    open, close, syncMembers, send, toHost, broadcast,
    on(fn) { handlers.add(fn); }, off(fn) { handlers.delete(fn); },
    onPeer(fn) { peerHandlers.add(fn); },
    mode(u) { const p = peers.get(u); return p ? p.mode : 'closed'; },
    slow(u) { const p = peers.get(u); return !p || p.mode !== 'direct'; },
    peers() { return [...peers.keys()]; },
    _signal: onSignal,
    get open_() { return !!roomId; },
    get isHost() { return isHost; },
    get uid() { return uid; },
    get hostUid() { return hostUid; },
    stats
  };
})();

G.Net.onPeer((u, mode) => G.SalaMod._peer(u, mode));
