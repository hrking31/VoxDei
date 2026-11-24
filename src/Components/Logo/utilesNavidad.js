// Temporada navideña: del 1 de diciembre al 6 de enero (Reyes), ambos incluidos.
// Usa la fecha del dispositivo; se repite sola cada año.
export function esTemporadaNavidena(fecha = new Date()) {
  const mes = fecha.getMonth();
  return mes === 11 || (mes === 0 && fecha.getDate() <= 6);
}

// TEMPORAL, solo mientras se diseña: con `npm run dev` (modo `development`) el
// ambiente navideño se ve siempre. La app publicada (`production`) y las
// pruebas (`test`) se rigen solo por la fecha. Al terminar el diseño se puede
// quitar `EN_DESARROLLO` y dejar `navidadActiva` como `esTemporadaNavidena`.
// A propósito no tiene pruebas.
const EN_DESARROLLO = import.meta.env.MODE === "development";

export function navidadActiva(fecha = new Date(), enDesarrollo = EN_DESARROLLO) {
  return enDesarrollo || esTemporadaNavidena(fecha);
}
