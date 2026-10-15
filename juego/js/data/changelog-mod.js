/* ============ changelog-mod.js — novedades del mod (sólo del mod) ============
 * Mismo formato que changelog.js (la fecha más nueva arriba; new / chg / fix;
 * cada línea en español y en inglés), pero en su propio archivo: así
 * changelog.js queda igual que en el original y la sincronización diaria no
 * choca. Al cargar se juntan con las del original: en la misma fecha, las del
 * mod van detrás de las suyas.
 */
G.CHANGELOG_MOD = [
  { d: '2026-10-15', title: ['Medallas, estreno y maestría', 'Badges, debut and mastery'], new: [
    ['Estreno, veterano y maestría: la primera vez que aguantas 5, 10 y 20 minutos con un Pokémon de compañero ganas 1 ticket, 2 tickets y un ticket ×10. Lo que llevas con cada uno se ve en su ficha de la Pokédex. Cuenta desde ahora: hay que jugarlo de nuevo aunque ya lo hubieras usado.',
     'Debut, veteran and mastery: the first time you survive 5, 10 and 20 minutes with a Pokémon as your partner you earn 1 ticket, 2 tickets and a ×10 ticket. You can see your progress with each one on its Pokédex page. It counts from now on: you need to play it again even if you had used it before.'],
    ['Medallas: cada región tiene 8, con los nombres de sus gimnasios (en Alola, sus cristales Z). Ganas una por cada 10 % que tengas de la región, y los shiny cuentan doble. Las 7 primeras dan 2 tickets cada una y la octava, un ticket ×10.',
     'Badges: every region has 8, named after its gyms (in Alola, its Z-Crystals). You earn one for every 10% of the region you own, and shinies count double. The first 7 give 2 tickets each and the eighth gives a ×10 ticket.'],
    ['Cada medalla tiene la forma y el color de la de su gimnasio (las de Galar y Paldea, con el emblema de su tipo). Las que te faltan se ven en gris, y al conseguir una el aviso enseña esa medalla.',
     'Each badge has the shape and color of its gym\'s badge (Galar and Paldea ones, with their type emblem). The ones you are missing show in grey, and when you earn one the notice shows that badge.'],
    ['Completa una región entera y consigues el título "Campeón de <región>".',
     'Complete a whole region to get the "<region> Champion" title.'],
    ['Las medallas se ven en la Pokédex, debajo de cada región, y en Logros, en su propia pestaña. Si ya tenías colección, recibes de golpe las que te tocan.',
     'You can see your badges in the Pokédex, below each region, and in Achievements, in their own tab (Medals). If you already had a collection, you get the ones you have earned all at once.']
  ] },
  { d: '2026-10-14', title: ['PokéSurvivor para Windows', 'PokéSurvivor for Windows'], new: [
    ['PokéSurvivor para Windows: el juego como programa, en su propia ventana y sin navegador. Se actualiza solo al abrirlo, o con "Buscar actualizaciones" debajo del menú.',
     'PokéSurvivor for Windows: the game as an app, in its own window and without a browser. It updates itself when you open it, or with "Check for updates" below the menu.'],
    ['Copia de la partida (Ajustes > Cuenta): guarda tu partida en un archivo y recupérala cuando quieras, en este u otro ordenador. Al recuperarla se junta con la que tengas, sin perder nada.',
     'Save backup (Settings > Account): save your progress to a file and restore it whenever you want, on this or another computer. Restoring merges it with your current progress, so you lose nothing.'],
    ['Afinidad regional: tu compañero gana +1 % de daño y de vida por cada 10 % que tengas de su región (hasta +10 %). Los shiny cuentan doble. Lo ves en su ficha de la Pokédex.',
     'Regional affinity: your partner gets +1% damage and HP for every 10% of its region you own (up to +10%). Shinies count double. You can see it on its Pokédex page.'],
    ['Brillo shiny: jugando con tu compañero shiny ganas un 15 % más de monedas y algunos tickets cuentan doble.',
     'Shiny glow: playing with your shiny partner gives you 15% more coins and some tickets count double.']
  ], chg: [
    ['Programa para Windows: debajo del menú se ve la versión del programa y la fecha y hora de la versión del juego.',
     'Windows app: below the menu you can see the app version and the date and time of the game version.']
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
