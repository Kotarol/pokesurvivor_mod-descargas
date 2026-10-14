/* ============ mod-local.js — sólo del mod ============
 * Probando en local (localhost) el juego va SIEMPRE en modo local: sin
 * conectarse al Firebase del juego original, para no subir partidas ni marcas
 * del mod a su nube ni a su ranking. Igual en el programa de escritorio
 * (desktop/: window.PS_DESKTOP).
 */
if (window.PS_DESKTOP || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) G.FIREBASE_CONFIG = null;
