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
 *
 * (20-10-2026, registro de dystim) En Sinnoh (×1,45) ninguna partida pasaba del
 * minuto 11 (antes, en Kanto/Johto/Hoenn a ×1, hasta el 30) y los Pokémon sin
 * mejoras caían en 2 minutos. La vida y el daño suben a la vez (en la práctica
 * casi ×2), los salvajes daban la misma experiencia con un 45 % más de vida
 * (llegaba al minuto 8 con ~10 niveles menos), el legendario de la primera
 * grieta tenía como poco ~6.800 de vida y los jefes pegaban 67-77 a quien tenía
 * 150-170. Ahora:
 *   - la dificultad de la región entra poco a poco: ×1 al empezar, la del mapa
 *     desde el minuto 10 (RAMP). Las monedas de más, las de la región entera;
 *   - los salvajes, jefes y legendarios dan más experiencia según lo que la
 *     región les sube la vida (XP_REG: ×1,3 con ×1,45);
 *   - el legendario aguanta como poco la mitad de la vida de antes (LEGEND_LO),
 *     así dura unos 20 s también a un Pokémon flojo;
 *   - ningún golpe de jefe o legendario te quita más del 20 % de tu vida máxima
 *     (HIT_CAP; la Sentencia de Arceus, sí);
 *   - las cartas de mejora de los movimientos que ya tienes salen algo más, y más
 *     las del hueco que estás usando (upW, enganchado en levelup.js).
 */
