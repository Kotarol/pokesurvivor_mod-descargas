/* ============ danyo-ui.js — (mod) daño de la partida en la pausa y al acabar ============
 * La pausa enseña tus movimientos (nivel y vínculo) y tus objetos con el daño
 * de cada uno, su daño por segundo y su % del total, de más a menos. El resumen final, lo mismo
 * como "Top de daño", con el primero destacado (en lugar de la fila de
 * movimientos). Los objetos que no hacen daño propio van aparte, con lo que
 * aportan (daño extra, vida recuperada...). Lo apuntado: js/systems/danyo.js.
 *
 * Envuelve G.RunUI.showPause y G.RunUI.showOver: run-ui.js no se toca. Del
 * resumen de la pausa del original (18-10-2026) se quita su tabla de ataques.
 */
G.DanyoUI = (() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const en = () => G.I18n.lang === 'en';
  const num = n => Math.round(n).toLocaleString(en() ? 'en-US' : 'es-ES');
  const pct = n => (n >= 10 || n === 0 ? Math.round(n) : n.toFixed(1).replace('.', en() ? '.' : ',')) + (en() ? '%' : ' %');

  const CSS = `
.dn { text-align: left; margin: 8px 0 14px; }
.dn-head { display: flex; justify-content: space-between; align-items: baseline; color: var(--muted); font-size: 12px; text-transform: uppercase; margin-bottom: 4px; }
.dn-head b { color: var(--ink); font-size: 15px; text-transform: none; }
.dn-list { max-height: 38vh; overflow-y: auto; display: grid; gap: 3px; }
.dn-row { position: relative; display: flex; align-items: center; gap: 6px; padding: 4px 8px; border-radius: 7px; background: rgba(0,0,0,.22); font-size: 14px; overflow: hidden; }
.dn-row > * { position: relative; }
.dn-row > i { position: absolute; left: 0; top: 0; bottom: 0; background: rgba(95,131,214,.38); }
.dn-row .nm { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dn-row small { color: var(--muted); font-size: 11px; }
.dn-row .tag { color: #c9a0ff; }
.dn-row .val { font-weight: 700; }
.dn-row .pc { width: 44px; text-align: right; color: var(--muted); font-size: 12px; }
.dn-row .dps { width: 62px; text-align: right; color: var(--muted); font-size: 12px; white-space: nowrap; }
.dn-head b small { color: var(--muted); font-size: 12px; font-weight: 400; }
.dn-row.top { box-shadow: inset 0 0 0 2px var(--gold); }
.dn-row.top .nm, .dn-row.top .val { color: var(--gold); }
.dn-row.top > i { background: rgba(255,210,63,.32); }
.dn-row.none .val { color: var(--muted); font-weight: 400; }
.dn-sub { color: var(--muted); font-size: 12px; text-transform: uppercase; margin: 6px 0 1px; }
.dn-row.it { flex-wrap: wrap; }
.dn-row.it .nm { flex: 1 1 auto; white-space: normal; }
.dn-row.it .data { color: var(--muted); font-size: 12px; text-align: right; margin-left: auto; white-space: nowrap; }
.dn-row.it .data b { color: var(--ink); font-size: 14px; }
.stats > .dn-over { grid-column: 1 / -1; margin: 0; }`;

  function style() {
    if ($('dn-css')) return;
    const s = document.createElement('style');
    s.id = 'dn-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  /** Lo que aporta un objeto, como [etiqueta, valor] (o un texto suelto). */
  function itemData(pl, id, s, over) {
    const k = G.Danyo.BOOST[id];
    if (k) return ['Daño extra', `≈ ${num(s.x)} (+${Math.round((k - 1) * 100)}${en() ? '%' : ' %'})`];
    switch (id) {
      case 'rockyhelmet': return s.d ? ['Daño', num(s.d)] : 'Aún no ha hecho daño';
      case 'leftovers': case 'shellbell': return ['Vida recuperada', '≈ ' + num(s.heal)];
      case 'luckyegg': return ['Experiencia extra', num(s.xp)];
      case 'quickclaw': return ['Ataques de más', '≈ ' + num(s.casts)];
      case 'choicescarf': return ['Casillas de más recorridas', '≈ ' + num(s.dist / 32)];
      case 'assaultvest': return ['Daño evitado', '≈ ' + num(s.avoid)];
      case 'focussash': return ['Veces que te ha salvado', num(s.saves)];
      case 'amuletcoin':
        if (!over) return G.Items.BY[id].desc;
        return ['Pokémonedas extra', pl.hasItem(id) ? '≈ ' + num(over.coins * (1 - 1 / 1.5)) : '0'];
    }
    return null;
  }

  /** HTML de la lista. @param over  el resumen de endRun (null en la pausa). */
  function html(pl, over) {
    const b = G.Danyo.book(pl);
    const now = G.Game.st.time;
    const rows = [];
    const seen = new Set();
    // secs: segundos desde que lo tienes (movimientos: m.since del original) o
    // que lo has llevado (Casco Dentado), para el daño por segundo.
    for (const m of pl.moves) {
      seen.add(m.id);
      const slot = pl.slots.find(g => g.includes(m));
      rows.push({ ico: 'move:' + m.id, name: m.name, lvl: m.lvl, bond: !!slot && slot.length > 1,
                  partners: slot ? slot.filter(o => o !== m).map(o => o.name) : [], d: b.mv[m.id] || 0,
                  secs: now - (m.since || 0) });
    }
    // Uno que ya no tienes (por si acaso): sale sin nivel.
    for (const id in b.mv) {
      if (!seen.has(id) && G.Moves.BY_ID[id]) rows.push({ ico: 'move:' + id, name: G.Moves.BY_ID[id].name, d: b.mv[id] });
    }
    const helmet = b.it.rockyhelmet;
    if (helmet && helmet.d) rows.push({ ico: 'rockyhelmet', name: G.Items.BY.rockyhelmet.name, item: true, d: helmet.d, secs: helmet.t });
    rows.sort((a, c) => c.d - a.d);
    const total = rows.reduce((t, r) => t + r.d, 0);
    // Daño por segundo (como en el resumen del original, con al menos 5 s para
    // que lo recién aprendido no salga disparado).
    const dps = (d, secs) => (d && secs != null ? num(d / Math.max(5, secs)) + '/s' : '');

    const list = rows.map((r, i) => {
      const p = total ? r.d / total * 100 : 0;
      const top = over && i === 0 && r.d > 0;
      return `<div class="dn-row${top ? ' top' : ''}${r.d ? '' : ' none'}"${r.bond ? ` title="${esc(r.partners.join(' · '))}"` : ''}>
        <i style="width:${p.toFixed(1)}%"></i>${G.Icons.html(r.ico, 18)}
        <span class="nm">${esc(r.name)}${r.lvl ? ` <small>${en() ? 'Lv.' : 'Nv.'}${r.lvl}</small>` : ''}${r.bond ? ` <small class="tag">Vínculo</small>` : ''}${r.item ? ` <small>Objeto</small>` : ''}</span>
        <span class="val">${r.d ? num(r.d) : '—'}</span><span class="dps" title="Daño por segundo desde que lo tienes">${dps(r.d, r.secs)}</span><span class="pc">${r.d ? pct(p) : ''}</span></div>`;
    }).join('');

    const its = b.order.filter(id => G.Items.BY[id] && !(id === 'rockyhelmet' && helmet.d)).map(id => {
      const s = b.it[id], dt = itemData(pl, id, s, over);
      const data = !dt ? '' : typeof dt === 'string' ? `<span>${esc(dt)}</span>` : `<span>${esc(dt[0])}</span>: <b>${esc(dt[1])}</b>`;
      return `<div class="dn-row it">${G.Icons.html(id, 18)}<span class="nm">${esc(G.Items.BY[id].name)}
        <small>· <span>Llevado</span> ${G.U.mmss(s.t)}</small></span><span class="data">${data}</span></div>`;
    }).join('');

    return `<div class="dn-head"><span>${over ? 'Top de daño' : 'Daño de la partida'}</span>
        <b><span>Total</span>: ${num(total)}${total ? ` <small>· ${dps(total, now)}</small>` : ''}</b></div>
      <div class="dn-list">${list || '<div class="dn-row none"><span class="nm">—</span></div>'}
      ${its ? `<div class="dn-sub">Objetos</div>${its}` : ''}</div>`;
  }

  // ---------------- pausa ----------------
  let timer = 0;
  function renderPause() {
    const pl = G.Game.player, box = $('dn-pause');
    if (!pl || !box) return;
    box.innerHTML = html(pl, null);
  }

  const showPause = G.RunUI.showPause;
  G.RunUI.showPause = function (coop) {
    style();
    let box = $('dn-pause');
    if (!box) {
      box = document.createElement('div');
      box.id = 'dn-pause';
      box.className = 'dn';
      const row = $('scr-pause').querySelector('.row');
      row.parentNode.insertBefore(box, row);
    }
    const r = showPause.apply(this, arguments);
    // (19-10-2026) El original añadió su resumen debajo (#pause-sum). Se quedan
    // sus estadísticas y cartas, pero no su "Tus ataques": repite esta lista con
    // otra cuenta (suma también lo que sobra al tumbar a un enemigo).
    const sumMoves = $('pause-sum') && $('pause-sum').querySelector('table.sum-moves');
    if (sumMoves) {
      const h = sumMoves.previousElementSibling;
      if (h && h.tagName === 'H3') h.remove();
      sumMoves.remove();
    }
    renderPause();
    // En grupo el juego sigue con la pausa abierta: la lista se va poniendo al día.
    clearInterval(timer);
    if (coop) timer = setInterval(() => {
      if (!G.UI.isOpen('scr-pause') || !G.Game.player) { clearInterval(timer); return; }
      renderPause();
    }, 1000);
    return r;
  };

  // ---------------- resumen final ----------------
  const showOver = G.RunUI.showOver;
  G.RunUI.showOver = function (r) {
    const res = showOver.apply(this, arguments);
    const pl = G.Game.player;
    if (!pl) return res;
    style();
    const stats = $('over-stats');
    const box = document.createElement('div');
    box.className = 'dn dn-over';
    box.innerHTML = html(pl, r);
    // En el sitio de la fila "Movimientos" (salen todos, con su nivel).
    const movesRow = [...stats.children].find(d => /(Nv|Lv)\.\d/.test(d.textContent) && !d.classList.contains('caught'));
    if (movesRow) stats.replaceChild(box, movesRow);
    else stats.appendChild(box);
    return res;
  };

  return { html };
})();
