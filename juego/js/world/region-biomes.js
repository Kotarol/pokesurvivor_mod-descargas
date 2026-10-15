/* ============ region-biomes.js — (mod) biomas y adornos de cada región ============
 * Sólo del mod (ver systems/maps.js). En el mapa de una región la partida va
 * turnando sus 3 biomas, cada 4 min, en lugar de los de siempre. Cada uno es
 * un lugar de esa región hecho con las piezas de tiles.js: paleta, líquido
 * (water, swamp, lava, poison, spark, ice), adorno y clima.
 *
 *   floor, wall, liq ...  colores, como las arenas de las grietas (tiles.js,
 *                         ARENA_THEMES): el resto de la paleta sale de ellos
 *   prop                  adorno en lugar del árbol: tree, crystal, dead o
 *                         el propio de la región (pintado aquí abajo)
 *   weatherW              probabilidad de cada clima (systems/weather.js)
 *
 * Cada región tiene UN adorno propio, pintado píxel a píxel como los de
 * tiles.js (PAINT), que sale en uno de sus biomas. Se engancha con dos
 * líneas de tiles.js (PAINT y kit, y el árbol usa PAINT[B.prop]).
 */
G.RegionBiomes = (() => {
  const { Pix, pack, disc, outline, H, palette } = G.Tiles.kit;
  const PAINT = G.Tiles.PAINT;

  // [nombre, inglés, tema]. Nombres oficiales de los juegos (WikiDex).
  const REGIONS = [
    // Kanto
    [['Bosque Verde', 'Viridian Forest', { floor: '#3f7d3a', wall: '#5b6e45', liquid: 'water', liq: '#3f86c8', prop: 'cutbush',
        leaf: '#3f9a3a', trunk: '#6b4a2a', flowers: ['#f4d65c', '#ff8a8a', '#ffffff'], grass: '#4c9a3f', rock: '#7a8070',
        weatherW: { rain: 3, sun: 1.5, fog: 1 } }],
     ['Mt. Moon', 'Mt. Moon', { floor: '#6a6478', wall: '#4a4458', liquid: 'water', liq: '#4a7ab0', prop: 'crystal',
        leaf: '#e8e0ff', trunk: '#5a5470', flowers: ['#ffffff', '#c9b8ff', '#ffe9a0'], grass: '#7a7090', rock: '#8a8498',
        weatherW: { fog: 3, sand: 1 } }],
     ['Isla Canela', 'Cinnabar Island', { floor: '#8a6a50', wall: '#5a4038', liquid: 'lava', liq: '#e45a1f', foam: '#ffd46a', prop: 'dead',
        leaf: '#6a5040', trunk: '#4a3428', flowers: ['#ff8d3d', '#ffc45e', '#e06a4a'], grass: '#a07a50', rock: '#7a6458',
        weatherW: { sun: 4, sand: 1 } }]],
    // Johto
    [['Bosque Encina', 'Ilex Forest', { floor: '#2f6232', wall: '#46583a', liquid: 'water', liq: '#356f9a', prop: 'tree',
        leaf: '#2f7a35', trunk: '#4a3020', flowers: ['#ffffff', '#c9e86a', '#f4d65c'], grass: '#3a7a35', rock: '#666e5e',
        weatherW: { fog: 3, rain: 2 } }],
     ['Ciudad Iris', 'Ecruteak City', { floor: '#8a6a44', wall: '#6a4a3a', liquid: 'water', liq: '#4f7fb0', prop: 'lantern',
        leaf: '#d0603a', trunk: '#5a3a28', flowers: ['#e0503a', '#f0a040', '#ffd23f'], grass: '#b07a3a', rock: '#8e887c',
        weatherW: { fog: 2, rain: 1, sun: 1 } }],
     ['Monte Plateado', 'Mt. Silver', { floor: '#c8d4e0', wall: '#8a96a8', liquid: 'ice', liq: '#a8d8ee', foam: '#ffffff', prop: 'crystal',
        leaf: '#d8f0ff', trunk: '#7890a8', flowers: ['#ffffff', '#bfe0ff', '#e0e8f0'], grass: '#a8b8c8', rock: '#9aa4b0',
        weatherW: { snow: 5, fog: 1 } }]],
    // Hoenn
    [['Ruta 119', 'Route 119', { floor: '#3a7a3a', wall: '#4a6a3a', liquid: 'swamp', liq: '#3f6a4a', foam: '#9ad08a', prop: 'tropical',
        leaf: '#2f9a4a', trunk: '#7a5a3a', flowers: ['#ff5f8a', '#ffd23f', '#ff8a3d'], grass: '#3f9a3f', rock: '#6a7a6a',
        weatherW: { rain: 6, fog: 1 } }],
     ['Cascada Meteoro', 'Meteor Falls', { floor: '#5a5468', wall: '#3e3850', liquid: 'water', liq: '#3a8ac8', prop: 'crystal',
        leaf: '#9ad0ff', trunk: '#3a4a78', flowers: ['#8fe3ff', '#c9a6ff', '#ffffff'], grass: '#5a6a90', rock: '#6a6480',
        weatherW: { fog: 2, rain: 1 } }],
     ['Monte Cenizo', 'Mt. Chimney', { floor: '#6a5a54', wall: '#3a3230', liquid: 'lava', liq: '#e4601f', foam: '#ffd46a', prop: 'dead',
        leaf: '#5a5050', trunk: '#3a3030', flowers: ['#ff6a3d', '#c0b8b0', '#ffc45e'], grass: '#8a8078', rock: '#6a605c',
        weatherW: { sun: 3, sand: 3 } }]],
    // Sinnoh
    [['Bosque Vetusta', 'Eterna Forest', { floor: '#2e5a3a', wall: '#40553a', liquid: 'water', liq: '#2f6a8a', prop: 'tree',
        leaf: '#2a6a3a', trunk: '#4a3424', flowers: ['#c9a6ff', '#ffffff', '#9ad0ff'], grass: '#3a6a40', rock: '#5e6a62',
        weatherW: { fog: 4, rain: 1 } }],
     ['Monte Corona', 'Mt. Coronet', { floor: '#6e6a74', wall: '#4a4652', liquid: 'water', liq: '#4a7ab0', prop: 'crystal',
        leaf: '#c0d0ff', trunk: '#4a4a70', flowers: ['#ffffff', '#a0c0ff', '#ffd8a0'], grass: '#7a7a88', rock: '#8a8694',
        weatherW: { fog: 2, snow: 2 } }],
     ['Ruta 216', 'Route 216', { floor: '#dfe8f2', wall: '#9aaac0', liquid: 'ice', liq: '#a8dcf2', foam: '#ffffff', prop: 'snowfir',
        leaf: '#2f5a48', trunk: '#5a4030', flowers: ['#ffffff', '#d8f1ff', '#bfe0ff'], grass: '#b8c8d8', rock: '#a0acbc',
        weatherW: { snow: 8 } }]],
    // Teselia
    [['Ciudad Porcelana', 'Castelia City', { floor: '#7a7a80', wall: '#5a6070', liquid: 'water', liq: '#3a7ac0', prop: 'lamp',
        leaf: '#ffe9a0', trunk: '#3a3e48', flowers: ['#ffd23f', '#ff5f6d', '#7fd0ff'], grass: '#5a8a4a', rock: '#80848c',
        weatherW: { rain: 3, fog: 1 } }],
     ['Zona Desierto', 'Desert Resort', { floor: '#c8a468', wall: '#9a7444', liquid: 'swamp', liq: '#a88a58', foam: '#e0c898', prop: 'dead',
        leaf: '#9a7a4a', trunk: '#7a5a34', flowers: ['#e06a4a', '#f4d65c', '#ffffff'], grass: '#b8985a', rock: '#a8885e',
        weatherW: { sand: 6, sun: 2 } }],
     ['Cueva Electrorroca', 'Chargestone Cave', { floor: '#4a4e5e', wall: '#34384a', liquid: 'spark', liq: '#e8c020', foam: '#fff6c0', prop: 'crystal',
        leaf: '#7fd0ff', trunk: '#3a4a6a', flowers: ['#ffe14d', '#7fd0ff', '#ffffff'], grass: '#5a6a7a', rock: '#6a6e80',
        weatherW: { fog: 1, rain: 1 } }]],
    // Kalos
    [['Bosque de Novarte', 'Santalune Forest', { floor: '#4a8a46', wall: '#5a7048', liquid: 'water', liq: '#4f90d0', prop: 'tree',
        leaf: '#4aa04a', trunk: '#6a4a30', flowers: ['#ffd23f', '#ff9ec4', '#ffffff'], grass: '#5aaa4a', rock: '#7a8270',
        weatherW: { sun: 2, rain: 2 } }],
     ['Ciudad Luminalia', 'Lumiose City', { floor: '#8a8070', wall: '#6a6070', liquid: 'water', liq: '#4f8fd0', prop: 'flowerbed',
        leaf: '#3a8a3a', trunk: '#b0a080', flowers: ['#ff5f8a', '#ffd23f', '#c9a6ff'], grass: '#6a9a50', rock: '#9a9088',
        weatherW: { sun: 1, rain: 2, fog: 1 } }],
     ['Cueva de los Reflejos', 'Reflection Cave', { floor: '#7a8aa0', wall: '#5a6a88', liquid: 'water', liq: '#6ab0e0', prop: 'crystal',
        leaf: '#e8f4ff', trunk: '#7a90b8', flowers: ['#ffffff', '#c8e8ff', '#e0d0ff'], grass: '#8aa0c0', rock: '#a0b0c8',
        weatherW: { fog: 3 } }]],
    // Alola
    [['Playa de Hanohano', 'Hano Beach', { floor: '#e2c890', wall: '#b89a68', liquid: 'water', liq: '#2fb0d8', foam: '#e8fbff', prop: 'palm',
        leaf: '#3aaa4a', trunk: '#9a7448', flowers: ['#ff5f8a', '#ffffff', '#ffd23f'], grass: '#7ab84a', rock: '#b8a080',
        weatherW: { sun: 5, rain: 1 } }],
     ['Jungla Umbría', 'Lush Jungle', { floor: '#2f6a34', wall: '#3a5a30', liquid: 'swamp', liq: '#3a6a3a', foam: '#8ac06a', prop: 'tree',
        leaf: '#2aa040', trunk: '#5a3a22', flowers: ['#ff5f6d', '#ffd23f', '#ff8ad8'], grass: '#3aa040', rock: '#5a7058',
        weatherW: { rain: 5, fog: 1 } }],
     ['Área Volcánica del Wela', 'Wela Volcano Park', { floor: '#6a4a3a', wall: '#4a3028', liquid: 'lava', liq: '#e45a1f', foam: '#ffd46a', prop: 'dead',
        leaf: '#6a4a38', trunk: '#40281e', flowers: ['#ff8d3d', '#ffd46a', '#ff5f3d'], grass: '#8a5a3a', rock: '#7a5a4a',
        weatherW: { sun: 5 } }]],
    // Galar
    [['Área Silvestre', 'Wild Area', { floor: '#5a7a48', wall: '#6a6a5a', liquid: 'water', liq: '#4a7aa0', prop: 'stones',
        leaf: '#5a8a4a', trunk: '#5a4a3a', flowers: ['#b08ad0', '#f4d65c', '#ffffff'], grass: '#7a9050', rock: '#8e8e86',
        weatherW: { rain: 5, fog: 2, sun: 0.5 } }],
     ['Bosque Lumirinto', 'Glimwood Tangle', { floor: '#2a2a4a', wall: '#3a2a50', liquid: 'poison', liq: '#6a4ab0', foam: '#c9a6ff', prop: 'crystal',
        leaf: '#7af0e0', trunk: '#3a3a6a', flowers: ['#7af0e0', '#ff8ad8', '#c9a6ff'], grass: '#4a4a7a', rock: '#5a5470',
        weatherW: { fog: 5 } }],
     ['Ruta 10', 'Route 10', { floor: '#d8e2ec', wall: '#8a98aa', liquid: 'ice', liq: '#b0dcf0', foam: '#ffffff', prop: 'tree',
        leaf: '#e8f2ff', trunk: '#6a5a4a', flowers: ['#ffffff', '#d8f1ff', '#ffd8e8'], grass: '#b0c0d0', rock: '#a0aab8',
        weatherW: { snow: 6 } }]],
    // Paldea
    [['Desierto Rostiz', 'Asado Desert', { floor: '#d8b070', wall: '#b07a48', liquid: 'swamp', liq: '#b89060', foam: '#e8d0a0', prop: 'cactus',
        leaf: '#4a9a4a', trunk: '#2f6a34', flowers: ['#ff5f8a', '#ffd23f', '#ffffff'], grass: '#c8a060', rock: '#b8906a',
        weatherW: { sand: 5, sun: 3 } }],
     ['Gran Cráter de Paldea', 'Great Crater of Paldea', { floor: '#3a5a4a', wall: '#2a3a48', liquid: 'water', liq: '#4ac0d0', prop: 'crystal',
        leaf: '#7af0ff', trunk: '#3a5a7a', flowers: ['#7af0ff', '#ff8ad8', '#ffd23f'], grass: '#4a7a5a', rock: '#5a6a70',
        weatherW: { fog: 3, rain: 1 } }],
     ['Sierra Napada', 'Glaseado Mountain', { floor: '#d4e2ee', wall: '#8498b0', liquid: 'ice', liq: '#a8d8f0', foam: '#ffffff', prop: 'crystal',
        leaf: '#bfe8ff', trunk: '#6f8fb0', flowers: ['#ffffff', '#cfe8ff', '#ffe0c0'], grass: '#b0c0d0', rock: '#a0aab8',
        weatherW: { snow: 6 } }]]
  ];

  // Los 27 biomas, al final de G.Tiles.BIOMES (después de las arenas).
  const index = {};               // gen -> [3 índices]
  REGIONS.forEach((list, gi) => {
    index[gi + 1] = list.map(([name, , th]) => {
      const b = palette(Object.assign({ name }, th));
      b.name = name;
      b.weatherW = th.weatherW;
      G.Tiles.BIOMES.push(b);
      return G.Tiles.BIOMES.length - 1;
    });
  });

  // ---------------- adornos (en lugar del árbol, como el cristal o el árbol muerto) ----------------

  const P_ = h => pack(h);
  /** Luz de arriba a la izquierda en un disco (0 oscuro … 3 claro). */
  const lit = (x, y, cx, cy, r) => { const l = ((x - cx) * -0.6 + (y - cy) * -0.8) / r; return l > 0.45 ? 3 : l > 0.05 ? 2 : l > -0.45 ? 1 : 0; };

  /** Kanto: el arbolito que se corta con Corte. Copa redonda y achatada, tronco corto. */
  PAINT.cutbush = B => {
    const P = Pix(24, 26);
    const L = B.leaf.map(P_), Tr = B.trunk.map(P_);
    for (let y = 19; y < 25; y++) for (let x = 10; x < 14; x++) P.set(x, y, Tr[x === 10 ? 0 : 1]);
    P.set(9, 24, Tr[0]); P.set(14, 24, Tr[0]);
    for (const [bx, by, br] of [[12, 12, 8.5], [6, 15, 5], [18, 15, 5], [12, 6, 5.5]]) {
      disc(P, bx, by, br, (x, y) => L[lit(x, y, bx, by, br)]);
    }
    // Hojas en forma de "v" (el dibujo de los árboles de Corte).
    for (const [x, y] of [[8, 9], [14, 8], [11, 13], [17, 12], [6, 16], [13, 17], [10, 5]]) {
      P.set(x, y, L[3]); P.set(x + 2, y, L[3]); P.set(x + 1, y + 1, L[3]);
    }
    for (const [x, y] of [[9, 4], [10, 3], [6, 9], [5, 11]]) P.set(x, y, L[3]);
    outline(P, P_('#14200f'));
    return P.canvas();
  };

  /** Johto: farolillo de piedra (tōrō) con la luz encendida. */
  PAINT.lantern = B => {
    const P = Pix(20, 36);
    const R = B.rock.map(P_);
    const glow = P_('#ffb347'), core = P_('#ffe9a0'), dark = P_('#3a2a22');
    const row = (y, x0, x1, c) => { for (let x = x0; x <= x1; x++) P.set(x, y, c(x)); };
    const stone = x0 => x => R[x === x0 ? 2 : 1];
    for (let y = 31; y <= 34; y++) row(y, 3, 16, x => R[y === 31 ? 2 : y === 34 ? 0 : x < 6 ? 2 : 1]);   // base
    for (let y = 27; y <= 30; y++) row(y, 6, 13, stone(6));                                           // peana
    for (let y = 19; y <= 26; y++) row(y, 8, 11, x => R[x === 8 ? 2 : x === 11 ? 0 : 1]);            // fuste
    for (let y = 16; y <= 18; y++) row(y, 4, 15, x => R[y === 16 ? 2 : y === 18 ? 0 : 1]);           // repisa
    for (let y = 10; y <= 15; y++) row(y, 5, 14, x => R[x === 5 ? 2 : x >= 13 ? 0 : 1]);            // caja de la luz
    for (let y = 11; y <= 14; y++) for (let x = 7; x <= 12; x++) P.set(x, y, (x === 9 || x === 10) && y < 14 ? core : glow);
    P.set(9, 11, dark); P.set(10, 11, dark);                                                          // rejilla
    // Tejado curvo, con las puntas hacia arriba.
    row(9, 2, 17, x => R[x < 6 ? 2 : 0]);
    row(8, 3, 16, x => R[x < 8 ? 2 : 1]);
    row(7, 5, 14, x => R[x < 9 ? 2 : 1]);
    row(6, 7, 12, x => R[2]);
    P.set(1, 8, R[2]); P.set(18, 8, R[0]);
    row(5, 9, 10, () => R[1]); row(4, 9, 10, () => R[2]); row(3, 9, 10, () => R[1]);              // remate
    outline(P, P_('#16120e'));
    return P.canvas();
  };

  /** Hoenn: árbol tropical de copa ancha, con lianas y flores. */
  PAINT.tropical = B => {
    const P = Pix(36, 42);
    const L = B.leaf.map(P_), Tr = B.trunk.map(P_);
    const flower = P_(B.flowers[0]), vine = L[1];
    // Tronco con raíces.
    for (let y = 18; y < 40; y++) for (let x = 15; x < 20; x++) P.set(x, y, Tr[x === 15 || (x === 19 && y % 4 === 0) ? 0 : 1]);
    [[13, 39], [14, 38], [20, 38], [21, 39], [12, 40], [22, 40]].forEach(([x, y]) => P.set(x, y, Tr[0]));
    // Copa en sombrilla: discos achatados.
    for (const [bx, by, rx, ry] of [[18, 13, 16, 7], [10, 11, 8, 5], [26, 11, 8, 5], [18, 7, 10, 5]]) {
      for (let y = Math.floor(by - ry); y <= by + ry; y++) for (let x = Math.floor(bx - rx); x <= bx + rx; x++) {
        const d = ((x - bx) / rx) ** 2 + ((y - by) / ry) ** 2;
        if (d > 1) continue;
        const l = ((x - bx) / rx) * -0.5 + ((y - by) / ry) * -0.9;
        P.set(x, y, L[l > 0.5 ? 3 : l > 0 ? 2 : l > -0.5 ? 1 : 0]);
      }
    }
    // Hojas grandes que cuelgan por el borde.
    for (const x of [4, 9, 25, 30]) for (let i = 0; i < 4; i++) P.set(x + (i > 1 ? 1 : 0), 17 + i, L[1]);
    // Lianas y flores.
    for (const [x, len] of [[8, 9], [12, 6], [23, 8], [28, 10]]) for (let i = 0; i < len; i++) P.set(x + (i % 3 === 2 ? 1 : 0), 16 + i, vine);
    for (const [x, y] of [[8, 25], [28, 26], [12, 22], [6, 12], [29, 9], [17, 4], [21, 15]]) {
      P.set(x, y, flower); P.set(x + 1, y, flower); P.set(x, y + 1, flower);
    }
    outline(P, P_('#0f1d10'));
    return P.canvas();
  };

  /** Sinnoh: abeto cargado de nieve. */
  PAINT.snowfir = B => {
    const P = Pix(28, 44);
    const L = B.leaf.map(P_), Tr = B.trunk.map(P_);
    const snow = P_('#ffffff'), snowD = P_('#cfe0f0');
    for (let y = 37; y < 43; y++) for (let x = 12; x < 16; x++) P.set(x, y, Tr[x === 12 ? 0 : 1]);
    // Cuatro pisos de ramas, cada uno más ancho; se pintan de abajo arriba, así
    // cada piso tapa la base del de debajo y se ve la nieve del borde de cada uno.
    const tiers = [[23, 37, 13], [16, 29, 11], [9, 21, 9], [2, 13, 6]];
    for (const [top, bot, hw] of tiers) {
      for (let y = top; y <= bot; y++) {
        const w = Math.round(hw * (y - top + 1) / (bot - top + 1));
        for (let x = 14 - w; x <= 13 + w; x++) {
          const side = (x - 13.5) / Math.max(1, w);
          let c = L[side < -0.4 ? 2 : side < 0.3 ? 1 : 0];
          if (x === 14 - w && y < bot - 1) c = snowD;                     // nieve en la ladera izquierda
          if (y >= bot - 1 && (y === bot - 1 || (x + Math.floor(x / 3)) % 3)) c = side > 0.5 ? snowD : snow;   // borde nevado, con goterones
          else if (H(x, y, 211) < 0.05) c = snow;
          P.set(x, y, c);
        }
      }
    }
    for (const [x, y] of [[13, 1], [14, 1], [13, 2], [14, 2], [12, 3], [15, 3]]) P.set(x, y, snow);   // copete
    outline(P, P_('#0e1a1c'));
    return P.canvas();
  };

  /** Teselia: farola de la ciudad, encendida. */
  PAINT.lamp = B => {
    const P = Pix(16, 42);
    const Tr = B.trunk.map(P_), Lt = B.leaf.map(P_);
    const metal = P_('#6a7280');
    for (let y = 10; y < 38; y++) { P.set(7, y, Tr[1]); P.set(8, y, Tr[0]); }
    for (let y = 37; y < 41; y++) for (let x = 4; x < 12; x++) P.set(x, y, y === 37 ? metal : Tr[x < 6 ? 1 : 0]);
    for (let x = 6; x < 10; x++) { P.set(x, 22, metal); P.set(x, 30, metal); }      // anillas del poste
    // Cabeza: tejadillo, cristal iluminado y base.
    for (let x = 3; x < 13; x++) P.set(x, 2, Tr[0]);
    for (let x = 2; x < 14; x++) P.set(x, 3, Tr[1]);
    for (let y = 4; y < 9; y++) for (let x = 3; x < 13; x++) {
      const edge = x === 3 || x === 12;
      P.set(x, y, edge ? Tr[0] : y < 6 && x > 4 && x < 11 ? Lt[3] : Lt[2]);
    }
    for (let x = 4; x < 12; x++) P.set(x, 9, Tr[0]);
    P.set(7, 1, metal); P.set(8, 1, metal);
    outline(P, P_('#101216'));
    // Halo de la luz (sin contorno).
    const halo = pack('#fff3b0', 90);
    for (const [x, y] of [[1, 5], [1, 6], [14, 5], [14, 6], [5, 10], [10, 10]]) if (!(P.get(x, y) >>> 24)) P.set(x, y, halo);
    return P.canvas();
  };

  /** Kalos: parterre de flores en una jardinera de piedra. */
  PAINT.flowerbed = B => {
    const P = Pix(32, 20);
    const S = [P_('#7a7060'), P_(B.trunk[1]), P_('#e0d6c0')], L = B.leaf.map(P_);
    const F = B.flowers.map(P_), soil = P_('#4a3426');
    for (let y = 10; y < 19; y++) for (let x = 1; x < 31; x++) {
      let c = y === 10 ? S[2] : y >= 17 ? S[0] : S[1];
      if (x === 1 || x === 30) c = S[0];
      if (y > 11 && y < 17 && (x === 8 || x === 16 || x === 24)) c = S[0];   // juntas de las losas
      P.set(x, y, c);
    }
    for (let x = 2; x < 30; x++) P.set(x, 9, soil);
    // Matas de hojas y flores encima, en tres colores.
    for (let i = 0; i < 9; i++) {
      const cx = 3 + i * 3.2, cy = 6 + (i % 2);
      disc(P, cx, cy, 2.6, (x, y) => L[lit(x, y, cx, cy, 2.6)]);
    }
    for (let i = 0; i < 13; i++) {
      const x = 2 + Math.floor(i * 2.2 + H(i, 3, 221) * 1.5), y = 3 + Math.floor(H(i, 5, 222) * 4);
      const c = F[i % F.length];
      P.set(x, y, c); P.set(x + 1, y, c); P.set(x, y + 1, c); P.set(x + 1, y + 1, P_('#ffffff'));
    }
    outline(P, P_('#1c1612'));
    return P.canvas();
  };

  /** Alola: palmera con cocos. */
  PAINT.palm = B => {
    const P = Pix(36, 48);
    const L = B.leaf.map(P_), Tr = B.trunk.map(P_);
    const coco = P_('#6b4422'), cocoL = P_('#8e5e30');
    // Tronco curvado, a anillos.
    for (let y = 12; y < 47; y++) {
      const t = (47 - y) / 35, cx = 11 + Math.round(Math.sin(t * 1.4) * 8);
      for (let x = cx - 1; x <= cx + 2; x++) P.set(x, y, (y % 3 === 0) ? Tr[0] : x === cx - 1 ? Tr[0] : Tr[1]);
    }
    const hx = 19, hy = 11;
    // Hojas: arcos largos que caen, con foliolos.
    const fronds = [[-1, -0.55], [-1, 0.15], [-0.45, -1], [0.45, -1], [1, -0.5], [1, 0.2], [-0.15, -0.9]];
    for (const [dx, dy] of fronds) {
      const len = 15;
      for (let i = 0; i <= len; i++) {
        const k = i / len;
        const x = Math.round(hx + dx * i), y = Math.round(hy + dy * i * 0.7 + k * k * 9);
        P.set(x, y, L[1]); P.set(x, y - 1, L[2]);
        if (i > 2 && i % 2 === 0) { P.set(x, y + 1, L[0]); P.set(x, y + 2, L[0]); P.set(x + (dx > 0 ? -1 : 1), y - 2, L[3]); }
      }
    }
    disc(P, hx, hy, 2.5, (x, y) => L[lit(x, y, hx, hy, 2.5)]);
    for (const [x, y] of [[17, 14], [20, 15], [22, 13]]) disc(P, x, y, 1.6, (xx, yy) => (xx + yy) % 3 ? coco : cocoL);
    outline(P, P_('#13200f'));
    return P.canvas();
  };

  /** Galar: círculo de piedras en el páramo. */
  PAINT.stones = B => {
    const P = Pix(36, 28);
    const R = B.rock.map(P_), moss = P_(B.leaf[1]), mossL = P_(B.leaf[2]);
    const stone = (x0, y0, w, h) => {
      for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
        if ((y === y0 && (x === x0 || x === x0 + w - 1))) continue;          // esquinas redondeadas
        let c = R[x === x0 ? 2 : x >= x0 + w - 2 ? 0 : 1];
        if (y === y0) c = R[2];
        if (y > y0 + h - 4 && H(x, y, 231) < 0.45) c = H(x, y, 232) < 0.5 ? moss : mossL;   // musgo abajo
        else if (H(x, y, 233) < 0.06) c = R[0];
        P.set(x, y, c);
      }
    };
    // Detrás, un trilito (dos piedras con otra encima); delante, piedras sueltas
    // más bajas, cerrando el círculo.
    stone(10, 5, 5, 15); stone(21, 5, 5, 15);
    for (let y = 1; y < 5; y++) for (let x = 9; x < 27; x++) P.set(x, y, y === 1 ? R[2] : y === 4 ? R[0] : x < 11 ? R[2] : R[1]);
    stone(1, 10, 6, 16); stone(29, 12, 6, 14); stone(15, 16, 6, 11);
    outline(P, P_('#15171a'));
    return P.canvas();
  };

  /** Paldea: cactus del desierto con flor. */
  PAINT.cactus = B => {
    const P = Pix(26, 38);
    const L = B.leaf.map(P_), spine = P_('#fff8d8'), fl = P_(B.flowers[0]), flC = P_(B.flowers[1]);
    const col = (x0, x1, y0, y1) => {
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        if (y === y0 && (x === x0 || x === x1)) continue;
        const k = (x - x0) / Math.max(1, x1 - x0);
        let c = L[k < 0.25 ? 3 : k < 0.6 ? 2 : k < 0.85 ? 1 : 0];
        if ((x - x0) % 2 === 1 && k > 0.2 && k < 0.85 && y % 2) c = L[1];   // costillas
        P.set(x, y, c);
      }
    };
    col(10, 15, 4, 36);                     // tronco
    col(3, 7, 9, 20); col(3, 9, 19, 22);    // brazo izquierdo
    col(18, 22, 6, 17); col(15, 22, 16, 19);// brazo derecho
    for (let i = 0; i < 16; i++) {
      const x = [4, 6, 11, 13, 14, 19, 21, 12, 10, 15, 20, 5, 12, 14, 11, 21][i], y = [11, 15, 8, 12, 18, 9, 13, 22, 26, 29, 7, 18, 32, 24, 15, 15][i];
      P.set(x, y, spine);
    }
    for (const [x, y] of [[12, 2], [13, 2], [11, 3], [14, 3], [12, 1]]) P.set(x, y, fl);
    P.set(12, 3, flC); P.set(13, 3, flC);
    outline(P, P_('#14200f'));
    return P.canvas();
  };

  return {
    REGIONS,
    /** Índices de G.Tiles.BIOMES de una región (o null). */
    of: gen => index[gen] || null,
    /** Nombres de sus 3 lugares. */
    names: gen => (REGIONS[gen - 1] || []).map(r => r[0])
  };
})();
