/* ============ equilibrio.js — (mod) ajustes de dificultad del mod ============
 *
 * (17-10-2026, con el registro de una partida real)
 *
 * Jefes y legendarios: los salvajes escalan con su tramo, el tiempo y la
 * resistencia extra de spawner.js; los jefes y legendarios no, y acababan
 * siendo como 2 o 3 salvajes élite (los legendarios caían en 4-7 s). Ahora su
 * vida y su daño tienen un mínimo según el salvaje normal del tramo de ese
 * momento. En cooperativo suben como la carga de salvajes (más vida y más que
 * salen), no sólo con la vida: con 4 jugadores los salvajes se multiplicaban
 * ×6,2 y el jefe ×2,7.
 *
 * Vida por nivel: la vida máxima sube con cada nivel. Los golpes enemigos
 * pasan de ~13 a ~58 en una partida y la vida sólo subía con Vigor, que
 * nadie cogía. Va por aquí y no en Player.gainXp porque en cooperativo el
 * nivel de los invitados lo pone el anfitrión (Game.syncTeam).
 */
G.Equilibrio = (() => {
  const LEGEND_HP = 12, BOSS_HP = 10;     // vida mínima: tantos salvajes del tramo actual
  const HIT = 1.2, SHOT = 0.45;           // golpe y disparo mínimos, frente al golpe de un salvaje
                                          // (el disparo de un salvaje es 0,5: el legendario dispara el doble de seguido)
  const LV_HP = 3;                        // vida máxima por nivel

  /** Un salvaje normal del tramo más nuevo en el segundo `t` (sin cooperativo ni élite). */
  function mob(t) {
    const tier = G.Enemies.TIERS[G.Enemies.tierAt(t)], sc = G.Enemies.scale(t);
    return { hp: tier.hp * sc.hp * G.Spawner.hpK(t), dmg: tier.dmg * sc.dmg * G.Spawner.DMG_K };
  }

  /** Cooperativo: lo mismo que la carga de salvajes (vida × cantidad). */
  const coop = n => G.Coop.scaleHp(n) * G.Coop.scaleRate(n);

  /** Legendario de la grieta. `def` trae su vida sin cooperativo (rift.js). */
  function legend(def, t, n) {
    const m = mob(t);
    def.hp = Math.round(Math.max(def.hp, m.hp * LEGEND_HP) * coop(n));
    def.dmg = Math.round(Math.max(def.dmg, m.dmg * HIT));
    def.shotDmg = Math.round(Math.max(def.shotDmg, m.dmg * SHOT));
    return def;
  }

  /** Jefe salvaje recién creado en spawner.js (que ya le dio su escala de cooperativo). */
  function boss(e, t, n) {
    const m = mob(t), had = G.Coop.scaleHp(n) * (n > 1 ? 1.4 : 1);
    e.maxHp = e.hp = Math.round(Math.max(e.maxHp / had, m.hp * BOSS_HP) * coop(n));
    e.dmg = Math.max(e.dmg, m.dmg * HIT);      // sus disparos suben con él (Enemy.shotDmg)
  }

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

  return { mob, legend, boss, LV_HP };
})();
