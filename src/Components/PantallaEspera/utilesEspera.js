import {
  DIAS,
  aMinutos,
  proximoServicio,
  serviciosEnCurso,
  textoCuentaRegresiva,
  textoHora,
} from "../Cronograma/UtilesCronograma.js";

// Hasta cuántas horas antes se muestra la cuenta regresiva. Más lejos, una
// cuenta de «41:12:09» no le dice nada a nadie: se muestra el día y la hora.
export const HORAS_CUENTA_REGRESIVA = 6;

// Qué dice la pantalla de espera en este momento:
//   { modo: "enCurso", nombre }                       un servicio ya empezó
//   { modo: "cuenta", nombre, hora, cuenta }          faltan pocas horas
//   { modo: "fecha", nombre, hora, dia }              falta más
//   { modo: "nada" }                                  no hay servicios
export function contenidoEspera(servicios, ahoraMs) {
  const enCurso = serviciosEnCurso(servicios || [], ahoraMs);
  if (enCurso.length) {
    // Si se cruzan dos, manda el que empezó más tarde (misma regla del turno).
    const actual = enCurso.reduce((a, b) => (aMinutos(b.inicio) > aMinutos(a.inicio) ? b : a));
    return { modo: "enCurso", nombre: actual.nombre || "Servicio" };
  }

  const proximo = proximoServicio(servicios, ahoraMs);
  if (!proximo) return { modo: "nada" };

  const nombre = proximo.servicio.nombre || "Servicio";
  const hora = textoHora(proximo.servicio.inicio);
  const falta = proximo.inicio - ahoraMs;

  if (falta <= HORAS_CUENTA_REGRESIVA * 60 * 60 * 1000) {
    return { modo: "cuenta", nombre, hora, cuenta: textoCuentaRegresiva(falta) };
  }

  const dia = DIAS.find((d) => d.num === new Date(proximo.inicio).getDay())?.largo;
  return { modo: "fecha", nombre, hora, dia };
}
