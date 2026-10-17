/* ============ registro.js — (mod) registro de las últimas partidas ============
 * Apunta cómo va cada partida para ajustar el equilibrio con datos reales (la
 * partida guardada sólo tiene totales). Se guarda en ESTE dispositivo, en su
 * propia clave ('ps.registro.<cuenta>', fuera de la partida: no se sube a
 * ninguna nube), con las últimas MAX partidas, y se exporta en un .json desde
 * Ajustes > Cuenta ("Exportar registro").
 *
 * De cada partida: fecha, mapa, tu Pokémon (shiny, mejoras de la tienda,
 * movimientos y objeto al acabar), solitario o cooperativo (cuántos),
 * duración, nivel, derrotados, y una línea por minuto:
 *   lv, hp, hpMax         al cerrar el minuto
 *   vivos, elite, jefe    enemigos vivos, cuántos son élite, si hay jefe
 *   kills, hecho          derrotados y daño hecho en ese minuto (G.Danyo)
 *   rec { golpe, disparo, zona, rayo, otro }   daño recibido en ese minuto
 *   n   { ... }           cuántos golpes de cada clase
 * Cada caída: qué te dio el último golpe y qué enemigos había cerca.
 * Cada grieta: cuándo se abre, cuándo entras, contra quién, cuánto dura y si ganas.
 *
 * No toca el original: envuelve métodos (Player.hurt/update, Enemy.update/
 * strike, Projectiles.spawn, Hazards.add/update, Combat.resolve,
 * Interact.update, Judgment.update, Rift.update,
 * Game.startRun y RunUI.showOver). Sólo cuenta lo TUYO (G.Game.player).
 */
