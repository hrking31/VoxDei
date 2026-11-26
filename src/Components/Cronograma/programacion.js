// Programación de los servicios (25-11-2026): quién sirve en cada cargo en cada fecha.
//
// El servicio (cronograma) se repite; la programación es de UNA fecha concreta:
//   iglesias/{groupId}/programacion/{servicioId}_{AAAA-MM-DD} = {
//     servicioId, fecha, actualizado,
//     asignaciones: { [cargoId]: [{ uid, nombre, estado }] }
//   }
// `estado` es "pendiente" | "confirmado" | "no_puede" (las confirmaciones, entrega 2).
//
// Los cargos son un catálogo editable de la iglesia (iglesias/{groupId}/cargos):
//   { nombre, orden, proyecta }
// Un cargo con `proyecta` (Conductor, Proyección) da el turno de la pantalla durante
// el servicio. Son funciones puras, sin React ni Firebase.

import {
  aMinutos,
  fechaISO,
  inicioEnMs,
  ocurreEl,
} from "./UtilesCronograma.js";

export const ESTADOS = ["pendiente", "confirmado", "no_puede"];

// Cargos con los que arranca una iglesia (no se crean solos: se pulsa «Usar los cargos
// básicos»). El id fijo permite volver a crearlos sin duplicarlos.
export const CARGOS_BASICOS = [
  { id: "conductor", nombre: "Conductor", proyecta: true },
  { id: "alabanza", nombre: "Alabanza", proyecta: false },
  { id: "predica", nombre: "Predica", proyecta: false },
  { id: "bienvenida", nombre: "Bienvenida", proyecta: false },
  { id: "oracion", nombre: "Oración", proyecta: false },
  { id: "ofrendas", nombre: "Ofrendas", proyecta: false },
  { id: "proyeccion", nombre: "Proyección", proyecta: true },
  { id: "sonido", nombre: "Sonido", proyecta: false },
  { id: "ninos", nombre: "Niños", proyecta: false },
].map((cargo, orden) => ({ ...cargo, orden }));

// Nombres que se ofrecen al crear un cargo (25-11-2026): los básicos y otros comunes. Se puede
// escoger uno o escribir uno propio. Salen siempre todos, también los que ya existen, para volver a crear uno que se borró.
export const SUGERENCIAS_CARGO = [
  ...CARGOS_BASICOS.map((c) => c.nombre),
  "Cámara",
  "Ujieres",
  "Intercesión",
  "Lectura bíblica",
  "Música",
  "Recepción",
];

export const idProgramacion = (servicioId, fecha) => `${servicioId}_${fecha}`;

// Los cargos, en el orden del catálogo.
export function ordenarCargos(cargos) {
  return [...(cargos || [])].sort(
    (a, b) =>
      (a.orden ?? 0) - (b.orden ?? 0) ||
      String(a.nombre).localeCompare(String(b.nombre), "es"),
  );
}

// Personas de un cargo en una programación.
export function personasDeCargo(programacion, cargoId) {
  return programacion?.asignaciones?.[cargoId] || [];
}

// Quienes tienen el turno de la pantalla en esa fecha: las personas de los cargos que
// proyectan, sin repetir y sin quien dijo «no puedo».
export function asignadosConTurno(programacion, cargos) {
  const vistos = new Set();
  const lista = [];
  for (const cargo of cargos || []) {
    if (!cargo.proyecta) continue;
    for (const persona of personasDeCargo(programacion, cargo.id)) {
      if (persona.estado === "no_puede" || vistos.has(persona.uid)) continue;
      vistos.add(persona.uid);
      lista.push({ uid: persona.uid, nombre: persona.nombre });
    }
  }
  return lista;
}

// Devuelve nuevas asignaciones con la persona añadida al cargo (si ya estaba, igual).
export function agregarPersona(asignaciones, cargoId, persona) {
  const actuales = asignaciones?.[cargoId] || [];
  if (actuales.some((p) => p.uid === persona.uid)) return { ...asignaciones };
  return {
    ...asignaciones,
    [cargoId]: [
      ...actuales,
      { uid: persona.uid, nombre: persona.nombre, estado: "pendiente" },
    ],
  };
}

// Devuelve nuevas asignaciones sin esa persona en el cargo; un cargo vacío se quita.
export function quitarPersona(asignaciones, cargoId, uid) {
  const restantes = (asignaciones?.[cargoId] || []).filter(
    (p) => p.uid !== uid,
  );
  const copia = { ...asignaciones };
  if (restantes.length) copia[cargoId] = restantes;
  else delete copia[cargoId];
  return copia;
}

// Las próximas fechas en que hay servicio (la que está en curso cuenta): hasta
// `cuantas`, mirando `diasAdelante` días. Cada una: { id, servicio, fecha, inicio, fin }
// con inicio y fin en ms, ordenadas por inicio.
export function proximasFechas(
  servicios,
  ahoraMs,
  { cuantas = 8, diasAdelante = 35 } = {},
) {
  const resultado = [];
  for (let d = 0; d <= diasAdelante; d++) {
    const dia = new Date(ahoraMs);
    dia.setDate(dia.getDate() + d);
    for (const servicio of servicios || []) {
      if (!ocurreEl(servicio, dia)) continue;
      const inicio = inicioEnMs(servicio, dia);
      const fin =
        inicio +
        (aMinutos(servicio.fin) - aMinutos(servicio.inicio)) * 60 * 1000;
      if (fin <= ahoraMs) continue;
      const fecha = fechaISO(dia);
      resultado.push({
        id: idProgramacion(servicio.id, fecha),
        servicio,
        fecha,
        inicio,
        fin,
      });
    }
  }
  return resultado.sort((a, b) => a.inicio - b.inicio).slice(0, cuantas);
}

// «Mi programación» (entrega 2): las próximas fechas en que `uid` tiene algún cargo, con lo
// que debe responder. Cada una: { id, servicio, fecha, inicio, cargos: [{ cargoId, nombre,
// estado }] }. Los cargos que ya no existen en el catálogo se ignoran.
export function misTurnos(servicios, programacion, cargos, uid, ahoraMs) {
  if (!uid) return [];
  const porId = new Map((cargos || []).map((c) => [c.id, c]));
  const resultado = [];
  for (const f of proximasFechas(servicios, ahoraMs, { cuantas: 20 })) {
    const asignaciones = programacion?.[f.id]?.asignaciones || {};
    const mios = Object.entries(asignaciones)
      .filter(([cargoId]) => porId.has(cargoId))
      .map(([cargoId, personas]) => ({
        cargoId,
        persona: (personas || []).find((p) => p.uid === uid),
      }))
      .filter((x) => x.persona)
      .map(({ cargoId, persona }) => ({
        cargoId,
        nombre: porId.get(cargoId).nombre,
        estado: persona.estado || "pendiente",
      }));
    if (mios.length) {
      resultado.push({
        id: f.id,
        servicio: f.servicio,
        fecha: f.fecha,
        inicio: f.inicio,
        cargos: mios,
      });
    }
  }
  return resultado;
}
