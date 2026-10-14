/* ============ escritorio.js — sólo en el programa de escritorio (desktop/, sólo del mod) ============
 * En el menú, debajo de las estadísticas: la versión del juego y el botón
 * "Buscar actualizaciones" (al abrir el programa ya se busca solo). Sólo se
 * puede actualizar desde el menú, así que nunca corta una partida.
 * En la web no hace nada (window.PS_DESKTOP sólo existe en el programa).
 */
G.Escritorio = (() => {
  const D = window.PS_DESKTOP;
  if (!D || !D.info) return null;
  let btn = null, busy = false;

  // Fecha y hora (la de tu ordenador) de la versión del juego: puede haber varias el mismo día.
  const fecha = iso => {
    const d = new Date(iso), two = n => String(n).padStart(2, '0');
    return two(d.getDate()) + '-' + two(d.getMonth() + 1) + '-' + d.getFullYear() + ', ' + two(d.getHours()) + ':' + two(d.getMinutes());
  };
  const idle = () => { busy = false; btn.disabled = false; btn.textContent = G.T('Buscar actualizaciones'); };

  async function init() {
    const stats = document.getElementById('menu-stats');
    if (!stats) return;
    const row = document.createElement('div');
    row.className = 'row between wrap';
    row.style.cssText = 'margin-top:10px;gap:8px;font-size:13px;color:var(--muted)';
    row.innerHTML = '<span id="desk-ver"></span><button class="btn small ghost" id="desk-upd">Buscar actualizaciones</button>';
    stats.parentNode.appendChild(row);
    btn = row.querySelector('#desk-upd');
    btn.onclick = check;
    const info = await D.info();
    // Programa (el .exe, cambia poco) y juego (se actualiza solo, por fecha).
    row.querySelector('#desk-ver').textContent = G.T('Programa ' + info.app) +
      (info.juego ? ' · ' + G.T('juego del ' + fecha(info.juego)) : '');
    if (!info.actualizable) btn.classList.add('hidden');
    D.onProgreso(p => { btn.textContent = G.T('Descargando… ' + p.hechos + '/' + p.total); });
    D.onAviso(appNotice);
    if (info.programaNuevo) appNotice();
  }

  function appNotice() { G.UI.toast(G.T('Hay una versión nueva del programa: se instalará al cerrarlo.'), 6000); }

  async function check() {
    if (busy || G.Game.state !== 'ui') return;
    busy = true; btn.disabled = true; btn.textContent = G.T('Buscando…');
    const r = await D.buscar();
    if (r.estado === 'nada') { idle(); G.UI.toast(G.T('Ya tienes la última versión.')); return; }
    if (r.estado === 'error') { idle(); G.UI.toast(G.T('No se pudo buscar: ¿hay conexión a internet?'), 4000); return; }
    if (!confirm(G.T('Hay una versión nueva del juego (' + r.mb + ' MB). ¿Actualizar ahora?'))) { idle(); return; }
    // Si sale bien, el programa recarga el juego con la versión nueva.
    if (!(await D.actualizar())) { idle(); G.UI.toast(G.T('No se pudo actualizar. Se volverá a intentar al abrir el juego.'), 5000); }
  }

  init();
  return { check };
})();
