/* ============ maps-ui.js — (mod) pantalla de mapas ============
 * Sólo del mod (ver systems/maps.js). Al pulsar Jugar (G.Flow.play) se abre
 * esta pantalla: una carta por mapa, con los colores de su región (los de su
 * banner del gacha), un Pokémon que la representa, lo que tienes de ella y
 * sus medallas. Mundo Distorsión, oscuro y retorcido, mezcla todas.
 * Las regiones cerradas (viaje.js) salen con candado y no se pueden elegir.
 *
 * En la sala del cooperativo, el anfitrión ve "Mapa: X · Cambiar" y los
 * demás, el mapa que ha elegido.
 */
G.MapsUI = (() => {
  // Pokémon de cada mapa: el legendario de la portada de su región (Giratina, el del Mundo Distorsión).
  const MASCOT = [487, 150, 250, 384, 483, 643, 716, 791, 888, 1007];
  const DISTORTION = ['#07040d', '#2a0d3d', '#0d1a1f'];
  let pick = 0, onGo = null;

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /** Lo que se ve en la carta de un mapa. */
  function card(g) {
    const s = G.DB.save, B = g ? G.Gacha.BANNERS[g - 1] : null;
    const col = B ? B.color : DISTORTION;
    const shut = !!g && G.Travel && !G.Travel.isOpen(g);     // viaje por regiones: cerrada
    const el = document.createElement('button');
    el.className = 'mp-card' + (g ? '' : ' mp-dist') + (g === pick ? ' on' : '') + (shut ? ' mp-shut' : '');
    el.style.setProperty('--c0', col[0]); el.style.setProperty('--c1', col[1]); el.style.setProperty('--c2', col[2]);
    el.dataset.g = g;
    const places = G.RegionBiomes ? G.RegionBiomes.names(g) : [];
    let info;
    if (g) {
      const r = G.Collection.region(s, g);
      const pct = Math.floor(r.pct * 100);
      const medals = G.Medals.count(s, g);
      const home = (G.DEX_BY[s.partner] || {}).gen === g;
      info = `<div class="mp-bar"><i style="width:${pct}%"></i></div>
        <div class="mp-stats"><span>${pct} %</span><span>${G.Icons.html(medals >= 8 ? 'medal3' : 'medal1', 14)} ${medals}/8</span></div>` +
        (home ? `<div class="mp-home">${G.Icons.html('star', 11)} Tu compañero es de aquí: +5 % de monedas</div>` : '');
      if (shut) info += `<div class="mp-lock">${G.Icons.html('lock', 22)}<span>${esc(G.Travel.lockText(g))}</span></div>`;
    } else {
      const all = !G.Travel || G.Travel.allOpen();
      info = `<small class="mp-places">Bosque Umbrío · Cueva Cristal · Volcán Ceniza</small><div class="mp-mix">${all ? 'Todas las regiones mezcladas' : 'Las regiones abiertas mezcladas'}</div>`;
    }
    el.innerHTML = (g ? '' : '<i class="mp-swirl"></i>') + `<b class="mp-name">${esc(G.Maps.name(g))}</b><span class="mp-mon"></span>` +
      (places.length ? `<small class="mp-places">${places.map(esc).join(' · ')}</small>` : '') + info;
    const mon = el.querySelector('.mp-mon');
    const prop = g && propIcon(g);
    if (prop) mon.appendChild(prop);
    mon.appendChild(G.UI.spriteCanvas(MASCOT[g], 120, 92, { scale: 3, hero: true, lively: true }));
    if (shut) {
      el.onclick = () => { G.Audio.sfx('error'); G.UI.toast(G.Travel.lockText(g), 3500); };
      return el;
    }
    el.onclick = () => select(g);
    el.ondblclick = go;
    return el;
  }

  /** El adorno propio de la región (el de region-biomes.js), en pequeño junto a su Pokémon. */
  function propIcon(g) {
    const list = G.RegionBiomes && G.RegionBiomes.of(g);
    if (!list) return null;
    const STD = ['tree', 'crystal', 'dead'];
    const bi = list.find(i => !STD.includes(G.Tiles.BIOMES[i].prop));
    if (bi == null) return null;
    const img = G.Tiles.propSprite(bi, 'tree', 0);
    const cv = document.createElement('canvas');
    cv.width = img.width; cv.height = img.height;
    cv.className = 'mp-prop';
    cv.getContext('2d').drawImage(img, 0, 0);
    cv.style.width = img.width * 1.5 + 'px'; cv.style.height = img.height * 1.5 + 'px';
    return cv;
  }

  function select(g) {
    pick = g;
    document.querySelectorAll('#maps .mp-card').forEach(c => c.classList.toggle('on', +c.dataset.g === g));
    const b = document.getElementById('mp-go');
    if (b) b.textContent = g ? 'Viajar a ' + G.Maps.name(g) : 'Entrar en el Mundo Distorsión';
    G.Audio.sfx('click');
  }

  /**
   * Abre la pantalla.
   * @param then  qué hacer con el mapa elegido
   * @param lobby desde la sala (el botón dice "Elegir")
   */
  function open(then, lobby = false) {
    close();
    pick = G.Maps.chosen();
    onGo = then;
    const ov = document.createElement('div');
    ov.id = 'maps';
    ov.className = 'mp-ov';
    ov.innerHTML = `<div class="box mp-box">
      <div class="row between"><h2>Elige mapa</h2><button class="btn small ghost" id="mp-back">Volver</button></div>
      <p class="sub">En el mapa de una región sólo salen Pokémon de esa región: salvajes, jefes, hordas y legendarios de las grietas. Y su Liga, si tienes sus 8 medallas.</p>
      <div class="mp-grid"></div>
      <div class="row mp-foot"><button class="btn gold grow" id="mp-go"></button></div></div>`;
    document.body.appendChild(ov);
    const grid = ov.querySelector('.mp-grid');
    for (let g = 1; g <= G.Maps.N; g++) grid.appendChild(card(g));
    grid.appendChild(card(0));
    document.getElementById('mp-back').onclick = () => { G.Audio.sfx('back'); close(); };
    document.getElementById('mp-go').dataset.sfx = 'confirm';
    document.getElementById('mp-go').onclick = go;
    select(pick);
    if (lobby) document.getElementById('mp-go').textContent = 'Elegir ' + G.Maps.name(pick);
    ov.dataset.lobby = lobby ? 1 : '';
    addEventListener('keydown', onKey, true);
  }

  function onKey(e) {
    if (!document.getElementById('maps')) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
    else if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); go(); }
  }

  function go() {
    const then = onGo, g = pick;
    close();
    if (then) then(g);
  }

  function close() {
    removeEventListener('keydown', onKey, true);
    const ov = document.getElementById('maps');
    if (ov) ov.remove();
  }

  // ---------------- sala del cooperativo ----------------

  /** "Mapa: Kanto" debajo del texto de la sala (y "Cambiar" para el anfitrión). */
  function lobbyRow() {
    const sub = document.getElementById('lobby-sub');
    const room = G.Social.room;
    if (!sub || !room) return;
    let row = document.getElementById('lobby-map');
    if (!row) {
      row = document.createElement('div');
      row.id = 'lobby-map';
      row.className = 'mp-lobby';
      sub.after(row);
    }
    const g = G.Maps.roomChoice();
    row.innerHTML = `Mapa: <b>${g == null ? '…' : esc(G.Maps.name(g))}</b>`;
    if (room.isHost) {
      const b = document.createElement('button');
      b.className = 'btn small ghost';
      b.textContent = 'Cambiar mapa';
      b.onclick = () => open(g2 => { G.Maps.choose(g2); G.Maps.tellRoom(); lobbyRow(); }, true);
      row.appendChild(b);
    }
  }

  const CSS = `
    .mp-ov { position: fixed; inset: 0; z-index: 60; background: rgba(0,0,0,.65); display: flex;
             align-items: center; justify-content: center; padding: 16px; }
    .mp-box { width: min(980px, 100%); max-height: 100%; overflow: auto; }
    .mp-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-top: 10px; }
    .mp-card { position: relative; display: flex; flex-direction: column; align-items: stretch; gap: 3px;
               padding: 8px 8px 9px; border-radius: 12px; border: 2px solid rgba(255,255,255,.14); color: #fff;
               background: linear-gradient(150deg, var(--c0), var(--c1) 55%, var(--c2)); cursor: pointer;
               text-align: center; font: inherit; overflow: hidden; transition: transform .12s, border-color .12s; }
    .mp-card:hover { transform: translateY(-2px); border-color: rgba(255,255,255,.4); }
    .mp-card.on { border-color: #ffd23f; box-shadow: 0 0 0 2px rgba(255,210,63,.35), 0 0 18px rgba(255,210,63,.25); }
    .mp-name { font-size: 15px; text-shadow: 0 1px 2px rgba(0,0,0,.6); }
    .mp-mon { position: relative; display: flex; justify-content: center; }
    .mp-mon canvas { width: 120px; height: 92px; position: relative; }
    .mp-mon canvas.mp-prop { position: absolute; left: 2px; bottom: 2px; image-rendering: pixelated; opacity: .9;
                              filter: drop-shadow(0 2px 0 rgba(0,0,0,.35)); }
    .mp-places { font-size: 10.5px; opacity: .8; min-height: 2.4em; line-height: 1.2; }
    .mp-bar { height: 6px; border-radius: 3px; background: rgba(0,0,0,.4); overflow: hidden; }
    .mp-bar i { display: block; height: 100%; background: linear-gradient(90deg, #ffd23f, #ffe98a); }
    .mp-stats { display: flex; justify-content: space-between; align-items: center; font-size: 12px; }
    .mp-stats span { display: inline-flex; align-items: center; gap: 3px; }
    .mp-home { font-size: 10.5px; color: #ffe98a; line-height: 1.2; }
    .mp-mix { font-size: 12px; opacity: .85; }
    .mp-shut { cursor: not-allowed; border-style: dashed; }
    .mp-shut:hover { transform: none; }
    .mp-shut .mp-mon canvas:not(.mp-prop) { filter: brightness(0) opacity(.6); }
    .mp-shut .mp-mon canvas.mp-prop { opacity: .35; }
    .mp-lock { display: flex; align-items: center; gap: 6px; margin-top: 2px; padding: 5px 6px; border-radius: 8px;
               background: rgba(0,0,0,.55); font-size: 11px; line-height: 1.2; text-align: left; color: #ffe98a; }
    .mp-dist { background: radial-gradient(circle at 30% 20%, rgba(123,60,255,.35), transparent 45%),
                           radial-gradient(circle at 75% 80%, rgba(40,200,180,.18), transparent 50%),
                           repeating-conic-gradient(from 20deg at 60% 45%, var(--c0) 0 14deg, var(--c1) 14deg 26deg, var(--c2) 26deg 40deg); }
    .mp-dist .mp-name { color: #d9c2ff; letter-spacing: .5px; }
    .mp-card > * { position: relative; }
    .mp-card > .mp-swirl { position: absolute; inset: -60%; pointer-events: none; opacity: .55;
      background: repeating-conic-gradient(from 0deg at 50% 50%, transparent 0 18deg, rgba(150,90,255,.28) 18deg 24deg, transparent 24deg 40deg);
      animation: mp-spin 40s linear infinite; }
    @keyframes mp-spin { to { transform: rotate(360deg); } }
    @media (prefers-reduced-motion: reduce) { .mp-card > .mp-swirl { animation: none; } }
    .mp-foot { position: sticky; bottom: -16px; margin: 12px -4px -4px; padding: 10px 4px 4px;
               background: linear-gradient(rgba(16,28,72,0), rgba(16,28,72,.92) 35%); }
    .mp-lobby { display: flex; align-items: center; gap: 8px; margin: 2px 0 8px; }
    @media (max-width: 760px) { .mp-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (min-width: 761px) and (max-width: 940px) { .mp-grid { grid-template-columns: repeat(4, 1fr); } }`;

  function init() {
    const st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);
    // Jugar (sin sala) pasa por aquí; el mapa elegido se recuerda.
    const play0 = G.Flow.play;
    G.Flow.play = function () { open(g => { G.Maps.choose(g); play0.call(G.Flow); }); };
    G.Maps.hookFlow();
    const open0 = G.LobbyUI.open;
    G.LobbyUI.open = function () { const r = open0.apply(this, arguments); lobbyRow(); G.Maps.tellRoom(); return r; };
  }
  init();

  return { open, close, lobbyRow };
})();
