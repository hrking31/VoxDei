import { nivelDe, RENGLONES_RESUMEN, SANGRIA_RESUMEN, textoDePunto } from "./utilesPredica.js";

// Las pantallas de puntos (20-11-2026, pedido del usuario): el resumen de puntos se reparte en
// PANTALLAS según lo que CABE en la pantalla real del templo, no de 6 en 6. La app propone la
// agrupación midiendo (MedidorPuntos) y el predicador la ajusta en Pruebas con cortes manuales
// («pantalla nueva desde este punto»), que se guardan en la prédica (`cortesPuntos`). Aquí vive la
// lógica pura: sin pantalla, sin React.
//
// Un GRUPO (una pantalla) es { ids: [idDelPunto…], estado, llenado }:
//   estado   «bien» | «justo» (cabe) | «no-cabe» (un solo punto que no cabe solo) | «sin-medir»
//   llenado  cuánto del espacio del centro ocupa (0 a más de 1), o null si no se ha medido

// Los renglones de una pantalla, con la numeración ORIGINAL del bosquejo (decisión del usuario:
// la numeración continúa de una pantalla a otra, IV., V.…, no vuelve a empezar). Los subpuntos van
// con sangría.
export function lineasConNumeracion(puntos, numeros) {
  return puntos.map((p) => SANGRIA_RESUMEN.repeat(nivelDe(p)) + textoDePunto(numeros[p.id], p.contenido));
}

// Los cortes que valen: ids de puntos que existen y que no son el primero (antes del primero no
// hay nada que cortar), sin repetir.
export function cortesValidos(cortes, puntos) {
  const existentes = new Set(puntos.map((p) => p.id));
  const primero = puntos[0]?.id;
  const vistos = new Set();
  const validos = [];
  for (const id of Array.isArray(cortes) ? cortes : []) {
    if (typeof id !== "string" || !existentes.has(id) || id === primero || vistos.has(id)) continue;
    vistos.add(id);
    validos.push(id);
  }
  return validos;
}

// La agrupación de respaldo, mientras no se ha medido: de a `maximo` puntos (los 6 de siempre),
// respetando los cortes manuales.
export function gruposPorCantidad(puntos, cortes = [], maximo = RENGLONES_RESUMEN) {
  const cortesSet = new Set(cortes);
  const grupos = [];
  let actual = [];
  for (const punto of puntos) {
    if (actual.length && (actual.length >= maximo || cortesSet.has(punto.id))) {
      grupos.push({ ids: actual, estado: "sin-medir", llenado: null });
      actual = [];
    }
    actual.push(punto.id);
  }
  if (actual.length) grupos.push({ ids: actual, estado: "sin-medir", llenado: null });
  return grupos;
}

// El rango de una pantalla, para su título: «IV – VII» o «IV» si es uno solo. Se quita el signo
// final de la etiqueta («IV.» → «IV», «4)» → «4»).
export function rotuloDeRango(ids, numeros) {
  const limpiar = (id) => String(numeros[id] || "").replace(/[.)]\s*$/, "");
  const primero = limpiar(ids[0]);
  const ultimo = limpiar(ids[ids.length - 1]);
  if (!primero) return "";
  return ids.length > 1 && ultimo && ultimo !== primero ? `${primero} – ${ultimo}` : primero;
}

// ---------- El medidor, como una máquina de pasos (sin pantalla: se prueba con medidas inventadas) ----------
//
// Se prueba con la pantalla real, un punto más cada vez: se mide el grupo de `cuantos` puntos desde
// `inicio`; si cabe, se prueba con uno más; si no cabe, el grupo se cierra con los que sí cabían y el
// punto que no cupo empieza el siguiente. Un corte manual cierra el grupo antes del punto cortado.
// Un solo punto que no cabe ni solo forma su propia pantalla, marcada «no-cabe».

export function estadoInicial(puntos, cortes = []) {
  return { ids: puntos.map((p) => p.id), cortes: [...cortes], inicio: 0, cuantos: 1, ultimaBuena: null, grupos: [], terminado: puntos.length === 0 };
}

// Los puntos (ids) que hay que medir ahora.
export const candidatoActual = (estado) => estado.ids.slice(estado.inicio, estado.inicio + estado.cuantos);

// Una clave para saber a qué grupo candidato corresponde una medida (las repetidas se ignoran).
export const claveDeCandidato = (estado) => `${estado.inicio}-${estado.cuantos}`;

const cerrar = (estado, cuantos, estadoDelGrupo, llenado) => {
  const ids = estado.ids.slice(estado.inicio, estado.inicio + cuantos);
  const inicio = estado.inicio + cuantos;
  return {
    ...estado,
    grupos: [...estado.grupos, { ids, estado: estadoDelGrupo, llenado: llenado ?? null }],
    inicio,
    cuantos: 1,
    ultimaBuena: null,
    terminado: inicio >= estado.ids.length,
  };
};

// `medida`: { clave, estado: «bien» | «justo» | «no-cabe», llenado }. Devuelve el estado siguiente.
export function paso(estado, medida) {
  if (estado.terminado || medida.clave !== claveDeCandidato(estado)) return estado;
  if (medida.estado === "no-cabe") {
    // Un solo punto que no cabe: pantalla propia, marcada. Si eran varios: se cierra con los anteriores.
    if (estado.cuantos === 1) return cerrar(estado, 1, "no-cabe", medida.llenado);
    return cerrar(estado, estado.cuantos - 1, estado.ultimaBuena?.estado || "bien", estado.ultimaBuena?.llenado);
  }
  const buena = { estado: medida.estado, llenado: medida.llenado };
  const siguiente = estado.ids[estado.inicio + estado.cuantos];
  // Ya no hay más puntos, o el siguiente tiene un corte manual: se cierra con estos.
  if (siguiente === undefined || estado.cortes.includes(siguiente)) return cerrar(estado, estado.cuantos, buena.estado, buena.llenado);
  return { ...estado, cuantos: estado.cuantos + 1, ultimaBuena: buena };
}

// Lo mismo, de una vez, con una función que mide un grupo de ids (para probarlo sin pantalla).
export function agruparPorCabida(puntos, cortes, medir) {
  let estado = estadoInicial(puntos, cortes);
  let vueltas = 0;
  while (!estado.terminado && vueltas++ < puntos.length * 4 + 4) {
    const { estado: veredicto, llenado } = medir(candidatoActual(estado));
    estado = paso(estado, { clave: claveDeCandidato(estado), estado: veredicto, llenado });
  }
  return estado.grupos;
}

// Qué estado de color lleva una pantalla ya medida, para el medidor de llenado.
export const tonoDeLlenado = (grupo) => (grupo.estado === "no-cabe" ? "error" : grupo.estado === "justo" ? "justo" : grupo.estado === "bien" ? "bien" : "sin-medir");
