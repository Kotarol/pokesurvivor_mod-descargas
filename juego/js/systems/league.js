/* ============ league.js — (mod) la Liga en las grietas ============
 * Sólo del mod (ver docs/IDEAS-COLECCION.md, idea 7).
 *
 *   Desde el minuto 10, la primera grieta en la que entras trae al as de un
 *   miembro del Alto Mando (uno al azar) de la región de tu compañero; desde
 *   el 20, la primera trae al as del campeón (si aún no habías entrado en
 *   ninguna desde el 10, el Alto Mando se lo salta). Arena del tipo del as.
 *   Sólo con las 8 medallas de esa región (medals.js); si faltan, la grieta es
 *   normal y sale un aviso con las que faltan.
 *
 *   Premio como una grieta normal (el as es "legendario" para el botín); el
 *   campeón suelta además un ticket ×10 seguro. Vencer al campeón da, una vez
 *   por región, el logro "Vence a la Liga de <región>" (pestaña "Liga").
 *   No cuenta para los logros de legendarios (ni "Vence a X" ni los contadores).
 *
 * Nada se guarda entre partidas (salvo el logro, en save.ach 'ligaw_<gen>':
 * así se junta sin perder nada al sincronizar o importar una copia).
 *
 * Cooperativo: lo decide el anfitrión (su región y sus medallas). La arena va
 * a todos con cfg.league, y así nadie apunta al as como legendario.
 *
 * Se engancha en rift.js (pick al elegir el rival, spawned al aparecer) y
 * envuelve G.Progress.kill y G.Rift.reset.
 */
