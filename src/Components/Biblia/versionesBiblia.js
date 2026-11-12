// Versiones de la Biblia que se pueden elegir con SelectorBiblia.
//
// TEMPORAL DHH (10-11-2026): la Dios Habla Hoy se pidió solo para el domingo
// 15-11-2026. Después se borra todo lo marcado «TEMPORAL DHH» y queda la
// RVR1960 sola. Las dos tienen derechos reservados de las Sociedades Bíblicas:
// el permiso está en trámite, y mientras tanto el aviso se muestra, no se oculta.
import * as librosRVR from "../LibrosBiblia/LibrosBiblia.js";
import * as librosDHH from "../LibrosBiblia/LibrosBibliaDHH.js";
import { AVISOS_BIBLIA } from "../LibrosBiblia/avisosBiblia.js";

// Nombre y aviso de derechos salen de avisosBiblia.js (permanente): los usa
// también la pantalla del templo.
export const VERSIONES = {
  RVR1960: {
    clave: "RVR1960",
    corto: "RVR1960",
    ...AVISOS_BIBLIA.RVR1960,
    libros: librosRVR,
  },
  DHHS94: {
    clave: "DHHS94",
    corto: "DHH",
    ...AVISOS_BIBLIA.DHHS94,
    libros: librosDHH,
  },
};

export const VERSION_POR_DEFECTO = "RVR1960";

// Cualquier valor desconocido (un ajuste viejo, uno ya borrado) cae en la RVR1960.
export const versionValida = (version) =>
  VERSIONES[version] ? version : VERSION_POR_DEFECTO;

// { librosAntiguo, librosNuevo } de esa versión: lo que muestran los selectores
// de libros, capítulos y versículos.
export const librosDe = (version) => VERSIONES[versionValida(version)].libros;

// El mismo libro (por sigla) en el catálogo de otra versión, o null si esa
// versión no lo tiene (los deuterocanónicos solo están en la DHH).
export function libroEnVersion(sigla, version) {
  const { librosAntiguo, librosNuevo } = librosDe(version);
  return [...librosAntiguo, ...librosNuevo].find((libro) => libro.sigla === sigla) || null;
}
