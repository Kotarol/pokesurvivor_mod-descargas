/* ============ changelog-mod.js — novedades del mod (sólo del mod) ============
 * Mismo formato que changelog.js (la fecha más nueva arriba; new / chg / fix;
 * cada línea en español y en inglés), pero en su propio archivo: así
 * changelog.js queda igual que en el original y la sincronización diaria no
 * choca. Al cargar se juntan con las del original: en la misma fecha, las del
 * mod van detrás de las suyas.
 */
G.CHANGELOG_MOD = [
  { d: '2026-10-16', title: ['Perfiles y ataques sin parones', 'Profiles and no more attack stalls'], new: [
    ['Perfiles en vez de cuenta y contraseña: al abrir el juego eliges tu perfil en uno de los 3 huecos, con un clic y sin contraseña. Cada uno enseña su % de Pokédex y sus medallas de cada región. Para crear uno sólo hace falta un nombre. Tus cuentas de antes siguen ahí como perfiles, con toda su partida.',
     'Profiles instead of account and password: when you open the game you pick your profile from one of the 3 slots, with one click and no password. Each one shows its Pokédex % and its badges from every region. Creating one only needs a name. Your old accounts are still there as profiles, with all their progress.'],
    ['Desde el botón ⋯ de cada perfil puedes exportar o importar su partida y borrarlo (hay que escribir su nombre para confirmarlo). En un hueco libre, "Importar partida" crea el perfil a partir del archivo: así puedes llevarte tu partida a otro ordenador. Se recuerda el último perfil usado.',
     'From each profile\'s ⋯ button you can export or import its save and delete it (you have to type its name to confirm). In an empty slot, "Import save" creates the profile from the file: that way you can take your progress to another computer. The last profile you used is remembered.']
  ], chg: [
    ['Mapas por región algo más difíciles: en Kanto salían 2 o 3 Pokémon que llaman a su manada (Pidgeot, Nidoqueen, Arbok, Gyarados...) de cada 7, y sus crías apenas pegan. Ahora hay como mucho 1 de esos por tramo en el mapa de una región, como al mezclarlas todas.',
     'Region maps are a bit harder: in Kanto 2 or 3 out of every 7 Pokémon were ones that call their pack (Pidgeot, Nidoqueen, Arbok, Gyarados...), and their young barely hit. Now there are at most 2 of those per stage on a region\'s map, as when they are all mixed.'],
    ['Grietas más duras con el tiempo: la primera sigue igual, pero a partir del minuto 2,5 el legendario (y el as de la Liga) tiene cada vez más vida (casi el doble en el minuto 10, el triple en el 20) y pega algo más. Las grietas de después se hacían muy fáciles.',
     'Rifts get tougher over time: the first one is the same, but from minute 2.5 the legendary (and the League ace) has more and more HP (almost double at minute 10, triple at minute 20) and hits a bit harder. Later rifts had become very easy.'],
    ['Pokédex más clara: debajo de cada región, tres recuadros separados. Medallas (las 8 y la siguiente), Liga (cerrada, abierta o vencida, y qué hace falta) y Colección (el sello al 50 % y la región completa al 100 %).',
     'Clearer Pokédex: below each region, three separate boxes. Badges (all 8 and the next one), League (closed, open or beaten, and what you need) and Collection (the stamp at 50% and the complete region at 100%).'],
    ['"Campeón de <región>" es ahora el título por vencer a la Liga de esa región, como en los juegos. Completar la región al 100 % se llama "<región> completa" y da el título "Maestro de <región>" (si ya lo tenías, lo conservas con el nombre nuevo).',
     '"<region> Champion" is now the title for beating that region\'s League, as in the games. Completing the region at 100% is now called "<region> complete" and gives the "<region> Master" title (if you already had it, you keep it with the new name).']
  ], fix: [
    ['El Pokémon corredor de cada tramo (el muy rápido que te corta el paso) va casi el doble de rápido que tú, así que cuando te alcanzaba se te quedaba pegado y te quitaba vida cada medio segundo sin que pudieras escapar. Ahora golpea y pasa de largo: sigue recto un momento y tiene que dar la vuelta para volver a por ti.',
     'Each stage\'s runner Pokémon (the very fast one that cuts you off) is almost twice as fast as you, so once it caught you it stuck to you and took health every half second with no way to escape. Now it hits and runs past: it keeps going straight for a moment and has to turn around to come back for you.'],
    ['El veneno (Tóxico, Picotazo Veneno, Residuos, Púas Tóxicas…) quitaba un porcentaje de la vida sin límite, así que tumbaba a cualquier jefe de grieta o élite en unos 7 segundos aunque el movimiento fuera de nivel 1. Ahora cada acumulación tiene un tope que crece con tu nivel, como la quemadura: contra enemigos normales casi no cambia, pero a los jefes y élites les cuesta bastante más.',
     'Poison (Toxic, Poison Sting, Sludge, Toxic Spikes…) took a percentage of health with no limit, so it brought down any rift boss or elite in about 7 seconds even with a level 1 move. Now each stack has a cap that grows with your level, like burn: against normal enemies it barely changes, but bosses and elites take much longer.'],
    ['Con un jefe cerca, los ataques cuerpo a cuerpo y los de alcance corto o medio (rayos, bumeranes, abanicos, embestidas, cadenas) se quedaban sin lanzarse esperando a que se acercara, aunque tuvieras enemigos al lado. Ahora sólo apuntan al jefe si le llegan; si no, atacan al más cercano. Los proyectiles siguen yendo a por el jefe.',
     'With a boss nearby, melee attacks and short or mid-range ones (beams, boomerangs, cones, dashes, chains) stopped firing while waiting for it to come closer, even with enemies right next to you. Now they only aim at the boss if they can reach it; otherwise they hit the closest enemy. Projectiles still go for the boss.']
  ] },
  { d: '2026-10-15', title: ['Medallas, Liga, pasaporte y mapas por región', 'Badges, League, passport and region maps'], new: [
    ['Mapas por región: al pulsar Jugar eliges mapa. En el de una región sólo salen Pokémon de esa región: salvajes, jefes, hordas, el Pokémon perdido y los legendarios de las grietas. Su Liga aparece si tienes sus 8 medallas. El Mundo Distorsión las mezcla todas, como hasta ahora. Se recuerda el último mapa, y en grupo lo elige el anfitrión.',
     'Region maps: when you press Play you choose a map. On a region\'s map only Pokémon from that region appear: wild ones, bosses, hordes, the lost Pokémon and rift legendaries. Its League appears if you have its 8 badges. The Distortion World mixes them all, as before. Your last map is remembered, and in a group the host chooses.'],
    ['Cada región tiene sus 3 lugares, que se turnan cada 4 minutos, con sus colores, su clima y un adorno propio: Bosque Verde, Mt. Moon e Isla Canela en Kanto; la Ruta 216 de Sinnoh, con nieve y hielo que resbala; la Playa de Hanohano de Alola, con palmeras y sol; los círculos de piedras del Área Silvestre de Galar, bajo la lluvia; los cactus del Desierto Rostiz de Paldea…',
     'Each region has its own 3 places, which change every 4 minutes, with their own colors, weather and scenery: Viridian Forest, Mt. Moon and Cinnabar Island in Kanto; Sinnoh\'s Route 216, with snow and slippery ice; Alola\'s Hano Beach, with palm trees and sun; the stone circles of Galar\'s Wild Area, in the rain; the cacti of Paldea\'s Asado Desert…'],
    ['En casa: si juegas en el mapa de la región de tu compañero, +5 % de monedas al acabar la partida.',
     'Home region: if you play on your partner\'s region map, +5% coins at the end of the run.'],
    ['Sinergia por tipo: los movimientos de cada tipo hacen +1 % de daño por cada 10 % que tengas de ese tipo, contando todas las regiones (hasta +10 % con el tipo entero). Los shiny cuentan doble. Con doble tipo, cada movimiento usa la de su tipo, y los movimientos Normal, la de Normal. Lo ves en la ficha de la Pokédex.',
     'Type synergy: moves of each type deal +1% damage for every 10% of that type you own, across all regions (up to +10% with the whole type). Shinies count double. With two types, each move uses its own type\'s synergy, and Normal moves use Normal\'s. You can see it on the Pokédex page.'],
    ['La Liga en las grietas: con las 8 medallas de la región de tu compañero, desde el minuto 10 la primera grieta en la que entres trae al as de un miembro del Alto Mando, y desde el 20, al as del campeón (¡Cintia te reta con Garchomp!). Dan el premio de una grieta y el campeón, además, un ticket ×10 seguro. Si te faltan medallas, la Liga no te deja pasar.',
     'The League in the rifts: with all 8 badges of your partner\'s region, from minute 10 the first rift you enter brings an Elite Four member\'s ace, and from minute 20, the Champion\'s ace (Cynthia challenges you with Garchomp!). They give the usual rift reward and the Champion also drops a guaranteed ×10 ticket. If you are missing badges, the League won\'t let you in.'],
    ['Logros nuevos: "Vence a la Liga de <región>", uno por región, con un ticket ×10 cada uno.',
     'New achievements: "Beat the <region> League", one per region, with a ×10 ticket each.'],
    ['Pasaporte: un sello por cada región de la que tengas al menos el 50 %. Cada sello da +2 % de monedas al acabar cada partida, y con los 9, el título "Trotamundos". Ábrelo desde la Pokédex.',
     'Passport: one stamp for every region you own at least 50% of. Each stamp gives +2% coins at the end of every run, and with all 9, the "Globetrotter" title. Open it from the Pokédex.'],
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
  ], chg: [
    ['Afinidad regional: ahora crece más al final. Hasta el 50 % de la región, +1 % de daño y vida por cada 10 %; del 60 al 90 %, +2 % por tramo; y al completarla, +18 % (antes, como mucho +10 %).',
     'Regional affinity now grows more at the end. Up to 50% of the region, +1% damage and HP for every 10%; from 60 to 90%, +2% per step; and when complete, +18% (it used to be +10% at most).']
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
