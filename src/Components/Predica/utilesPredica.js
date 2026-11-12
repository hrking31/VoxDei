import { parsearCita } from "../OrdenCulto/utilesOrden.js";

// Prédicas sin límite (10 de noviembre de 2026; antes, 5 «slots» fijos).
// Lógica pura, sin Firebase, para probarla sin red.
//
// Una prédica es un documento de iglesias/{groupId}/predicas/{id}:
//   { titulo, fecha: "AAAA-MM-DD" | "", serie, piezas[], estado, creado, actualizado }
// Cada pieza conserva la forma de los antiguos `items`:
//   { id, tipo: "titulo",    contenido: "La fe ve lo invisible" }   ← un «punto»
//   { id, tipo: "mensaje",   contenido: "…" }
//   { id, tipo: "versiculo", contenido: { cita, texto } }
// Las 5 antiguas (predica1..predica5, con `items` y sin título) se leen igual
// y pasan a la forma nueva la primera vez que se guardan.

// Tres estados (11 de noviembre de 2026, pedido del usuario; antes, solo
// borrador y predicada): toda prédica nace «borrador», el botón de arriba del
// bosquejo la pasa a «terminada» (y la devuelve) y «Terminar y marcar como
// predicada» del púlpito, a «predicada». «Sin predicar» no es un estado: es
// una que no se predicó y cuya fecha ya pasó (estadoVisible).
export const ESTADOS = { borrador: "Borrador", terminada: "Terminada", predicada: "Predicada", "sin-predicar": "Sin predicar" };
const GUARDABLES = ["borrador", "terminada", "predicada"];
const estadoValido = (estado) => (GUARDABLES.includes(estado) ? estado : "borrador");

// Lo que se muestra: el estado guardado, salvo si pasó la fecha sin predicarla.
export const estadoVisible = (predica, hoy) =>
  predica.estado !== "predicada" && predica.fecha && predica.fecha < hoy ? "sin-predicar" : predica.estado;

// El botón de arriba: Borrador ↔ Terminada; una predicada vuelve a terminada.
export const siguienteEstado = (estado) => (estado === "terminada" ? "borrador" : "terminada");

// En el calendario, un día con varias muestra la que más pide atención.
const URGENCIA = ["sin-predicar", "borrador", "terminada", "predicada"];
export const estadoDelDia = (predicas, hoy) =>
  URGENCIA.find((e) => predicas.some((p) => estadoVisible(p, hoy) === e)) || null;

// Los tipos que se eligen en el campo de Preparar. «Versículo» salió de aquí
// (11 de noviembre de 2026, pedido del usuario): una cita se reconoce sola al
// escribirla y «Buscar por libro» sigue; en su lugar entró «Imagen».
export const TIPOS_PIEZA = [
  { tipo: "titulo", nombre: "Punto" },
  { tipo: "mensaje", nombre: "Mensaje" },
  { tipo: "imagen", nombre: "Imagen" },
];
export const NOMBRE_TIPO = { titulo: "Punto", mensaje: "Mensaje", versiculo: "Versículo", imagen: "Imagen" };

