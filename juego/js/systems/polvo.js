/* ============ polvo.js — (mod) polvo regional ============
 * Sólo del mod (ver docs/IDEAS-COLECCION.md, idea B). Decidido con el usuario
 * el 17-10-2026:
 *
 *   - Se abre al 90 % de una región (mismo contador que las medallas: los
 *     shiny cuentan doble). Cuenta el % que tenías AL TIRAR: si una ×10 te
 *     hace pasar del 90 %, el polvo empieza en la siguiente tirada.
 *   - Desde entonces, cada repetido de esa región da, además de las monedas,
 *     polvo de esa región: 1★ 1 · 2★ 2 · 3★ 3 · 4★ 7 · 5★ 30 (legendarios
 *     incluidos). Shiny repetido, el triple.
 *   - Con el polvo de una región compras un Pokémon de esa región que te
 *     falte: 1★ 100 · 2★ 150 · 3★ 300 · 4★ 800 · 5★ 2.000. Los legendarios y
 *     singulares (p.leg) no se venden.
 *   - Cada región tiene su nombre (Polvo Lunar, Polvo Campana...).
 *   - Las regiones cerradas del viaje por regiones (viaje.js) tienen la tienda
 *     cerrada; su polvo se conserva.
 *
 * Se guarda en save.stats como 'polvoG<gen>' (ganado) y 'polvoS<gen>'
 * (gastado): al sincronizar o importar una copia db.js se queda con el mayor
 * de cada stat, así que nunca se pierde lo ganado ni sale saldo negativo.
 *
 * Envuelve G.Gacha.pull (cada resultado repetido lleva r.polvo), G.Medals.dexRow
 * (el bloque "Polvo" en la pestaña de la región de la Pokédex, con la tienda)
 * y G.Travel.gacha (el polvo junto al banner). Gancho en el original (una
 * línea, "(mod) polvo regional"): gacha-ui.js, el polvo en cada carta.
 * Se carga después de viaje.js.
 */
