/* ============ viaje.js — (mod) viaje por regiones ============
 * Sólo del mod (ver docs/IDEAS-COLECCION.md, idea 9).
 *
 *   Como en los juegos: no puedes ir a la siguiente región sin ser campeón de
 *   la Liga de la anterior. Orden fijo Kanto → Johto → … → Paldea.
 *   - Abiertas desde el principio: Kanto y la región de tu primer compañero
 *     (save.starter, el del test). Las demás, cerradas aunque ya tengas
 *     Pokémon de ellas.
 *   - Vencer al campeón de la Liga de una región abierta (league.js, logro
 *     save.ach['ligaw_<gen>']) abre la siguiente en el orden que siga cerrada
 *     (después de Paldea vuelve a empezar: quien empezó en Paldea también abre
 *     una al vencer a su campeón).
 *   - Una región cerrada no tiene mapa (maps-ui.js) ni banner (gacha-ui.js):
 *     candado y "Vence al campeón de la Liga de <anterior> para viajar a
 *     <región>". Sus Pokémon no salen en ningún sitio: el Mundo Distorsión
 *     mezcla sólo las abiertas (maps.js). Tampoco se pueden elegir de
 *     compañero (menu.js); si lo era, vuelve a serlo tu primer compañero.
 *
 * No se guarda nada propio: las regiones abiertas salen siempre de save.starter
 * y de los logros ligaw_<gen> (save.ach), así se juntan bien al sincronizar o
 * importar una copia. Que cada campeón abra "la siguiente cerrada" da el mismo
 * resultado sea cual sea el orden en que se vencieron.
 *
 * Ganchos en el original (una línea cada uno, con "(mod) viaje por regiones"):
 * gacha-ui.js (refresh) y menu.js (elegir compañero). Envuelve G.Gacha.pull,
 * G.Progress.kill y G.Rift.update (el aviso, al salir de la arena),
 * G.Collection.detailHtml y G.Flow.goMenu (por eso se carga después de game.js).
 */
