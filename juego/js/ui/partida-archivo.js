/* ============ partida-archivo.js — copia de la partida en un archivo (sólo del mod) ============
 * En Ajustes > Cuenta: "Exportar partida" descarga un .json con la partida y
 * "Importar partida" la recupera. Al importar se FUSIONA con la de ahora
 * (G.DB.merge, como al sincronizar): no se pierde ningún Pokémon ni shiny,
 * mejoras y estadísticas se quedan con el máximo, y monedas y compañero con
 * la partida más reciente. Sirve en la web y en el programa de escritorio.
 * Va en su propio archivo y se añade a la pantalla de Ajustes desde fuera,
 * para no tocar settings-ui.js del original.
 */
G.SaveFile = (() => {
  const $ = G.UI.$;
  const clone = o => JSON.parse(JSON.stringify(o));

  function block() {
    const div = document.createElement('div');
    div.id = 'set-savefile';
    div.innerHTML = `<h3 class="set-h">Copia de la partida</h3>
      <p class="sub">Guarda tu partida en un archivo o recupera una que guardaste. Al recuperarla se junta con la de ahora: no pierdes ningún Pokémon ni shiny, y las monedas y el compañero son los de la partida más reciente.</p>
      <div class="row wrap" style="gap:8px">
        <button class="btn" id="set-export">Exportar partida</button>
        <button class="btn" id="set-import">Importar partida</button>
      </div>
      <input type="file" id="set-import-file" accept=".json,application/json" class="hidden">`;
    div.querySelector('#set-export').onclick = exportSave;
    div.querySelector('#set-import').onclick = () => {
      if (G.Game.state !== 'ui') { G.UI.toast(G.T('Termina la partida antes de importar.')); return; }
      div.querySelector('#set-import-file').click();
    };
    div.querySelector('#set-import-file').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) importSave(f); };
    return div;
  }

  function exportSave() {
    const s = G.DB.save;
    if (!s) return;
    const data = { juego: 'PokeSurvivor', tipo: 'partida', v: 1, fecha: new Date().toISOString(), save: s };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }));
    a.download = 'PokeSurvivor-' + (G.DB.user || 'partida').replace(/[^\w-]+/g, '') + '-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
    G.UI.toast(G.T('Partida exportada'));
  }

  const isObj = v => v && typeof v === 'object' && !Array.isArray(v);

  async function importSave(file) {
    let inc = null;
    try {
      const data = JSON.parse(await file.text());
      inc = isObj(data) && isObj(data.save) ? data.save : data;   // también vale la partida a secas
    } catch (e) { /* no es JSON */ }
    if (!isObj(inc) || !isObj(inc.owned) || !isObj(inc.stats)) {
      G.UI.toast(G.T('Ese archivo no es una partida de PokéSurvivor.'), 4000);
      return;
    }
    const cur = G.DB.save;
    if (!confirm(G.T('¿Juntar la partida de {x} con la tuya? No pierdes nada de lo que tienes.').replace('{x}', inc.name || '?'))) return;
    // Lo que falte en la partida importada (de una versión vieja), de la actual:
    // merge() cuenta con que estén. Al recargar, db.js la revisa entera (migrate).
    for (const k in cur) if (inc[k] == null) inc[k] = clone(cur[k]);
    for (const k in cur.stats) if (inc.stats[k] == null) inc.stats[k] = cur.stats[k];
    const r = G.DB.merge(clone(cur), inc);
    r.name = cur.name;
    r.updated = Date.now();
    for (const k of Object.keys(cur)) delete cur[k];
    Object.assign(cur, r);
    G.DB.commit(true);
    G.UI.toast(G.T('Partida importada: recargando…'), 3000);
    setTimeout(() => location.reload(), 1200);
  }

  // Ajustes > Cuenta se vuelve a pintar cada vez: se añade el bloque si es una
  // cuenta con partida (no invitado) y aún no está.
  function init() {
    const body = $('set-body');
    if (!body) return;
    new MutationObserver(() => {
      if ($('set-logout') && !$('set-savefile') && G.DB.save && !G.DB.guest) {
        const note = $('set-msg');
        body.insertBefore(block(), note ? note.nextSibling : null);
      }
    }).observe(body, { childList: true });
  }
  init();

  return { exportSave, importSave };
})();
