/* ============ maps.js — (mod) mapas por región ============
 * Sólo del mod (ver docs/IDEAS-COLECCION.md, idea 8B "Viajar a una región").
 *
 * Al pulsar Jugar se elige mapa (ui/maps-ui.js): una de las 9 regiones o el
 * Mundo Distorsión, que las mezcla todas (como el juego original). Se
 * recuerda el último en save.lastMap.
 *
 * En el mapa de una región sólo salen Pokémon de esa región: el elenco de
 * cada tramo, los jefes, las hordas, los shiny salvajes (salen del elenco),
 * el Pokémon perdido y los legendarios de las grietas (aunque se repitan).
 * Los stats de combate salen del tramo (enemies.js) y, desde el 18-10-2026,
 * cada región es un 15 % más dura que la anterior (hard(): vida y daño de
 * salvajes, jefes y legendarios, en equilibrio.js) y da un 15 % más de monedas
 * al acabar; el Mundo Distorsión, la media de las abiertas. Jugar en casa (tu
 * Pokémon es de la región) da +15 % de daño y de vida. Antes un Mewtwo muy
 * mejorado limpiaba igual Kanto que Paldea y no compensaba cambiar.
 * Donde a una región le faltan Pokémon:
 *   tramos  se completa con los más fuertes de la región del tramo anterior,
 *           y con 1 invocador como mucho (si no, Kanto era más fácil)
 *   jefes   si no hay ninguno en su franja, otro fuerte no legendario de la región
 *   hordas  sólo de los tipos con al menos HORDE_MIN Pokémon en la región,
 *           los de stats más cercanos al tramo
 * La Liga de las grietas es la del mapa (league.js), sus biomas los de la
 * región (region-biomes.js) y, si tu compañero es de la región, +5 % de
 * monedas al acabar (collection.js).
 *
 * Viaje por regiones (viaje.js): las regiones cerradas no tienen mapa y el
 * Mundo Distorsión mezcla sólo las abiertas, con los mismos rellenos que el
 * mapa de una región. Con todas abiertas, como el original.
 *
 * Cooperativo: elige el anfitrión. El mapa va en la orden de empezar
 * ({ k:'start', map }) y, mientras estáis en la sala, en { k:'map', g }.
 *
 * Ganchos en el original (una línea cada uno, con "(mod) mapas por región"):
 * enemies.js (candidates, jefes), events.js (perdido), rift.js (legendarios),
 * game.js (bioma) y social-ui.js (mapa en la orden de empezar).
 */