G.Polvo = (() => {
  const OPEN = 0.9;
  const GAIN = { 1: 1, 2: 2, 3: 3, 4: 7, 5: 30 };
  const PRICE = { 1: 100, 2: 150, 3: 300, 4: 800, 5: 2000 };
  const SHINY = 3;
  const NAMES = [
    ['Polvo Lunar', 'Moon Dust'], ['Polvo Campana', 'Bell Dust'], ['Polvo Meteoro', 'Meteor Dust'],
    ['Polvo Lanza', 'Spear Dust'], ['Polvo Dragospiral', 'Dragonspiral Dust'], ['Polvo Mega', 'Mega Dust'],
    ['Polvo Z', 'Z-Dust'], ['Polvo Dinamax', 'Dynamax Dust'], ['Polvo Teracristal', 'Tera Dust']
  ];
  const name = g => NAMES[g - 1][0];
  const regionName = g => G.Medals.REGIONS[g - 1][0];
  const kGot = g => 'polvoG' + g, kSpent = g => 'polvoS' + g;

  /** Polvo de la región `g` que te queda. */
  function balance(s, g) {
    const st = (s && s.stats) || {};
    return Math.max(0, (+st[kGot(g)] || 0) - (+st[kSpent(g)] || 0));
  }

  /** ¿Tiene la región el 90 %? */
  function unlocked(s, g) {
    const r = G.Collection.region(s, g);
    return r.total > 0 && r.pts >= Math.ceil(r.total * OPEN - 1e-9);
  }

  const travelOpen = g => !G.Travel || G.Travel.isOpen(g);

  /** Los que te faltan de la región y se pueden comprar (sin legendarios ni los que no salen en el banner). */
  function missing(s, g) {
    return G.DEX.filter(p => p.gen === g && !p.leg && G.SPRITE_META[p.dex] && !s.owned[p.dex])
      .sort((a, b) => a.rarity - b.rarity || a.dex - b.dex);
  }

  // ---------------- gacha ----------------

  const pull0 = G.Gacha.pull;
  G.Gacha.pull = function (save, n, gen = 1) {
    const on = !!save && unlocked(save, gen);     // el % de antes de tirar
    const res = pull0.apply(this, arguments);
    if (!res || !on) return res;
    let sum = 0;
    for (const r of res) {
      if (r.isNew) continue;
      r.polvo = (GAIN[r.rarity] || 0) * (r.shiny ? SHINY : 1);
      sum += r.polvo;
    }
    if (sum) {
      save.stats = save.stats || {};
      save.stats[kGot(gen)] = (+save.stats[kGot(gen)] || 0) + sum;
    }
    return res;
  };

  /** En la carta del repetido (gacha-ui.js): "+3 Polvo Lunar". */
  function card(c, r) {
    if (!r.polvo) return;
    const mon = G.DEX_BY[r.dex];
    const tag = c.querySelector('.tag');
    if (tag && mon) tag.insertAdjacentHTML('beforeend', `<span class="pv-tag">${G.Icons.html('dust' + mon.gen, 12)} +${r.polvo} ${name(mon.gen)}</span>`);
  }

  // El polvo junto a "Tienes X de Y" del banner, y la regla en las probabilidades.
  if (G.Travel) {
    const gacha0 = G.Travel.gacha;
    G.Travel.gacha = function (g) {
      const r = gacha0.apply(this, arguments);
      const s = G.DB.save, own = document.getElementById('gacha-owned');
      if (s && own && travelOpen(g) && (unlocked(s, g) || balance(s, g))) {
        own.insertAdjacentHTML('beforeend', `<span class="pv-g"> · ${G.Icons.html('dust' + g, 12)} <b>${balance(s, g)}</b> <span>${name(g)}</span></span>`);
      }
      const note = document.querySelector('#gacha-rates .note');
      if (note) note.insertAdjacentHTML('beforeend', `<br><span>· Desde el 90 % de la región, los repetidos dan también ${name(g)}: con él compras en la Pokédex los que te falten.</span>`);
      return r;
    };
  }

  // ---------------- Pokédex ----------------

  const dexRow0 = G.Medals.dexRow;
  G.Medals.dexRow = function (after, gen) {
    const r = dexRow0.apply(this, arguments);
    const el = document.getElementById('dex-medals');
    if (el) el.insertAdjacentHTML('beforeend', section(G.DB.save, gen));
    const b = document.getElementById('pv-open');
    if (b) b.onclick = () => openShop(gen);
    return r;
  };

  function gainLine() {
    return [1, 2, 3, 4, 5].map(k => `<span class="pv-r">${G.UI.stars(k, 9)} ${GAIN[k]}</span>`).join('');
  }

  function section(s, g) {
    const bal = balance(s, g);
    const head = `<div class="dm-head">${G.Icons.html('dust' + g, 16)} <b>${name(g)}</b> <span class="gold">${bal}</span></div>`;
    let body;
    if (!travelOpen(g)) {
      body = `<small class="dm-next">${G.Icons.html('lock', 12)} ${G.Travel.lockText(g)}</small>`;
    } else if (!unlocked(s, g)) {
      const pct = Math.floor(G.Collection.region(s, g).pct * 100);
      body = `<small class="dm-next">Se abre al 90 % de ${regionName(g)} (llevas ${pct} %): desde entonces, los repetidos de ${regionName(g)} dan polvo para comprar los que te falten.</small>`;
    } else {
      const left = missing(s, g).length;
      body = `<div class="pv-gain"><small>Por repetido:</small> ${gainLine()} <small>(shiny ×3)</small></div>
        <button class="btn small gold" id="pv-open" data-sfx="confirm">${G.Icons.html('dust' + g, 12)} <span>Tienda</span> <small>(${left})</small></button>`;
    }
    return `<div class="dm-sec pv-sec">${head}${body}</div>`;
  }

  // ---------------- tienda ----------------

  let shopGen = 0, picked = 0;

  function openShop(g) {
    shopGen = g; picked = 0;
    close(false);
    const ov = document.createElement('div');
    ov.id = 'pv-shop';
    ov.className = 'pp-ov';
    ov.onclick = e => { if (e.target === ov) close(); };
    document.body.appendChild(ov);
    renderShop();
  }

  function renderShop() {
    const ov = document.getElementById('pv-shop');
    if (!ov) return;
    const s = G.DB.save, g = shopGen, bal = balance(s, g);
    if (!travelOpen(g) || !unlocked(s, g)) { close(); return; }
    const list = missing(s, g);
    const prices = [1, 2, 3, 4, 5].map(k => `<span class="pv-r">${G.UI.stars(k, 9)} ${PRICE[k]}</span>`).join('');
    ov.innerHTML = `<div class="box pv-box">
      <div class="row between"><h2>${G.Icons.html('dust' + g, 24)} <span>Tienda de polvo</span> <small class="gold">${name(g)}</small></h2><button class="btn small ghost" id="pv-close">Cerrar</button></div>
      <p class="sub">Compra con ${name(g)} los Pokémon de ${regionName(g)} que te falten. Los legendarios y singulares no se venden: ésos, del banner o de las grietas.</p>
      <div class="pv-top"><span>Tu polvo: <b class="gold">${bal}</b></span>
        <div class="pv-gain"><small>Precio:</small> ${prices}</div></div>
      <div class="pv-grid" id="pv-grid"></div>
      <div class="pv-ask" id="pv-ask"></div></div>`;
    const grid = document.getElementById('pv-grid');
    for (const p of list) {
      const price = PRICE[p.rarity], can = bal >= price;
      const c = document.createElement('div');
      c.className = 'pv-cell' + (can ? '' : ' poor') + (p.dex === picked ? ' on' : '');
      c.insertAdjacentHTML('beforeend', `<span class="no">${String(p.dex).padStart(3, '0')}</span>`);
      c.appendChild(G.UI.spriteCanvas(p.dex, 72, 64, { scale: 2, silhouette: true }));
      c.insertAdjacentHTML('beforeend', `<b>${p.name}</b>${G.UI.stars(p.rarity, 9)}<span class="pv-price">${G.Icons.html('dust' + g, 12)} ${price}</span>`);
      c.onclick = () => {
        if (!can) { G.Audio.sfx('error'); G.UI.toast(`Te falta ${name(g)}: cuesta ${price} y tienes ${bal}`); return; }
        G.Audio.sfx('select');
        picked = p.dex;
        grid.querySelectorAll('.pv-cell').forEach(x => x.classList.toggle('on', x === c));
        ask();
      };
      grid.appendChild(c);
    }
    if (!list.length) grid.innerHTML = `<p class="sub" style="grid-column:1/-1">¡No te falta ninguno que se pueda comprar en ${regionName(g)}!</p>`;
    document.getElementById('pv-close').onclick = () => close();
    ask();
  }

  /** La confirmación de compra, debajo de la lista. */
  function ask() {
    const box = document.getElementById('pv-ask');
    if (!box) return;
    const p = G.DEX_BY[picked];
    if (!p || G.DB.save.owned[picked]) { box.innerHTML = '<small class="sub">Elige el que quieras comprar.</small>'; return; }
    const price = PRICE[p.rarity];
    box.innerHTML = `<span>¿Comprar a ${p.name} por ${price} ${name(shopGen)}?</span>
      <button class="btn small gold" id="pv-buy">Comprar</button><button class="btn small ghost" id="pv-no">Cancelar</button>`;
    document.getElementById('pv-buy').onclick = () => buy(picked);
    document.getElementById('pv-no').onclick = () => { picked = 0; renderShop(); };
  }

  /** Compra `dex` con el polvo de su región. true si se ha comprado. */
  function buy(dex) {
    const s = G.DB.save, p = G.DEX_BY[dex];
    if (!s || !p || p.leg || s.owned[dex] || !travelOpen(p.gen) || !unlocked(s, p.gen)) return false;
    const price = PRICE[p.rarity];
    if (!price || balance(s, p.gen) < price) { G.Audio.sfx('error'); return false; }
    s.stats[kSpent(p.gen)] = (+s.stats[kSpent(p.gen)] || 0) + price;
    G.DB.grant(dex, 'polvo');
    G.Progress.checkAch();
    G.DB.commit(true);
    G.Audio.sfx('buy');
    G.UI.toast(`¡${p.name} es tuyo!`);
    picked = 0;
    renderShop();
    return true;
  }

  /** Cierra la tienda y (si se compró algo) repinta la Pokédex. */
  function close(refresh = true) {
    const ov = document.getElementById('pv-shop');
    if (!ov) return;
    ov.remove();
    if (refresh) {
      const tab = document.querySelector('#dex-gens .gen-tab.on');
      if (tab) tab.click();
    }
  }

  // ---------------- aspecto ----------------

  // Un montoncito de polvo con brillos, del color de cada región.
  const PAL = [['#dfe8ff', '#8a9cd6'], ['#ffd27a', '#c0862a'], ['#ff9a6a', '#b84a2a'], ['#d2a8ff', '#7a50c0'],
               ['#a6e0d0', '#4a8a7a'], ['#ff8ad6', '#b03a8a'], ['#fff07a', '#c0a020'], ['#ff6a8a', '#a82a4a'],
               ['#8af0ff', '#2a9ab8']];
  const ROWS = ['..w.......w.', '.wyw.....wyw', '..w.......w.', '.....kk.....', '....kyyk....', '...kyywyk...',
                '..kyyyyyok..', '.kyywyyyyok.', 'kyyyyyywyyok', 'kyyyyyyyyook', 'kooooooooook', '.kkkkkkkkkk.'];
  PAL.forEach(([y, o], i) => { G.Icons.UI['dust' + (i + 1)] = { pal: { y, o, w: '#ffffff' }, rows: ROWS }; });

  const CSS = `
    .dex-medals .pv-sec { flex: 1 1 220px; }
    .dex-medals .pv-sec .dm-head { display: flex; align-items: center; gap: 5px; }
    .pv-gain { display: flex; flex-wrap: wrap; align-items: center; gap: 2px 8px; }
    .pv-gain small { color: var(--muted); }
    .pv-r { display: inline-flex; align-items: center; gap: 3px; white-space: nowrap; }
    #pv-open { align-self: flex-start; display: inline-flex; align-items: center; gap: 5px; margin-top: 2px; }
    .pv-box { width: min(720px, 100%); max-height: 100%; overflow: auto; }
    .pv-box h2 { display: flex; align-items: center; gap: 8px; }
    .pv-top { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 6px 14px;
              padding: 6px 10px; border-radius: 10px; background: rgba(0,0,0,.22); }
    .pv-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 6px; margin: 10px 0;
               max-height: 46vh; overflow: auto; }
    .pv-cell { position: relative; display: flex; flex-direction: column; align-items: center; gap: 1px; padding: 4px;
               border-radius: 10px; background: rgba(0,0,0,.25); border: 2px solid transparent; cursor: pointer; }
    .pv-cell .no { position: absolute; left: 5px; top: 3px; font-size: 10px; color: var(--muted); }
    .pv-cell b { font-size: 12px; text-align: center; }
    .pv-cell.on { border-color: var(--gold); }
    .pv-cell.poor { opacity: .5; }
    .pv-price { display: inline-flex; align-items: center; gap: 3px; font-size: 13px; color: var(--gold); }
    .pv-ask { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; min-height: 34px; }
    .pv-ask > span { flex: 1 1 200px; }
    .pv-tag { display: block; color: #ffe98a; }
    .pv-g { white-space: nowrap; }`;
  const st = document.createElement('style');
  st.textContent = CSS;
  document.head.appendChild(st);

  return { OPEN, GAIN, PRICE, NAMES, name, balance, unlocked, missing, card, buy, openShop };
})();
