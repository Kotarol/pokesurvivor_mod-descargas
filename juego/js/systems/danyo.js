/* ============ danyo.js — (mod) daño por movimiento y por objeto ============
 * Apunta, durante la partida, cuánto daño hace cada uno de tus movimientos y
 * de tus objetos, y lo que aporta cada objeto que no hace daño propio. Lo
 * enseñan la pausa y el resumen final (js/ui/danyo-ui.js).
 *
 * Sólo cuenta lo TUYO (G.Game.player): en cooperativo cada uno ve lo suyo.
 * Se guarda en el propio Pokémon (pl._dn), así que cada partida empieza a cero.
 *
 * Ganchos de una línea "(mod) daño por movimiento" en el original:
 *   combat.js  hit() y el choque de proyectiles → G.Danyo.mv
 *              payload() → los proyectiles llevan el id del movimiento (mid)
 *              Casco Dentado → G.Danyo.item
 *   enemy.js   quemadura y veneno → G.Danyo.dot (cuentan para el movimiento que los puso)
 * Lo de los objetos que no hacen daño (vida recuperada, experiencia extra...)
 * se mira envolviendo métodos de G.Player, sin tocar player.js.
 *
 * Es daño REAL: lo que le quitas al enemigo (un golpe de 500 a uno con 20 de
 * vida cuenta 20) y nada a los que ya han caído.
 */
G.Danyo = (() => {
  // Objetos que sólo potencian el daño: lo que multiplican (ver data/items.js).
  const BOOST = { choiceband: 1.4, lifeorb: 1.3 };

  const mine = p => !!p && G.Game && p === G.Game.player;

  /** Lo apuntado de un Pokémon: { mv: {id: daño}, it: {id: datos}, order: [ids de objeto] } */
  function book(pl) {
    return pl._dn || (pl._dn = { mv: {}, it: {}, order: [] });
  }

  /** Datos de un objeto: d daño propio, x daño extra, heal vida, xp experiencia
   *  extra, avoid daño evitado, saves veces que te salvó, casts ataques de más,
   *  dist distancia de más, t segundos llevado. */
  function slot(pl, id) {
    const b = book(pl);
    if (!b.it[id]) {
      b.it[id] = { d: 0, x: 0, heal: 0, xp: 0, avoid: 0, saves: 0, casts: 0, dist: 0, t: 0 };
      b.order.push(id);
    }
    return b.it[id];
  }

  /** Lo que de verdad le quita un golpe de `d` a `e` (se mira ANTES de e.hurt). */
  function real(e, d) {
    if (!e || e.dead) return 0;
    return Math.min(Math.max(1, Math.round(d)), Math.max(0, e.hp) + (e.shield || 0));
  }

  function add(pl, id, n, boosted) {
    if (!n) return;
    const b = book(pl);
    b.mv[id] = (b.mv[id] || 0) + n;
    const k = boosted && BOOST[pl.item];
    if (k) slot(pl, pl.item).x += n * (1 - 1 / k);
  }

  /**
   * Golpe de un movimiento (combat.js), justo antes de e.hurt.
   * @param src  el movimiento o el proyectil: si quema o envenena, la
   *             quemadura y el veneno de `e` cuentan desde ahora para `id`.
   */
  let byMe = null;          // enemigo al que le vas a poner quemadura/veneno ahora mismo
  function mv(pl, id, e, d, src) {
    if (!id || !mine(pl)) return;
    add(pl, id, real(e, d), true);
    if (src && src.burn) e._dB = id;
    if (src && src.poison) e._dP = id;
    // El golpe pone el estado justo después (mismo fotograma): luego se olvida.
    if (src && (src.burn || src.poison)) { if (!byMe) queueMicrotask(clearMe); byMe = e; }
  }

  // Si se la pone otro (un compañero en cooperativo, una baya venenosa del
  // mapa...), los tics dejan de contar para tu movimiento.
  const E = G.Enemy.prototype;
  for (const [fn, key] of [['applyBurn', '_dB'], ['applyPoison', '_dP']]) {
    const orig = E[fn];
    E[fn] = function () {
      if (byMe !== this) this[key] = null;
      return orig.apply(this, arguments);
    };
  }
  const clearMe = () => { byMe = null; };

  /** Tic de quemadura ('b') o veneno ('p') de `e` (enemy.js). Devuelve `amt` tal cual. */
  function dot(e, kind, amt) {
    const id = kind === 'b' ? e._dB : e._dP, pl = G.Game && G.Game.player;
    // No sube con el ataque: la Vidasfera y la Cinta no lo potencian.
    if (id && pl) add(pl, id, real(e, amt), false);
    return amt;
  }

  /** Daño propio de un objeto (Casco Dentado). Devuelve `amt` tal cual. */
  function item(pl, id, e, amt) {
    if (mine(pl)) slot(pl, id).d += real(e, amt);
    return amt;
  }

  // ---------- lo que aportan los objetos que no hacen daño ----------
  const P = G.Player.prototype;

  const equip = P.equip;
  P.equip = function (id) {
    const r = equip.apply(this, arguments);
    if (id && mine(this)) slot(this, id);
    return r;
  };

  const update = P.update;
  P.update = function (dt) {
    const s = mine(this) && !this.dead && this.item ? slot(this, this.item) : null;
    let x0 = 0, y0 = 0;
    if (s) {
      s.t += dt;
      const room = this.maxHp - this.hp;
      // Mismas cuentas que Player.update, con lo que falta para la vida máxima.
      if (this.item === 'shellbell' && this.bellHeal > 0) s.heal += Math.min(this.bellHeal, 4 * dt, room);
      if (this.item === 'leftovers' && this.regen > 0) {
        s.heal += Math.min(this.regen * dt, room) * Math.min(1, (this._itemRegen || 0) / this.regen);
      }
      x0 = this.x; y0 = this.y;
    }
    const r = update.apply(this, arguments);
    if (s && this.item === 'choicescarf' && this.walking) {
      s.dist += Math.hypot(this.x - x0, this.y - y0) * (1 - 1 / 1.35);
    }
    return r;
  };

  const hurt = P.hurt;
  P.hurt = function (amount, type, pure) {
    if (!mine(this) || !this.item || this.invuln > 0 || this.dead) return hurt.apply(this, arguments);
    const s = slot(this, this.item), hp0 = this.hp, red = this.reduction, sash = this.sashT;
    const r = hurt.apply(this, arguments);
    // Chaleco Asalto: su 20 % de lo que habrías recibido sin él.
    if (this.item === 'assaultvest' && !pure && red < 1) s.avoid += Math.max(0, hp0 - this.hp) * Math.min(0.2, red) / (1 - red);
    if (this.sashT !== sash) s.saves++;
    return r;
  };

  const gainXp = P.gainXp;
  P.gainXp = function (amount) {
    if (this.item === 'luckyegg' && mine(this)) slot(this, 'luckyegg').xp += amount * this.xpMul * (1 - 1 / 1.3);
    return gainXp.apply(this, arguments);
  };

  const cast = P.cast;
  P.cast = function (m) {
    // Garra Rápida: con un 20 % menos de recarga, 1 de cada 5 ataques es de más.
    if (this.item === 'quickclaw' && m && m.id && mine(this)) slot(this, 'quickclaw').casts += 0.2;
    return cast.apply(this, arguments);
  };

  return { mv, dot, item, book, BOOST };
})();