let contador = 0;
export const nuevoId = () => `${Date.now().toString(36)}${(contador++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const nuevaPieza = (tipo, contenido) => ({ id: nuevoId(), tipo, contenido });

// Documento de Firestore → prédica con la forma de siempre.
export function normalizarPredica(id, datos = {}) {
  const antigua = !Array.isArray(datos.piezas);
  const piezas = antigua
    ? (datos.items || []).map((item, i) => ({
        id: String(item.timestamp ?? `${id}-${i}`),
        tipo: item.tipo,
        contenido: item.contenido,
      }))
    : datos.piezas;
  const numero = /^predica(\d)$/.exec(id)?.[1];
  return {
    id,
    titulo: datos.titulo || (numero ? `Prédica guardada ${numero}` : "Sin título"),
    fecha: datos.fecha || "",
    serie: datos.serie || "",
    estado: estadoValido(datos.estado),
    piezas,
    antigua,
    creado: datos.creado ?? null,
    actualizado: datos.actualizado ?? null,
  };
}

// Lo que se guarda: la forma nueva completa (una antigua pierde `items`).
// Nunca un recuadro vacío ni una imagen sin foto (piezaCompleta), aunque se
// guarde justo mientras se escribe uno nuevo.
export const documentoDePredica = ({ titulo, fecha, serie, estado, piezas }) => ({
  titulo: titulo.trim() || "Sin título",
  fecha: fecha || "",
  serie: (serie || "").trim(),
  estado: estadoValido(estado),
  piezas: piezas.filter(piezaCompleta).map(({ id, tipo, contenido }) => ({ id, tipo, contenido })),
});

// ---------- Puntos numerados I, II, III ----------

const ROMANOS = [["M", 1000], ["CM", 900], ["D", 500], ["CD", 400], ["C", 100], ["XC", 90], ["L", 50], ["XL", 40], ["X", 10], ["IX", 9], ["V", 5], ["IV", 4], ["I", 1]];

export function romano(numero) {
  let resto = numero;
  let texto = "";
  for (const [letra, valor] of ROMANOS) {
    while (resto >= valor) {
      texto += letra;
      resto -= valor;
    }
  }
  return texto;
}

// { idDePieza: "I" | "II" … } solo para los puntos, en orden.
export function numerosDePuntos(piezas) {
  const numeros = {};
  let n = 0;
  for (const pieza of piezas) if (pieza.tipo === "titulo") numeros[pieza.id] = romano(++n);
  return numeros;
}

export function resumenPiezas(piezas) {
  const cuenta = { puntos: 0, versiculos: 0, mensajes: 0, imagenes: 0 };
  for (const { tipo } of piezas) {
    if (tipo === "titulo") cuenta.puntos++;
    else if (tipo === "versiculo") cuenta.versiculos++;
    else if (tipo === "imagen") cuenta.imagenes++;
    else cuenta.mensajes++;
  }
  return cuenta;
}

// «9 ítems» / «1 ítem» en Mis prédicas (antes decía «piezas»; pedido del
// usuario, 11-11-2026).
export const cuantosItems = (n) => `${n} ${n === 1 ? "ítem" : "ítems"}`;

// El primer versículo es el «texto base» de la prédica.
export const textoBase = (piezas) => piezas.find((p) => p.tipo === "versiculo")?.contenido?.cita || "";

// ---------- Mover y quitar ----------

export function mover(piezas, indice, paso) {
  const destino = indice + paso;
  if (destino < 0 || destino >= piezas.length) return piezas;
  const copia = [...piezas];
  [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
  return copia;
}

export const quitar = (piezas, id) => piezas.filter((p) => p.id !== id);

// Lo nuevo va debajo del ítem elegido; sin elegido, al final (11-11-2026).
export function insertarDespues(piezas, idElegida, pieza) {
  const i = piezas.findIndex((p) => p.id === idElegida);
  if (i < 0) return [...piezas, pieza];
  return [...piezas.slice(0, i + 1), pieza, ...piezas.slice(i + 1)];
}

// En el computador, Punto, Mensaje e Imagen crean el recuadro vacío y se
// llena en el sitio (11-11-2026). Uno vacío o una imagen sin foto no está
// completo: no se guarda ni se proyecta.
export function piezaCompleta(pieza) {
  if (pieza.tipo === "imagen") return Boolean(pieza.contenido?.url);
  if (pieza.tipo === "versiculo") return Boolean(pieza.contenido?.texto);
  return Boolean(String(pieza.contenido ?? "").trim());
}

// ---------- La cuadrícula de libros (columna derecha, 11-11-2026) ----------

// Sin el «S.» de los evangelios («S. Juan» → «Juan»).
export const nombreSinSan = (nombre) => String(nombre || "").replace(/^S\.\s*/, "");

// Nombre corto para la cuadrícula: cuatro letras («Géne», «Fili», «File») o
// el número y tres («1 Sam»); «dc» marca los deuterocanónicos de la DHH.
export function nombreCorto(nombre) {
  const limpio = nombreSinSan(nombre);
  const dc = /\(dc\)/.test(limpio) ? " dc" : "";
  const sinDc = limpio.replace(/\s*\(dc\)/, "");
  const conNumero = /^(\d)\s*(.*)$/.exec(sinDc);
  return (conNumero ? `${conNumero[1]} ${conNumero[2].slice(0, 3)}` : sinDc.slice(0, 4)) + dc;
}

// «Juan 3:16» a partir del libro del catálogo.
export const citaDeLibro = (libro, capitulo, versiculo) => `${nombreSinSan(libro.nombre)} ${capitulo}:${versiculo}`;

// ---------- El campo único ----------

// Qué agregaría el campo con lo escrito. Una cita reconocida («Juan 3:16»,
// «jn 3 16») es siempre un versículo, aunque el tipo elegido sea otro; con
// «Versículo» elegido y una cita que no se entiende, no se agrega nada.
// Devuelve { tipo, cita? } o null. `libros`: catálogo de la Biblia elegida
// (TEMPORAL DHH; sin él, la RVR1960).
export function interpretarEntrada(texto, tipoElegido, libros) {
  const limpio = String(texto || "").trim();
  if (!limpio) return null;
  // Con «Imagen» elegida no se escribe: se sube o se elige una.
  if (tipoElegido === "imagen") return null;
  const cita = parsearCita(limpio, libros);
  if (cita) return { tipo: "versiculo", cita };
  if (tipoElegido === "versiculo") return null;
  return { tipo: tipoElegido === "titulo" ? "titulo" : "mensaje" };
}

// Texto corto de una pieza para listas, avisos y el «luego».
export function textoDePieza(pieza) {
  if (!pieza) return "";
  if (pieza.tipo === "versiculo") return pieza.contenido?.cita || "";
  if (pieza.tipo === "imagen") return pieza.contenido?.nombre ? `Imagen · ${pieza.contenido.nombre}` : "Imagen";
  return String(pieza.contenido || "");
}

// ---------- Biblioteca ----------

const sinTildes = (texto) =>
  String(texto || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Busca en título, serie y citas; filtro: "todas" | "borrador" | "terminada" |
// "predicada" (por el estado guardado: una «sin predicar» sale en el suyo).
export function filtrarPredicas(predicas, busqueda = "", filtro = "todas") {
  const buscado = sinTildes(busqueda).trim();
  return predicas.filter((p) => {
    if (filtro !== "todas" && p.estado !== filtro) return false;
    if (!buscado) return true;
    const donde = [p.titulo, p.serie, ...p.piezas.map((x) => (x.tipo === "versiculo" ? x.contenido?.cita : ""))];
    return donde.some((t) => sinTildes(t).includes(buscado));
  });
}

const milisegundos = (marca) =>
  typeof marca?.toMillis === "function" ? marca.toMillis() : typeof marca === "number" ? marca : 0;

// Dos grupos: «próximas» (fecha de hoy en adelante, la más cercana primero) y
// «anteriores» (las demás, la más reciente primero; sin fecha, por la última
// edición).
export function ordenarPredicas(predicas, hoy) {
  const proximas = predicas.filter((p) => p.fecha && p.fecha >= hoy).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const anteriores = predicas
    .filter((p) => !(p.fecha && p.fecha >= hoy))
    .sort((a, b) => (b.fecha || "").localeCompare(a.fecha || "") || milisegundos(b.actualizado) - milisegundos(a.actualizado));
  return { proximas, anteriores };
}

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

// "2026-11-15" → "Dom 15 nov". Sin fecha, "".
export function fechaCorta(fecha) {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha || "");
  if (!partes) return "";
  const dia = new Date(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3]));
  return `${DIAS[dia.getDay()]} ${dia.getDate()} ${MESES[dia.getMonth()]}`;
}

// Fecha local de hoy en "AAAA-MM-DD".
export function hoyLocal(ahora = new Date()) {
  const dosCifras = (n) => String(n).padStart(2, "0");
  return `${ahora.getFullYear()}-${dosCifras(ahora.getMonth() + 1)}-${dosCifras(ahora.getDate())}`;
}

// El próximo domingo (o hoy si es domingo): la fecha de fábrica de una prédica nueva.
export function proximoDomingo(ahora = new Date()) {
  const dia = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  dia.setDate(dia.getDate() + ((7 - dia.getDay()) % 7));
  return hoyLocal(dia);
}

// ---------- Calendario ----------

export const NOMBRES_MES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

// La línea de tiempo de Mis prédicas (11 de noviembre de 2026): agrupa por mes
// sin cambiar el orden que trae la lista. El año solo se nombra si no es el de
// hoy; las que no tienen fecha van juntas en «Sin fecha».
// → [{ clave: "2026-11" | "sin-fecha", nombre: "Noviembre", predicas: [...] }]
export function agruparPorMes(predicas, hoy) {
  const anioHoy = (hoy || "").slice(0, 4);
  const grupos = [];
  for (const p of predicas) {
    const partes = /^(\d{4})-(\d{2})-\d{2}$/.exec(p.fecha || "");
    const clave = partes ? `${partes[1]}-${partes[2]}` : "sin-fecha";
    let grupo = grupos.find((g) => g.clave === clave);
    if (!grupo) {
      const nombre = !partes
        ? "Sin fecha"
        : `${NOMBRES_MES[Number(partes[2]) - 1]}${partes[1] === anioHoy ? "" : ` ${partes[1]}`}`;
      grupo = { clave, nombre, predicas: [] };
      grupos.push(grupo);
    }
    grupo.predicas.push(p);
  }
  return grupos;
}

// Las casillas de un mes (`mes` de 0 a 11), semanas de domingo a sábado,
// completadas con días del mes anterior y del siguiente:
// [{ fecha: "AAAA-MM-DD", dia, delMes, domingo }].
export function diasDelMes(anio, mes) {
  const primero = new Date(anio, mes, 1);
  const inicio = new Date(anio, mes, 1 - primero.getDay());
  const ultimo = new Date(anio, mes + 1, 0);
  const casillas = Math.ceil((primero.getDay() + ultimo.getDate()) / 7) * 7;
  return Array.from({ length: casillas }, (_, i) => {
    const dia = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i);
    return { fecha: hoyLocal(dia), dia: dia.getDate(), delMes: dia.getMonth() === mes, domingo: dia.getDay() === 0 };
  });
}

// { "AAAA-MM-DD": [prédicas de ese día] }, para marcar el calendario.
export function predicasPorFecha(predicas) {
  const porFecha = {};
  for (const p of predicas) if (p.fecha) (porFecha[p.fecha] ||= []).push(p);
  return porFecha;
}

// "18:42" para el reloj del púlpito.
export function relojDesde(ms) {
  const segundos = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(segundos / 3600);
  const m = String(Math.floor((segundos % 3600) / 60)).padStart(h ? 2 : 1, "0");
  const s = String(segundos % 60).padStart(2, "0");
  return h ? `${h}:${m}:${s}` : `${m}:${s}`;
}
