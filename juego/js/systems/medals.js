/* ============ medals.js — (mod) medallas de cada región ============
 * Sólo del mod (ver docs/IDEAS-COLECCION.md, idea 1 / A).
 *
 *   8 medallas por región, una por cada 10 % que tengas de ella (10 % … 80 %),
 *   con los nombres de sus gimnasios (Alola no tiene: sus cristales Z). Mismo
 *   contador que la afinidad (collection.js): cada shiny cuenta como uno más.
 *     medallas 1-7  → 2 tickets cada una
 *     medalla 8     → 1 ticket ×10 y abre la Liga de la región (league.js)
 *     100 %         → "<región> completa", título "Maestro de <región>"
 *                     (hasta el 16-10-2026 era "Campeón de <región>": ahora
 *                     el campeón es quien vence a la Liga, league.js)
 *
 * Son logros normales (G.AchDefs, pestaña "Medallas"): progress.js los
 * comprueba y da los premios como a los demás. La Pokédex (menu.js) enseña la
 * fila de medallas de la región con dexRow(). La primera vez, quien ya tenía
 * colección recibe de golpe las que le tocan, con un solo aviso (catchUp).
 *
 * Pasaporte (idea E): un sello por región con al menos el 50 % (mismo
 * contador). Cada sello da +2 % de monedas al acabar cada partida
 * (collection.js) y con los 9, el título "Trotamundos". Los sellos son logros
 * de la misma pestaña; la página del pasaporte se abre desde la Pokédex.
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
    [['Medalla Céfiro', 'Zephyr Badge', '#a8d8ff'], ['Medalla Colmena', 'Hive Badge', '#e04848'], ['Medalla Planicie', 'Plain Badge', '#ffb0c8'],
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

  // ---------------- pasaporte ----------------
  // Color de la tinta del sello de cada región.
  const INK = ['#e0303c', '#d8a020', '#3aa860', '#4f78e0', '#5a6070', '#c04aa0', '#ff8a3c', '#9a5ae0', '#e05a7a'];
  const STAMP_TIER = 5;   // el sello, al 50 % (como la 5.ª medalla)

  /** ¿Tiene el sello de la región `gen`? */
  function hasStamp(save, gen) {
    const r = points(save)[gen];
    return r.pts >= goal(r.total, STAMP_TIER);
  }

  /** Sellos del pasaporte (0-9). */
  function stamps(save) {
    let n = 0;
    for (let g = 1; g <= REGIONS.length; g++) if (hasStamp(save, g)) n++;
    return n;
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
                      name: badgeName(g, k), desc: `Ten ${n} Pokémon de ${reg} (${k * 10} %). Los shiny cuentan doble.` + (k === N ? ` Abre la Liga de ${reg}.` : ''),
                      value, goal: n, reward: k < N ? { t1: T1 } : { t10: 1 } });
      }
      D.LIST.push({ id: `champ_${g}`, cat: 'medallas', tier: 3, gen: g, medal: 10,
                    name: `${reg} completa`, desc: `Completa ${reg}: los ${total} Pokémon de la región.`,
                    value, goal: total, reward: {}, title: `Maestro de ${reg}` });
      const ns = goal(total, STAMP_TIER);
      D.LIST.push({ id: `stamp_${g}`, cat: 'medallas', tier: 2, gen: g, medal: 'stamp',
                    name: `Sello de ${reg}`, desc: `Ten el 50 % de ${reg} (${ns} Pokémon). Cada sello del pasaporte da +2 % de monedas al acabar cada partida.`,
                    value, goal: ns, reward: {} });
    }
    D.LIST.push({ id: 'passport', cat: 'medallas', tier: 3, medal: 'passport', name: 'Trotamundos',
                  desc: `Consigue los ${REGIONS.length} sellos del pasaporte.`, value: stamps, goal: REGIONS.length,
                  reward: {}, title: 'Trotamundos' });
    for (const a of D.LIST) D.BY[a.id] = a;

    // Nombres en inglés: van aquí, con la región, porque en español se repiten.
    const en = {};
    BADGES.forEach((list, gi) => list.forEach(([, eng], ki) => { en[badgeName(gi + 1, ki + 1)] = `${eng} (${REGIONS[gi][1]})`; }));
    REGIONS.forEach(([es, eng]) => {
      en[`${es} completa`] = `${eng} complete`;
      en[`Maestro de ${es}`] = `${eng} Master`;
      en[`¡${es} completa!`] = `${eng} complete!`;
    });
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
    // Hasta el 16-10-2026 el 100 % daba "Campeón de <región>" (ahora es de la
    // Liga): quien lo llevaba puesto sin haber vencido a la Liga pasa a Maestro.
    const P = s.profile;
    const old = P && P.title && /^Campeón de (.+)$/.exec(P.title);
    const og = old ? REGIONS.findIndex(r => r[0] === old[1]) + 1 : 0;
    if (og && !s.ach['liga_' + og]) P.title = s.ach['champ_' + og] ? `Maestro de ${old[1]}` : '';
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
    const st = due.filter(a => a.medal === 'stamp').length;
    if (st) parts.push(st === 1 ? '1 sello' : `${st} sellos`);
    const champs = due.filter(a => a.title).length;
    if (champs) parts.push(champs === 1 ? 'nuevo título' : `${champs} títulos nuevos`);
    const m = due.length - st - champs;
    G.UI.toast(`¡${m} medallas por tu colección! ` + parts.join(' · '), 6000);
  }

  // ---------------- iconos ----------------
  // La forma de cada medalla (16×16) está en medal-art.js; sin conseguir, en gris.

  function registerIcons() {
    const UI = G.Icons.UI;
    BADGES.forEach((list, gi) => list.forEach(([, , c], ki) => {
      UI[`badge${gi + 1}_${ki + 1}`] = G.MedalArt.def(gi + 1, ki + 1, c);
      UI[`badge${gi + 1}_${ki + 1}_off`] = G.MedalArt.off(gi + 1, ki + 1);
    }));
    UI.trophyOff = { rows: UI.trophy.rows, pal: { y: '#3a4870', d: '#2a3458', w: '#4a5a88' } };
    INK.forEach((c, gi) => { UI[`stamp${gi + 1}`] = G.MedalArt.stamp(c); UI[`stamp${gi + 1}_off`] = G.MedalArt.stampOff(); });
    UI.passport = G.MedalArt.passport('#2f5aa8');
    UI.passportOff = G.MedalArt.passportOff();
    // El aviso de logro y su carta (progress.js, goals-ui.js) usan icon / iconOff.
    for (const a of G.AchDefs.LIST) {
      if (a.cat !== 'medallas') continue;
      const base = a.medal === 10 ? 'trophy' : a.medal === 'stamp' ? `stamp${a.gen}` : a.medal === 'passport' ? 'passport' : `badge${a.gen}_${a.medal}`;
      a.icon = base;
      a.iconOff = a.medal === 10 || a.medal === 'passport' ? base + 'Off' : base + '_off';
    }
  }

  // ---------------- Pokédex ----------------

  /**
   * Fila de la región `gen`, justo debajo de las pestañas de región, en tres
   * bloques separados (16-10-2026: con todo en una fila, el trofeo del 100 %
   * parecía la 9.ª medalla): Medallas · Liga (league.js) · Colección.
   */
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
               G.Icons.html(`badge${gen}_${k}` + (ok ? '' : '_off'), 32) + '</span>';
    }
    passportButton();
    const next = st.medals < N
      ? `Siguiente: ${badgeName(gen, st.medals + 1)} con ${goal(st.total, st.medals + 1)} Pokémon (tienes ${st.pts}).`
      : `¡Las 8! La Liga de ${reg} está abierta.`;
    const medals = `<div class="dm-sec"><div class="dm-head"><b>Medallas</b> <span class="gold">${st.medals}/${N}</span></div>
      <div class="dm-icons">${icons}</div><small class="dm-next">${next}</small></div>`;

    // Colección: el sello (50 %) y la región completa (100 %), con su nombre debajo.
    const stamp = hasStamp(s, gen);
    const item = (ok, icon, label, n) => `<span class="dm-item${ok ? ' ok' : ''}">${G.Icons.html(icon, 28)}<small>${label}<br>${n} Pokémon</small></span>`;
    const pct = Math.floor(Math.min(1, st.pts / st.total) * 100);
    const coll = `<div class="dm-sec"><div class="dm-head"><b>Colección</b> <span class="gold">${pct} %</span></div>
      <div class="dm-icons">${item(stamp, `stamp${gen}` + (stamp ? '' : '_off'), 'Sello (50 %)', goal(st.total, STAMP_TIER))}${
        item(st.champion, st.champion ? 'trophy' : 'trophyOff', st.champion ? `¡${reg} completa!` : 'Completa (100 %)', st.total)}</div>
      <small class="dm-next">Tienes ${st.pts} de ${st.total} (los shiny cuentan doble).</small></div>`;

    el.innerHTML = medals + (G.League ? G.League.dexBlock(s, gen, st.medals) : '') + coll;
  }

  /** Botón "Pasaporte 4/9" junto al contador de la Pokédex. */
  function passportButton() {
    const total = document.getElementById('dex-total');
    if (!total) return;
    let b = document.getElementById('dex-passport');
    if (!b) {
      b = document.createElement('button');
      b.id = 'dex-passport';
      b.className = 'btn small ghost dm-pp-btn';
      b.onclick = openPassport;
      total.after(b);
    }
    const n = stamps(G.DB.save);
    b.innerHTML = G.Icons.html(n ? 'passport' : 'passportOff', 16) + ` <span>Pasaporte ${n}/${REGIONS.length}</span>`;
  }

  /** La página del pasaporte: los 9 sellos, conseguidos o no. */
  function openPassport() {
    const s = G.DB.save;
    close();
    const n = stamps(s);
    let cells = '';
    for (let g = 1; g <= REGIONS.length; g++) {
      const r = points(s)[g], reg = regionName(g);
      const pct = Math.floor(Math.min(1, r.pts / r.total) * 100);
      if (hasStamp(s, g)) {
        const at = s.ach && s.ach[`stamp_${g}`];
        // Un giro distinto para cada sello, siempre el mismo.
        const rot = ((g * 37) % 17) - 8;
        cells += `<div class="pp-cell"><div class="pp-stamp" style="--c:${INK[g - 1]};--r:${rot}deg">
          ${G.Icons.html(`stamp${g}`, 32)}<b>${reg}</b>${at ? `<small>${new Date(at).toLocaleDateString('es')}</small>` : ''}</div></div>`;
      } else {
        cells += `<div class="pp-cell"><div class="pp-stamp off"><b>${reg}</b><small>${pct} %</small><small>sello al 50 %</small></div></div>`;
      }
    }
    const done = n >= REGIONS.length;
    const ov = document.createElement('div');
    ov.id = 'passport';
    ov.className = 'pp-ov';
    ov.innerHTML = `<div class="box pp-box">
      <div class="row between"><h2>${G.Icons.html('passport', 24)} Pasaporte</h2><button class="btn small ghost" id="pp-close">Cerrar</button></div>
      <p class="sub">Un sello por cada región de la que tengas al menos el 50 % (los shiny cuentan doble).</p>
      <div class="pp-grid">${cells}</div>
      <p class="pp-foot"><b class="gold">Sellos: ${n} de ${REGIONS.length}</b> · +${n * 2} % de monedas al acabar cada partida</p>
      <p class="sub">${done ? '¡Trotamundos! Tienes todos los sellos.' : `Con los ${REGIONS.length} sellos: título "Trotamundos".`}</p></div>`;
    ov.onclick = e => { if (e.target === ov) close(); };
    document.body.appendChild(ov);
    document.getElementById('pp-close').onclick = close;
  }

  function close() {
    const ov = document.getElementById('passport');
    if (ov) ov.remove();
  }

  const CSS = `
    .dex-medals { display: flex; align-items: stretch; gap: 6px; flex-wrap: wrap; margin: 2px 2px 6px; }
    .dex-medals .dm-sec { flex: 1 1 200px; display: flex; flex-direction: column; gap: 3px;
                          padding: 6px 10px; border-radius: 10px; background: rgba(0,0,0,.22); }
    .dex-medals .dm-sec:first-child { flex: 2 1 300px; }
    .dex-medals .dm-head { white-space: nowrap; }
    .dex-medals .dm-icons { display: flex; flex-wrap: wrap; gap: 3px 10px; align-items: center; }
    .dex-medals .dm-b { display: inline-flex; opacity: .75; }
    .dex-medals .dm-b.ok { opacity: 1; filter: drop-shadow(0 0 3px rgba(255,210,63,.45)); }
    .dex-medals .dm-icons:has(.dm-b) { gap: 3px; }
    .dex-medals .dm-item { display: inline-flex; align-items: center; gap: 5px; opacity: .8; }
    .dex-medals .dm-item small { font-size: 11px; line-height: 1.2; color: var(--muted); }
    .dex-medals .dm-item.ok { opacity: 1; }
    .dex-medals .dm-item.ok > :first-child { filter: drop-shadow(0 0 3px rgba(255,210,63,.45)); }
    .dex-medals .dm-item.ok small { color: inherit; }
    .dex-medals .dm-next { color: var(--muted); font-size: 12px; }
    .dm-pp-btn { margin-left: 10px; vertical-align: middle; display: inline-flex; align-items: center; gap: 4px; }
    .pp-ov { position: fixed; inset: 0; z-index: 60; background: rgba(0,0,0,.6); display: flex;
             align-items: center; justify-content: center; padding: 16px; }
    .pp-box { width: min(560px, 100%); max-height: 100%; overflow: auto; }
    .pp-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 10px 0;
               padding: 12px; border-radius: 10px; background: #e9dfc4; }
    .pp-cell { display: flex; align-items: center; justify-content: center; }
    .pp-stamp { width: 100%; max-width: 132px; aspect-ratio: 1; border-radius: 50%; border: 4px double var(--c);
                color: var(--c); display: flex; flex-direction: column; align-items: center; justify-content: center;
                gap: 2px; transform: rotate(var(--r)); text-transform: uppercase; text-align: center; }
    .pp-stamp b { font-size: 14px; }
    .pp-stamp small { font-size: 10px; text-transform: none; }
    .pp-stamp.off { --c: #a89c80; border: 3px dashed #b8ac90; color: #8a7e62; transform: none; }
    .pp-foot { margin: 4px 0 2px; }`;

  function init() {
    register();
    registerIcons();
    const st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);
  }
  init();

  return { count, status, goal, catchUp, dexRow, stamps, hasStamp, openPassport, BADGES, REGIONS };
})();
