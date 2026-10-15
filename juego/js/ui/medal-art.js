/* ============ medal-art.js — (mod) dibujo de cada medalla ============
 * Las 72 medallas de medals.js en pixel art de 16×16, con el estilo de
 * icons.js. No van dibujadas píxel a píxel: cada una se describe con figuras
 * (círculos, polígonos, estrellas...) que se pasan a la cuadrícula; luego se
 * sombrean (borde de arriba-izquierda más claro, de abajo-derecha más oscuro)
 * y se perfilan. Galar y Paldea: moneda con el emblema de su tipo
 * (G.Icons.TYPE_GLYPH); Alola: el cristal Z con el suyo.
 *
 *   G.MedalArt.def(gen, k, color)   { rows, pal } para G.Icons.UI
 *   G.MedalArt.off(gen, k)          la misma forma, en gris (sin conseguir)
 */
G.MedalArt = (() => {
  const S = 16;

  // ---------------- figuras: f(x, y), con (x, y) el centro del píxel ----------------
  const C = (cx, cy, r) => (x, y) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
  const E = (cx, cy, rx, ry, deg = 0) => {
    const a = deg * Math.PI / 180, co = Math.cos(a), si = Math.sin(a);
    return (x, y) => { const dx = x - cx, dy = y - cy; return ((dx * co + dy * si) / rx) ** 2 + ((-dx * si + dy * co) / ry) ** 2 <= 1; };
  };
  const R = (x0, y0, x1, y1) => (x, y) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
  const P = (...pts) => (x, y) => {
    let ins = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) ins = !ins;
    }
    return ins;
  };
  const STAR = (cx, cy, ro, ri, n, deg = -90) => {
    const pts = [];
    for (let i = 0; i < n * 2; i++) {
      const a = (deg + i * 180 / n) * Math.PI / 180, r = i % 2 ? ri : ro;
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    return P(...pts);
  };
  const L = (x1, y1, x2, y2, w = 0.6) => (x, y) => {
    const dx = x2 - x1, dy = y2 - y1;
    const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(x - x1 - t * dx, y - y1 - t * dy) <= w;
  };
  const OR = (...f) => (x, y) => f.some(g => g(x, y));
  const AND = (...f) => (x, y) => f.every(g => g(x, y));
  const MIR = f => (x, y) => f(x, y) || f(S - x, y);
  // Sector de un círculo centrado, de a0 a a1 grados (0 = derecha, en el sentido del reloj).
  const SECT = (a0, a1) => (x, y) => {
    let a = Math.atan2(y - 8, x - 8) * 180 / Math.PI;
    while (a < a0) a += 360;
    while (a >= a0 + 360) a -= 360;
    return a < a1;
  };
  // Emblema de un tipo (8×8) con la esquina en (ox, oy).
  const GLY = (type, ox = 4, oy = 4) => (x, y) => {
    const g = G.Icons.TYPE_GLYPH[type], gx = Math.floor(x - ox), gy = Math.floor(y - oy);
    return !!(g && g[gy] && g[gy][gx] === '#');
  };
  const scale = (pts, s, cx = 8, cy = 8) => pts.map(([x, y]) => [cx + (x - cx) * s, cy + (y - cy) * s]);

  // ---------------- formas que se repiten ----------------
  const drop = (cx = 8, cy = 10, r = 4.6, top = 1.5) => OR(C(cx, cy, r), P([cx, top], [cx + r * 0.95, cy - r * 0.3], [cx - r * 0.95, cy - r * 0.3]));
  const OCT = [[5, 1.5], [11, 1.5], [14.5, 5], [14.5, 11], [11, 14.5], [5, 14.5], [1.5, 11], [1.5, 5]];
  const oct = P(...OCT), octIn = P(...scale(OCT, 0.5));
  const HEX = [[8, 1.5], [14, 5], [14, 11], [8, 14.5], [2, 11], [2, 5]];
  const hex = P(...HEX);
  const tri = P([8, 1.5], [14.5, 13.5], [1.5, 13.5]);
  const diamond = P([8, 1.5], [14.5, 8], [8, 14.5], [1.5, 8]);
  const heart = OR(C(5, 5.6, 3.3), C(11, 5.6, 3.3), P([1.9, 6.8], [14.1, 6.8], [8, 14.5]));
  const flame = P([8, 1.5], [9.6, 4.6], [11.8, 2.8], [12, 6.5], [13.6, 9.5], [12.6, 13], [10, 14.5], [6, 14.5], [3.4, 13], [2.4, 9.5], [4, 6.5], [4.2, 2.8], [6.4, 4.6]);
  const flameIn = P([8, 6.5], [10.3, 10.3], [9.6, 13], [6.4, 13], [5.7, 10.3]);
  const fist = [
    ['a', OR(R(2.6, 5.4, 13.9, 13.4), C(4.4, 5.4, 1.8), C(7.1, 5, 1.8), C(9.8, 5, 1.8), C(12.2, 5.4, 1.7))],
    ['1', OR(L(5.5, 4, 5.5, 8, 0.4), L(8.5, 4, 8.5, 8, 0.4), L(11.5, 4, 11.5, 8, 0.4))],
    ['b', R(2.6, 9.5, 9.4, 11.4)]
  ];
  const dragon = P([8, 4], [11, 1.5], [13, 4], [14.5, 8], [12, 8.5], [14, 12], [8, 14.5], [2, 12], [4, 8.5], [1.5, 8], [3, 4], [5, 1.5]);
  const leaf = deg => [['a', E(8, 8, 6.8, 3.6, deg)], ['1', L(4, 12, 12, 4, 0.4)]];
  const coin = (type) => [['a', C(8, 8, 7)], ['1', C(8, 8, 5.4)], ['w', GLY(type)]];
  const octCoin = (type) => [['a', oct], ['1', P(...scale(OCT, 0.76))], ['w', GLY(type)]];
  const zgem = P([8, 1.5], [13, 5.5], [13, 10.5], [8, 14.5], [3, 10.5], [3, 5.5]);
  const zcrystal = (type) => [['a', zgem], ['w', AND(zgem, GLY(type))]];
  const snow = OR(...[-90, -30, 30, 90, 150, 210].map(d => {
    const a = d * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
    // brazo y dos ramitas en la punta
    return OR(L(8, 8, 8 + 6.6 * c, 8 + 6.6 * s, 0.7),
              L(8 + 4.2 * c, 8 + 4.2 * s, 8 + 4.2 * c + 2 * Math.cos(a + 0.9), 8 + 4.2 * s + 2 * Math.sin(a + 0.9), 0.5),
              L(8 + 4.2 * c, 8 + 4.2 * s, 8 + 4.2 * c + 2 * Math.cos(a - 0.9), 8 + 4.2 * s + 2 * Math.sin(a - 0.9), 0.5));
  }));

  // ---------------- las 72 (mismo orden que medals.js) ----------------
  // Cada una: [segundo color o null, partes]. Partes: [clave, figura], en orden
  // (la última manda). Claves: a = color de la medalla, b = segundo color (los
  // dos con sombreado), 1 / 2 = sus tonos oscuros, x = hueco, y colores fijos
  // r o y g u p w n (rojo, naranja, amarillo, verde, azul, morado, blanco, negro).
  const ART = [
    [ // Kanto
      [null, [['a', oct], ['b', octIn]]],                                              // Roca
      [null, [['a', drop()], ['b', drop(8, 10.3, 2.2, 6.5)]]],                          // Cascada
      ['#ffd23f', [['a', STAR(8, 8, 7, 4.6, 8, -67.5)], ['b', C(8, 8, 2.8)]]],          // Trueno
      [null, [...['r', 'o', 'y', 'g', 'u', 'p'].map((k, i) => {                          // Arcoíris
        const a = (i * 60 - 90) * Math.PI / 180;
        return [k, C(8 + 4.2 * Math.cos(a), 8 + 4.2 * Math.sin(a), 2.9)];
      }), ['w', C(8, 8, 2.1)]]],
      [null, [['a', heart]]],                                                           // Alma
      [null, [['a', C(8, 8, 6.9)], ['x', C(8, 8, 4.9)], ['a', C(8, 8, 3.1)], ['b', C(8, 8, 1.3)]]], // Pantano
      ['#ff9a3c', [['a', flame], ['b', flameIn]]],                                     // Volcán
      [null, [['a', P([8, 1.5], [12.5, 5], [13.5, 9], [8, 14.5], [2.5, 9], [3.5, 5])], ['1', L(7.5, 4, 7.5, 13, 0.45)]]] // Tierra
    ],
    [ // Johto
      [null, [['a', MIR(P([8, 6], [3, 2], [1.5, 4], [2, 8], [4, 11], [8, 13.5]))],      // Céfiro
              ['1', MIR(OR(L(3, 5.5, 7, 8, 0.4), L(3.5, 9, 7, 10.5, 0.4)))]]],
      [null, [['n', C(8, 3.6, 2.3)], ['a', C(8, 9, 5.8)], ['n', L(8, 4, 8, 14.5, 0.55)], // Colmena
              ['n', OR(C(5.4, 7.6, 1.2), C(10.6, 7.6, 1.2), C(5.6, 11.2, 1.1), C(10.4, 11.2, 1.1))]]],
      [null, [['a', P([8, 1.5], [14.5, 6.3], [12, 14.5], [4, 14.5], [1.5, 6.3])],       // Planicie
              ['b', P(...scale([[8, 1.5], [14.5, 6.3], [12, 14.5], [4, 14.5], [1.5, 6.3]], 0.5, 8, 8.8))]]],
      [null, [['a', OR(C(8, 7, 5.5), R(2.5, 7, 13.5, 11.5), C(4.3, 11.8, 1.8), C(8, 11.8, 1.8), C(11.7, 11.8, 1.8))], // Niebla
              ['n', OR(C(6, 7.5, 1), C(10, 7.5, 1))]]],
      ['#e8c090', fist],                                                                // Tormenta
      [null, [['a', diamond], ['b', P([8, 5], [11, 8], [8, 11], [5, 8])]]],             // Mineral
      [null, [['a', STAR(8, 8, 7, 3, 6)], ['w', C(8, 8, 1.8)]]],                        // Glaciar
      [null, [['a', dragon], ['b', P([8, 6], [10, 9], [8, 12], [6, 9])]]]               // Dragón
    ],
    [ // Hoenn
      [null, [['a', tri], ['b', P([8, 6], [11, 11.5], [5, 11.5])]]],                    // Piedra
      ['#4fa8ff', fist],                                                                // Puño
      ['#4fa8ff', [['a', STAR(8, 8, 7, 5.2, 10)], ['a', C(8, 8, 5.6)], ['b', C(8, 8, 2.6)]]], // Dinamo
      ['#ffd23f', [['a', flame], ['b', flameIn]]],                                     // Calor
      ['#d06040', [['a', AND(oct, R(0, 0, 8, 16))], ['b', AND(oct, R(8, 0, 16, 16))]]], // Equilibrio
      [null, [['a', E(8, 8, 7, 3, -45)], ['1', L(2, 14, 12, 4, 0.45)]]],                // Pluma
      [null, [['a', OR(C(5.3, 8, 4.3), C(10.7, 8, 4.3))], ['x', OR(C(5.3, 8, 1.7), C(10.7, 8, 1.7))]]], // Mente
      ['#a8d8ff', [['a', C(8, 8, 7)], ['x', C(8, 8, 5.2)], ['b', drop(8, 9.3, 2.6, 4.2)]]] // Lluvia
    ],
    [ // Sinnoh
      [null, [['a', P([4.5, 2.5], [11.5, 2.5], [14.5, 13.5], [1.5, 13.5])],             // Lignito
              ['y', AND(P([4.5, 2.5], [11.5, 2.5], [14.5, 13.5], [1.5, 13.5]), R(0, 7.2, 16, 8.8))]]],
      ['#8a5a30', [['b', R(6.5, 11.5, 9.5, 14.5)], ['a', P([8, 1.5], [12.5, 7.5], [3.5, 7.5])], ['a', P([8, 4.5], [14, 11.8], [2, 11.8])]]], // Bosque
      [null, [['a', OR(R(1.5, 1.5, 7.4, 7.4), R(8.6, 1.5, 14.5, 7.4), R(1.5, 8.6, 7.4, 14.5), R(8.6, 8.6, 14.5, 14.5))]]], // Adoquín
      [null, [['a', drop()], ['b', AND(drop(), R(0, 10, 16, 16))]]],                    // Ciénaga
      [null, [['a', hex], ['b', P([8, 4.5], [11, 8], [8, 11.5], [5, 8])]]],             // Reliquia
      [null, [['a', hex], ['x', C(8, 8, 2.6)]]],                                        // Mina
      [null, [['a', snow], ['w', C(8, 8, 1.6)]]],                                       // Carámbano
      ['#ff9a3c', [['b', STAR(8, 8, 7.2, 4.4, 12)], ['a', C(8, 8, 4.3)]]]               // Faro
    ],
    [ // Teselia
      [null, [['r', AND(C(8, 8, 6.9), SECT(-90, 30))], ['u', AND(C(8, 8, 6.9), SECT(30, 150))], // Trío
              ['g', AND(C(8, 8, 6.9), SECT(150, 270))], ['w', C(8, 8, 1.6)]]],
      [null, [['a', OR(R(3, 1.5, 13, 14.5), R(1.5, 3, 14.5, 13), C(3, 3, 1.5), C(13, 3, 1.5), C(3, 13, 1.5), C(13, 13, 1.5))], // Base
              ['b', R(5, 5, 11, 11)]]],
      [null, [['a', OR(E(5, 6.5, 3.4, 5.2, 25), E(11, 6.5, 3.4, 5.2, -25))],            // Élitro
              ['b', OR(E(5, 12, 2.4, 3, -25), E(11, 12, 2.4, 3, 25))], ['n', E(8, 8.5, 1.1, 6)]]],
      [null, [['a', P([10.5, 1.5], [3, 9], [7.5, 9], [5, 14.5], [13, 6.5], [8.5, 6.5], [12, 1.5])]]], // Voltio
      [null, [['a', tri], ['1', OR(L(8, 4, 6.5, 7.5, 0.45), L(6.5, 7.5, 9, 10, 0.45), L(9, 10, 7.5, 13.5, 0.45))]]], // Temblor
      [null, [['a', P([8, 1.5], [13.5, 13.5], [8, 10], [2.5, 13.5])], ['b', P([8, 5], [9.5, 9], [8, 8.5], [6.5, 9])]]], // Jet
      [null, [['a', P([8, 1.5], [11, 8], [8, 14.5], [5, 8])],                            // Candelizo
              ['b', OR(P([3.5, 5], [5.5, 9], [3.5, 13], [1.5, 9]), P([12.5, 5], [14.5, 9], [12.5, 13], [10.5, 9]))]]],
      ['#c0c8ff', [['a', dragon], ['b', P([8, 6], [10, 9], [8, 12], [6, 9])]]]          // Leyenda
    ],
    [ // Kalos
      [null, [['n', OR(L(6.5, 4, 4.5, 1.5, 0.4), L(9.5, 4, 11.5, 1.5, 0.4))], ['a', E(8, 9.2, 5, 5.3)], // Insecto
              ['n', OR(C(8, 4.6, 2.2), L(8, 6, 8, 14, 0.55))]]],
      [null, [['a', P([1.5, 14], [4.5, 5], [7, 8], [10.5, 1.5], [14.5, 14])], ['b', P([10.5, 1.5], [12.3, 6], [10.4, 5.2], [8.7, 5])]]], // Muro
      ['#ffb070', fist],                                                                // Lid
      [null, leaf(-45)],                                                                // Hoja
      [null, [['a', C(8, 8, 6.9)], ['o', P([9.5, 3], [5, 8.6], [7.8, 8.6], [6.5, 13], [11, 7.4], [8.2, 7.4], [10, 3])]]], // Voltaje
      [null, [['a', OR(P([8, 8], [1.5, 3], [1.5, 13]), P([8, 8], [14.5, 3], [14.5, 13]))], ['b', C(8, 8, 2.2)]]], // Hada
      [null, [['a', E(8, 8, 7, 4.3)], ['b', C(8, 8, 2.5)], ['n', C(8, 8, 1.1)]]],       // Psique
      [null, [['a', P([8, 1.5], [14, 14], [2, 14])], ['b', P([8, 1.5], [8, 14], [2, 14])]]] // Iceberg
    ],
    // Alola: cristales Z
    ['normal', 'water', 'fire', 'grass', 'electric', 'ghost', 'fairy', 'dragon'].map(t => [null, zcrystal(t)]),
    // Galar (Espada): moneda con el emblema del tipo
    ['grass', 'water', 'fire', 'fighting', 'fairy', 'rock', 'dark', 'dragon'].map(t => [null, coin(t)]),
    // Paldea: lo mismo, con marco octogonal
    ['bug', 'grass', 'electric', 'water', 'normal', 'ghost', 'psychic', 'ice'].map(t => [null, octCoin(t)])
  ];

  // ---------------- de figuras a filas ----------------

  function grid(parts) {
    const g = [];
    for (let y = 0; y < S; y++) {
      const row = [];
      for (let x = 0; x < S; x++) {
        let k = '.';
        for (const [key, f] of parts) if (f(x + 0.5, y + 0.5)) k = key === 'x' ? '.' : key;
        // El borde (fila/columna 0 y 15) es para el contorno.
        row.push(x === 0 || y === 0 || x === S - 1 || y === S - 1 ? '.' : k);
      }
      g.push(row);
    }
    // Sombreado: a y b, más claros arriba-izquierda (A, B) y más oscuros abajo-derecha (1, 2).
    const at = (x, y) => (g[y] && g[y][x]) || '.';
    const out = g.map(r => r.slice());
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const k = g[y][x];
      if (k !== 'a' && k !== 'b') continue;
      const up = at(x, y - 1) !== k, dn = at(x, y + 1) !== k, lf = at(x - 1, y) !== k, rt = at(x + 1, y) !== k;
      if ((up && !dn) || (lf && !rt)) out[y][x] = k === 'a' ? 'A' : 'B';
      else if ((dn && !up) || (rt && !lf)) out[y][x] = k === 'a' ? '1' : '2';
    }
    // Contorno: todo hueco que toca algo pintado.
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      if (g[y][x] !== '.') continue;
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => at(x + dx, y + dy) !== '.')) out[y][x] = 'k';
    }
    return out.map(r => r.join(''));
  }

  function mix(hex, to, f) {
    const a = parseInt(hex.slice(1), 16), b = parseInt(to.slice(1), 16);
    const ch = sh => Math.round(((a >> sh) & 255) * (1 - f) + ((b >> sh) & 255) * f);
    return '#' + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1);
  }

  const FIXED = { r: '#ff5f6d', o: '#ff9a3c', y: '#ffd23f', g: '#5fe08a', u: '#4fa8ff', p: '#c47bff', w: '#ffffff', n: '#2a2238' };
  const rowsCache = {};
  const rowsOf = (gen, k) => rowsCache[gen + '_' + k] || (rowsCache[gen + '_' + k] = grid(ART[gen - 1][k - 1][1]));

  function def(gen, k, color) {
    const b = ART[gen - 1][k - 1][0] || mix(color, '#ffffff', 0.45);
    return { rows: rowsOf(gen, k), pal: Object.assign({}, FIXED, {
      a: color, A: mix(color, '#ffffff', 0.4), 1: mix(color, '#000000', 0.35),
      b, B: mix(b, '#ffffff', 0.4), 2: mix(b, '#000000', 0.35) }) };
  }

  function off(gen, k) {
    const pal = { a: '#3a4870', b: '#3a4870', A: '#4a5a88', B: '#4a5a88', 1: '#2a3458', 2: '#2a3458', n: '#232b4a' };
    for (const c of 'roygupw') pal[c] = '#465686';
    return { rows: rowsOf(gen, k), pal };
  }

  return { def, off };
})();