G.Maps = (() => {
  const BONUS = 0.05;           // +5 % de monedas con un compañero de la región
  const HORDE_MIN = 4;          // Pokémon de un tipo para que haya horda de ese tipo
  const SUMMON_MAX = 1;         // invocadores como mucho entre los candidatos de un tramo
  const N = 9;                  // regiones
  const STEP = 0.15;            // cada región, +15 % de vida y daño enemigos (y de monedas) sobre la anterior
  const HOME = 0.15;            // tu Pokémon es de la región: +15 % de daño y de vida

  let gen = 0;                  // mapa de la partida: 0 = Mundo Distorsión, 1..9 = región

  const valid = g => (Number.isInteger(+g) && +g >= 1 && +g <= N ? +g : 0);

  /** Nombre de un mapa. */
  function name(g) {
    g = valid(g);
    return g ? G.Gacha.BANNERS[g - 1].name : 'Mundo Distorsión';
  }

  /** ¿Región abierta? (viaje.js) */
  const isOpen = g => !G.Travel || G.Travel.isOpen(g);
  /** Mundo Distorsión con todas las regiones abiertas: todo como en el original. */
  const mixed = () => !gen && (!G.Travel || G.Travel.allOpen());

  /** El último mapa elegido (el que sale marcado). Si se ha cerrado, el Mundo Distorsión. */
  function chosen() {
    const s = G.DB.save, g = valid(s && s.lastMap);
    return isOpen(g) ? g : 0;
  }

  /** Eliges mapa para jugar tú solo (se recuerda). */
  function choose(g) {
    gen = valid(g);
    const s = G.DB.save;
    if (s && s.lastMap !== gen) { s.lastMap = gen; G.DB.commit(); }
  }

  /** El mapa de la partida en grupo (lo manda el anfitrión). */
  function setRun(g) { gen = valid(g); }

  /** ¿Puede salir este Pokémon en el mapa de ahora? */
  function allows(p) { return gen ? p.gen === gen : isOpen(p.gen); }

  /** Del mapa de ahora (para filtros): su región, o en el Mundo Distorsión las abiertas. */
  const mine = p => allows(p) && G.SPRITE_META[p.dex];

  /** Candidatos de un tramo (enemies.js, candidates): los de la región, y si faltan, del tramo anterior. */
  function tierPool(all, tier) {
    if (mixed()) return all;
    const list = fewSummoners(all.filter(allows));
    if (list.length >= tier.cast) return list;
    const below = fewSummoners(G.DEX.filter(p => mine(p) && p.rarity < 5 && p.bst < tier.bst[0]), SUMMON_MAX -
                               list.filter(p => G.Enemies.behaviorOf(p) === 'summoner').length).sort((a, b) => b.bst - a.bst);
    return list.concat(below.slice(0, tier.cast - list.length));
  }

  /**
   * Como mucho `max` invocadores (al azar) en un tramo. En Kanto casi todas
   * las evoluciones finales llaman a su manada (Pidgeot, Nidoqueen, Arbok,
   * Gyarados...) y salían 2-3 de 7 por tramo; sus crías pegan poco y ocupan
   * el sitio de los demás, así que la región era más fácil (16-10-2026).
   * Mezclando todas sale menos de 1 por tramo.
   */
  function fewSummoners(list, max = SUMMON_MAX) {
    const isS = p => G.Enemies.behaviorOf(p) === 'summoner';
    const keep = new Set(G.U.pickN(list.filter(isS), Math.max(0, max)));
    return list.filter(p => !isS(p) || keep.has(p));
  }

  /** Jefes (enemies.js, rollRun): `ok` ya quita legendarios, sin sprite y repetidos. */
  function bossPool(pool, slot, ok) {
    if (mixed()) return pool;
    const strong = G.DEX.filter(p => mine(p) && ok(p));
    const inSlot = strong.filter(p => p.bst >= slot.bst[0] && p.bst <= slot.bst[1]);
    if (inSlot.length) return inSlot;
    // Los más fuertes que queden (la fuerza la da la franja, no el Pokémon).
    const top = strong.sort((a, b) => b.bst - a.bst).slice(0, 4);
    return top.length ? top : pool;
  }

  // ---------------- dificultad por región ----------------

  const hardOf = g => 1 + STEP * (g - 1);
  /** Dificultad de un mapa (×1 Kanto ... ×2,2 Paldea). Mundo Distorsión: la media de las abiertas. */
  function hard(g = gen) {
    g = valid(g);
    if (g) return hardOf(g);
    let sum = 0, n = 0;
    for (let r = 1; r <= N; r++) if (isOpen(r)) { sum += hardOf(r); n++; }
    return n ? sum / n : 1;
  }
  /** "×1,15" */
  const hardText = (g = gen) => '×' + String(Math.round(hard(g) * 100) / 100).replace('.', G.I18n.lang === 'en' ? '.' : ',');
  /** ¿Juega en casa? (el Pokémon `dex` es de la región del mapa `g`) */
  function atHome(dex, g = gen) {
    const mon = G.DEX_BY[dex];
    g = valid(g);
    return !!g && !!mon && mon.gen === g;
  }

  // ---------------- hordas ----------------

  const E = G.Enemies;
  const hordeMons = type => G.DEX.filter(p => mine(p) && p.rarity < 5 && !p.leg && p.types.includes(type) &&
                                              !E.NO_HORDE.has(E.behaviorOf(p)));
  const types0 = E.hordeTypes, defs0 = E.hordeDefs;
  E.hordeTypes = t => (mixed() ? types0(t) : Object.keys(G.U.TYPE_COLOR).filter(ty => hordeMons(ty).length >= HORDE_MIN));
  E.hordeDefs = (type, t) => {
    if (mixed()) return defs0(type, t);
    const ti = E.tierAt(t), tier = E.TIERS[ti], mid = (tier.bst[0] + tier.bst[1]) / 2;
    const near = hordeMons(type).sort((a, b) => Math.abs(a.bst - mid) - Math.abs(b.bst - mid)).slice(0, 6);
    return G.U.pickN(near, 4).map(p => E.defFor(p, tier, ti));
  };

  // ---------------- biomas ----------------

  /** Bioma del turno `n` (cada 4 min, game.js). En Mundo Distorsión, los de siempre. */
  function biome(n) {
    // Halloween (del original, 26-10-2026): sus biomas de noche mandan también en
    // los mapas de región (los Pokémon, la dificultad y la Liga siguen siendo de la región).
    if (G.Halloween && G.Halloween.inRun) return G.Tiles.runBiome(n);
    const b = G.RegionBiomes && G.RegionBiomes.of(gen);
    return b ? b[n % b.length] : G.Tiles.runBiome(n);
  }

  // ---------------- premio ----------------

  /**
   * Al acabar (collection.js): monedas de más por la dificultad del mapa y
   * +5 % si tu compañero es de la región.
   */
  function coinsEnd(pl, coins) {
    const s = G.DB.save;
    if (!s) return '';
    const parts = [];
    const add = (k, label) => {
      const extra = Math.round((coins || 0) * k);
      if (extra <= 0) return;
      s.coins += extra;
      s.stats.coinsEarned += extra;
      parts.push(`${label}: +${extra} ${extra === 1 ? 'moneda' : 'monedas'}`);
    };
    add(hard() - 1, `Dificultad ${hardText()}`);
    if (atHome(pl.dex)) add(BONUS, `En casa (${name(gen)})`);
    return parts.join(' · ');
  }

  // ---------------- cooperativo ----------------

  // Quien no es anfitrión ve en la sala el mapa que ha elegido él.
  let roomMap = null;
  /** G.Flow está en game.js, que se carga después: lo engancha maps-ui.js. */
  function hookFlow() {
    const sc = G.Flow.startCoop;
    G.Flow.startCoop = cfg => { setRun(cfg && cfg.map); return sc.call(G.Flow, cfg); };
  }
  G.Net.on((from, msg) => {
    if (msg && msg.k === 'map') { roomMap = valid(msg.g); if (G.MapsUI) G.MapsUI.lobbyRow(); }
  });
  /** El anfitrión avisa a la sala del mapa elegido. */
  function tellRoom() {
    const room = G.Social.room;
    if (room && room.isHost) G.Net.broadcast({ k: 'map', g: chosen() });
  }
  G.Net.onPeer((u, mode) => { if (mode === 'direct' || mode === 'relay') tellRoom(); });
  /** Mapa que se ve en la sala: el tuyo si eres el anfitrión, el suyo si no. */
  function roomChoice() {
    const room = G.Social.room;
    return !room || room.isHost ? chosen() : roomMap;
  }

  return {
    N, BONUS, HOME, name, hard, hardText, atHome, chosen, choose, setRun, allows, tierPool, bossPool, biome, coinsEnd,
    tellRoom, roomChoice, hookFlow,
    get gen() { return gen; }
  };
})();
