// Lógica del cronograma: quién tiene el turno de proyectar en cada momento.
//
// Son funciones puras (no leen Firebase ni el reloj por su cuenta) para que
// todos los dispositivos lleguen a la misma respuesta con los mismos datos.
// La hora que reciben es la del servidor (Date.now() + desfase de
// `.info/serverTimeOffset`), no la del celular, que puede estar adelantada.
//
// Un servicio es como una alarma del celular:
//   { nombre, inicio: "08:00", fin: "10:00", dias: [0], fecha: null, activo }
// El servicio se repite, así que NO lleva operador (25-11-2026): quién sirve cada
// fecha se decide en la programación (programacion.js): los cargos con `proyecta`
// dan el turno ese día.
// `dias` usa la numeración de Date.getDay() (0 = domingo … 6 = sábado). Si está
// vacío, el servicio es de una sola vez y vale solo en `fecha` ("AAAA-MM-DD").
//
// Reglas (acordadas con el usuario el 23 de octubre de 2026):
// - Pastor, pastora y líder proyectan siempre.
// - Con un servicio en curso, proyecta quien tenga ese día un cargo que proyecta
//   (Conductor, Proyección...), según la programación. Si dos servicios se
//   cruzan, manda el que empezó más tarde.
// - Sin servicio, proyecta quien tenga el ensayo. Un ensayo termina al pulsar
//   «Terminar», al empezar cualquier servicio o a las HORAS_ENSAYO.
// - Sin servicio ni ensayo, o con un servicio sin nadie asignado, solo pastor,
//   pastora y líder.

import { puedeProgramar } from "../Roles/Roles.js";
import { asignadosConTurno, idProgramacion } from "./programacion.js";

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
export function inicioEnMs(servicio, fecha) {
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

// Turno actual (`uids`: puede haber varias personas en un cargo; `uid` es la primera y
// `nombre` la lista, para lo que muestra la franja):
//   { tipo: "servicio", uid, uids, nombre, servicio }   (sin nadie: uid null, uids [])
//   { tipo: "ensayo", uid, uids, nombre, hasta }
//   { tipo: "libre" }
//
// `programacion` es el mapa { [servicioId_AAAA-MM-DD]: documento } y `cargos` el
// catálogo; sin ellos nadie queda asignado y solo proyectan los que mandan.
export function turnoActual(servicios, ensayo, ahoraMs, programacion = {}, cargos = []) {
  const enCurso = serviciosEnCurso(servicios, ahoraMs);

  if (enCurso.length) {
    const servicio = enCurso.reduce((elegido, s) =>
      aMinutos(s.inicio) > aMinutos(elegido.inicio) ? s : elegido
    );
    const prog = programacion?.[idProgramacion(servicio.id, fechaISO(new Date(ahoraMs)))];
    const asignados = asignadosConTurno(prog, cargos);
    return {
      tipo: "servicio",
      uid: asignados[0]?.uid || null,
      uids: asignados.map((a) => a.uid),
      nombre: asignados.map((a) => a.nombre).join(", "),
      servicio,
    };
  }

  if (ensayoVigente(ensayo, servicios, ahoraMs)) {
    return {
      tipo: "ensayo",
      uid: ensayo.uid,
      uids: [ensayo.uid],
      nombre: ensayo.nombre || "",
      hasta: ensayo.inicio + MS_ENSAYO,
    };
  }

  return { tipo: "libre" };
}

// ¿Esta persona tiene el turno? `uids` es la lista; `uid` queda por si llega un turno
// armado a mano (los ejemplos de la Ayuda).
export function tieneElTurno(turno, uid) {
  if (!uid || turno.tipo === "libre") return false;
  return Array.isArray(turno.uids) ? turno.uids.includes(uid) : turno.uid === uid;
}

export function puedeProyectar(turno, userData, uid) {
  if (puedeProgramar(userData)) return true;
  return tieneElTurno(turno, uid);
}

// Hora en formato 12 h para mostrar: "08:00" → "8:00 a. m."
export function textoHora(hora) {
  const minutos = aMinutos(hora);
  const d = new Date(2000, 0, 1, Math.floor(minutos / 60), minutos % 60);
  return d.toLocaleTimeString("es", { hour: "numeric", minute: "2-digit" });
}

// Próximo servicio que todavía no ha empezado, desde hoy hasta
// `diasAdelante` días. Devuelve { servicio, inicio } (inicio en ms) o null.
// Lo usa la pantalla de espera del templo para la cuenta regresiva.
export function proximoServicio(servicios, ahoraMs, diasAdelante = 7) {
  for (let d = 0; d <= diasAdelante; d++) {
    const fecha = new Date(ahoraMs);
    fecha.setDate(fecha.getDate() + d);
    let mejor = null;
    for (const servicio of servicios || []) {
      if (!ocurreEl(servicio, fecha)) continue;
      const inicio = inicioEnMs(servicio, fecha);
      if (inicio <= ahoraMs) continue;
      if (!mejor || inicio < mejor.inicio) mejor = { servicio, inicio };
    }
    if (mejor) return mejor;
  }
  return null;
}

// Tiempo que falta, para la cuenta regresiva: 754000 → "12:34";
// 3754000 → "1:02:34". Nunca negativo.
export function textoCuentaRegresiva(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const dos = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${dos(m)}:${dos(s)}` : `${dos(m)}:${dos(s)}`;
}
