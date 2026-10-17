/* ============ zoom-vista.js — (mod) alejar la vista en partida ============
 * Cuatro niveles de vista: 100 % (la de siempre, la más cerca), 115 %, 130 % y
 * 145 % de mundo visible. Se cambia con la rueda del ratón mientras juegas o
 * con el deslizador de la pausa, que también tiene "Restablecer" y un candado
 * para que la rueda no la mueva sin querer. Se guarda en los ajustes de este
 * dispositivo (G.Settings 'zoomLvl' y 'zoomLock').
 *
 * Alejar sirve para ver, no para ganar ventaja: los enemigos siguen saliendo a
 * la misma distancia de ti que con la vista normal (outerRadius() se calcula
 * con la vista del 100 %), y la bomba y el alcance de los proyectiles también
 * van con la vista normal (sees(x, y, pad, true)).
 *
 * Sólo en partida: en los menús, en la arena de la grieta y en la Sentencia de
 * Arceus la vista vuelve sola al 100 %. Envuelve G.Camera; no toca el bucle.
 */
G.ZoomVista = (() => {
  const LEVELS = [1, 1.15, 1.3, 1.45];
  const Cam = G.Camera;
  const clampLvl = v => Math.max(0, Math.min(LEVELS.length - 1, Math.round(+v || 0)));

  let lvl = clampLvl(G.Settings.get('zoomLvl'));
  let lock = !!G.Settings.get('zoomLock');
  let last = null;                   // últimos argumentos de resize()

  // ---------------- cámara ----------------

  Cam.zoom = 1;
  const baseResize = Cam.resize;
  Cam.resize = function (cssW, cssH, dpr = 1) {
    last = [cssW, cssH, dpr];
    baseResize.call(this, cssW, cssH, dpr);
    this.scale /= this.zoom;
    this.w = cssW / this.scale;
    this.h = cssH / this.scale;
  };
  // Anillo de aparición (y radio de la bomba en grupo): siempre con la vista normal.
  Cam.outerRadius = function () { return Math.hypot(this.w, this.h) / 2 / this.zoom + 40; };
  const baseSees = Cam.sees;
  Cam.sees = function (x, y, pad = 60, base = false) {
    if (!base || this.zoom === 1) return baseSees.call(this, x, y, pad);
    const hw = this.w / this.zoom / 2, hh = this.h / this.zoom / 2;
    return Math.abs(x - this.x) < hw + pad && Math.abs(y - this.y) < hh + pad;
  };

  function setZoom(z) {
    if (Cam.zoom === z) return;
    Cam.zoom = z;
    if (last) Cam.resize(...last);
  }

  /** ¿Se puede alejar ahora? (en partida y fuera de la grieta y de la Sentencia) */
  function active() {
    const st = G.Game.state;
    return !!G.Game.player && st !== 'ui' && !(G.Rift && G.Rift.inArena) && !(G.Judgment && G.Judgment.active);
  }

  // ---------------- nivel ----------------

  function setLvl(v, tip = false) {
    const n = clampLvl(v);
    if (n !== lvl) { lvl = n; G.Settings.set('zoomLvl', lvl); }
    refreshPanel();
    if (tip) showTip(pct(lvl));
  }
  function setLock(v) {
    lock = !!v; G.Settings.set('zoomLock', lock);
    refreshPanel();
  }
  const pct = n => Math.round(LEVELS[n] * 100) + ' %';

  // ---------------- rueda ----------------

  let wheelAcc = 0, wheelT = 0;
  addEventListener('wheel', e => {
    if (G.Game.state !== 'playing' || !active()) return;
    if (G.UI.isOpen('scr-pause') || (G.Minimapa && G.Minimapa.isOpen)) return;
    const t = e.target;
    if (t && t.closest && t.closest('.scr:not(.hidden), .sound-panel')) return;
    e.preventDefault();
    if (lock) { showTip('Vista bloqueada'); return; }
    // Un paso por "clic" de rueda; los touchpads mandan muchos deltas pequeños.
    wheelAcc += e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY;
    const now = performance.now();
    if (Math.abs(wheelAcc) < 60 || now - wheelT < 140) return;
    wheelT = now;
    setLvl(lvl + (wheelAcc > 0 ? 1 : -1), true);
    wheelAcc = 0;
  }, { passive: false });

  // ---------------- aviso pequeño ----------------

  let tip = null, tipT = 0;
  function showTip(text) {
    if (!tip) return;
    tip.textContent = text === 'Vista bloqueada' ? text : 'Vista ' + text;
    tip.style.opacity = '1';
    clearTimeout(tipT);
    tipT = setTimeout(() => { tip.style.opacity = '0'; }, 900);
  }

  // ---------------- panel de la pausa ----------------

  let panel = null;

  function build() {
    const st = document.createElement('style');
    st.textContent = `
      .zoom-vista { margin: -6px auto 14px; max-width: 320px; }
      .zoom-vista .snd-row { grid-template-columns: 20px 64px 1fr 44px; margin-bottom: 8px; }
      .zoom-vista .zv-val { font-size: 13px; text-align: right; color: #c9f3ff; }
      .zoom-vista .zv-btns { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
      #zoom-tip { position: fixed; left: 50%; top: 22%; transform: translateX(-50%); z-index: 15;
        padding: 4px 12px; border-radius: 8px; background: rgba(10,14,30,.72); color: #fff;
        font: 700 15px Pixelify, system-ui, sans-serif; pointer-events: none; opacity: 0;
        transition: opacity .25s; }`;
    document.head.appendChild(st);

    tip = document.createElement('div');
    tip.id = 'zoom-tip';
    document.body.appendChild(tip);

    const snd = document.getElementById('pause-sound');
    if (!snd) return;
    panel = document.createElement('div');
    panel.className = 'zoom-vista';
    panel.innerHTML = `
      <div class="snd-row">${G.Icons.html('cursor', 18)}<span>Vista</span>
        <input type="range" min="0" max="${LEVELS.length - 1}" step="1" data-zv-range>
        <span class="zv-val" data-zv-val></span></div>
      <div class="zv-btns">
        <button class="btn small" data-zv-reset>Restablecer</button>
        <button class="btn small" data-zv-lock></button>
      </div>`;
    snd.after(panel);
    const r = panel.querySelector('[data-zv-range]');
    r.oninput = () => setLvl(r.value);
    r.onchange = () => G.Audio.sfx('click');
    panel.querySelector('[data-zv-reset]').onclick = () => { setLvl(0); G.Audio.sfx('click'); };
    panel.querySelector('[data-zv-lock]').onclick = () => { setLock(!lock); G.Audio.sfx('click'); };
    refreshPanel();
  }

  function refreshPanel() {
    if (!panel) return;
    panel.querySelector('[data-zv-range]').value = lvl;
    panel.querySelector('[data-zv-val]').textContent = pct(lvl);
    panel.querySelector('[data-zv-reset]').disabled = lvl === 0;
    const b = panel.querySelector('[data-zv-lock]');
    b.textContent = lock ? 'Desbloquear' : 'Bloquear';
    b.classList.toggle('gold', lock);
    b.title = lock ? 'La rueda del ratón no cambia la vista' : 'La rueda del ratón aleja o acerca la vista';
  }

  // ---------------- bucle propio ----------------

  let prev = 0;
  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.1, (now - (prev || now)) / 1000);
    prev = now;
    const target = active() ? LEVELS[lvl] : 1;
    let z = Cam.zoom;
    if (z === target) return;
    z += (target - z) * (1 - Math.exp(-dt * 9));
    if (Math.abs(z - target) < 0.003) z = target;
    setZoom(z);
  }
  // Los scripts van con defer: la página ya está montada.
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
  requestAnimationFrame(loop);

  return {
    LEVELS,
    get level() { return lvl; },
    get locked() { return lock; },
    set: setLvl,
    lock: setLock
  };
})();
