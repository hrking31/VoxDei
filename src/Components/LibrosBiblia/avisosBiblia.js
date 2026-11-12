// El nombre y el aviso de derechos de cada Biblia (11 de noviembre de 2026).
// Los muestra la pantalla del templo, abajo y muy pequeño, con cada versículo
// (ControlDisplay), y SelectorBiblia en el panel. Las dos tienen derechos de
// las Sociedades Bíblicas: el permiso está en trámite y el aviso se muestra,
// nunca se oculta.
//
// Vive aquí, fuera de Biblia/ (que se borra entera con la DHH), porque el
// aviso de la RVR1960 se queda: al quitar la DHH solo se borra su entrada.

export const BIBLIA_POR_DEFECTO = "RVR1960";

export const AVISOS_BIBLIA = {
  RVR1960: {
    sigla: "RVR1960",
    nombre: "Reina-Valera 1960",
    aviso:
      "Texto bíblico Reina-Valera 1960® © Sociedades Bíblicas en América Latina, 1960. Derechos renovados 1988, Sociedades Bíblicas Unidas.",
  },
  // TEMPORAL DHH (hasta el 16-11-2026): borrar esta entrada con la DHH.
  DHHS94: {
    sigla: "DHH",
    nombre: "Dios Habla Hoy",
    aviso:
      "La Biblia Dios Habla Hoy, Tercera edición © Sociedades Bíblicas Unidas 1966, 1970, 1979, 1983, 1994, 1996. Todos los derechos reservados.",
  },
};

// Las iniciales, junto a la cita en el tapete de Prédica (11-11-2026).
export const siglaBiblia = (version) => (AVISOS_BIBLIA[version] || AVISOS_BIBLIA[BIBLIA_POR_DEFECTO]).sigla;

// La línea del templo: «Reina-Valera 1960 · Texto bíblico…». Una versión
// desconocida (o que no vino) es la RVR1960, la de siempre.
export function avisoBiblia(version) {
  const { nombre, aviso } = AVISOS_BIBLIA[version] || AVISOS_BIBLIA[BIBLIA_POR_DEFECTO];
  return `${nombre} · ${aviso}`;
}
