/* ============ sala-ui.js — (mod) cooperativo con código de sala ============
 * Sólo del mod (las salas: js/net/sala-mod.js). El botón "Amigos" del menú
 * pasa a "Cooperativo" y abre una pantalla para crear una sala o entrar con un
 * código. En la sala del original (scr-lobby), en vez de "Invitar amigos" el
 * anfitrión ve el código y a quién quiere entrar, para aceptarlo o no.
 * Se engancha desde fuera para no tocar los archivos del original.
 */
(() => {
  const $ = G.UI.$;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // Va dentro de la pantalla de Amigos del original (así se abre y se cierra como
  // las demás), en lugar de su contenido.
  const scr = document.getElementById('scr-friends');
  scr.firstElementChild.classList.add('hidden');
  scr.insertAdjacentHTML('beforeend', `
  <div class="box" id="coop-box">
    <div class="row between"><h2>Cooperativo</h2><button id="coop-volver" class="btn small ghost">Volver</button></div>
    <p class="sub">Jugad juntos hasta 4, cada uno desde su casa. Uno crea la sala y pasa el código a los demás.</p>
    <button id="coop-crear" class="btn gold" style="width:100%" data-sfx="confirm">Crear sala</button>
    <h3 style="margin:16px 0 6px">Entrar en una sala</h3>
    <form id="coop-unir" class="row" autocomplete="off">
      <input id="coop-codigo" class="field grow" maxlength="14" spellcheck="false" autocapitalize="characters" placeholder="Código de la sala" translate="no" style="font-family:Consolas,'Courier New',monospace;font-size:18px;letter-spacing:2px;text-transform:uppercase">
      <button id="coop-entrar" class="btn gold" type="submit" data-sfx="confirm">Entrar</button>
    </form>
    <p id="coop-msg" class="note"></p>
    <button id="coop-cancelar" class="btn small ghost hidden">Cancelar</button>
    <p class="note">En grupo, tu juego se conecta directamente con el del anfitrión (como en una videollamada), así que podéis llegar a ver vuestra dirección IP. Juega sólo con gente que conozcas.</p>
  </div>`);

  // ---------------- pantalla "Cooperativo" ----------------

  function msg(t, bad) { const el = $('coop-msg'); el.textContent = t || ''; el.style.color = bad ? '#ff8a8a' : ''; }

  function busy(on, waiting) {
    $('coop-crear').disabled = on; $('coop-entrar').disabled = on; $('coop-codigo').disabled = on;
    $('coop-cancelar').classList.toggle('hidden', !waiting);
  }

  function open() {
    if (G.Social.room) { G.LobbyUI.open(); return; }
    G.UI.show('scr-friends', true);
    if (!G.SalaMod.esperando) { busy(false, false); msg(''); }
  }

  async function crear() {
    busy(true, false); msg('Creando la sala…');
    try { await G.Social.createRoom(); }
    catch (e) { console.warn('[Sala]', e); busy(false, false); msg('No se pudo crear la sala.', true); return; }
    busy(false, false); msg('');
    G.LobbyUI.open();
  }

  async function entrar(ev) {
    ev.preventDefault();
    const code = $('coop-codigo').value;
    busy(true, true); msg('Esperando a que el anfitrión te acepte…');
    let r;
    try { r = await G.Social.joinRoom(code); }
    catch (e) { console.warn('[Sala]', e); r = { ok: false, error: 'No se pudo entrar en la sala.' }; }
    busy(false, false);
    if (r.ok) { msg(''); $('coop-codigo').value = ''; G.LobbyUI.open(); return; }
    msg(r.cancel ? '' : r.error, true);
  }

  // ---------------- en la sala: código y quién pide entrar ----------------

  function extra() {
    const room = G.Social.room;
    if (!room || !G.UI.isOpen('scr-lobby')) return;
    const title = $('lobby-inv-title'), box = $('lobby-invite');
    if (!room.isHost) {
      title.classList.add('hidden'); box.classList.add('hidden');
      if (G.SalaMod.hostAway) $('lobby-note').textContent = 'Se ha cortado la conexión del anfitrión. Esperando a que vuelva…';
      return;
    }
    $('lobby-sub').textContent = 'Eres el anfitrión. Pasa el código a tus amigos (hasta 4) y empezad cuando estéis.';
    title.textContent = 'Código de la sala';
    title.classList.remove('hidden'); box.classList.remove('hidden');
    box.innerHTML = '';

    const row = document.createElement('div');
    row.className = 'fr-row';
    // En letra normal: con la de píxeles la C parece un 0.
    row.innerHTML = `<b class="gold" translate="no" style="font:700 24px Consolas,'Courier New',monospace;letter-spacing:3px;user-select:all">${esc(G.SalaMod.code || '')}</b><span class="grow"></span>`;
    const copy = document.createElement('button');
    copy.className = 'btn small'; copy.textContent = 'Copiar';
    copy.onclick = () => {
      const c = G.SalaMod.code || '';
      const done = () => G.UI.toast('Código copiado', 1600);
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(c).then(done, () => G.UI.toast(c, 4000));
      else G.UI.toast(c, 4000);
    };
    row.appendChild(copy);
    box.appendChild(row);
    const note = document.createElement('p');
    note.className = 'sub'; note.style.margin = '4px 0 0';
    note.textContent = !G.SalaMod.ready ? 'Conectando con el servidor de salas…'
      : room.members.length >= G.Social.MAX_PLAYERS ? 'La sala está llena.'
      : 'Pásaselo sólo a tus amigos. Tú decides quién entra.';
    box.appendChild(note);

    for (const p of G.SalaMod.pending) {
      const el = document.createElement('div');
      el.className = 'fr-row';
      el.innerHTML = `<i class="dot on"></i><b translate="no">${esc(p.name)}</b><span class="st">${esc((G.DEX_BY[p.dex] || {}).name || '')} · quiere entrar</span><span class="grow"></span>`;
      const yes = document.createElement('button');
      yes.className = 'btn small gold'; yes.textContent = 'Aceptar'; yes.dataset.sfx = 'confirm';
      yes.onclick = () => G.SalaMod.accept(p.uid);
      const no = document.createElement('button');
      no.className = 'btn small ghost'; no.textContent = 'Rechazar';
      no.onclick = () => G.SalaMod.reject(p.uid);
      el.appendChild(yes); el.appendChild(no);
      box.appendChild(el);
    }
  }

  // ---------------- enganches ----------------

  const init0 = G.SocialUI.init;
  G.SocialUI.init = function () {
    init0.apply(this, arguments);
    // Después de los del original: lo suyo se pinta antes y esto encima.
    G.Social.on(extra);
    G.Net.onPeer(() => extra());
    $('coop-volver').onclick = () => { if (G.SalaMod.esperando) G.SalaMod.cancelJoin(); G.MenuUI.open(); };
    $('coop-crear').onclick = crear;
    $('coop-unir').onsubmit = entrar;
    $('coop-cancelar').onclick = () => G.SalaMod.cancelJoin();
    // "Amigos" -> "Cooperativo".
    const b = document.querySelector('#scr-menu [data-go=friends]');
    if (b) for (const n of b.childNodes) if (n.nodeType === 3 && n.textContent.trim() === 'Amigos') n.textContent = 'Cooperativo';
  };
  G.FriendsUI.open = open;
  const lobbyOpen0 = G.LobbyUI.open;
  G.LobbyUI.open = function () { const r = lobbyOpen0.apply(this, arguments); extra(); return r; };
})();
