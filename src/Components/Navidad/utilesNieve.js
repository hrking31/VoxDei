import { navidadActiva } from "../Logo/utilesNavidad.js";

// ¿Está nevando en esta pantalla? Lo usan la nieve (`NieveCayendo`) y el espacio que
// reserva abajo (`EspacioNieve`), que deben ir siempre juntos.
//
// NO nieva en la pantalla del templo (`/VOXDEI`): taparía lo que ve la congregación.
// Tampoco con «reducir movimiento» activo.
const RUTA_PROYECTOR = "/voxdei";

function prefiereMenosMovimiento() {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function hayNieve(pathname) {
  return navidadActiva() && pathname.toLowerCase() !== RUTA_PROYECTOR && !prefiereMenosMovimiento();
}
