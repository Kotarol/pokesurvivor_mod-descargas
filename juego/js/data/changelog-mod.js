/* ============ changelog-mod.js — novedades del mod (sólo del mod) ============
 * Mismo formato que changelog.js (la fecha más nueva arriba; new / chg / fix;
 * cada línea en español y en inglés), pero en su propio archivo: así
 * changelog.js queda igual que en el original y la sincronización diaria no
 * choca. Al cargar se juntan con las del original: en la misma fecha, las del
 * mod van detrás de las suyas.
 */
G.CHANGELOG_MOD = [
  { d: '2026-10-17', title: ['Cooperativo con código de sala', 'Co-op with a room code'], new: [
    ['Cooperativo en línea, hasta 4, cada uno desde su casa: en "Cooperativo" (antes "Amigos"), uno pulsa "Crear sala" y pasa el código (como ABCDE-FGHJK) a los demás, que lo escriben en "Entrar en una sala". El anfitrión ve quién quiere entrar y lo acepta o lo rechaza; nadie entra sin su permiso.',
     'Online co-op, up to 4, each from your own home: in "Co-op" (formerly "Friends"), one player presses "Create room" and gives the code (like ABCDE-FGHJK) to the others, who type it in "Join a room". The host sees who wants to join and accepts or rejects them; nobody gets in without their permission.'],
    ['Para jugar juntos hace falta la misma versión del juego: si no coincide, el juego lo avisa. Mientras jugáis la sala no admite a nadie nuevo, y al acabar volvéis todos a la sala para echar otra.',
     'Playing together needs the same game version: if it doesn\'t match, the game tells you. While you play the room lets nobody new in, and when you finish you all go back to the room for another round.'],
    ['La pausa enseña el daño de la partida: cada uno de tus movimientos (con su nivel y si está en un vínculo) con el daño que lleva y su % del total, de más a menos. La quemadura y el veneno cuentan para el movimiento que los puso. En cooperativo cada uno ve lo suyo y la lista se va poniendo al día.',
     'The pause screen shows this run\'s damage: each of your moves (with its level and whether it\'s in a bond) with the damage it has dealt and its % of the total, from most to least. Burn and poison count for the move that applied them. In co-op everyone sees their own and the list keeps updating.'],
    ['También tus objetos, cada uno con lo suyo: el daño del Casco Dentado, el daño extra de la Vidasfera y la Cinta Elección, la vida recuperada con Restos o el Cascabel Concha, la experiencia extra del Huevo Suerte, los ataques de más de la Garra Rápida, el daño que te ha evitado el Chaleco Asalto, las veces que te ha salvado la Banda Focus...',
     'Your items too, each with its own figure: Rocky Helmet\'s damage, the extra damage from Life Orb and Choice Band, the HP recovered with Leftovers or Shell Bell, Lucky Egg\'s extra XP, Quick Claw\'s extra attacks, the damage Assault Vest saved you from, the times Focus Sash saved you...'],
    ['Al acabar la partida, el resumen enseña el "Top de daño", con el que más ha hecho destacado.',
     'When the run ends, the summary shows the "Top damage", with the one that dealt the most highlighted.']
  ], chg: [
    ['Ataques cuerpo a cuerpo más útiles hasta el final: desde el nivel 3 cada golpe suelta una onda de choque que llega al doble de su alcance, atraviesa a todos y hace la mitad del daño (con el golpe en 360°, la onda sale en todas direcciones). Además hacen un 60 % más de daño a los enemigos quemados, envenenados o frenados, también con la onda (el frenado del propio Lengüetazo no cuenta).',
     'Melee attacks stay useful until the end: from level 3 every hit releases a shockwave that reaches twice its range, goes through everyone and deals half the damage (once the hit is 360°, the wave goes in every direction). They also deal 60% more damage to burned, poisoned or slowed enemies, the wave too (Lick\'s own slow doesn\'t count).'],
    ['Viaje por regiones: ahora todos empiezan sólo en Kanto, y el test te da uno de sus iniciales (Bulbasaur, Charmander, Squirtle, Psyduck o Slowpoke). Las demás regiones se abren una a una venciendo al campeón de la Liga de la anterior. Si tu compañero era de otra región, pasa a serlo tu Pokémon de Kanto con más mejoras (o, si no tienes ninguno, un inicial de Kanto); los demás siguen en tu Pokédex con sus mejoras.',
     'Region journey: everyone now starts in Kanto only, and the test gives you one of its starters (Bulbasaur, Charmander, Squirtle, Psyduck or Slowpoke). The other regions open one by one by beating the previous region\'s League Champion. If your partner was from another region, your Kanto Pokémon with the most upgrades becomes your partner (or a Kanto starter if you have none); the rest stay in your Pokédex with their upgrades.'],
    ['Mejoras: cada una enseña ahora lo que llevas en total y lo que tendrás con el siguiente nivel (por ejemplo, Fuerza "Ahora +12% · siguiente +16%"), en vez de sólo lo que da un nivel.',
     'Upgrades: each one now shows your current total and what you\'ll have with the next level (for example, Strength "Now +12% · next +16%"), instead of only what one level gives.']
  ] },
  { d: '2026-10-16', title: ['Perfiles, viaje por regiones y ataques sin parones', 'Profiles, region journey and no more attack stalls'], new: [
    ['Viaje por regiones, como en los juegos: al principio sólo están abiertas Kanto y la región de tu primer compañero (el del test). Al vencer al campeón de la Liga de una región abierta se abre la siguiente, en el orden Kanto → Johto → Hoenn → Sinnoh → Teselia → Kalos → Alola → Galar → Paldea.',
     'Region journey, as in the games: at first only Kanto and your first partner\'s region (the one from the test) are open. Beating the League Champion of an open region opens the next one, in the order Kanto → Johto → Hoenn → Sinnoh → Unova → Kalos → Alola → Galar → Paldea.'],
    ['Las regiones cerradas salen con candado: no puedes viajar a su mapa, ni tirar en su banner, ni elegir de compañero a sus Pokémon (aunque ya los tengas). Si tu compañero era de una región cerrada, vuelve a serlo tu primer compañero; los demás siguen en tu Pokédex con sus mejoras. El Mundo Distorsión mezcla sólo las regiones abiertas.',
     'Closed regions show a padlock: you can\'t travel to their map, pull on their banner or pick their Pokémon as your partner (even if you already have them). If your partner was from a closed region, your first partner takes its place again; the rest stay in your Pokédex with their upgrades. The Distortion World only mixes the open regions.'],
    ['Perfiles en vez de cuenta y contraseña: al abrir el juego eliges tu perfil en uno de los 3 huecos, con un clic y sin contraseña. Cada uno enseña su % de Pokédex y sus medallas de cada región. Para crear uno sólo hace falta un nombre. Tus cuentas de antes siguen ahí como perfiles, con toda su partida.',
     'Profiles instead of account and password: when you open the game you pick your profile from one of the 3 slots, with one click and no password. Each one shows its Pokédex % and its badges from every region. Creating one only needs a name. Your old accounts are still there as profiles, with all their progress.'],
    ['Desde el botón ⋯ de cada perfil puedes exportar o importar su partida y borrarlo (hay que escribir su nombre para confirmarlo). En un hueco libre, "Importar partida" crea el perfil a partir del archivo: así puedes llevarte tu partida a otro ordenador. Se recuerda el último perfil usado.',
     'From each profile\'s ⋯ button you can export or import its save and delete it (you have to type its name to confirm). In an empty slot, "Import save" creates the profile from the file: that way you can take your progress to another computer. The last profile you used is remembered.']
  ], chg: [
    ['El primer objeto de la partida (el de la primera grieta, un jefe o un cofre) ya no se te pone solo: eliges entre ése y otro distinto, o no coger ninguno. Así puedes evitar los que tienen contrapartida, como la Vidasfera o la Cinta Elección.',
     'The first item of the run (from the first rift, a boss or a chest) is no longer equipped automatically: you choose between it and a different one, or take none. That way you can avoid the ones with a drawback, like Life Orb or Choice Band.'],
    ['Mapas por región algo más difíciles: en Kanto salían 2 o 3 Pokémon que llaman a su manada (Pidgeot, Nidoqueen, Arbok, Gyarados...) de cada 7, y sus crías apenas pegan. Ahora hay como mucho 1 de esos por tramo en el mapa de una región, como al mezclarlas todas.',
     'Region maps are a bit harder: in Kanto 2 or 3 out of every 7 Pokémon were ones that call their pack (Pidgeot, Nidoqueen, Arbok, Gyarados...), and their young barely hit. Now there are at most 2 of those per stage on a region\'s map, as when they are all mixed.'],
    ['Grietas más duras con el tiempo: la primera sigue igual, pero a partir del minuto 2,5 el legendario (y el as de la Liga) tiene cada vez más vida (casi el doble en el minuto 10, el triple en el 20) y pega algo más. Las grietas de después se hacían muy fáciles.',
     'Rifts get tougher over time: the first one is the same, but from minute 2.5 the legendary (and the League ace) has more and more HP (almost double at minute 10, triple at minute 20) and hits a bit harder. Later rifts had become very easy.'],
    ['Pokédex más clara: debajo de cada región, tres recuadros separados. Medallas (las 8 y la siguiente), Liga (cerrada, abierta o vencida, y qué hace falta) y Colección (el sello al 50 % y la región completa al 100 %).',
     'Clearer Pokédex: below each region, three separate boxes. Badges (all 8 and the next one), League (closed, open or beaten, and what you need) and Collection (the stamp at 50% and the complete region at 100%).'],
    ['"Campeón de <región>" es ahora el título por vencer a la Liga de esa región, como en los juegos. Completar la región al 100 % se llama "<región> completa" y da el título "Maestro de <región>" (si ya lo tenías, lo conservas con el nombre nuevo).',
     '"<region> Champion" is now the title for beating that region\'s League, as in the games. Completing the region at 100% is now called "<region> complete" and gives the "<region> Master" title (if you already had it, you keep it with the new name).']
  ], fix: [
    ['Varios Pokémon curanderos juntos (Chansey, Blissey, Audino…) se curaban unos a otros y sus curaciones se sumaban sin límite, así que un grupo de 3 a 5 era casi imposible de bajar. Ahora no se curan entre ellos ni a sí mismos, y cada Pokémon (jefes incluidos) recibe como mucho una curación cada 3 segundos aunque tenga varios curanderos cerca.',
     'Several healer Pokémon together (Chansey, Blissey, Audino…) healed each other and their heals stacked with no limit, so a group of 3 to 5 was almost impossible to take down. Now they don\'t heal each other or themselves, and each Pokémon (bosses included) gets at most one heal every 3 seconds even with several healers nearby.'],
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
