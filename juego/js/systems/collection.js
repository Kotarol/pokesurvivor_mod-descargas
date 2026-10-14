/* ============ collection.js — (mod) premios por coleccionar ============
 * Sólo del mod (ver docs/IDEAS-COLECCION.md). Dos cosas:
 *
 *   Afinidad regional  tu compañero gana +1 % de daño y +1 % de vida por cada
 *                      10 % que tengas de su región (tope +10 %). Cada shiny
 *                      de la región cuenta como uno más (doble).
 *   Brillo shiny       jugando con tu compañero shiny: +15 % de monedas al
 *                      acabar, y cada ticket normal recogido tiene un 15 % de
 *                      contar doble (todo se suma al acabar la partida).
 *
 * Se engancha en game.js: apply() al crear tu Pokémon y runEnd() al acabar.
 * La ficha de la Pokédex (menu.js) enseña detailHtml().
 */
G.Collection = (() => {
  const PER_TIER = 0.01;        // +1 % por cada 10 % de la región
  const TIERS = 10;
  const SHINY_COINS = 0.15;     // +15 % de monedas
  const SHINY_TICKET = 0.15;    // probabilidad de que un ticket cuente doble

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

  /** Extra de daño y vida (0 … 0,10) de un Pokémon por la afinidad con su región. */
  function affinity(save, dex) {
    const mon = G.DEX_BY[dex];
    if (!save || !mon) return 0;
    // (el 1e-9, para que el 30 % justo no se quede en 2 tramos por redondeo)
    return Math.min(TIERS, Math.floor(region(save, mon.gen).pct * TIERS + 1e-9)) * PER_TIER;
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
    if (!pl.shiny) return;
    const s = G.DB.save;
    const extraCoins = Math.round((coins || 0) * SHINY_COINS);
    let extraT = 0;
    for (let i = 0; i < (pl.t1 || 0); i++) if (Math.random() < SHINY_TICKET) extraT++;
    if (extraCoins && s) { s.coins += extraCoins; s.stats.coinsEarned += extraCoins; }
    pl.t1 += extraT;          // game.js los guarda justo después (bankTickets)
    const parts = [];
    if (extraCoins) parts.push('+' + extraCoins + ' monedas');
    if (extraT) parts.push('+' + extraT + (extraT === 1 ? ' ticket' : ' tickets'));
    if (parts.length) G.UI.toast('Brillo shiny: ' + parts.join(' · '), 4500);
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
      <div class="sub" style="margin-top:2px">Tienes ${r.owned} de ${r.total} (y ${r.shiny} shiny, que cuentan doble). Cada 10 % de la región da +1 %, hasta +10 %.</div>`;
    if (shiny) html += `<div style="margin-top:6px">${G.Icons.html('shiny', 12)} <b>Brillo shiny:</b> +15 % de monedas y algunos tickets cuentan doble.</div>`;
    return html + '</div>';
  }

  return { region, affinity, apply, runEnd, detailHtml, SHINY_COINS, SHINY_TICKET };
})();
