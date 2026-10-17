/* ============ minimapa.js — (mod) minimapa y mapa grande ============
 * Minimapa pequeño arriba a la derecha (debajo del clima y del botón de pausa
 * del móvil) y, con la tecla M o tocándolo, el mapa grande con zoom.
 *
 * El mundo no tiene bordes: el minimapa es un radar centrado en ti y el mapa
 * grande enseña lo que has recorrido en esta partida (el terreno de cada trozo
 * de 512 px por el que has pasado), tus compañeros, los jefes, la grieta, los
 * cofres que has visto y el Pokémon perdido. Los enemigos normales sólo como
 * manchas por zonas.
 *
 * Va en sus propios canvas, encima del juego, y se dibuja pocas veces por
 * segundo: no toca el bucle ni el HUD del original. No sale en la arena de la
 * grieta ni en la Sentencia de Arceus. Esconder/sacar el pequeño se recuerda
 * (localStorage 'ps.minimapa').
 */
G.Minimapa = (() => {
  const KEY = 'ps.minimapa';
  const VIEW = 1500;                 // radio de mundo (px) que enseña el minimapa
  const CELL = 192;                  // zona de las manchas de enemigos (px de mundo)
  const MINI_MS = 160;               // el pequeño, unas 6 veces por segundo
  const BIG_MS = 60;                 // el grande, más suave al arrastrar
  const SAMPLE_MS = 400;             // cada cuánto se apunta lo recorrido
  const ZMIN = 0.012, ZMAX = 0.5;    // zoom del grande (px de pantalla por px de mundo)

  let pref = null;                   // true/false si el jugador lo eligió; null = según la pantalla
  try { const v = localStorage.getItem(KEY); if (v === '0' || v === '1') pref = v === '1'; } catch (e) { /* nada */ }

  // ---------------- memoria de la partida ----------------
  let runPl = null;                  // jugador de la partida que se está apuntando
  const explored = new Map();        // "cx,cy" -> { cx, cy, terr: Uint8Array, img }
  const chests = new Map();          // id -> prop (cofres vistos)
  const altars = new Map();          // id -> prop (altares de poder vistos)
  let bakedBiome = -1;

  function resetRun(pl) {
    runPl = pl; explored.clear(); chests.clear(); altars.clear(); bakedBiome = -1;
  }

  const KIND_N = { floor: 0, wall: 1, liquid: 2 };

  /** Apunta los trozos alrededor del jugador y los cofres que tiene cerca. */
  function sample(pl) {
    const W = G.World, CW = W.CW, TS = W.TS, N = Math.round(CW / TS);
    const pcx = Math.floor(pl.x / CW), pcy = Math.floor(pl.y / CW);
    let added = 0;
    for (let cy = pcy - 2; cy <= pcy + 2; cy++) for (let cx = pcx - 2; cx <= pcx + 2; cx++) {
      const k = cx + ',' + cy;
      if (explored.has(k) || added >= 4) continue;     // como mucho 4 trozos nuevos de una vez
      const terr = new Uint8Array(N * N);
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        terr[j * N + i] = KIND_N[W.kindAt(cx * CW + i * TS + 1, cy * CW + j * TS + 1)] || 0;
      }
      explored.set(k, { cx, cy, terr, img: null });
      added++;
    }
    for (const p of W.propsInCircle(pl.x, pl.y, 900)) if (p.type === 'chest') chests.set(p.id, p);
    for (const p of W.specialsNear(pl.x, pl.y, 900)) {
      if (p.type === 'bigchest') chests.set(p.id, p);
      else if (p.type === 'altar') altars.set(p.id, p);
    }
    for (const [id, p] of chests) if (p.hp <= 0 || (p.type === 'bigchest' && !W.specialsNear(p.x, p.y, 1).includes(p))) chests.delete(id);
  }

  /** Imagen de 16×16 de un trozo con los colores del bioma actual. */
  function chunkImg(c) {
    const biome = G.World.biome;
    if (bakedBiome !== biome) { for (const e of explored.values()) e.img = null; bakedBiome = biome; }
    if (c.img) return c.img;
    const B = G.Tiles.BIOMES[biome] || G.Tiles.BIOMES[0];
    const col = [B.floor[0], B.wallTop[0], B.liq];
    const N = Math.round(Math.sqrt(c.terr.length));
    const cv = document.createElement('canvas'); cv.width = cv.height = N;
    const x = cv.getContext('2d');
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { x.fillStyle = col[c.terr[j * N + i]]; x.fillRect(i, j, 1, 1); }
    c.img = cv;
    return cv;
  }

  // ---------------- cuándo se ve ----------------

  function screenOpen(id) { const el = document.getElementById(id); return !!el && !el.classList.contains('hidden'); }

  function canShow() {
    const pl = G.Game.player, st = G.Game.state;
    if (!pl || !['playing', 'paused', 'held'].includes(st)) return false;
    if (G.Rift.inArena || G.Judgment.active) return false;
    if (G.SettingsUI.isOpen || screenOpen('scr-layout') || screenOpen('rotate')) return false;
    return true;
  }

  const tiny = () => Math.min(innerWidth, innerHeight) < 420;
  const wanted = () => (pref === null ? !tiny() : pref);

  function setPref(v) {
    pref = v;
    try { localStorage.setItem(KEY, v ? '1' : '0'); } catch (e) { /* nada */ }
    lastMini = 0;
  }

  // ---------------- DOM ----------------

  let box, mini, mctx, btn, big, bcv, bctx, ready = false;

  const ICON_MAP = '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M1.5 3.5l4-1.5 5 2 4-1.5v10l-4 1.5-5-2-4 1.5z"/><path d="M5.5 2v10M10.5 4v10"/></svg>';
  const ICON_HIDE = '<svg viewBox="0 0 16 16" width="14" height="14" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 8h8"/></svg>';

  function build() {
    const css = document.createElement('style');
    css.textContent = `
#mm { position: fixed; z-index: 22; display: none; pointer-events: none; }
#mm-cv { display: block; border-radius: 10px; cursor: pointer; pointer-events: auto; touch-action: none;
  box-shadow: 0 2px 10px rgba(0,0,0,.45); }
#mm-btn { position: absolute; width: 26px; height: 26px; padding: 0; border-radius: 8px; pointer-events: auto;
  display: flex; align-items: center; justify-content: center; color: #eaf2ff; cursor: pointer;
  background: rgba(10,16,28,.72); border: 1px solid rgba(255,255,255,.22); touch-action: manipulation; }
#mm-btn:hover { background: rgba(30,44,70,.9); }
#mm-big { position: fixed; inset: 0; z-index: 24; display: none; background: rgba(6,10,20,.94); touch-action: none; }
#mm-big canvas { position: absolute; inset: 0; width: 100%; height: 100%; cursor: grab; touch-action: none; }
#mm-big .mm-bar { position: absolute; top: max(10px, env(safe-area-inset-top)); right: max(12px, env(safe-area-inset-right));
  display: flex; gap: 6px; z-index: 1; }
#mm-big .mm-bar button { min-width: 40px; height: 40px; border-radius: 10px; font: 800 20px Pixelify, system-ui, sans-serif;
  color: #eaf2ff; background: rgba(20,30,50,.9); border: 1px solid rgba(255,255,255,.25); cursor: pointer; touch-action: manipulation; }
#mm-big .mm-bar button:hover { background: rgba(40,60,95,.95); }
#mm-big .mm-title { position: absolute; top: max(16px, env(safe-area-inset-top)); left: max(16px, env(safe-area-inset-left));
  font: 800 18px Pixelify, system-ui, sans-serif; color: #eaf2ff; z-index: 1; pointer-events: none; text-shadow: 0 2px 4px #000; }
#mm-big .mm-legend { position: absolute; left: max(12px, env(safe-area-inset-left)); bottom: max(10px, env(safe-area-inset-bottom));
  display: flex; flex-wrap: wrap; gap: 4px 12px; max-width: calc(100% - 24px); z-index: 1; pointer-events: none;
  font: 700 12px Pixelify, system-ui, sans-serif; color: #cfd9ee; text-shadow: 0 1px 3px #000; }
#mm-big .mm-legend i { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 5px; vertical-align: -1px; }
#mm-big .mm-hint { width: 100%; color: #8fa0bf; }
`;
    document.head.appendChild(css);

    box = document.createElement('div'); box.id = 'mm';
    mini = document.createElement('canvas'); mini.id = 'mm-cv';
    mini.title = 'Mapa (M)';
    btn = document.createElement('button'); btn.id = 'mm-btn'; btn.type = 'button';
    box.append(mini, btn);
    document.body.appendChild(box);
    mctx = mini.getContext('2d');
    btn.addEventListener('click', e => { e.stopPropagation(); setPref(!wanted()); });
    mini.addEventListener('click', () => open());

    big = document.createElement('div'); big.id = 'mm-big';
    big.innerHTML = '<canvas></canvas><div class="mm-title">Mapa</div>' +
      '<div class="mm-bar"><button type="button" data-z="out" title="Alejar">−</button><button type="button" data-z="in" title="Acercar">+</button>' +
      '<button type="button" data-z="me" title="Centrar en ti">◎</button><button type="button" data-z="x" title="Cerrar">✕</button></div>' +
      '<div class="mm-legend">' +
      '<span><i style="background:#ffffff"></i>Tú</span>' +
      '<span><i style="background:linear-gradient(90deg,' + G.Coop.COLORS.join(',') + ');box-shadow:0 0 0 1px #fff"></i>Compañeros</span>' +
      '<span><i style="background:#ff9a3d;border-radius:1px;transform:rotate(45deg) scale(.8)"></i>Jefe</span>' +
      '<span><i style="background:#b48aff"></i>Grieta</span>' +
      '<span><i style="background:#e8b04a;border-radius:2px"></i>Cofre</span>' +
      '<span><i style="background:linear-gradient(90deg,' + G.Interact.POWERS.map(p => p.color).join(',') + ');border-radius:5px 5px 1px 1px"></i>Altar de poder</span>' +
      '<span><i style="background:#7dffb0"></i>Pokémon perdido</span>' +
      '<span><i style="background:rgba(255,80,80,.7);border-radius:2px"></i>Enemigos</span>' +
      '<span class="mm-hint"></span></div>';
    document.body.appendChild(big);
    bcv = big.querySelector('canvas'); bctx = bcv.getContext('2d');
    big.querySelector('.mm-bar').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      const z = b.dataset.z;
      if (z === 'x') close();
      else if (z === 'me') { const pl = G.Game.player; if (pl) { view.x = pl.x; view.y = pl.y; } follow = true; dirty = true; }
      else zoomBy(z === 'in' ? 1.4 : 1 / 1.4);
    });
    wireBig();
    ready = true;
  }

  // ---------------- dibujo (sirve para los dos) ----------------

  const TAU = Math.PI * 2;

  function dot(c, x, y, r, fill, line = 'rgba(0,0,0,.85)') {
    c.beginPath(); c.arc(x, y, r, 0, TAU);
    c.fillStyle = fill; c.fill();
    c.lineWidth = Math.max(1, r * 0.35); c.strokeStyle = line; c.stroke();
  }

  /**
   * Dibuja el mapa en c (w×h px) centrado en (cx, cy) del mundo, con k px de
   * pantalla por px de mundo. Lo importante que queda fuera sale pegado al borde.
   */
  function paint(c, w, h, cx, cy, k, isBig) {
    const pl = G.Game.player;
    const now = performance.now() / 1000;
    const sx = x => w / 2 + (x - cx) * k, sy = y => h / 2 + (y - cy) * k;
    const M = isBig ? 18 : 6;
    const edge = (x, y) => {
      const px = sx(x), py = sy(y);
      const inside = px >= M && px <= w - M && py >= M && py <= h - M;
      return [G.U.clamp(px, M, w - M), G.U.clamp(py, M, h - M), inside];
    };

    c.fillStyle = 'rgba(8,12,22,.9)';
    c.fillRect(0, 0, w, h);

    // Terreno recorrido.
    const CW = G.World.CW;
    c.imageSmoothingEnabled = false;
    const x0 = cx - w / 2 / k - CW, x1 = cx + w / 2 / k, y0 = cy - h / 2 / k - CW, y1 = cy + h / 2 / k;
    for (const e of explored.values()) {
      const wx = e.cx * CW, wy = e.cy * CW;
      if (wx < x0 || wx > x1 || wy < y0 || wy > y1) continue;
      // Bordes redondeados a píxel: los trozos se tocan sin rayas entre ellos.
      const a = Math.round(sx(wx)), b = Math.round(sy(wy));
      c.drawImage(chunkImg(e), a, b, Math.round(sx(wx + CW)) - a, Math.round(sy(wy + CW)) - b);
    }
    // Más oscuro, para que se lean bien los puntos.
    c.fillStyle = isBig ? 'rgba(8,12,22,.25)' : 'rgba(8,12,22,.4)';
    c.fillRect(0, 0, w, h);

    // Enemigos normales: manchas por zonas.
    const cells = new Map();
    for (const e of G.EnemyMgr.all()) {
      if (e.dead || e.boss) continue;
      const kk = Math.floor(e.x / CELL) + ',' + Math.floor(e.y / CELL);
      cells.set(kk, (cells.get(kk) || 0) + 1);
    }
    const cp = CELL * k;
    for (const [kk, n] of cells) {
      const [gx, gy] = kk.split(',').map(Number);
      const px = sx(gx * CELL), py = sy(gy * CELL);
      if (px + cp < 0 || px > w || py + cp < 0 || py > h) continue;
      c.fillStyle = `rgba(255,70,70,${Math.min(0.75, 0.16 + n * 0.07).toFixed(2)})`;
      c.fillRect(px, py, Math.max(2, cp), Math.max(2, cp));
    }

    // Cofres vistos.
    const cr = isBig ? 4 : 2.5;
    for (const p of chests.values()) {
      const px = sx(p.x), py = sy(p.y);
      if (px < -6 || px > w + 6 || py < -6 || py > h + 6) continue;
      const s = p.type === 'bigchest' ? cr * 1.6 : cr;
      c.fillStyle = p.type === 'bigchest' ? '#ffd86a' : '#e8b04a';
      c.strokeStyle = 'rgba(0,0,0,.85)'; c.lineWidth = 1;
      c.fillRect(px - s, py - s, s * 2, s * 2); c.strokeRect(px - s, py - s, s * 2, s * 2);
    }

    // Altares de poder: una torre con el color de su poder (gris si ya lo has usado).
    const ar = isBig ? 6 : 3.5;
    for (const p of altars.values()) {
      const px = sx(p.x), py = sy(p.y);
      if (px < -8 || px > w + 8 || py < -8 || py > h + 8) continue;
      const pw = G.Interact.POWERS[p.kind];
      c.beginPath();
      c.moveTo(px, py - ar * 1.7); c.lineTo(px + ar, py - ar * 0.6); c.lineTo(px + ar, py + ar);
      c.lineTo(px - ar, py + ar); c.lineTo(px - ar, py - ar * 0.6); c.closePath();
      c.fillStyle = p.used ? '#6b7280' : (pw ? pw.color : '#ffffff'); c.fill();
      c.lineWidth = 1; c.strokeStyle = 'rgba(0,0,0,.9)'; c.stroke();
    }

    const R = isBig ? 6 : 3.5;
    const beat = 0.5 + Math.sin(now * 6) * 0.5;

    // Pokémon perdido y su marca.
    const L = G.Events._dbg && G.Events._dbg();
    if (L) {
      if (L.state !== 'wait') {
        const [gx, gy] = edge(L.tx, L.ty);
        c.beginPath(); c.arc(gx, gy, R * 1.6, 0, TAU);
        c.lineWidth = 2; c.strokeStyle = '#7dffb0'; c.stroke();
      }
      const [lx, ly] = edge(L.x, L.y);
      dot(c, lx, ly, R * (0.9 + beat * 0.25), '#7dffb0');
    }

    // Grieta.
    const rift = G.Rift.rift;
    if (rift) {
      const [rx, ry] = edge(rift.x, rift.y);
      c.beginPath(); c.arc(rx, ry, R * (1.6 + beat * 0.8), 0, TAU);
      c.fillStyle = 'rgba(180,138,255,.35)'; c.fill();
      dot(c, rx, ry, R * 1.1, beat > 0.5 ? '#e2d0ff' : '#b48aff');
    }

    // Jefes.
    for (const e of G.EnemyMgr.all()) {
      if (!e.boss || e.dead) continue;
      // Rombo naranja (un compañero puede ser amarillo).
      const [bx, by] = edge(e.x, e.y), r = R * 1.6;
      c.beginPath(); c.moveTo(bx, by - r); c.lineTo(bx + r, by); c.lineTo(bx, by + r); c.lineTo(bx - r, by); c.closePath();
      c.fillStyle = '#ff9a3d'; c.fill();
      c.lineWidth = 1.5; c.strokeStyle = 'rgba(0,0,0,.9)'; c.stroke();
    }

    // Compañeros.
    if (G.Coop.active) {
      for (const m of G.Coop.mates) {
        if (!m.connected || !m.pl) continue;
        const [mx, my] = edge(m.pl.x, m.pl.y);
        dot(c, mx, my, R * 1.05, m.pl.dead ? (beat > 0.5 ? '#ff5f6d' : '#ffd0d5') : m.color, '#ffffff');
      }
    }

    // Tú: flecha hacia donde miras.
    if (pl) {
      const [px, py] = edge(pl.x, pl.y);
      const a = pl.aim || 0, s = R * 1.5;
      c.beginPath();
      c.moveTo(px + Math.cos(a) * s * 1.3, py + Math.sin(a) * s * 1.3);
      c.lineTo(px + Math.cos(a + 2.5) * s, py + Math.sin(a + 2.5) * s);
      c.lineTo(px + Math.cos(a + Math.PI) * s * 0.35, py + Math.sin(a + Math.PI) * s * 0.35);
      c.lineTo(px + Math.cos(a - 2.5) * s, py + Math.sin(a - 2.5) * s);
      c.closePath();
      c.fillStyle = '#ffffff'; c.fill();
      c.lineWidth = 1.5; c.strokeStyle = 'rgba(0,0,0,.9)'; c.stroke();
    }
  }

  // ---------------- minimapa pequeño ----------------

  let lastMini = 0, lastSample = 0, layoutKey = '';

  function place() {
    const W = innerWidth, H = innerHeight, short = Math.min(W, H), small = tiny();
    const size = Math.round(G.U.clamp(short * (small ? 0.2 : 0.22), small ? 72 : 90, 170));
    const touch = G.Touch.active;
    const sa = touch ? G.Touch.safeArea() : { top: 0, right: 0 };
    const right = 16 + (touch ? Math.min(44, sa.right) : 0);
    let top = touch ? 12 + Math.min(20, sa.top) + 48 : 48;
    // Si has movido el botón de pausa (editor de botones) y cae encima, se baja.
    const pp = touch && G.Touch.spot('pause');
    if (pp) {
      const bx = G.U.clamp(pp[0] * W - 20, 4, W - 44), by = G.U.clamp(pp[1] * H - 20, 10, H - 44);
      const L = W - right - size;
      if (bx + 40 > L && bx < W - right && by + 40 > top && by < top + size) top = by + 48;
    }
    const show = wanted();
    const k = [W, H, size, top, right, show].join();
    if (k === layoutKey) return show;
    layoutKey = k;
    const dpr = Math.min(2, devicePixelRatio || 1);
    box.style.right = right + 'px'; box.style.top = top + 'px';
    box.style.width = (show ? size : 26) + 'px'; box.style.height = (show ? size : 26) + 'px';
    mini.style.display = show ? 'block' : 'none';
    mini.style.width = mini.style.height = size + 'px';
    mini.width = mini.height = Math.round(size * dpr);
    // Escondido: sólo el botón (con el dibujo de un mapa); a la vista, un "−" en su esquina.
    btn.style.left = show ? '-30px' : '0'; btn.style.top = '0';
    btn.innerHTML = show ? ICON_HIDE : ICON_MAP;
    btn.title = show ? 'Esconder el minimapa' : 'Sacar el minimapa';
    return show;
  }

  function drawMini(pl) {
    const dpr = mini.width / parseFloat(mini.style.width);
    const s = mini.width;
    mctx.setTransform(1, 0, 0, 1, 0, 0);
    mctx.clearRect(0, 0, s, s);
    mctx.save();
    mctx.beginPath(); mctx.roundRect ? mctx.roundRect(0, 0, s, s, 10 * dpr) : mctx.rect(0, 0, s, s); mctx.clip();
    mctx.scale(dpr, dpr);
    const css = s / dpr;
    paint(mctx, css, css, pl.x, pl.y, css / (VIEW * 2), false);
    mctx.restore();
    mctx.lineWidth = 2 * dpr; mctx.strokeStyle = 'rgba(255,255,255,.35)';
    mctx.beginPath(); mctx.roundRect ? mctx.roundRect(dpr, dpr, s - 2 * dpr, s - 2 * dpr, 9 * dpr) : mctx.rect(dpr, dpr, s - 2 * dpr, s - 2 * dpr); mctx.stroke();
  }

  // ---------------- mapa grande ----------------

  let isBig = false, pausedByMe = false, follow = true, dirty = true, lastBig = 0;
  const view = { x: 0, y: 0, k: 0.06 };

  /** Zoom para que quepa todo lo recorrido, sin que quede demasiado pequeño. */
  function fit() {
    const pl = G.Game.player, CW = G.World.CW;
    let a = pl.x, b = pl.y, c = pl.x, d = pl.y;
    const add = (x, y) => { if (x < a) a = x; if (y < b) b = y; if (x > c) c = x; if (y > d) d = y; };
    for (const e of explored.values()) { add(e.cx * CW, e.cy * CW); add(e.cx * CW + CW, e.cy * CW + CW); }
    if (G.Rift.rift) add(G.Rift.rift.x, G.Rift.rift.y);
    const w = bcv.clientWidth || innerWidth, h = bcv.clientHeight || innerHeight;
    const kFit = Math.min((w - 40) / Math.max(1, c - a), (h - 110) / Math.max(1, d - b));
    if (kFit >= 0.05) { view.k = Math.min(ZMAX, kFit); view.x = (a + c) / 2; view.y = (b + d) / 2; follow = false; }
    else { view.k = 0.05; view.x = pl.x; view.y = pl.y; follow = true; }
  }

  function open() {
    if (isBig || !canShow() || G.Game.state === 'held') return;
    isBig = true;
    pausedByMe = false;
    if (G.Game.state === 'playing' && !G.Coop.active) { G.Game.togglePause(); pausedByMe = G.Game.state === 'paused'; }
    big.style.display = 'block';
    big.querySelector('.mm-hint').textContent = G.Touch.active
      ? 'Pellizca o usa + / − para el zoom · arrastra para mover el mapa'
      : 'Rueda o + / − para el zoom · arrastra para mover el mapa · M o Esc para cerrar';
    fit();
    dirty = true;
  }

  function close() {
    if (!isBig) return;
    isBig = false;
    big.style.display = 'none';
    ptrs.clear();
    if (pausedByMe && G.Game.state === 'paused') G.Game.togglePause();
    pausedByMe = false;
  }

  function zoomBy(f, ax, ay) {
    const w = bcv.clientWidth, h = bcv.clientHeight;
    if (ax === undefined) { ax = w / 2; ay = h / 2; }
    // El punto bajo el ratón (o el centro) se queda donde está.
    const wx = view.x + (ax - w / 2) / view.k, wy = view.y + (ay - h / 2) / view.k;
    view.k = G.U.clamp(view.k * f, ZMIN, ZMAX);
    view.x = wx - (ax - w / 2) / view.k; view.y = wy - (ay - h / 2) / view.k;
    if (ax !== w / 2 || ay !== h / 2) follow = false;
    dirty = true;
  }

  const ptrs = new Map();
  let pinch = null;

  function wireBig() {
    bcv.addEventListener('wheel', e => { e.preventDefault(); zoomBy(e.deltaY < 0 ? 1.2 : 1 / 1.2, e.offsetX, e.offsetY); }, { passive: false });
    bcv.addEventListener('pointerdown', e => {
      bcv.setPointerCapture(e.pointerId);
      ptrs.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
      if (ptrs.size === 2) {
        const [p, q] = [...ptrs.values()];
        pinch = { d: Math.hypot(p.x - q.x, p.y - q.y) || 1, k: view.k };
      }
      bcv.style.cursor = 'grabbing';
    });
    bcv.addEventListener('pointermove', e => {
      const o = ptrs.get(e.pointerId); if (!o) return;
      const nx = e.offsetX, ny = e.offsetY;
      if (ptrs.size === 1) {
        view.x -= (nx - o.x) / view.k; view.y -= (ny - o.y) / view.k;
        follow = false;
      }
      o.x = nx; o.y = ny;
      if (ptrs.size === 2 && pinch) {
        const [p, q] = [...ptrs.values()];
        const d = Math.hypot(p.x - q.x, p.y - q.y) || 1;
        zoomBy((pinch.k * d / pinch.d) / view.k, (p.x + q.x) / 2, (p.y + q.y) / 2);
      }
      dirty = true;
    });
    const up = e => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null; if (!ptrs.size) bcv.style.cursor = 'grab'; };
    bcv.addEventListener('pointerup', up);
    bcv.addEventListener('pointercancel', up);
  }

  function drawBig(pl) {
    const dpr = Math.min(2, devicePixelRatio || 1);
    const w = bcv.clientWidth, h = bcv.clientHeight;
    if (bcv.width !== Math.round(w * dpr) || bcv.height !== Math.round(h * dpr)) { bcv.width = Math.round(w * dpr); bcv.height = Math.round(h * dpr); }
    if (follow) { view.x = pl.x; view.y = pl.y; }
    bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    bctx.clearRect(0, 0, w, h);
    paint(bctx, w, h, view.x, view.y, view.k, true);
    // Escala: cuántos metros son 100 px (1 m = 32 px de mundo, como el juego).
    const m = Math.max(1, Math.round(100 / view.k / 32));
    bctx.font = '700 12px Pixelify, system-ui, sans-serif';
    bctx.textAlign = 'right'; bctx.fillStyle = '#cfd9ee';
    const yb = h - 46;
    bctx.fillRect(w - 116, yb, 100, 2);
    bctx.fillText(m + ' m', w - 16, yb - 6);
  }

  // ---------------- teclado ----------------

  addEventListener('keydown', e => {
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    const c = (e.code || e.key).toLowerCase();
    if (isBig) {
      if (c === 'keym' || c === 'escape') close();
      else if (c === 'equal' || c === 'numpadadd' || e.key === '+') zoomBy(1.4);
      else if (c === 'minus' || c === 'numpadsubtract' || e.key === '-') zoomBy(1 / 1.4);
      else return;
      e.preventDefault(); e.stopImmediatePropagation();
      return;
    }
    if (c === 'keym' && !e.repeat && ready && canShow()) { open(); e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);

  // ---------------- bucle propio ----------------

  function loop(now) {
    requestAnimationFrame(loop);
    if (!ready) { if (document.body) build(); else return; }
    const pl = G.Game.player;
    const ok = canShow();
    if (pl && pl !== runPl && G.Game.state !== 'ui') resetRun(pl);
    if (ok && now - lastSample > SAMPLE_MS) { lastSample = now; sample(pl); }
    if (isBig && !ok) close();
    if (!ok || isBig) { box.style.display = 'none'; layoutKey = ''; }
    else {
      box.style.display = 'block';
      const show = place();
      if (now - lastMini > MINI_MS) {
        lastMini = now;
        if (show) drawMini(pl);
        // Con la pausa abierta, si pisa su panel (pantallas pequeñas), se queda detrás.
        let under = false;
        if (screenOpen('scr-pause')) {
          const pn = document.getElementById('scr-pause').firstElementChild;
          const a = pn && pn.getBoundingClientRect(), b = box.getBoundingClientRect();
          under = !!a && a.right > b.left - 32 && a.left < b.right && a.bottom > b.top && a.top < b.bottom;
        }
        box.style.zIndex = under ? '19' : '';
      }
    }
    if (isBig && (dirty || now - lastBig > BIG_MS * 2) && now - lastBig > BIG_MS) { lastBig = now; dirty = false; drawBig(pl); }
  }
  requestAnimationFrame(loop);

  return {
    open, close,
    get shown() { return wanted(); },
    get isOpen() { return isBig; },
    /** Para pruebas: lo apuntado en esta partida. */
    _dbg() { return { chunks: explored.size, chests: chests.size, altars: altars.size, pref }; }
  };
})();