G.Registro = (() => {
  const MAX = 30;                       // partidas que se guardan
  const NEAR = 260;                     // "cerca" al caer (px)
  const r1 = v => Math.round(v * 10) / 10;
  const mine = p => !!p && G.Game && p === G.Game.player;
  const key = () => 'ps.registro.' + (G.DB.user || 'invitado');

  function load() {
    try { const v = JSON.parse(localStorage.getItem(key())); return Array.isArray(v) ? v : []; }
    catch (e) { return []; }
  }
  function store(list) {
    try { localStorage.setItem(key(), JSON.stringify(list.slice(-MAX))); } catch (e) { /* sin sitio: nada */ }
  }

  let run = null;                       // partida en curso
  let acc = null;                       // lo de este minuto
  let ctx = null;                       // de dónde viene el daño que entra ahora
  let curEnemy = null;                  // enemigo que está actuando ahora (para disparos y zonas)
  let striker = null;                   // enemigo que acaba de tocarte (combat.js: strike y hurt seguidos)

  const blank = () => ({ kills: 0, hecho: 0, rec: { golpe: 0, disparo: 0, zona: 0, rayo: 0, otro: 0 }, n: {} });

  /** Daño total hecho hasta ahora (movimientos y objetos, de G.Danyo). */
  function dealt(pl) {
    const b = pl._dn;
    if (!b) return 0;
    let s = 0;
    for (const k in b.mv) s += b.mv[k];
    for (const k in b.it) s += b.it[k].d || 0;
    return s;
  }

  const who = e => e ? { de: e.name || null, elite: !!e.elite || undefined, jefe: !!e.boss || undefined } : {};

  // ---------------- empezar y acabar ----------------

  function begin(coop) {
    const s = G.DB.save, pl = G.Game.player;
    if (!s || !pl) { run = null; return; }
    const gen = G.Maps ? G.Maps.gen : 0;
    run = {
      fecha: new Date().toISOString(),
      mapa: G.Maps ? G.Maps.name(gen) : 'Mundo Distorsión', gen,
      poke: { dex: pl.dex, nombre: pl.mon.name, shiny: !!pl.shiny, tipos: pl.mon.types,
              mejoras: Object.assign({}, G.DB.upgradesOf(pl.dex)) },
      grupo: coop ? (coop.members ? coop.members.length : 2) : 1,
      min: [], caidas: [], grietas: []
    };
    acc = blank();
    run._t0 = 0; run._d0 = 0; run._k0 = 0; run._arena = null; run._rift = false;
  }

  /** Cierra la línea del minuto (o el trozo final). */
  function row(pl, t) {
    const all = G.EnemyMgr.all();
    let vivos = 0, elite = 0, jefe = false;
    for (const e of all) {
      if (e.dead) continue;
      vivos++;
      if (e.elite) elite++;
      if (e.boss) jefe = true;
    }
    const d = dealt(pl);
    acc.hecho = Math.round(d - run._d0); run._d0 = d;
    acc.kills = pl.kills - run._k0; run._k0 = pl.kills;
    for (const k in acc.rec) acc.rec[k] = Math.round(acc.rec[k]);
    run.min.push(Object.assign({ t: Math.round(t), lv: pl.level, hp: Math.round(pl.hp), hpMax: Math.round(pl.maxHp),
      vivos, elite, jefe: jefe || undefined, arena: G.Rift.inArena || undefined }, acc));
    acc = blank();
  }

  function finish(info) {
    const pl = G.Game.player;
    if (!run || !pl) { run = null; return; }
    const t = info.time || 0;
    if (t - run.min.length * 60 > 5 || !run.min.length) row(pl, t);
    if (run._arena) endArena(t);
    Object.assign(run, {
      dur: Math.round(t), nivel: info.level, kills: info.kills, jefes: info.bosses,
      murio: !!info.dead, abandono: !info.dead || undefined,
      objeto: pl.item || null,
      movs: pl.moves.map(m => ({ id: m.id, lv: m.lvl })),
      vinculos: pl.slots.filter(g => g.length > 1).map(g => g.map(m => m.id))
    });
    for (const k of Object.keys(run)) if (k[0] === '_') delete run[k];
    const list = load();
    list.push(run);
    store(list);
    run = null; acc = null;
  }

  // ---------------- cada fotograma (tras Rift.update) ----------------

  function tick(pl, t) {
    if (!run || !mine(pl)) return;
    while (t >= (run.min.length + 1) * 60) row(pl, (run.min.length + 1) * 60);
    // Grietas: se abre, entras, acaba.
    const open = !!G.Rift.rift;
    if (open && !run._rift) run.grietas.push({ abre: Math.round(t), entra: null });
    run._rift = open;
    const a = G.Rift.arena;
    if (a && !run._arena) {
      let g = run.grietas[run.grietas.length - 1];
      if (!g || g.entra != null) { g = { abre: null }; run.grietas.push(g); }
      const mon = G.DEX_BY[a.dex];
      Object.assign(g, { entra: Math.round(t), contra: mon ? mon.name : a.dex, shiny: !!a.shiny || undefined, hp: Math.round(pl.hp), hpMax: Math.round(pl.maxHp) });
      run._arena = g;
    }
    if (run._arena) {
      if (a && a.phase !== 'fight') run._arena.gana = a.phase === 'won';
      if (a && a.phase === 'fight') run._arena._end = t;
      if (!a) endArena(t);
    }
  }

  function endArena(t) {
    const g = run._arena;
    g.dura = Math.round((g._end || t) - g.entra);
    if (g.gana == null) g.gana = false;
    delete g._end;
    run._arena = null;
  }

  // ---------------- daño recibido ----------------

  function hitInfo(pl, type, pure) {
    if (ctx === 'resolve') {
      if (striker) { const e = striker; striker = null; return Object.assign({ k: 'golpe' }, who(e)); }
      const p = G.Projectiles.all().find(p => !p.friendly && G.U.dist2(p.x, p.y, pl.x, pl.y) < (p.r + pl.r) * (p.r + pl.r));
      return Object.assign({ k: 'disparo' }, p && p._from);
    }
    if (ctx === 'zona') {
      let best = null;
      for (const h of G.Hazards.all) {
        if (h.hit && h.t - h.delay < 0.2 && G.Hazards.inside(h, pl.x, pl.y, pl.r)) best = h;
      }
      const from = best && best._from || (pure ? { de: 'Arceus' } : {});
      return Object.assign({ k: best && best.kind === 'beam' ? 'rayo' : 'zona' }, from);
    }
    if (ctx === 'arceus') return { k: 'golpe', de: 'Arceus' };
    if (ctx === 'terreno') return { k: 'otro', de: 'terreno' };
    if (ctx === 'trampa') return { k: 'otro', de: 'trampa' };
    return { k: 'otro' };
  }

  function nearby(pl) {
    const names = {};
    let n = 0, elite = 0;
    for (const e of G.EnemyMgr.queryCircle(pl.x, pl.y, NEAR)) {
      if (e.dead || G.U.dist2(e.x, e.y, pl.x, pl.y) > NEAR * NEAR) continue;
      n++;
      if (e.elite) elite++;
      names[e.name] = (names[e.name] || 0) + 1;
    }
    const top = Object.entries(names).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => v > 1 ? k + ' ×' + v : k);
    return { n, elite, quienes: top };
  }

  const P = G.Player.prototype;
  const hurt = P.hurt;
  P.hurt = function (amount, type, pure) {
    if (!run || !mine(this) || this.dead || this.invuln > 0) return hurt.apply(this, arguments);
    const hp0 = this.hp;
    const r = hurt.apply(this, arguments);
    const d = Math.max(0, hp0 - this.hp);
    if (d > 0) {
      const h = hitInfo(this, type, pure);
      acc.rec[h.k] += d;
      acc.n[h.k] = (acc.n[h.k] || 0) + 1;
      this._regLast = Object.assign(h, { tipo: type || undefined, d: Math.round(d) });
    }
    if (this.dead) {
      run.caidas.push({ t: Math.round(G.Game.st.time), lv: this.level, hpMax: Math.round(this.maxHp),
        arena: G.Rift.inArena || undefined, causa: this._regLast || null, cerca: nearby(this) });
    }
    return r;
  };

  /** Ejecuta fn con el origen del daño `c` (y lo deja como estaba). */
  function within(obj, name, c) {
    const orig = obj[name];
    obj[name] = function () {
      const prev = ctx; ctx = c;
      try { return orig.apply(this, arguments); }
      finally { ctx = prev; if (c === 'resolve') striker = null; }
    };
  }
  within(G.Combat, 'resolve', 'resolve');
  within(G.Hazards, 'update', 'zona');
  within(G.Interact, 'update', 'trampa');
  within(G.Judgment, 'update', 'arceus');
  const pUpdate = P.update;
  P.update = function () {
    if (!mine(this)) return pUpdate.apply(this, arguments);
    const prev = ctx; ctx = 'terreno';
    try { return pUpdate.apply(this, arguments); } finally { ctx = prev; }
  };

  // Quién dispara y quién pone zonas o rayos.
  const E = G.Enemy.prototype;
  const eUpdate = E.update;
  E.update = function () {
    const prev = curEnemy; curEnemy = this;
    try { return eUpdate.apply(this, arguments); } finally { curEnemy = prev; }
  };
  const strike = E.strike;
  E.strike = function (pl) {
    if (mine(pl)) striker = this;
    return strike.apply(this, arguments);
  };
  const spawn = G.Projectiles.spawn;
  G.Projectiles.spawn = function (o) {
    const p = spawn.apply(this, arguments);
    if (p && o && !o.friendly && curEnemy) p._from = who(curEnemy);
    return p;
  };
  const hzAdd = G.Hazards.add;
  G.Hazards.add = function (h) {
    const o = hzAdd.apply(this, arguments);
    if (o && curEnemy) o._from = who(curEnemy);
    return o;
  };

  // Élite: los marca spawner.js (e.elite). Desde el 17-10-2026 no salen (ELITE_FROM).

  // ---------------- ganchos de la partida ----------------

  const riftUpdate = G.Rift.update;
  G.Rift.update = function (dt, pl, time) {
    const r = riftUpdate.apply(this, arguments);
    try { tick(pl, time); } catch (e) { console.warn('registro', e); }
    return r;
  };
  const startRun = G.Game.startRun;
  G.Game.startRun = function (coop) {
    const r = startRun.apply(this, arguments);
    try { begin(coop); } catch (e) { console.warn('registro', e); run = null; }
    return r;
  };
  const showOver = G.RunUI.showOver;
  G.RunUI.showOver = function (info) {
    try { finish(info || {}); } catch (e) { console.warn('registro', e); run = null; }
    return showOver.apply(this, arguments);
  };

  // ---------------- exportar ----------------

  function exportar() {
    const list = load();
    if (!list.length) { G.UI.toast(G.T('Aún no hay partidas en el registro.')); return; }
    const data = { juego: 'PokeSurvivor', tipo: 'registro', v: 1, fecha: new Date().toISOString(), cuenta: G.DB.user || 'invitado', partidas: list };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' }));
    a.download = 'PokeSurvivor-registro-' + (G.DB.user || 'invitado').replace(/[^\w-]+/g, '') + '-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
    G.UI.toast(G.T('Registro exportado'));
  }

  // Ajustes > Cuenta (se vuelve a pintar cada vez): su bloque, tras la copia de la partida.
  function block() {
    const div = document.createElement('div');
    div.id = 'set-registro';
    const n = load().length;
    div.innerHTML = `<h3 class="set-h">Registro de partidas</h3>
      <p class="sub">Cómo fueron tus últimas ${MAX} partidas, minuto a minuto (vida, enemigos, daño hecho y recibido, caídas y grietas). Se guarda sólo en este dispositivo. Sirve para ajustar la dificultad del juego.</p>
      <div class="row wrap" style="gap:8px">
        <button class="btn" id="set-registro-exp">Exportar registro</button>
        <span class="sub" style="align-self:center">${n === 1 ? '1 partida' : n + ' partidas'}</span>
      </div>`;
    div.querySelector('#set-registro-exp').onclick = exportar;
    return div;
  }
  const body = document.getElementById('set-body');
  if (body) {
    new MutationObserver(() => {
      if (document.getElementById('set-logout') && !document.getElementById('set-registro') && G.DB.save) {
        const after = document.getElementById('set-savefile') || document.getElementById('set-msg');
        body.insertBefore(block(), after ? after.nextSibling : null);
      }
    }).observe(body, { childList: true });
  }

  return { load, exportar, get actual() { return run; } };
})();
