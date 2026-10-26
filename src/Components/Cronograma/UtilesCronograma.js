// Lógica del cronograma: quién tiene el turno de proyectar en cada momento.
//
// Son funciones puras (no leen Firebase ni el reloj por su cuenta) para que
// todos los dispositivos lleguen a la misma respuesta con los mismos datos.
// La hora que reciben es la del servidor (Date.now() + desfase de
// `.info/serverTimeOffset`), no la del celular, que puede estar adelantada.
//
// Un servicio es como una alarma del celular:
//   { nombre, inicio: "08:00", fin: "10:00", dias: [0], fecha: null,
//     operadorUid, operadorNombre, activo }
// `dias` usa la numeración de Date.getDay() (0 = domingo … 6 = sábado). Si está
// vacío, el servicio es de una sola vez y vale solo en `fecha` ("AAAA-MM-DD").
//
// Reglas (acordadas con el usuario el 23 de octubre de 2026):
// - Pastor y pastora proyectan siempre.
// - Con un servicio en curso, proyecta su operador. Si dos se cruzan, manda el
//   que empezó más tarde.
// - Sin servicio, proyecta quien tenga el ensayo. Un ensayo termina al pulsar
//   «Terminar», al empezar cualquier servicio o a las HORAS_ENSAYO.
// - Sin servicio ni ensayo, solo pastor y pastora.

import { esPastor } from "../Roles/Roles.js";

export const HORAS_ENSAYO = 3;
const MS_ENSAYO = HORAS_ENSAYO * 60 * 60 * 1000;

// En pantalla la semana empieza el lunes, como en las alarmas.
export const DIAS = [
  { num: 1, corto: "L", largo: "Lunes" },
  { num: 2, corto: "M", largo: "Martes" },
  { num: 3, corto: "X", largo: "Miércoles" },
  { num: 4, corto: "J", largo: "Jueves" },
  { num: 5, corto: "V", largo: "Viernes" },
  { num: 6, corto: "S", largo: "Sábado" },
  { num: 0, corto: "D", largo: "Domingo" },
];

// "08:30" → 510
export function aMinutos(hora) {
  const [h, m] = String(hora || "0:0").split(":").map(Number);
  return h * 60 + m;
}

// Fecha local en formato "AAAA-MM-DD" (la de <input type="date">).
export function fechaISO(fecha) {
  const a = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, "0");
  const d = String(fecha.getDate()).padStart(2, "0");
  return `${a}-${m}-${d}`;
}

// ¿El servicio ocurre ese día (sin mirar la hora)?
export function ocurreEl(servicio, fecha) {
  if (servicio.activo === false) return false;
  if (servicio.dias?.length) return servicio.dias.includes(fecha.getDay());
  return servicio.fecha === fechaISO(fecha);
}

// Momento exacto (ms) en que el servicio empieza el día indicado.
function inicioEnMs(servicio, fecha) {
  const minutos = aMinutos(servicio.inicio);
  const d = new Date(fecha);
  d.setHours(Math.floor(minutos / 60), minutos % 60, 0, 0);
  return d.getTime();
}

export function serviciosEnCurso(servicios, ahoraMs) {
  const ahora = new Date(ahoraMs);
  const minuto = ahora.getHours() * 60 + ahora.getMinutes();
  return servicios.filter(
    (s) =>
      ocurreEl(s, ahora) &&
      aMinutos(s.inicio) <= minuto &&
      minuto < aMinutos(s.fin)
  );
}

// ¿Algún servicio empezó entre `desdeMs` (sin incluir) y `hastaMs`? Sirve para
// cortar un ensayo cuando empieza un servicio, aunque ese servicio ya haya
// terminado: el ensayo no «revive» después.
function empezoAlgunServicio(servicios, desdeMs, hastaMs) {
  const dias = [new Date(desdeMs), new Date(hastaMs)];
  return servicios.some((s) =>
    dias.some((dia) => {
      if (!ocurreEl(s, dia)) return false;
      const inicio = inicioEnMs(s, dia);
      return inicio > desdeMs && inicio <= hastaMs;
    })
  );
}

export function ensayoVigente(ensayo, servicios, ahoraMs) {
  if (!ensayo?.uid || typeof ensayo.inicio !== "number") return false;
  if (ahoraMs - ensayo.inicio >= MS_ENSAYO) return false;
  return !empezoAlgunServicio(servicios, ensayo.inicio, ahoraMs);
}

// Turno actual:
//   { tipo: "servicio", uid, nombre, servicio }
//   { tipo: "ensayo", uid, nombre, hasta }
//   { tipo: "libre" }
export function turnoActual(servicios, ensayo, ahoraMs) {
  const enCurso = serviciosEnCurso(servicios, ahoraMs);

  if (enCurso.length) {
    const servicio = enCurso.reduce((elegido, s) =>
      aMinutos(s.inicio) > aMinutos(elegido.inicio) ? s : elegido
    );
    return {
      tipo: "servicio",
      uid: servicio.operadorUid || null,
      nombre: servicio.operadorNombre || "",
      servicio,
    };
  }

  if (ensayoVigente(ensayo, servicios, ahoraMs)) {
    return {
      tipo: "ensayo",
      uid: ensayo.uid,
      nombre: ensayo.nombre || "",
      hasta: ensayo.inicio + MS_ENSAYO,
    };
  }

  return { tipo: "libre" };
}

export function puedeProyectar(turno, userData, uid) {
  if (esPastor(userData)) return true;
  return turno.tipo !== "libre" && Boolean(uid) && turno.uid === uid;
}

// Texto corto de los días de un servicio: "L M X J V", "Domingo",
// "Todos los días" o la fecha si es de una sola vez.
export function textoDias(servicio) {
  const dias = servicio.dias || [];
  if (!dias.length) {
    if (!servicio.fecha) return "Sin fecha";
    const [a, m, d] = servicio.fecha.split("-").map(Number);
    return new Date(a, m - 1, d).toLocaleDateString("es", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  }
  if (dias.length === 7) return "Todos los días";
  if (dias.length === 1) return DIAS.find((d) => d.num === dias[0])?.largo;
  return DIAS.filter((d) => dias.includes(d.num))
    .map((d) => d.corto)
    .join(" ");
}

// Hora en formato 12 h para mostrar: "08:00" → "8:00 a. m."
export function textoHora(hora) {
  const minutos = aMinutos(hora);
  const d = new Date(2000, 0, 1, Math.floor(minutos / 60), minutos % 60);
  return d.toLocaleTimeString("es", { hour: "numeric", minute: "2-digit" });
}
