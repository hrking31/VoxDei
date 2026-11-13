import { useAppContext } from "../Context/AppContext";

// El formato de la pantalla del panel (12-11-2026, propuesta aprobada por el
// usuario: https://claude.ai/artifact/TbjJUe59Na4bgcTAMn1hd2).
//   celular     menos de 744 px de ancho
//   tableta     de 744 a 1023 (el iPad mini de pie y parecidos)
//   escritorio  1024 o más (iPad Pro acostado, PC); es lo mismo que isDesktop
// `baja`: escritorio con menos de 800 px de alto (un PC de 1280×720 o
// 1366×768): ahí se pliegan cosas para que todo quepa sin desplazar.
export const ANCHO_TABLETA = 744;
export const ANCHO_ESCRITORIO = 1024;
export const ALTO_BAJO = 800;

export function formatoDe(ancho) {
  if (ancho >= ANCHO_ESCRITORIO) return "escritorio";
  if (ancho >= ANCHO_TABLETA) return "tableta";
  return "celular";
}

export const esBaja = (ancho, alto) => formatoDe(ancho) === "escritorio" && alto < ALTO_BAJO;

// Lo lee del contexto (lo actualiza InicializarEstados en cada resize). Si
// no está (pruebas antiguas), lo deduce de isDesktop.
export function useFormato() {
  const { isDesktop, formatoPantalla, pantallaBaja } = useAppContext();
  const formato = formatoPantalla || (isDesktop ? "escritorio" : "celular");
  return { formato, baja: formato === "escritorio" && Boolean(pantallaBaja) };
}
