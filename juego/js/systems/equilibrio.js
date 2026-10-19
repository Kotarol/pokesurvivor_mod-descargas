/* ============ equilibrio.js — (mod) ajustes de dificultad del mod ============
 *
 * (17/18-10-2026, con el registro de partidas reales)
 *
 * Jefes y legendarios: antes caían en 4-7 s (sólo crecían con el tiempo). El
 * 17-10 se les dio de mínimo la vida de 10-12 salvajes del tramo de ese
 * momento, pero con un Mew muy mejorado la grieta del minuto 8 duró 83 s, los
 * jefes del minuto 9 en adelante no caían nunca (y con un jefe vivo no se abre
 * ninguna grieta: ni Alto Mando ni campeón) y un Venusaur sin mejoras perdió su
 * primera grieta. El daño de un Pokémon a UN solo enemigo apenas crece en la
 * partida aunque su daño total se multiplique, y entre uno muy mejorado y uno
 * sin mejorar hay ×15. Así que ahora duran lo mismo para todos: su vida es la
 * de unos segundos de vuestro daño a un solo enemigo (lo mide judgment.js para
 * la Sentencia de Arceus) y nunca menos que lo de antes. Su daño sí tiene un
 * mínimo según el golpe de un salvaje del momento.
 *
 * Cooperativo: esa medida ya suma el daño de todos (los golpes de los
 * invitados llegan al anfitrión). Lo de antes, el mínimo, sube como la carga de
 * salvajes (más vida y más que salen), no sólo con la vida.
 *
 * (18-10-2026, registro de un amigo) Un jefe que salió justo al volver de una
 * grieta no caía en 8 minutos: la medida de judgment.js contaba la grieta (todo
 * el daño a un único blanco) y los curanderos le curaban un % de su vida
 * enorme. Ahora el daño se mide aquí, sólo en el mapa y sin contar jefes, con un
 * tope de 5 veces la vida de antes; los curanderos y escudos ya no tocan a
 * jefes (enemy.js).
 *
 * Defensa: la reducción de Coraza y la de Fortaleza se sumaban con tope del
 * 80 % (te llegaba un quinto del daño: "con fortaleza vas más que sobrado").
 * Ahora se combinan multiplicando y el tope es del 60 %.
 *
 * Vida por nivel: la vida máxima sube con cada nivel. Los golpes enemigos
 * pasan de ~13 a ~58 en una partida y la vida sólo subía con Vigor, que
 * nadie cogía. Va por aquí y no en Player.gainXp porque en cooperativo el
 * nivel de los invitados lo pone el anfitrión (Game.syncTeam).
 *
 * Dificultad por región (18-10-2026): con un Mewtwo casi al máximo se llegaba a
 * Arceus en Kanto y se podía limpiar cualquier región igual. Ahora la vida y el
 * daño de salvajes, jefes y legendarios van por G.Maps.hard() (Kanto ×1, cada
 * región +15 %, Paldea ×2,2; el Mundo Distorsión, la media de las abiertas) y
 * jugar en casa da +15 % de daño y de vida. Jefes y legendarios se miden con
 * tu daño: en solitario se mide sin la ventaja de casa, para que se note.
 * En cooperativo, la dificultad es la del mapa del anfitrión y la ventaja, la
 * de cada uno con su Pokémon.
 */