G.League = (() => {
  const AT_E4 = 10 * 60, AT_CHAMP = 20 * 60;
  const N_MEDALS = 8;
  // Por región: [nombre, inglés, dex del as, tipo de la arena]. El campeón, el último.
  // (Toucannon y Flamigo no están en el juego: Kahili lleva a Skarmory y Laureano, a Staraptor.)
  const LEAGUES = [
    [['Lorelei', 'Lorelei', 131, 'ice'], ['Bruno', 'Bruno', 68, 'fighting'], ['Agatha', 'Agatha', 94, 'ghost'], ['Lance', 'Lance', 149, 'dragon'],
     ['Azul', 'Blue', 18, 'flying']],
    [['Mento', 'Will', 178, 'psychic'], ['Koga', 'Koga', 169, 'poison'], ['Bruno', 'Bruno', 68, 'fighting'], ['Karen', 'Karen', 229, 'dark'],
     ['Lance', 'Lance', 149, 'dragon']],
    [['Sixto', 'Sidney', 359, 'dark'], ['Fátima', 'Phoebe', 356, 'ghost'], ['Nívea', 'Glacia', 365, 'ice'], ['Dracón', 'Drake', 373, 'dragon'],
     ['Máximo', 'Steven', 376, 'steel']],
    [['Alecrán', 'Aaron', 452, 'poison'], ['Gaia', 'Bertha', 450, 'ground'], ['Fausto', 'Flint', 392, 'fire'], ['Delos', 'Lucian', 437, 'psychic'],
     ['Cintia', 'Cynthia', 445, 'dragon']],
    [['Anís', 'Shauntal', 609, 'ghost'], ['Aza', 'Grimsley', 625, 'dark'], ['Catleya', 'Caitlin', 576, 'psychic'], ['Lotto', 'Marshal', 534, 'fighting'],
     ['Mirto', 'Alder', 637, 'bug']],
    [['Malva', 'Malva', 663, 'fire'], ['Narciso', 'Siebold', 689, 'water'], ['Tileo', 'Wikstrom', 681, 'steel'], ['Drácena', 'Drasna', 715, 'dragon'],
     ['Dianta', 'Diantha', 282, 'fairy']],
    [['Hala', 'Hala', 740, 'fighting'], ['Mayla', 'Olivia', 745, 'rock'], ['Zarala', 'Acerola', 770, 'ghost'], ['Kahili', 'Kahili', 227, 'flying'],
     ['Kukui', 'Kukui', 727, 'fire']],
    // Galar no tiene Alto Mando: en su lugar, Roy.
    [['Roy', 'Raihan', 884, 'dragon'],
     ['Lionel', 'Leon', 6, 'fire']],
    [['Cayena', 'Rika', 980, 'ground'], ['Lima', 'Poppy', 959, 'steel'], ['Laureano', 'Larry', 398, 'flying'], ['Hassel', 'Hassel', 998, 'dragon'],
     ['Ságita', 'Geeta', 970, 'rock']]
  ];

  let e4Done = false, champDone = false;   // de esta partida
  let notice = null;                       // aviso para cuando aparezca el rival

  const regionName = gen => G.Medals.REGIONS[gen - 1][0];
  const challenge = (gen, tr) => `Liga de ${regionName(gen)}: ¡${tr[0]} te reta con ${G.DEX_BY[tr[2]].name}!`;

  /**
   * Quien manda, al elegir el rival de una grieta en la que se entra (rift.js,
   * start): si toca la Liga y hay medallas, el as sustituye al legendario.
   */
  function pick(cfg) {
    notice = null;
    const t = G.Game.st.time;
    let champ;
    if (!champDone && t >= AT_CHAMP) champ = true;
    else if (!e4Done && t >= AT_E4) champ = false;
    else return;
    e4Done = true;
    if (champ) champDone = true;
    const pl = G.Game.player, mon = pl && G.DEX_BY[pl.dex];
    if (!mon || !LEAGUES[mon.gen - 1]) return;
    const gen = mon.gen, list = LEAGUES[gen - 1];
    const missing = N_MEDALS - G.Medals.count(G.DB.save, gen);
    if (missing > 0) {
      notice = `La Liga de ${regionName(gen)} no te deja pasar: ` +
               (missing === 1 ? 'te falta 1 medalla' : `te faltan ${missing} medallas`);
      return;
    }
    const tr = champ ? list[list.length - 1] : G.U.pick(list.slice(0, -1));
    cfg.dex = tr[2];
    cfg.shiny = false;
    cfg.type = tr[3];
    cfg.league = { gen, champ, who: tr[0] };
    notice = challenge(gen, tr);
  }

  /** Quien manda, con el rival ya en la arena: el aviso (va a todos). */
  function spawned(arena) {
    if (arena.league) {
      const e = G.EnemyMgr.get(arena.bossId);
      if (e) e.league = arena.league;
    }
    if (notice) G.Spawner.say(notice, 4);
    notice = null;
  }

  /** El as de la Liga no se apunta como legendario (en todos los ordenadores). */
  const kill0 = G.Progress.kill;
  G.Progress.kill = e => {
    const lg = G.Rift.arena && G.Rift.arena.league;
    if (!lg || !e.boss || G.Judgment.active) return kill0(e);
    const s = G.DB.save;
    if (lg.champ) {
      // El ×10 seguro del campeón (el botín lo suelta quien manda).
      if (!e.remote) G.Pickups.drop('ticket10', e.x, e.y - 30, 1);
      if (s) { s.ach = s.ach || {}; s.ach['ligaw_' + lg.gen] = s.ach['ligaw_' + lg.gen] || Date.now(); }
    }
    G.Progress.event('kill', { types: e.types || [], boss: true, legend: 0 });
  };

  const reset0 = G.Rift.reset;
  G.Rift.reset = () => { reset0(); e4Done = champDone = false; notice = null; };

  // ---------------- logros ----------------

  function register() {
    const D = G.AchDefs;
    const i = D.CATS.findIndex(c => c[0] === 'medallas');
    D.CATS.splice(i + 1, 0, ['liga', 'Liga']);
    const en = { 'Liga': 'League' };
    LEAGUES.forEach((list, gi) => {
      const gen = gi + 1, reg = regionName(gen), regEn = G.Medals.REGIONS[gi][1];
      const champ = list[list.length - 1];
      const a = { id: 'liga_' + gen, cat: 'liga', tier: 3, gen, icon: 'crown', iconOff: 'crownOff',
                  name: `Vence a la Liga de ${reg}`,
                  desc: `Con las 8 medallas de ${reg}, vence al as de ${champ[0]} en una grieta (desde el minuto 20).`,
                  value: s => (s.ach && s.ach['ligaw_' + gen] ? 1 : 0), goal: 1, reward: { t10: 1 } };
      D.LIST.push(a);
      D.BY[a.id] = a;
      // En inglés: los nombres de los entrenadores cambian, así que van enteros.
      en[a.name] = `Beat the ${regEn} League`;
      en[a.desc] = `With all 8 ${regEn} badges, defeat ${champ[1]}'s ace in a rift (from minute 20).`;
      for (const tr of list) {
        const mon = G.DEX_BY[tr[2]].name;
        en[challenge(gen, tr)] = `${regEn} League: ${tr[1]} challenges you with ${mon}!`;
      }
    });
    G.I18n.add(en);
    const UI = G.Icons.UI;
    UI.crownOff = { rows: UI.crown.rows, pal: { y: '#3a4870', o: '#2a3458', r: '#4a5a88' } };
  }
  register();

  return { pick, spawned, LEAGUES, AT_E4, AT_CHAMP };
})();
