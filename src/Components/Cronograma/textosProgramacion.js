import { textoHora } from "./UtilesCronograma.js";

// Textos de la programación (sin React ni Firebase, para probarlos).

// «domingo 29 de noviembre»
export function textoFecha(ms) {
  return new Date(ms).toLocaleDateString("es", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

// «domingo 29 de noviembre · 10:00 a. m. – 12:00 p. m.» (con el nombre del servicio, si lo tiene)
export function textoFechaProgramada(ocurrencia) {
  const { servicio } = ocurrencia;
  const base = `${textoFecha(ocurrencia.inicio)} · ${textoHora(servicio.inicio)} – ${textoHora(servicio.fin)}`;
  return servicio.nombre ? `${servicio.nombre} · ${base}` : base;
}
