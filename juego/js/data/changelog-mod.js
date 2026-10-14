/* ============ changelog-mod.js — novedades del mod (sólo del mod) ============
 * Mismo formato que changelog.js (la fecha más nueva arriba; new / chg / fix;
 * cada línea en español y en inglés), pero en su propio archivo: así
 * changelog.js queda igual que en el original y la sincronización diaria no
 * choca. Al cargar se juntan con las del original: en la misma fecha, las del
 * mod van detrás de las suyas.
 */
G.CHANGELOG_MOD = [
  { d: '2026-10-14', title: ['PokéSurvivor para Windows', 'PokéSurvivor for Windows'], new: [
    ['PokéSurvivor para Windows: el juego como programa, en su propia ventana y sin navegador. Se actualiza solo al abrirlo, o con "Buscar actualizaciones" debajo del menú.',
     'PokéSurvivor for Windows: the game as an app, in its own window and without a browser. It updates itself when you open it, or with "Check for updates" below the menu.'],
    ['Copia de la partida (Ajustes > Cuenta): guarda tu partida en un archivo y recupérala cuando quieras, en este u otro ordenador. Al recuperarla se junta con la que tengas, sin perder nada.',
     'Save backup (Settings > Account): save your progress to a file and restore it whenever you want, on this or another computer. Restoring merges it with your current progress, so you lose nothing.']
  ] }
];

(() => {
  for (const m of G.CHANGELOG_MOD) {
    let e = G.CHANGELOG.find(x => x.d === m.d);
    if (!e) G.CHANGELOG.push(e = { d: m.d, title: m.title });
    for (const k of ['new', 'chg', 'fix']) if (m[k]) e[k] = (e[k] || []).concat(m[k]);
  }
  G.CHANGELOG.sort((a, b) => b.d.localeCompare(a.d));
})();
