// Lógica pura de la pestaña «Servicios» (25-11-2026): el calendario de la columna, la semana
// en vertical de los que se repiten y las fechas especiales. Sin React ni Firebase.

import { DIAS, aMinutos, inicioEnMs, ocurreEl } from "./UtilesCronograma.js";
import { idProgramacion } from "./programacion.js";

const aFecha = (iso) => {
  const [a, m, d] = String(iso).split("-").map(Number);
  return new Date(a, m - 1, d);
};

const porHora = (a, b) => aMinutos(a.inicio) - aMinutos(b.inicio);

// ¿El servicio se repite cada semana (tiene días marcados) o es de una sola vez?
export const seRepite = (servicio) => Boolean(servicio.dias?.length);

// La semana en vertical, de lunes a domingo: los 7 días siempre, cada uno con los
// servicios que se repiten en él (ordenados por hora). Un día sin nada queda con la lista vacía.
// → [{ num, corto, largo, abrev, servicios }]  (`abrev`: «Lun», «Mié»… para los encabezados)
export function semanaDeRepetidos(servicios) {
  return DIAS.map((dia) => ({
    ...dia,
    abrev: dia.largo.slice(0, 3),
    servicios: (servicios || [])
      .filter((s) => seRepite(s) && s.dias.includes(dia.num))
      .sort(porHora),
  }));
}

// Los servicios de una sola vez que todavía no pasan (hoy cuenta), por fecha y hora.
export function especialesProximos(servicios, hoyISO) {
  return (servicios || [])
    .filter((s) => !seRepite(s) && s.fecha && s.fecha >= hoyISO)
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || porHora(a, b));
}

// Cuántos servicios hay de cada tipo, para los filtros: { todos, repiten, especiales }.
export function conteoServicios(servicios, hoyISO) {
  const repiten = (servicios || []).filter(seRepite).length;
  const especiales = especialesProximos(servicios, hoyISO).length;
  return { todos: repiten + especiales, repiten, especiales };
}

// Cuánto falta para una fecha: «hoy», «mañana», «en 12 días».
export function textoFalta(fechaISO, hoyISO) {
  const dias = Math.round((aFecha(fechaISO) - aFecha(hoyISO)) / 86400000);
  if (dias <= 0) return "hoy";
  if (dias === 1) return "mañana";
  return `en ${dias} días`;
}

// El bloque de fecha de un servicio especial: { mes: "DIC", dia: 5, semana: "sáb" }
export function bloqueDeFecha(fechaISO) {
  const fecha = aFecha(fechaISO);
  const mes = fecha
    .toLocaleDateString("es", { month: "short" })
    .replace(".", "")
    .toUpperCase();
  const semana = fecha
    .toLocaleDateString("es", { weekday: "short" })
    .replace(".", "")
    .toLowerCase();
  return { mes, dia: fecha.getDate(), semana };
}

// Cómo se dice que un servicio se repite: «Cada domingo», «Cada semana» (varios días).
export function textoRepeticion(servicio) {
  const dias = servicio.dias || [];
  if (dias.length === 1)
    return `Cada ${DIAS.find((d) => d.num === dias[0])?.largo.toLowerCase()}`;
  if (dias.length === 7) return "Todos los días";
  return "Cada semana";
}

// Qué hay en un día del calendario: los servicios que ocurren ese día y de qué clase.
// → { servicios, repite, unico } (`unico` gana al pintar si hay de las dos clases)
export function marcasDelDia(servicios, fechaISO) {
  const dia = aFecha(fechaISO);
  const delDia = (servicios || [])
    .filter((s) => ocurreEl(s, dia))
    .sort(porHora);
  return {
    servicios: delDia,
    repite: delDia.some(seRepite),
    unico: delDia.some((s) => !seRepite(s)),
  };
}

// La ocurrencia de ese día (la del servicio que empieza primero), en la forma que usa
// la programación: { id, servicio, fecha, inicio, fin }, o null si no hay servicio.
export function ocurrenciaEn(servicios, fechaISO) {
  const [primero] = marcasDelDia(servicios, fechaISO).servicios;
  if (!primero) return null;
  const dia = aFecha(fechaISO);
  const inicio = inicioEnMs(primero, dia);
  const fin =
    inicio + (aMinutos(primero.fin) - aMinutos(primero.inicio)) * 60 * 1000;
  return {
    id: idProgramacion(primero.id, fechaISO),
    servicio: primero,
    fecha: fechaISO,
    inicio,
    fin,
  };
}

// Lo que suele hacerse en una iglesia: el nombre se puede ESCOGER de esta lista o escribir libre
// (25-11-2026, pedido del usuario). Los ensayos se programan igual que un servicio.
export const SUGERENCIAS_NOMBRE = [
  "Servicio dominical",
  "Escuela dominical",
  "Oración",
  "Estudio bíblico",
  "Culto de jóvenes",
  "Ensayo de alabanza",
  "Ensayo general",
  "Vigilia",
  "Bautismos",
  "Cena del Señor",
  "Retiro",
  "Reunión de líderes",
];