G.Equilibrio = (() => {
  const LEGEND_S = 20, BOSS_S = 25;       // segundos de vuestro daño a un solo enemigo que aguantan
  const HIT = 1.2, SHOT = 0.45;           // golpe y disparo mínimos, frente al golpe de un salvaje
                                          // (el disparo de un salvaje es 0,5: el legendario dispara el doble de seguido)
  const LV_HP = 3;                        // vida máxima por nivel
  const CAP_K = 5;                        // jefes y legendarios: como mucho 5 veces la vida de antes
  const MAX_RED = 0.6;                    // tope de reducción de daño (era 0,8)

  // Dificultad por región: vida y daño de los salvajes (spawner.js, hordas, mob()).
  const hard = () => (G.Maps ? G.Maps.hard() : 1);
  const scale0 = G.Enemies.scale;
  G.Enemies.scale = function (t) {
    const sc = scale0.apply(this, arguments), k = hard();
    return k === 1 ? sc : Object.assign({}, sc, { hp: sc.hp * k, dmg: sc.dmg * k });
  };

  /** Un salvaje normal del tramo más nuevo en el segundo `t` (sin cooperativo). */
  function mob(t) {
    const tier = G.Enemies.TIERS[G.Enemies.tierAt(t)], sc = G.Enemies.scale(t);
    return { hp: tier.hp * sc.hp * G.Spawner.hpK(t), dmg: tier.dmg * sc.dmg * G.Spawner.DMG_K };
  }

  // Daño a un solo enemigo por segundo: el que más recibe en cada segundo, sólo
  // en el mapa y sin jefes. Vale la media de los 6 mejores de los últimos 30.
  let hits = new Map(), hitT = 0, samples = [], lastT = 0;
  const noteDmg = G.Judgment.noteDmg;
  G.Judgment.noteDmg = function (d, e) {
    if (e && !e.boss && !G.Rift.inArena) hits.set(e.id, (hits.get(e.id) || 0) + d);
    return noteDmg.apply(this, arguments);
  };
  function sample(dt) {
    const t = G.Game.st.time;
    if (t < lastT) { samples = []; hits.clear(); hitT = 0; }     // partida nueva
    lastT = t;
    if (G.Rift.inArena || G.Judgment.active || (hitT += dt) < 1) return;
    let best = 0;
    for (const v of hits.values()) if (v > best) best = v;
    samples.push(best / hitT);
    if (samples.length > 30) samples.shift();
    hits.clear(); hitT = 0;
  }
  function single() {
    const top = samples.slice().sort((a, b) => b - a).slice(0, 6);
    return top.length ? top.reduce((a, b) => a + b, 0) / top.length : 0;
  }
  /** Tu Pokémon juega en casa (mapa de su región). */
  const home = pl => !!(pl && G.Maps && G.Maps.atHome(pl.dex));
  /**
   * La vida de antes (base) o la de tu daño, como mucho CAP_K veces la de
   * antes, y por la dificultad del mapa. En solitario tu daño se mide sin la
   * ventaja de casa (si no, se la comerían jefes y legendarios).
   */
  const fit = (base, secs, n) => {
    const own = n <= 1 && home(G.Game.player) ? 1 + G.Maps.HOME : 1;
    return Math.round(G.U.clamp(single() / own * secs, base, base * CAP_K) * hard());
  };

  /** Cooperativo: lo mismo que la carga de salvajes (vida × cantidad). */
  const coop = n => G.Coop.scaleHp(n) * G.Coop.scaleRate(n);

  /** Legendario de la grieta. `def` trae su vida de antes, sin cooperativo (rift.js). */
  function legend(def, t, n) {
    const m = mob(t);
    def.hp = fit(def.hp * coop(n), LEGEND_S, n);
    def.dmg = Math.round(Math.max(def.dmg * hard(), m.dmg * HIT));          // mob() ya va con la región
    def.shotDmg = Math.round(Math.max(def.shotDmg * hard(), m.dmg * SHOT));
    return def;
  }

  /** Jefe salvaje recién creado en spawner.js (que ya le dio su escala de cooperativo). */
  function boss(e, t, n) {
    const m = mob(t), had = G.Coop.scaleHp(n) * (n > 1 ? 1.4 : 1);
    e.maxHp = e.hp = fit(e.maxHp / had * coop(n), BOSS_S, n);
    e.dmg = Math.max(e.dmg * hard(), m.dmg * HIT);      // sus disparos suben con él (Enemy.shotDmg)
  }

  // Jugar en casa: +15 % de daño y de vida (con tu Pokémon recién creado, game.js).
  // Cada uno con el suyo: en cooperativo cada jugador crea su Pokémon.
  const apply0 = G.Collection.apply;
  G.Collection.apply = function (pl) {
    const r = apply0.apply(this, arguments);
    pl.home = home(pl);
    if (pl.home) {
      pl.atkMul *= 1 + G.Maps.HOME;
      pl.maxHp = pl.hp = Math.round(pl.maxHp * (1 + G.Maps.HOME));
      const txt = `En casa (${G.Maps.name(G.Maps.gen)}): +${Math.round(G.Maps.HOME * 100)} % de daño y de vida`;
      setTimeout(() => { if (G.Game.player === pl) G.UI.toast(txt, 4000); }, 1200);
    }
    return r;
  };

  // Vida por nivel: cada fotograma se ponen al día los niveles aún no contados.
  const update = G.Player.prototype.update;
  G.Player.prototype.update = function (dt) {
    if (this._lvHp == null) this._lvHp = this.level;
    if (!this.dead && this.level > this._lvHp) {
      this.addMaxHp((this.level - this._lvHp) * LV_HP);
      this._lvHp = this.level;
    }
    return update.apply(this, arguments);
  };

  // Salto del cuerpo a cuerpo (18-10-2026): si tu blanco es un jefe o un
  // legendario y está un poco más lejos de lo que llega el golpe, al tocar
  // golpear saltas hacia él. Los legendarios que disparan se quedan a ~245 px y
  // un Látigo Cepa llega a ~136: un Venusaur pasó 81 s sin poder darle a Mewtwo.
  // (18-10, más tarde) En la grieta el jefe es siempre tu blanco y no había
  // forma de alejarse: cada segundo volvías a caerle encima (también con
  // Confusión y Placaje vinculados). Ahora no saltas si te estás alejando ni si
  // otro ataque del hueco ya le llega, y caes al borde del golpe, no encima.
  const LUNGE = 130, LUNGE_CD = 1;
  const SHOOT = ['projectile', 'beam', 'boomerang', 'chain', 'meteor', 'dash', 'cone'];
  function lunge(pl, dt) {
    if ((pl.lungeT = (pl.lungeT || 0) - dt) > 0) return;
    const tg = pl.target;
    if (!tg || !tg.boss || tg.dead || !tg.hurt) return;
    const m = pl.activeGroup().find(x => x.kind === 'melee' && x.t - dt <= 0);
    if (!m) return;
    const reach = G.Combat.reach(m), d = G.U.dist(pl.x, pl.y, tg.x, tg.y);
    if (d <= reach || d > reach + LUNGE) return;
    const ca = (tg.x - pl.x) / d, sa = (tg.y - pl.y) / d, want = d - m.radius;
    if ((pl.svx || 0) * ca + (pl.svy || 0) * sa < 0) return;
    if (pl.activeGroup().some(x => SHOOT.includes(x.kind) && G.Combat.reach(x) >= d)) return;
    let len = 0;
    for (let s = 8; s <= want; s += 8) {
      if (!G.World.isFree(pl.x + ca * s, pl.y + sa * s, pl.r * 0.8, true)) break;
      len = s;
    }
    if (len < 16) return;
    const vis = G.VFX.forMove(m);
    for (let s = 0; s <= len; s += 22) G.FX.sp('streak', vis.pal, pl.x + ca * s, pl.y + sa * s - G.LIFT * 0.6, { life: 0.2, angle: Math.atan2(sa, ca) });
    pl.x += ca * len; pl.y += sa * len;
    G.World.collide(pl);
    pl.invuln = Math.max(pl.invuln || 0, 0.2);
    pl.lungeT = LUNGE_CD;
  }
  const tick = G.Combat.tick;
  G.Combat.tick = function (dt, pl) {
    sample(dt);
    if (pl && !pl.dead) lunge(pl, dt);
    return tick.apply(this, arguments);
  };

  // Defensa: Coraza (dmgReduce) y Fortaleza (buff def) multiplicando, con tope.
  // Coraza (+6 % por carta) llega al tope con 10: la carta deja de salir ahí (eran 12).
  const coraza = G.LevelUp.STATS.find(x => x.id === 'def');
  if (coraza) coraza.max = 10;

  // Potencia (18-10-2026): cada carta suma +10 % del daño base en vez de
  // multiplicar ×1,10: con 40 cartas era ×45 (un Mewtwo llegó a nivel 248 y desde
  // el minuto 14 nada le tocaba); ahora ×5.
  const potencia = G.LevelUp.STATS.find(x => x.id === 'atk');
  if (potencia) potencia.apply = pl => {
    const n = (pl._potencia || 0) + 1;
    pl.atkMul *= (1 + 0.1 * n) / (1 + 0.1 * (n - 1));
    pl._potencia = n;
  };
  Object.defineProperty(G.Player.prototype, 'reduction', {
    configurable: true,
    get() {
      const buff = this.buffs.def.n * this.buffs.def.amount;
      return Math.min(MAX_RED, 1 - (1 - this.dmgReduce) * (1 - Math.min(1, buff)));
    }
  });

  // Danzas (19-10-2026): Danza Espada y Danza Dragón sólo suben el Ataque
  // físico y Maquinación el especial, pero al subir de nivel el original las
  // trataba como "de tu lado bueno" con cualquier Pokémon (no tienen categoría:
  // salían el doble y sin aviso; a Magnezone, Danza Espada casi tanto como
  // Maquinación). Mientras se eligen las cartas llevan la categoría de lo que
  // suben: si no es tu lado, salen la mitad y con aviso, como los ataques. Al
  // aprenderlas siguen sin categoría (no hacen daño).
  const SIDE = { patk: 'physical', satk: 'special' };
  const dances = G.Moves.ALL.filter(m => m.kind === 'buff' && SIDE[m.stat]);
  const offer = G.LevelUp.offer;
  G.LevelUp.offer = function (pl) {
    for (const m of dances) m.cat = SIDE[m.stat];
    let list;
    try { list = offer.apply(this, arguments); } finally { for (const m of dances) m.cat = null; }
    for (const c of list) {
      const m = c.type === 'new' && dances.find(d => c.key === 'new:' + d.id);
      if (!m || G.Stats.fit(pl.mon, SIDE[m.stat]) >= 0.95) continue;
      const txt = m.stat === 'patk'
        ? `Con ${pl.mon.name} apenas sirve: sólo sube el Ataque físico y pega mejor con ataques especiales.`
        : `Con ${pl.mon.name} apenas sirve: sólo sube el Ataque Especial y pega mejor con ataques físicos.`;
      c.desc = `${m.desc} <span class="fit-low">${txt}</span>`;
    }
    return list;
  };

  return { mob, legend, boss, single, LV_HP, MAX_RED };
})();
