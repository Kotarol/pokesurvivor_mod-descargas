/* ============ medals.js — (mod) medallas de cada región ============
 * Sólo del mod (ver docs/IDEAS-COLECCION.md, idea 1 / A).
 *
 *   8 medallas por región, una por cada 10 % que tengas de ella (10 % … 80 %),
 *   con los nombres de sus gimnasios (Alola no tiene: sus cristales Z). Mismo
 *   contador que la afinidad (collection.js): cada shiny cuenta como uno más.
 *     medallas 1-7  → 2 tickets cada una
 *     medalla 8     → 1 ticket ×10 (y, más adelante, abre la Liga de la región)
 *     100 %         → título "Campeón de <región>"
 *
 * Son logros normales (G.AchDefs, pestaña "Medallas"): progress.js los
 * comprueba y da los premios como a los demás. La Pokédex (menu.js) enseña la
 * fila de medallas de la región con dexRow(). La primera vez, quien ya tenía
 * colección recibe de golpe las que le tocan, con un solo aviso (catchUp).
 */
G.Medals = (() => {
  const REGIONS = [
    ['Kanto', 'Kanto'], ['Johto', 'Johto'], ['Hoenn', 'Hoenn'], ['Sinnoh', 'Sinnoh'], ['Teselia', 'Unova'],
    ['Kalos', 'Kalos'], ['Alola', 'Alola'], ['Galar', 'Galar'], ['Paldea', 'Paldea']
  ];
  // [español, inglés, color] de cada medalla, en el orden de los gimnasios.
  const BADGES = [
    [['Medalla Roca', 'Boulder Badge', '#a3a9b3'], ['Medalla Cascada', 'Cascade Badge', '#4fa8ff'], ['Medalla Trueno', 'Thunder Badge', '#ff9a3c'],
     ['Medalla Arcoíris', 'Rainbow Badge', '#5fd6a0'], ['Medalla Alma', 'Soul Badge', '#ff7fb0'], ['Medalla Pantano', 'Marsh Badge', '#ffd23f'],
     ['Medalla Volcán', 'Volcano Badge', '#e0303c'], ['Medalla Tierra', 'Earth Badge', '#4fbf5a']],
    [['Medalla Céfiro', 'Zephyr Badge', '#a8d8ff'], ['Medalla Colmena', 'Hive Badge', '#e0b030'], ['Medalla Planicie', 'Plain Badge', '#ffb0c8'],
     ['Medalla Niebla', 'Fog Badge', '#9a7cd8'], ['Medalla Tormenta', 'Storm Badge', '#c08050'], ['Medalla Mineral', 'Mineral Badge', '#b8c0cc'],
     ['Medalla Glaciar', 'Glacier Badge', '#a0e8ff'], ['Medalla Dragón', 'Rising Badge', '#5060e0']],
    [['Medalla Piedra', 'Stone Badge', '#a08870'], ['Medalla Puño', 'Knuckle Badge', '#e07050'], ['Medalla Dinamo', 'Dynamo Badge', '#ffd23f'],
     ['Medalla Calor', 'Heat Badge', '#ff6030'], ['Medalla Equilibrio', 'Balance Badge', '#e8dcb0'], ['Medalla Pluma', 'Feather Badge', '#80c8ff'],
     ['Medalla Mente', 'Mind Badge', '#ff80c0'], ['Medalla Lluvia', 'Rain Badge', '#4080ff']],
    [['Medalla Lignito', 'Coal Badge', '#8a7a68'], ['Medalla Bosque', 'Forest Badge', '#50b050'], ['Medalla Adoquín', 'Cobble Badge', '#c0a080'],
     ['Medalla Ciénaga', 'Fen Badge', '#6aa0b0'], ['Medalla Reliquia', 'Relic Badge', '#c09040'], ['Medalla Mina', 'Mine Badge', '#a0a8b8'],
     ['Medalla Carámbano', 'Icicle Badge', '#a0e0ff'], ['Medalla Faro', 'Beacon Badge', '#ffd060']],
    [['Medalla Trío', 'Trio Badge', '#ff7050'], ['Medalla Base', 'Basic Badge', '#c0b0a0'], ['Medalla Élitro', 'Insect Badge', '#a0c040'],
     ['Medalla Voltio', 'Bolt Badge', '#ffe040'], ['Medalla Temblor', 'Quake Badge', '#c09050'], ['Medalla Jet', 'Jet Badge', '#80c0ff'],
     ['Medalla Candelizo', 'Freeze Badge', '#b0e8ff'], ['Medalla Leyenda', 'Legend Badge', '#7080ff']],
    [['Medalla Insecto', 'Bug Badge', '#a0c040'], ['Medalla Muro', 'Cliff Badge', '#b09070'], ['Medalla Lid', 'Rumble Badge', '#d06040'],
     ['Medalla Hoja', 'Plant Badge', '#60c060'], ['Medalla Voltaje', 'Voltage Badge', '#ffd040'], ['Medalla Hada', 'Fairy Badge', '#ff90d0'],
     ['Medalla Psique', 'Psychic Badge', '#d070ff'], ['Medalla Iceberg', 'Iceberg Badge', '#80d8ff']],
    // Alola no tiene gimnasios: los cristales Z de sus pruebas.
    [['Normastal Z', 'Normalium Z', '#c8c0b0'], ['Hidrostal Z', 'Waterium Z', '#4f98ff'], ['Pirostal Z', 'Firium Z', '#ff6030'],
     ['Fitostal Z', 'Grassium Z', '#50c050'], ['Electrostal Z', 'Electrium Z', '#ffd040'], ['Espectrostal Z', 'Ghostium Z', '#8a6ad0'],
     ['Feeristal Z', 'Fairium Z', '#ff90d0'], ['Dracostal Z', 'Dragonium Z', '#6a5ae8']],
    // Galar: los gimnasios de Pokémon Espada.
    [['Medalla Planta', 'Grass Badge', '#50c050'], ['Medalla Agua', 'Water Badge', '#4f98ff'], ['Medalla Fuego', 'Fire Badge', '#ff6030'],
     ['Medalla Lucha', 'Fighting Badge', '#d05040'], ['Medalla Hada', 'Fairy Badge', '#ff90d0'], ['Medalla Roca', 'Rock Badge', '#b0a070'],
     ['Medalla Siniestro', 'Dark Badge', '#7a6a8a'], ['Medalla Dragón', 'Dragon Badge', '#6a5ae8']],
    [['Medalla Bicho', 'Bug Badge', '#a0c040'], ['Medalla Planta', 'Grass Badge', '#50c050'], ['Medalla Eléctrico', 'Electric Badge', '#ffd040'],
     ['Medalla Agua', 'Water Badge', '#4f98ff'], ['Medalla Normal', 'Normal Badge', '#c8c0b0'], ['Medalla Fantasma', 'Ghost Badge', '#8a6ad0'],
     ['Medalla Psíquico', 'Psychic Badge', '#ff70a0'], ['Medalla Hielo', 'Ice Badge', '#80d8ff']]
  ];
  const N = 8;          // medallas por región
  const T1 = 2;         // tickets de las medallas 1-7

  const regionName = gen => REGIONS[gen - 1][0];
  // "Medalla Roca (Kanto)": con la región, porque hay nombres repetidos (Roca, Dragón...).
  const badgeName = (gen, k) => `${BADGES[gen - 1][k - 1][0]} (${regionName(gen)})`;

  /** Pokémon de la región que hacen falta para la medalla k (1-8), o para el 100 % (k = 10). */
  function goal(total, k) {
    return Math.ceil(total * k / 10 - 1e-9);
  }

  // Puntos de todas las regiones de una pasada. checkAch mira decenas de
  // medallas seguidas: se calcula una vez y se olvida al acabar esa tarea.
  let memo = null;
  function points(save) {
    if (memo && memo.save === save) return memo.pts;
    const pts = {};
    for (let g = 1; g <= REGIONS.length; g++) pts[g] = G.Collection.region(save, g);
    memo = { save, pts };
    queueMicrotask(() => { memo = null; });
    return pts;
  }

  /** { pts, total, medals (0-8), champion } de la región `gen`. */
  function status(save, gen) {
    const r = points(save)[gen];
    let medals = 0;
    for (let k = 1; k <= N; k++) if (r.pts >= goal(r.total, k)) medals = k;
    return { pts: r.pts, total: r.total, owned: r.owned, shiny: r.shiny, medals, champion: r.pts >= r.total };
  }

  /** Medallas que tienes de la región `gen` (0-8). Para la Liga. */
  function count(save, gen) {
    return save ? status(save, gen).medals : 0;
  }

  // ---------------- logros ----------------

  function register() {
    const D = G.AchDefs;
    const i = D.CATS.findIndex(c => c[0] === 'coleccion');
    D.CATS.splice(i + 1, 0, ['medallas', 'Medallas']);
    for (let g = 1; g <= REGIONS.length; g++) {
      const total = G.DEX.filter(p => p.gen === g).length;
      const reg = regionName(g);
      const value = s => points(s)[g].pts;
      for (let k = 1; k <= N; k++) {
        const n = goal(total, k);
        D.LIST.push({ id: `medal_${g}_${k}`, cat: 'medallas', tier: k < 4 ? 1 : k < N ? 2 : 3, gen: g, medal: k,
                      name: badgeName(g, k), desc: `Ten ${n} Pokémon de ${reg} (${k * 10} %). Los shiny cuentan doble.`,
                      value, goal: n, reward: k < N ? { t1: T1 } : { t10: 1 } });
      }
      D.LIST.push({ id: `champ_${g}`, cat: 'medallas', tier: 3, gen: g, medal: 10,
                    name: `Campeón de ${reg}`, desc: `Completa ${reg}: los ${total} Pokémon de la región.`,
                    value, goal: total, reward: {}, title: `Campeón de ${reg}` });
    }
    for (const a of D.LIST) D.BY[a.id] = a;

    // Nombres en inglés: van aquí, con la región, porque en español se repiten.
    const en = {};
    BADGES.forEach((list, gi) => list.forEach(([, eng], ki) => { en[badgeName(gi + 1, ki + 1)] = `${eng} (${REGIONS[gi][1]})`; }));
    G.I18n.add(en);
  }

  /**
   * La primera vez (o al recuperar una partida vieja) puede haber muchas
   * medallas por dar de golpe: se dan todas con un solo aviso, en vez de un
   * aviso de logro por cada una. Se llama al abrir el menú, antes de checkAch.
   */
  function catchUp() {
    const s = G.DB.save;
    if (!s) return;
    s.ach = s.ach || {};
    const due = G.AchDefs.LIST.filter(a => a.cat === 'medallas' && !s.ach[a.id] && a.value(s) >= a.goal);
    if (due.length < 3) return;           // pocas: con su aviso normal
    const sum = { t1: 0, t10: 0 };
    for (const a of due) {
      s.ach[a.id] = Date.now();
      sum.t1 += a.reward.t1 || 0;
      sum.t10 += a.reward.t10 || 0;
    }
    G.Progress.grant(sum);
    const parts = [];
    if (sum.t1) parts.push(`+${sum.t1} tickets`);
    if (sum.t10) parts.push(`+${sum.t10} ×10`);
    const champs = due.filter(a => a.title).length;
    if (champs) parts.push(champs === 1 ? 'nuevo título' : `${champs} títulos nuevos`);
    G.UI.toast(`¡${due.length} medallas por tu colección! ` + parts.join(' · '), 6000);
  }

  // ---------------- iconos ----------------
  // Una insignia de 12×12 (estilo de icons.js) por medalla, con su color.

  const BADGE_ROWS = ['....kkkk....', '..kkwccckk..', '.kwwcccccdk.', 'kwccccccccdk', 'kwcccsscccdk', 'kcccssssccdk',
                      'kcccssssccdk', 'kccccsscccdk', 'kcccccccdddk', '.kcccccdddk.', '..kkcdddkk..', '....kkkk....'];

  function mix(hex, to, f) {
    const a = parseInt(hex.slice(1), 16), b = parseInt(to.slice(1), 16);
    const ch = sh => Math.round(((a >> sh) & 255) * (1 - f) + ((b >> sh) & 255) * f);
    return '#' + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1);
  }

  function registerIcons() {
    const UI = G.Icons.UI;
    BADGES.forEach((list, gi) => list.forEach(([, , c], ki) => {
      UI[`badge${gi + 1}_${ki + 1}`] = { rows: BADGE_ROWS,
        pal: { c, d: mix(c, '#000000', 0.35), w: mix(c, '#ffffff', 0.55), s: mix(c, '#ffffff', 0.3) } };
    }));
    UI.badgeOff = { rows: BADGE_ROWS, pal: { c: '#3a4870', d: '#2a3458', w: '#4a5a88', s: '#3f4e7c' } };
    UI.trophyOff = { rows: UI.trophy.rows, pal: { y: '#3a4870', d: '#2a3458', w: '#4a5a88' } };
  }

  // ---------------- Pokédex ----------------

  /** Fila de medallas de la región `gen`, justo debajo de las pestañas de región. */
  function dexRow(after, gen) {
    const s = G.DB.save;
    let el = document.getElementById('dex-medals');
    if (!el) {
      el = document.createElement('div');
      el.id = 'dex-medals';
      el.className = 'dex-medals';
      after.after(el);
    }
    const st = status(s, gen);
    const reg = regionName(gen);
    let icons = '';
    for (let k = 1; k <= N; k++) {
      const ok = st.medals >= k;
      icons += `<span class="dm-b${ok ? ' ok' : ''}" title="${badgeName(gen, k)} · ${goal(st.total, k)}">` +
               G.Icons.html(ok ? `badge${gen}_${k}` : 'badgeOff', 24) + '</span>';
    }
    icons += `<span class="dm-b dm-champ${st.champion ? ' ok' : ''}" title="Campeón de ${reg} · ${st.total}">` +
             G.Icons.html(st.champion ? 'trophy' : 'trophyOff', 24) + '</span>';

    let next;
    if (st.champion) next = `<b class="gold">Campeón de ${reg}</b>`;
    else if (st.medals < N) next = `<span>Siguiente: ${badgeName(gen, st.medals + 1)} con ${goal(st.total, st.medals + 1)} Pokémon (tienes ${st.pts}).</span>`;
    else next = `<span>Completa ${reg} para ser Campeón: ${st.pts} de ${st.total}.</span>`;

    el.innerHTML = `<div class="dm-head"><b>Medallas</b> <span class="gold">${st.medals}/${N}</span></div>
      <div class="dm-icons">${icons}</div><small class="dm-next">${next}</small>`;
  }

  const CSS = `
    .dex-medals { display: flex; align-items: center; gap: 4px 12px; flex-wrap: wrap; margin: 2px 2px 6px;
                  padding: 6px 10px; border-radius: 10px; background: rgba(0,0,0,.22); }
    .dex-medals .dm-head { white-space: nowrap; }
    .dex-medals .dm-icons { display: flex; gap: 3px; }
    .dex-medals .dm-b { display: inline-flex; opacity: .75; }
    .dex-medals .dm-b.ok { opacity: 1; filter: drop-shadow(0 0 3px rgba(255,210,63,.45)); }
    .dex-medals .dm-champ { margin-left: 4px; }
    .dex-medals .dm-next { color: var(--muted); font-size: 12px; }`;

  function init() {
    register();
    registerIcons();
    const st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);
  }
  init();

  return { count, status, goal, catchUp, dexRow, BADGES, REGIONS };
})();
