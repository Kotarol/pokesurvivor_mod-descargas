/* ============ perfiles.js — (mod) perfiles en vez de cuenta y contraseña ============
 * Sólo del mod (docs/IDEAS-COLECCION.md, "Perfiles en vez de cuenta y contraseña").
 * El mod juega sin conexión: en modo local la pantalla de inicio enseña los
 * perfiles como las partidas guardadas de un juego, en 3 huecos. Se crea uno
 * escribiendo sólo un nombre y se entra con un clic.
 *
 *   Cada perfil es una cuenta local de siempre (db.js): ps.accounts[clave] y su
 *   partida en ps.save.<clave>. Las cuentas antiguas (con contraseña) salen tal
 *   cual como perfiles, sin pedirla; las nuevas se guardan sin contraseña
 *   ({ name, created }). No se copia ni se mueve ninguna partida.
 *   El nombre es el apodo del jugador (G.DB.user y save.name), como el de la cuenta.
 *
 *   Huecos: 3. Si hay más perfiles (cuentas de antes) salen todos, en filas de
 *   3, y para crear otro hay que borrar antes alguno.
 *
 *   Al abrir el juego salen los perfiles con el último usado marcado
 *   (ps.perfil.ultimo). Si la página se recarga sola (actualización,
 *   importar una partida) se vuelve a entrar en el mismo perfil: ps.session de
 *   db.js se deja sólo mientras esta ventana siga abierta (sessionStorage).
 *
 * Se engancha a la pantalla de login (login.js) y a Ajustes desde fuera, para
 * no tocar los archivos del original.
 */