G.Travel = (() => {
  const N = 9;
  const regionName = g => G.Medals.REGIONS[g - 1][0];

  // ---------------- regiones abiertas ----------------

  let cache = null, cacheKey = '', cacheSave = null;

  /** Regiones abiertas (Set de 1..9) de un guardado. */
  function open(s = G.DB.save) {
    if (!s) return new Set([1]);
    const won = g => !!(s.ach && s.ach['ligaw_' + g]);
    const first = G.DEX_BY[s.starter] || G.DEX_BY[s.partner];   // cuentas sin test: su compañero
    let key = (first ? first.gen : 0) + ':';
    for (let g = 1; g <= N; g++) key += won(g) ? 1 : 0;
    if (s === cacheSave && key === cacheKey) return cache;

    const base = new Set([1]);
    if (first) base.add(first.gen);
    let res = base;
    // Cada campeón vencido de una región abierta abre la siguiente cerrada;
    // las que se abren pueden tener ya su campeón vencido: se repite hasta que no cambie.
    for (;;) {
      const next = new Set(base);
      for (let g = 1; g <= N; g++) {
        if (!res.has(g) || !won(g)) continue;
        for (let k = 1; k < N; k++) {
          const h = (g - 1 + k) % N + 1;
          if (!next.has(h)) { next.add(h); break; }
        }
      }
      if (next.size === res.size) break;
      res = next;
    }
    cache = res; cacheKey = key; cacheSave = s;
    return res;
  }

  const isOpen = g => open().has(g);
  const allOpen = () => open().size >= N;

  /** "Vence al campeón de la Liga de <anterior> para viajar a <región>". */
  function lockText(g) {
    return `Vence al campeón de la Liga de ${regionName(g > 1 ? g - 1 : N)} para viajar a ${regionName(g)}`;
  }

  // ---------------- gacha ----------------

  /** Pestañas y banner de la región `g` (gacha-ui.js, al final de refresh). */
  function gacha(g) {
    document.querySelectorAll('#gacha-gens .gen-tab').forEach(t => {
      const shut = !isOpen(+t.dataset.gen);
      t.classList.toggle('tv-shut', shut);
      let ic = t.querySelector('.tv-ic');
      if (shut && !ic) t.querySelector('b').insertAdjacentHTML('afterbegin', `<span class="tv-ic">${G.Icons.html('lock', 12)} </span>`);
      else if (!shut && ic) ic.remove();
    });
    const banner = document.getElementById('banner');
    let box = document.getElementById('tv-gacha');
    if (isOpen(g)) { if (box) box.remove(); return; }
    if (!box) {
      box = document.createElement('div');
      box.id = 'tv-gacha';
      box.className = 'tv-lock';
      banner.appendChild(box);
    }
    box.innerHTML = `${G.Icons.html('lock', 36)}<b>${regionName(g)} está cerrada</b><span>${lockText(g)}</span>`;
    for (const id of ['pull-1', 'pull-10', 'pull-10b']) document.getElementById(id).disabled = true;
  }

  // Por si acaso: en una región cerrada no se tira.
  const pull0 = G.Gacha.pull;
  G.Gacha.pull = function (save, n, gen = 1, use) {
    if (!open(save).has(gen)) return null;
    return pull0.apply(this, arguments);
  };

  // ---------------- compañero ----------------

  /** Al pulsar "Elegir de compañero" (menu.js): true si no se puede (con el aviso). */
  function blockPartner(mon) {
    if (!mon || isOpen(mon.gen)) return false;
    G.Audio.sfx('error');
    G.UI.toast(lockText(mon.gen), 3500);
    return true;
  }

  // El aviso, también en la ficha de la Pokédex (debajo de afinidad y sinergia).
  const detail0 = G.Collection.detailHtml;
  G.Collection.detailHtml = function (dex) {
    const html = detail0.apply(this, arguments), mon = G.DEX_BY[dex];
    if (!mon || isOpen(mon.gen)) return html;
    return html + `<p class="tv-note">${G.Icons.html('lock', 14)} ${lockText(mon.gen)}</p>`;
  };

  /** Si tu compañero es de una región cerrada (ya lo tenías), vuelve a serlo el primero. */
  function fixPartner() {
    const s = G.DB.save, mon = s && G.DEX_BY[s.partner];
    if (!mon || isOpen(mon.gen) || !G.DEX_BY[s.starter]) return;
    s.partner = s.starter;
    s.partnerShiny = false;
    G.DB.commit();
    G.UI.toast(`${regionName(mon.gen)} está cerrada: ${G.DEX_BY[s.starter].name} vuelve a ser tu compañero`, 4500);
  }

  // ---------------- al vencer al campeón ----------------

  let fresh = [];   // regiones abiertas en esta partida (se avisa también al volver al menú)
  let tell = [];    // avisos para cuando acabe la arena (si no, los tapa "¡Has vencido a…!")
  const kill0 = G.Progress.kill;
  G.Progress.kill = function (e) {
    const before = open();
    const r = kill0.apply(this, arguments);
    const now = open();
    if (now !== before) {
      for (let g = 1; g <= N; g++) {
        if (now.has(g) && !before.has(g) && !fresh.includes(g)) { fresh.push(g); tell.push(g); }
      }
    }
    return r;
  };
  let tellT = 0;    // 2 s después de salir de la arena, para no pisar sus avisos
  const update0 = G.Rift.update;
  G.Rift.update = function (dt) {
    const r = update0.apply(this, arguments);
    if (tell.length && !G.Rift.arena && (tellT += dt) >= 2) {
      G.Spawner.say(`¡Nueva región abierta: ${tell.map(regionName).join(' y ')}!`, 5, true);
      tell = []; tellT = 0;
    }
    return r;
  };

  const goMenu0 = G.Flow.goMenu;
  G.Flow.goMenu = function () {
    fixPartner();     // antes de abrir el menú, para que ya salga el bueno
    const r = goMenu0.apply(this, arguments);
    if (fresh.length) {
      G.UI.toast(`¡Ya puedes viajar a ${fresh.map(regionName).join(' y ')}!`, 4500);
      fresh = [];
    }
    tell = []; tellT = 0;
    return r;
  };

  // ---------------- aspecto ----------------

  G.Icons.UI.lock = { pal: { s: '#c9d6ff', y: '#ffd23f', o: '#c08a10' }, rows: [
    '....kkkk....', '...kssssk...', '..kskkkksk..', '..ksk..ksk..', '..ksk..ksk..', '.kkkkkkkkkk.',
    '.kyyyyyyyok.', '.kyyykkyyok.', '.kyyykkyyok.', '.kyyyykyyok.', '.kooooooook.', '.kkkkkkkkkk.'] };

  const CSS = `
    .gen-tab.tv-shut { opacity: .6; }
    .gen-tab.tv-shut b { display: inline-flex; align-items: center; gap: 3px; }
    .tv-lock { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center;
               justify-content: center; gap: 8px; padding: 18px; text-align: center; z-index: 2;
               background: rgba(8,10,28,.78); }
    .tv-lock b { font-size: 22px; color: var(--gold); text-shadow: 2px 2px 0 #2a0f55; }
    .tv-lock span { max-width: 420px; font-size: 15px; }
    .tv-note { margin: 8px 0 0; font-size: 13px; color: #ffe98a; }
    .tv-note + #dex-pick, .tv-note ~ #dex-pick { opacity: .55; }`;
  const st = document.createElement('style');
  st.textContent = CSS;
  document.head.appendChild(st);

  return { N, open, isOpen, allOpen, lockText, gacha, blockPartner, fixPartner };
})();