G.Equilibrio = (() => {
  const LEGEND_S = 20, BOSS_S = 25;       // segundos de vuestro daño a un solo enemigo que aguantan
  const HIT = 1.2, SHOT = 0.45;           // golpe y disparo mínimos, frente al golpe de un salvaje
                                          // (el disparo de un salvaje es 0,5: el legendario dispara el doble de seguido)
  const LV_HP = 3;                        // vida máxima por nivel
  const CAP_K = 5;                        // jefes y legendarios: como mucho 5 veces la vida de antes
  const MAX_RED = 0.6;                    // tope de reducción de daño (era 0,8)
  const RAMP = 600;                       // la dificultad de la región se completa en el minuto 10
  const XP_REG = 2 / 3;                   // experiencia: 2/3 de lo que sube la vida (×1,45 → ×1,3)
  const LEGEND_LO = 0.5;                  // legendarios: como poco la mitad de la vida de antes (era toda)
  const HIT_CAP = 0.2;                    // golpe de jefe o legendario: como mucho el 20 % de tu vida máxima
  const UP_W = 10, UP_W_ACTIVE = 12;      // peso de las cartas de mejora de tus movimientos (era 8)

  // Dificultad por región: vida y daño de los salvajes (spawner.js, hordas, mob()).
  // Entra poco a poco: ×1 en el segundo 0 y la del mapa desde el minuto 10.
  const hard = t => {
    const k = G.Maps ? G.Maps.hard() : 1;
    return 1 + (k - 1) * G.U.clamp((t || 0) / RAMP, 0, 1);
  };
  const scale0 = G.Enemies.scale;
  G.Enemies.scale = function (t) {
    const sc = scale0.apply(this, arguments), k = hard(t);
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
   * La de tu daño, entre `lo` veces la vida de antes (base) y CAP_K veces, y por
   * la dificultad del mapa en el segundo `t`. En solitario tu daño se mide sin
   * la ventaja de casa (si no, se la comerían jefes y legendarios).
   */
  const fit = (base, secs, n, t, lo = 1) => {
    const own = n <= 1 && home(G.Game.player) ? 1 + G.Maps.HOME : 1;
    return Math.round(G.U.clamp(single() / own * secs, base * lo, base * CAP_K) * hard(t));
  };

  /** Cooperativo: lo mismo que la carga de salvajes (vida × cantidad). */
  const coop = n => G.Coop.scaleHp(n) * G.Coop.scaleRate(n);

  /** Legendario de la grieta. `def` trae su vida de antes, sin cooperativo (rift.js). */
  function legend(def, t, n) {
    const m = mob(t);
    def.hp = fit(def.hp * coop(n), LEGEND_S, n, t, LEGEND_LO);
    def.dmg = Math.round(Math.max(def.dmg * hard(t), m.dmg * HIT));          // mob() ya va con la región
    def.shotDmg = Math.round(Math.max(def.shotDmg * hard(t), m.dmg * SHOT));
    return def;
  }

  /** Jefe salvaje recién creado en spawner.js (que ya le dio su escala de cooperativo). */
  function boss(e, t, n) {
    const m = mob(t), had = G.Coop.scaleHp(n) * (n > 1 ? 1.4 : 1);
    e.maxHp = e.hp = fit(e.maxHp / had * coop(n), BOSS_S, n, t);
    e.dmg = Math.max(e.dmg * hard(t), m.dmg * HIT);      // sus disparos suben con él (Enemy.shotDmg)
  }

  // Experiencia por región: si la región les sube la vida, dan más experiencia
  // (2/3 de lo que sube). Al caer, una vez; no los de la Sentencia de Arceus.
  const die = G.Enemy.prototype.die;
  G.Enemy.prototype.die = function () {
    if (!this.remote && !this.judge && !this._xpReg) {
      this._xpReg = true;
      this.xp = Math.round(this.xp * (1 + (hard(G.Game.st.time) - 1) * XP_REG));
    }
    return die.apply(this, arguments);
  };

  // Golpes de jefes y legendarios: como mucho HIT_CAP de tu vida máxima (al
  // Pokémon con 160 de vida le quitaban 67-77; al que tiene 2.000 no le cambia
  // nada). De quién es el golpe se sabe como en registro.js: el contacto por
  // strike() (combat.js lo llama justo antes de hurt), y los disparos y zonas,
  // marcados al crearse mientras su enemigo actúa. En la grieta todo lo que pega
  // es el legendario. La Sentencia de Arceus no tiene tope. (En cooperativo, a
  // los invitados los disparos y zonas les llegan del anfitrión sin marcar: a
  // ellos sólo les cuenta el contacto y la grieta.)
  const isBoss = e => !!e && e.boss && !e.judge;
  let acting = null, bossTouch = false, where = null;
  const eUpdate = G.Enemy.prototype.update;
  G.Enemy.prototype.update = function () {
    const prev = acting; acting = this;
    try { return eUpdate.apply(this, arguments); } finally { acting = prev; }
  };
  const strike = G.Enemy.prototype.strike;
  G.Enemy.prototype.strike = function () {
    bossTouch = isBoss(this);
    return strike.apply(this, arguments);
  };
  const spawn = G.Projectiles.spawn;
  G.Projectiles.spawn = function (o) {
    const p = spawn.apply(this, arguments);
    if (p && o && !o.friendly && isBoss(acting)) p._boss = true;
    return p;
  };
  const hzAdd = G.Hazards.add;
  G.Hazards.add = function () {
    const h = hzAdd.apply(this, arguments);
    if (h && isBoss(acting)) h._boss = true;
    return h;
  };
  /** Ejecuta obj[name] sabiendo que el daño que entre viene de ahí (`tag`). */
  function within(obj, name, tag) {
    const f = obj[name];
    obj[name] = function () {
      const prev = where; where = tag;
      try { return f.apply(this, arguments); } finally { where = prev; bossTouch = false; }
    };
  }
  within(G.Combat, 'resolve', 'resolve');
  within(G.Hazards, 'update', 'zona');
  /** ¿El golpe que te entra ahora es de un jefe o legendario? */
  function fromBoss(pl) {
    if (G.Judgment.active) return false;
    if (bossTouch || G.Rift.inArena) return true;
    const near = (x, y, r) => G.U.dist2(x, y, pl.x, pl.y) < (r + pl.r) * (r + pl.r);
    if (where === 'resolve') return G.Projectiles.all().some(p => p._boss && !p.friendly && near(p.x, p.y, p.r));
    if (where === 'zona') return G.Hazards.all.some(h => h._boss && h.hit && h.t - h.delay < 0.1 && G.Hazards.inside(h, pl.x, pl.y, pl.r));
    return false;
  }
  const hurt = G.Player.prototype.hurt;
  G.Player.prototype.hurt = function (amount, type, pure, cat) {
    const args = Array.from(arguments);
    if (!pure && !this.dead && !(this.invuln > 0) && amount > 0 && fromBoss(this)) {
      // Lo que te llegaría (las mismas cuentas que Player.hurt) frente al tope.
      const k = G.Stats.taken(this.mon, cat) * (type ? G.Types.mult(type, this.mon.types) * G.Weather.mult(type) : 1) *
                (1 - this.reduction) * (this.activeGroup().some(m => m.kind === 'melee') ? 0.75 : 1);
      const cap = this.maxHp * HIT_CAP;
      if (k > 0 && amount * k > cap) args[0] = cap / k;
    }
    bossTouch = false;
    return hurt.apply(this, args);
  };

  /**
   * Peso de la carta de mejora de un movimiento que ya tienes (levelup.js; era
   * 8): algo más para todos y más para los del hueco que estás usando.
   */
  const upW = (pl, m) => (pl.activeGroup().includes(m) ? UP_W_ACTIVE : UP_W);

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

  return { mob, legend, boss, single, hard, upW, LV_HP, MAX_RED, HIT_CAP };
})();
