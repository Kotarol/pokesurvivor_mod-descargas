/* ============ collection.js — (mod) premios por coleccionar ============
 * Sólo del mod (ver docs/IDEAS-COLECCION.md). Cuatro cosas:
 *
 *   Afinidad regional  tu compañero gana daño y vida según lo que tengas de su
 *                      región: +1 % por cada 10 % hasta el 50 %, +2 % por tramo
 *                      del 60 al 90 % y +18 % al completarla. Cada shiny de la
 *                      región cuenta como uno más (doble).
 *   Pasaporte          +2 % de monedas al acabar por cada sello (medals.js).
 *   Brillo shiny       jugando con tu compañero shiny: +15 % de monedas al
 *                      acabar, y cada ticket normal recogido tiene un 15 % de
 *                      contar doble (todo se suma al acabar la partida).
 *   Estreno y maestría la primera vez que aguantas 5, 10 y 20 minutos con
 *                      cada Pokémon de compañero: 1 ticket, 2 tickets y 1 ×10.
 *                      Se apuntan en save.ach ('est_25', 'vet_25', 'mae_25'):
 *                      así se juntan sin perder nada al sincronizar o importar
 *                      una copia, y no cuentan como logros (no están en la lista).
 *
 * Se engancha en game.js: apply() al crear tu Pokémon y runEnd() al acabar.
 * La ficha de la Pokédex (menu.js) enseña detailHtml().
 */