G.Profiles = (() => {
  const $ = G.UI.$;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const K_ACC = 'ps.accounts', K_SES = 'ps.session', K_SAVE = 'ps.save.', K_LAST = 'ps.perfil.ultimo', K_IN = 'ps.perfil.dentro';
  const SLOTS = 3;
  const VALID = /^[A-Za-z0-9_ñÑáéíóúÁÉÍÓÚ]{3,16}$/;   // como en db.js

  function read(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function remove(k) { try { localStorage.removeItem(k); } catch (e) { /* nada */ } }
  function inside(v) { try { if (v) sessionStorage.setItem(K_IN, '1'); else sessionStorage.removeItem(K_IN); } catch (e) { /* nada */ } }

  // Al abrir el juego (no al recargar la misma ventana) no se entra solo en la
  // última cuenta: se recuerda para marcarla y se eligen los perfiles.
  (function atStart() {
    let again = false;
    try { again = !!sessionStorage.getItem(K_IN); } catch (e) { /* nada */ }
    const ses = read(K_SES);
    if (ses) write(K_LAST, ses);
    if (!again) remove(K_SES);
  })();

  const on = () => G.DB.mode === 'local';

  /** Perfiles guardados, en el orden en que se crearon: [{ key, name, created }]. */
  function list() {
    const accs = read(K_ACC) || {};
    return Object.keys(accs).map(key => ({ key, name: accs[key].name || key, created: accs[key].created || 0 }))
      .sort((a, b) => a.created - b.created || a.key.localeCompare(b.key));
  }

  /** Resumen de la partida de un perfil para su hueco: % de Pokédex y medallas de cada región. */
  function summary(key) {
    const s = read(K_SAVE + key);
    if (!s || !s.owned) return { pct: 0, owned: 0, medals: G.Medals.REGIONS.map(() => 0) };
    let owned = 0;
    for (const p of G.DEX) if (s.owned[p.dex]) owned++;
    s.shiny = s.shiny || {};
    let pct = Math.floor(owned / G.DEX.length * 100);
    if (owned && !pct) pct = 1;
    return { pct, owned, medals: G.Medals.REGIONS.map((r, i) => G.Medals.count(s, i + 1)) };
  }

  // ---------------- pantalla ----------------

  let wrap = null, creating = null;   // creating: { import: partida } mientras se escribe el nombre

  function build() {
    const box = document.querySelector('#scr-login .box');
    box.classList.add('pf-on');
    wrap = document.createElement('div');
    wrap.id = 'perfiles';
    box.querySelector('.tabs').before(wrap);
  }

  function render() {
    if (!wrap) build();
    const all = list();
    const last = read(K_LAST);
    let html = `<h3 class="pf-h">Elige tu perfil</h3><div class="pf-grid">`;
    for (const p of all) {
      const sm = summary(p.key);
      let badges = '';
      G.Medals.REGIONS.forEach((r, i) => {
        const n = sm.medals[i], gen = i + 1;
        badges += `<span class="pf-b${n ? ' ok' : ''}" title="${esc(r[G.I18n.lang === 'en' ? 1 : 0])}: ${n}/8">` +
                  G.Icons.html(`badge${gen}_${Math.max(1, n)}` + (n ? '' : '_off'), 24) + `<i>${n}</i></span>`;
      });
      html += `<div class="pf-card${p.key === last ? ' last' : ''}" data-k="${esc(p.key)}">
          <button class="pf-main" data-a="enter">
            <b class="pf-name" translate="no">${esc(p.name)}</b>
            <span class="pf-dex">Pokédex <b class="gold">${sm.pct} %</b></span>
            <span class="pf-badges">${badges}</span>
            ${p.key === last ? '<small class="pf-last">Último perfil usado</small>' : ''}
          </button>
          <button class="pf-more" data-a="more" title="${esc(G.T('Opciones'))}">⋯</button>
        </div>`;
    }
    for (let i = all.length; i < SLOTS; i++) {
      if (creating && i === all.length) {
        html += `<div class="pf-card pf-new">
            <b>Nuevo perfil</b>
            <input class="field" id="pf-name" maxlength="16" spellcheck="false" autocomplete="off" placeholder="${esc(G.T('Tu nombre'))}">
            <small class="pf-hint">3-16 letras, números o _</small>
            <p class="err" id="pf-err"></p>
            <div class="row" style="gap:6px">
              <button class="btn ghost small" data-a="cancel">Cancelar</button>
              <button class="btn gold small grow" data-a="create">Crear</button>
            </div>
          </div>`;
      } else {
        html += `<div class="pf-card pf-empty">
            <span class="pf-free">Hueco libre</span>
            <button class="btn gold small" data-a="new">Crear perfil</button>
            <button class="btn ghost small" data-a="import-new">Importar partida</button>
          </div>`;
      }
    }
    html += `</div>`;
    if (all.length >= SLOTS) html += `<p class="note center">Para crear otro perfil, borra antes uno (puedes exportar su partida para no perderla).</p>`;
    wrap.innerHTML = html;
    wire();
    const inp = $('pf-name');
    if (inp) {
      if (creating.import && !inp.value) inp.value = String(creating.import.name || '').slice(0, 16);
      setTimeout(() => inp.focus(), 30);
    } else {
      const lastBtn = wrap.querySelector('.pf-card.last .pf-main');
      if (lastBtn) setTimeout(() => lastBtn.focus(), 30);
    }
  }

  function wire() {
    wrap.querySelectorAll('[data-a]').forEach(b => {
      const card = b.closest('.pf-card');
      const key = card && card.dataset.k;
      b.onclick = () => {
        const a = b.dataset.a;
        if (a === 'enter') enter(key);
        else if (a === 'more') options(key);
        else if (a === 'new') { creating = {}; render(); }
        else if (a === 'cancel') { creating = null; render(); }
        else if (a === 'create') create();
        else if (a === 'import-new') G.SaveFile.pick(async f => { const inc = await G.SaveFile.read(f); if (inc) { creating = { import: inc }; render(); } });
      };
    });
    const inp = $('pf-name');
    if (inp) inp.onkeydown = e => { if (e.key === 'Enter') create(); if (e.key === 'Escape') { creating = null; render(); } };
  }

  function enter(key) {
    const r = G.DB.openProfile(key);
    if (!r.ok) { G.UI.toast(G.T(r.error)); render(); return; }
    write(K_LAST, key);
    inside(true);
    creating = null;
    G.Flow.afterLogin();
  }

  function create() {
    const name = ($('pf-name').value || '').trim();
    const err = m => { $('pf-err').textContent = G.T(m); };
    if (!VALID.test(name)) return err('El nombre debe tener 3-16 letras, números o _.');
    const accs = read(K_ACC) || {};
    const key = name.toLowerCase();
    if (accs[key]) return err('Ya hay un perfil con ese nombre.');
    accs[key] = { name, created: Date.now() };
    if (!write(K_ACC, accs)) return err('El navegador no deja guardar datos (¿modo incógnito?).');
    // Desde un archivo: esa partida, con el nombre nuevo (db.js la completa al abrirla).
    if (creating && creating.import) write(K_SAVE + key, Object.assign(creating.import, { name }));
    enter(key);
  }

  // ---------------- ventanas ----------------

  function modal(inner) {
    const el = document.createElement('section');
    el.className = 'scr dim pf-modal';
    el.style.zIndex = 70;
    el.innerHTML = `<div class="box center" style="max-width:400px">${inner}</div>`;
    document.body.appendChild(el);
    el.onclick = e => { if (e.target === el) el.remove(); };
    return el;
  }

  function options(key) {
    const p = list().find(x => x.key === key);
    if (!p) return;
    const el = modal(`<h3 translate="no">${esc(p.name)}</h3>
      <p class="sub">Opciones del perfil</p>
      <div class="pf-opts">
        <button class="btn" data-a="export">Exportar partida</button>
        <button class="btn" data-a="import">Importar partida</button>
        <button class="btn danger" data-a="delete">Borrar perfil</button>
        <button class="btn ghost" data-a="close">Cancelar</button>
      </div>`);
    const act = a => el.querySelector(`[data-a=${a}]`);
    act('close').onclick = () => el.remove();
    act('export').onclick = () => {
      const s = read(K_SAVE + key);
      if (!s) { G.UI.toast(G.T('Este perfil aún no tiene partida.')); return; }
      G.SaveFile.exportSave(s, p.name);
    };
    act('import').onclick = () => {
      el.remove();
      G.SaveFile.pick(async f => {
        const inc = await G.SaveFile.read(f);
        if (!inc) return;
        if (!confirm(G.T('¿Juntar la partida de {x} con la de este perfil? No pierde nada de lo que tiene.').replace('{x}', inc.name || '?'))) return;
        enterQuiet(key) && G.SaveFile.mergeIn(inc);
      });
    };
    act('delete').onclick = () => { el.remove(); confirmDelete(p, () => { drop(p.key); G.UI.toast(G.T('Perfil borrado')); render(); }); };
  }

  /** Entra en el perfil sin pasar de pantalla (para importar y recargar dentro). */
  function enterQuiet(key) {
    const r = G.DB.openProfile(key);
    if (!r.ok) { G.UI.toast(G.T(r.error)); return false; }
    write(K_LAST, key);
    inside(true);
    return true;
  }

  /**
   * Confirmación clara antes de borrar: se pierde la partida para siempre.
   * Para que no se borre sin querer, hay que escribir el nombre del perfil.
   */
  function confirmDelete(p, done) {
    const el = modal(`<h3>Borrar perfil</h3>
      <p class="pf-del-name" translate="no">${esc(p.name)}</p>
      <p class="sub">Se borrará toda su partida para siempre: Pokémon, shinies, monedas, medallas y mejoras. No se puede deshacer.</p>
      <p class="sub">Si quieres conservarla, exporta antes la partida.</p>
      <label>Escribe el nombre del perfil para confirmarlo:</label>
      <input class="field" maxlength="16" spellcheck="false" autocomplete="off" style="width:100%">
      <div class="row" style="gap:8px;margin-top:12px;justify-content:center;flex-wrap:wrap">
        <button class="btn ghost" data-a="no">Cancelar</button>
        <button class="btn danger" data-a="yes" disabled>Borrar para siempre</button>
      </div>`);
    const inp = el.querySelector('input'), yes = el.querySelector('[data-a=yes]');
    const ok = () => inp.value.trim().toLowerCase() === p.name.toLowerCase();
    inp.oninput = () => { yes.disabled = !ok(); };
    inp.onkeydown = e => { if (e.key === 'Enter' && ok()) yes.click(); if (e.key === 'Escape') el.remove(); };
    el.querySelector('[data-a=no]').onclick = () => el.remove();
    yes.onclick = () => { if (!ok()) return; el.remove(); done(); };
    inp.focus();   // ya: que un Enter de más no vuelva a pulsar el botón de debajo
  }

  /** Borra un perfil (en el que no se está jugando) y su partida. */
  function drop(key) {
    const accs = read(K_ACC) || {};
    delete accs[key];
    write(K_ACC, accs);
    remove(K_SAVE + key);
    remove('ps.migrated.' + key);
    if (read(K_SES) === key) remove(K_SES);
    if (read(K_LAST) === key) remove(K_LAST);
  }

  // ---------------- enganches ----------------

  function hookLogin() {
    const open0 = G.LoginUI.open;
    G.LoginUI.open = function () {
      const r = open0.apply(this, arguments);
      inside(false);
      if (on()) {
        creating = null;
        render();
        $('login-err').textContent = G.DB.storageOk ? '' : G.T('Este navegador no deja guardar datos: juega como invitado.');
        $('login-mode').textContent = G.T('Las partidas se guardan en este navegador.');   // (el programa de escritorio dice "ordenador": preload.js)
      }
      return r;
    };
  }

  // Ajustes > Cuenta (se vuelve a pintar cada vez): "Cambiar de perfil" y
  // "Borrar perfil", con la misma confirmación que en los huecos.
  function hookSettings() {
    const body = $('set-body');
    if (!body) return;
    new MutationObserver(() => {
      if (!on()) return;
      const lo = $('set-login');
      if (lo && lo.dataset.pf !== '1') { lo.dataset.pf = '1'; lo.textContent = G.T('Elegir perfil'); }
      const out = $('set-logout'), del = $('set-delete');
      if (!out || out.dataset.pf === '1') return;
      out.dataset.pf = '1';
      out.textContent = G.T('Cambiar de perfil');
      // "Tipo de cuenta" sobra: todos son perfiles de aquí (lo dice la fila "Partida").
      body.querySelectorAll('.set-row').forEach(r => {
        const v = r.querySelector(':scope > span');
        if (v && ['Cuenta de este navegador', G.T('Cuenta de este navegador')].includes(v.textContent)) r.remove();
      });
      if (!del) return;
      del.textContent = G.T('Borrar perfil');
      del.onclick = () => {
        const key = (read(K_SES) || '');
        const p = list().find(x => x.key === key) || { key, name: G.DB.user || '' };
        confirmDelete(p, async () => {
          if (G.Game.state !== 'ui' && G.Game.quit) G.Game.quit();
          const r = await G.DB.deleteAccount('');
          if (!r.ok) { $('set-msg').textContent = G.T(r.error); return; }
          drop(p.key);
          G.SettingsUI.close();
          G.UI.toast(G.T('Perfil borrado'));
          G.Audio.music(null);
          G.Flow.toLogin();
        });
      };
    }).observe(body, { childList: true });
  }

  const CSS = `
    #scr-login .box.pf-on { width: min(780px, 100%) !important; }
    .pf-on #login-form, .pf-on .tabs, .pf-on #btn-google { display: none !important; }
    .pf-h { text-align: center; margin: 0 0 12px !important; }
    .pf-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
    .pf-card { position: relative; display: flex; flex-direction: column; min-height: 178px; border-radius: 10px;
               background: rgba(5,12,34,.45); border: 2px solid rgba(244,248,255,.35); }
    .pf-card.last { border-color: var(--gold); box-shadow: 0 0 0 2px rgba(255,210,63,.25); }
    .pf-main { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 12px 10px 10px;
               background: none; border: 0; cursor: pointer; text-shadow: inherit; border-radius: 8px; }
    .pf-main:hover, .pf-main:focus-visible { background: rgba(255,255,255,.08); outline: none; }
    .pf-name { font-size: 20px; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding: 0 22px; }
    .pf-dex { font-size: 14px; color: var(--muted); }
    .pf-badges { display: grid; grid-template-columns: repeat(3, auto); gap: 3px 10px; justify-content: center; }
    .pf-b { display: flex; align-items: center; gap: 2px; opacity: .55; }
    .pf-b.ok { opacity: 1; }
    .pf-b i { font-style: normal; font-size: 13px; min-width: 8px; }
    .pf-last { color: var(--gold); font-size: 12px; }
    .pf-more { position: absolute; top: 6px; right: 6px; width: 28px; height: 28px; border-radius: 6px; cursor: pointer;
               background: rgba(255,255,255,.08); border: 1px solid rgba(244,248,255,.3); line-height: 1; font-size: 16px; }
    .pf-more:hover { background: rgba(255,255,255,.18); }
    .pf-empty { align-items: center; justify-content: center; gap: 8px; border-style: dashed; padding: 12px; }
    .pf-free { color: var(--muted); }
    .pf-new { gap: 6px; padding: 12px; justify-content: center; }
    .pf-new .field { width: 100%; }
    .pf-new .err { margin: 0; min-height: 0; }
    .pf-hint { color: var(--muted); font-size: 12px; }
    .pf-opts { display: flex; flex-direction: column; gap: 8px; }
    .pf-del-name { font-size: 22px; color: var(--gold); margin: 0 0 8px; }
    .pf-modal label { display: block; text-align: left; font-size: 14px; margin: 4px 0; }
    @media (max-height: 520px) {
      .pf-card { min-height: 0; }
      .pf-main { padding: 8px 6px 6px; gap: 3px; }
      .pf-name { font-size: 17px; }
      .pf-badges { grid-template-columns: repeat(5, auto); gap: 2px 6px; }
    }`;

  function init() {
    const st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);
    hookLogin();
    hookSettings();
  }
  init();

  return { list, render };
})();