G.Collection = (() => {
  const PER_TIER = 0.01;        // +1 % por cada 10 % de la región (x2 del 60 al 90 %)
  const TIERS = 10;
  const CHAMPION = 5;           // +5 % más al completar la región
  const STAMP_COINS = 0.02;     // pasaporte: +2 % de monedas por sello
  const SHINY_COINS = 0.15;     // +15 % de monedas
  const SHINY_TICKET = 0.15;    // probabilidad de que un ticket cuente doble
  // Una vez por Pokémon, al aguantar `min` minutos con él de compañero.
  const GOALS = [
    { id: 'est', min: 5, name: 'Estreno', reward: { t1: 1 } },
    { id: 'vet', min: 10, name: 'Veterano', reward: { t1: 2 } },
    { id: 'mae', min: 20, name: 'Maestría', reward: { t10: 1 } }
  ];

  /** Pokémon de la región `gen` que tienes: { owned, shiny, total, pts, pct }. */
  function region(save, gen) {
    let owned = 0, shiny = 0, total = 0;
    for (const p of G.DEX) {
      if (p.gen !== gen) continue;
      total++;
      if (save.owned && save.owned[p.dex]) owned++;
      if (save.shiny && save.shiny[p.dex]) shiny++;
    }
    const pts = owned + shiny;
    return { owned, shiny, total, pts, pct: total ? Math.min(1, pts / total) : 0 };
  }

  /**
   * Extra de daño y vida (0 … 0,18) de un Pokémon por la afinidad con su región.
   * Crece más al final: +1 % por tramo hasta el 50 %, +2 % por tramo del 60 al
   * 90 % (+13 %), y al completarla (Campeón de la región) +18 %.
   */
  function affinity(save, dex) {
    const mon = G.DEX_BY[dex];
    if (!save || !mon) return 0;
    // (el 1e-9, para que el 30 % justo no se quede en 2 tramos por redondeo)
    const t = Math.min(TIERS, Math.floor(region(save, mon.gen).pct * TIERS + 1e-9));
    const pts = Math.min(t, 5) + 2 * Math.max(0, Math.min(t, 9) - 5) + (t >= TIERS ? CHAMPION : 0);
    return pts * PER_TIER;
  }

  /** Al crear tu Pokémon para la partida (game.js, startRun). */
  function apply(pl, save) {
    const b = affinity(save, pl.dex);
    if (b > 0) {
      pl.atkMul *= 1 + b;
      pl.maxHp = Math.round(pl.maxHp * (1 + b));
      pl.hp = pl.maxHp;
    }
    pl.affinity = b;
  }

  /**
   * Al acabar la partida, con las monedas ya sumadas y antes de guardar los
   * tickets (game.js, endRun). Las monedas de más van aparte (no en coinMul)
   * para que el resumen no las cuente como la mejora Fortuna.
   */
  function runEnd(pl, coins) {
    const msgs = [];
    const goals = goalsEnd(pl);
    if (goals) msgs.push(goals);
    const shiny = pl.shiny && shinyEnd(pl, coins);
    if (shiny) msgs.push(shiny);
    const stamps = passportEnd(coins);
    if (stamps) msgs.push(stamps);
    // Un aviso detrás de otro (el segundo taparía al primero).
    msgs.forEach((m, i) => setTimeout(() => G.UI.toast(m, 4500), i * 4700));
  }

  /** Brillo shiny: monedas y tickets de más. Devuelve el texto del aviso. */
  function shinyEnd(pl, coins) {
    const s = G.DB.save;
    const extraCoins = Math.round((coins || 0) * SHINY_COINS);
    let extraT = 0;
    for (let i = 0; i < (pl.t1 || 0); i++) if (Math.random() < SHINY_TICKET) extraT++;
    if (extraCoins && s) { s.coins += extraCoins; s.stats.coinsEarned += extraCoins; }
    pl.t1 += extraT;          // game.js los guarda justo después (bankTickets)
    const parts = [];
    if (extraCoins) parts.push('+' + extraCoins + ' monedas');
    if (extraT) parts.push('+' + extraT + (extraT === 1 ? ' ticket' : ' tickets'));
    return parts.length ? 'Brillo shiny: ' + parts.join(' · ') : '';
  }

  /** Pasaporte: +2 % de monedas por cada sello (región al 50 %, medals.js). */
  function passportEnd(coins) {
    const s = G.DB.save;
    const n = s && G.Medals ? G.Medals.stamps(s) : 0;
    const extra = Math.round((coins || 0) * STAMP_COINS * n);
    if (!extra) return '';
    s.coins += extra;
    s.stats.coinsEarned += extra;
    return `Pasaporte (${n === 1 ? '1 sello' : n + ' sellos'}): +${extra} ${extra === 1 ? 'moneda' : 'monedas'}`;
  }

  const goalKey = (g, dex) => g.id + '_' + dex;

  /** Qué objetivos (estreno, veterano, maestría) tienes ya con `dex`. */
  function goalsDone(save, dex) {
    return GOALS.map(g => !!(save && save.ach && save.ach[goalKey(g, dex)]));
  }

  /**
   * Estreno, veterano y maestría que se consiguen en esta partida, con los
   * minutos aguantados. Los tickets van a pl.t1 / pl.t10, como los recogidos:
   * salen en el resumen y game.js los guarda justo después.
   */
  function goalsEnd(pl) {
    const s = G.DB.save, mon = G.DEX_BY[pl.dex];
    if (!s || !mon) return '';
    const time = G.Game.st.time;
    s.ach = s.ach || {};
    const got = [];
    for (const g of GOALS) {
      if (time < g.min * 60 || s.ach[goalKey(g, pl.dex)]) continue;
      s.ach[goalKey(g, pl.dex)] = Date.now();
      pl.t1 += g.reward.t1 || 0;
      pl.t10 += g.reward.t10 || 0;
      got.push(g);
    }
    if (!got.length) return '';
    const names = got.map(g => g.name);
    const t1 = got.reduce((a, g) => a + (g.reward.t1 || 0), 0), t10 = got.reduce((a, g) => a + (g.reward.t10 || 0), 0);
    const parts = [];
    if (t1) parts.push('+' + t1 + (t1 === 1 ? ' ticket' : ' tickets'));
    if (t10) parts.push('+' + t10 + ' ×10');
    const what = names.length === 1 ? names[0] : names.slice(0, -1).join(', ') + ' y ' + names[names.length - 1];
    return `¡${what} con ${mon.name}! ${parts.join(' · ')}`;
  }

  /** Párrafo para la ficha de la Pokédex de un Pokémon que tienes. */
  function detailHtml(dex, shiny) {
    const s = G.DB.save, mon = G.DEX_BY[dex];
    if (!s || !mon) return '';
    const r = region(s, mon.gen);
    const pct = Math.round(affinity(s, dex) * 100);
    const name = G.MenuUI.GEN_NAMES[mon.gen - 1];
    let html = `<div class="panel" style="margin:10px 0 0;padding:8px 10px;font-size:13px">
      <b>Afinidad con ${name}:</b> <b class="gold">+${pct} % de daño y vida</b>
      <div class="sub" style="margin-top:2px">Tienes ${r.owned} de ${r.total} (y ${r.shiny} shiny, que cuentan doble). Hasta el 50 % de la región, +1 % por cada 10 %; del 60 al 90 %, +2 %; completa, +18 %.</div>`;
    if (shiny) html += `<div style="margin-top:6px">${G.Icons.html('shiny', 12)} <b>Brillo shiny:</b> +15 % de monedas y algunos tickets cuentan doble.</div>`;
    const done = goalsDone(s, dex);
    html += `<div style="margin-top:6px"><b>Con este Pokémon:</b> ` +
      GOALS.map((g, i) => `<span class="${done[i] ? 'gold' : 'sub'}" style="white-space:nowrap">${G.Icons.html(done[i] ? 'star' : 'starDim', 12)} ${g.name} (${g.min} min)</span>`).join(' · ') +
      `<div class="sub" style="margin-top:2px">Aguanta esos minutos con él de compañero: 1 ticket, 2 tickets y 1 ×10, una sola vez.</div></div>`;
    return html + '</div>';
  }

  return { region, affinity, apply, runEnd, detailHtml, goalsDone, GOALS, SHINY_COINS, SHINY_TICKET };
})();
