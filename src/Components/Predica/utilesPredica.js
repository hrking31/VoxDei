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
    // El versículo base es un dato propio desde el 12-11-2026 (pedido del
    // usuario: solo se muestra arriba, no es un ítem). Las de antes, sin el
    // campo, toman el primer versículo del bosquejo, como se veía entonces.
    base: typeof datos.base === "string" ? datos.base : textoBase(piezas),
    numeracion: numeracionValida(datos.numeracion),
    numeracionNiveles: nivelesValidos(datos.numeracionNiveles),
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
export const documentoDePredica = ({ titulo, fecha, serie, base, numeracion, numeracionNiveles, estado, piezas }) => ({
  titulo: titulo.trim() || "Sin título",
  fecha: fecha || "",
  serie: (serie || "").trim(),
  base: (base || "").trim(),
  numeracion: numeracionValida(numeracion),
  numeracionNiveles: nivelesValidos(numeracionNiveles),
  estado: estadoValido(estado),
  // El nivel solo se guarda en los subpuntos (Firestore no acepta undefined).
  piezas: piezas.filter(piezaCompleta).map((p) => ({ id: p.id, tipo: p.tipo, contenido: p.contenido, ...(nivelDe(p) ? { nivel: nivelDe(p) } : {}) })),
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
// Cómo se numeran los puntos (12-11-2026, pedido del usuario: elegirlo en
// el botón «Punto», con las mismas opciones de la biblioteca de números de
// Word). Cada prédica guarda la suya en `numeracion`; la etiqueta lleva su
// signo («I.», «1)», «a)»).
export const NUMERACIONES = [
  { clave: "numeros", nombre: "Números con punto", ejemplo: "1. 2. 3." },
  { clave: "numeros-parentesis", nombre: "Números con paréntesis", ejemplo: "1) 2) 3)" },
  { clave: "romanos", nombre: "Romanos", ejemplo: "I. II. III." },
  { clave: "letras", nombre: "Letras", ejemplo: "A. B. C." },
  { clave: "minusculas-parentesis", nombre: "Minúsculas con paréntesis", ejemplo: "a) b) c)" },
  { clave: "minusculas", nombre: "Minúsculas con punto", ejemplo: "a. b. c." },
  { clave: "romanos-minusculas", nombre: "Romanos minúsculos", ejemplo: "i. ii. iii." },
];
export const numeracionValida = (clave) => (NUMERACIONES.some((n) => n.clave === clave) ? clave : "romanos");

// 1 → A, 26 → Z, 27 → AA (como las columnas de una hoja de cálculo).
function letra(numero) {
  let n = numero;
  let texto = "";
  while (n > 0) {
    const resto = (n - 1) % 26;
    texto = String.fromCharCode(65 + resto) + texto;
    n = Math.floor((n - 1) / 26);
  }
  return texto;
}

export function etiquetaPunto(numero, estilo = "romanos") {
  switch (numeracionValida(estilo)) {
    case "numeros":
      return `${numero}.`;
    case "numeros-parentesis":
      return `${numero})`;
    case "letras":
      return `${letra(numero)}.`;
    case "minusculas-parentesis":
      return `${letra(numero).toLowerCase()})`;
    case "minusculas":
      return `${letra(numero).toLowerCase()}.`;
    case "romanos-minusculas":
      return `${romano(numero).toLowerCase()}.`;
    default:
      return `${romano(numero)}.`;
  }
}

// Niveles de los puntos (12-11-2026, pedidos del usuario), como la lista
// multinivel de Word: 0 punto, 1 subpunto, 2 sub-subpunto (`nivel` en la
// pieza; hasta 3 niveles: más, en el proyector, deja el texto muy angosto).
// Cada nivel se numera dentro del de arriba y empieza de nuevo en cada uno:
// I. → a) → 1.; con puntos en letras, A. → 1) → a.
export const NIVEL_MAXIMO = 2;
export const nivelDe = (pieza) => (pieza?.tipo === "titulo" && (pieza.nivel === 1 || pieza.nivel === 2) ? pieza.nivel : 0);
export const esSubpunto = (pieza) => nivelDe(pieza) > 0;
const ESTILOS_DE_LETRAS = ["letras", "minusculas", "minusculas-parentesis"];
export function estiloDeNivel(estilo, nivel) {
  if (nivel === 0) return numeracionValida(estilo);
  const conLetras = ESTILOS_DE_LETRAS.includes(numeracionValida(estilo));
  if (nivel === 1) return conLetras ? "numeros-parentesis" : "minusculas-parentesis";
  return conLetras ? "minusculas" : "numeros";
}

// El estilo de cada nivel se puede elegir (12-11-2026, pedido del usuario:
// «romanos, después números y después letras»). `numeracionNiveles` guarda
// el de subpuntos y sub-subpuntos; null es «automático» (el de estiloDeNivel).
export const nivelesValidos = (niveles) =>
  [0, 1].map((i) => (Array.isArray(niveles) && NUMERACIONES.some((n) => n.clave === niveles[i]) ? niveles[i] : null));
export const estilosDeNiveles = (estilo, niveles) => {
  const elegidos = nivelesValidos(niveles);
  return [numeracionValida(estilo), elegidos[0] ?? estiloDeNivel(estilo, 1), elegidos[1] ?? estiloDeNivel(estilo, 2)];
};

// Combinaciones ya hechas para los tres niveles, como la biblioteca de
// listas multinivel de Word (12-11-2026, pedido del usuario: «mejor las
// combinaciones ya hechas, al final solo son tres puntos»). Se elige una y
// quedan puestos los tres estilos.
export const COMBINACIONES = [
  { clave: "clasico", nombre: "Esquema clásico", estilos: ["romanos", "letras", "numeros"] },
  { clave: "fabrica", nombre: "Romanos y letras", estilos: ["romanos", "minusculas-parentesis", "numeros"] },
  { clave: "romanos-numeros", nombre: "Romanos y números", estilos: ["romanos", "numeros-parentesis", "minusculas"] },
  { clave: "numeros", nombre: "Números", estilos: ["numeros", "minusculas-parentesis", "romanos-minusculas"] },
  { clave: "letras", nombre: "Letras", estilos: ["letras", "numeros-parentesis", "minusculas"] },
  { clave: "parentesis", nombre: "Con paréntesis", estilos: ["numeros-parentesis", "minusculas-parentesis", "romanos-minusculas"] },
];
// La combinación que coincide con lo que tiene la prédica (o null).
export const combinacionDe = (estilo, niveles) => {
  const actuales = estilosDeNiveles(estilo, niveles);
  return COMBINACIONES.find((c) => c.estilos.every((e, i) => e === actuales[i])) || null;
};
// Lo que se guarda al elegir una.
export const datosDeCombinacion = (combinacion) => ({ numeracion: combinacion.estilos[0], numeracionNiveles: combinacion.estilos.slice(1) });

export function numerosDePuntos(piezas, estilo = "romanos", niveles = null) {
  const estilos = estilosDeNiveles(estilo, niveles);
  const numeros = {};
  const cuenta = [0, 0, 0];
  for (const pieza of piezas) {
    if (pieza.tipo !== "titulo") continue;
    const nivel = nivelDe(pieza);
    cuenta[nivel] += 1;
    for (let mas = nivel + 1; mas <= NIVEL_MAXIMO; mas++) cuenta[mas] = 0;
    numeros[pieza.id] = etiquetaPunto(cuenta[nivel], estilos[nivel]);
  }
  return numeros;
}

// Poner un punto en un nivel (0 a NIVEL_MAXIMO): la sangría de Word. Solo
// los puntos; los demás ítems no cambian.
// Regla del esquema (12-11-2026, pedido del usuario): un punto puede ir, como
// mucho, un nivel más adentro que el punto de arriba (los demás ítems no
// cuentan); el primero siempre es punto. Así no hay un «1.» sin su «a)» arriba.
export function nivelPermitido(piezas, id) {
  const i = piezas.findIndex((p) => p.id === id);
  for (let j = i - 1; j >= 0; j--) if (piezas[j].tipo === "titulo") return Math.min(NIVEL_MAXIMO, nivelDe(piezas[j]) + 1);
  return 0;
}

export const cambiarNivel = (piezas, id, nivel) =>
  piezas.map((p) => {
    if (p.id !== id || p.tipo !== "titulo") return p;
    const destino = Math.min(nivelPermitido(piezas, id), Math.max(0, nivel));
    const { nivel: _quitado, ...sinNivel } = p;
    return destino > 0 ? { ...sinNivel, nivel: destino } : sinNivel;
  });

// Un punto se proyecta como mensaje, con su número delante: «I. La fe…».
// La etiqueta ya trae su signo («I.», «1)»).
export const textoDePunto = (numero, contenido) => (numero ? `${numero} ${contenido}` : String(contenido || ""));

// El resumen de los puntos ya vistos, uno por renglón, para proyectarlo
// como un solo mensaje. `hasta` es el índice del último ítem visto.
// Los subpuntos, con sangría bajo su punto.
export const SANGRIA_RESUMEN = "    ";
// Regla (12-11-2026, pedido del usuario): SOLO lo que se proyecta desde
// «Resumen de puntos vistos» va alineado así, renglón por renglón, en un
// bloque centrado; todo lo demás sigue la alineación de Estilos y colores.
export const ALINEACION_RESUMEN = "izquierda";

// El resumen, por partes, para que nunca quede cortado en la pantalla
// (12-11-2026, pedido del usuario): paquetes de hasta `maximo` renglones. Un
// punto va siempre con sus subpuntos: si no cabe entero, pasa a la parte
// siguiente (solo se parte si él solo ya no cabe en una).
export const RENGLONES_RESUMEN = 6;
export function partesDelResumen(lineas, maximo = RENGLONES_RESUMEN) {
  const grupos = [];
  for (const linea of lineas) {
    if (linea.startsWith(SANGRIA_RESUMEN) && grupos.length) grupos.at(-1).push(linea);
    else grupos.push([linea]);
  }
  const partes = [];
  let parte = [];
  for (const grupo of grupos) {
    if (parte.length && parte.length + grupo.length > maximo) {
      partes.push(parte);
      parte = [];
    }
    for (const linea of grupo) {
      if (parte.length === maximo) {
        partes.push(parte);
        parte = [];
      }
      parte.push(linea);
    }
  }
  if (parte.length) partes.push(parte);
  return partes;
}
export function resumenDePuntos(piezas, hasta, estilo = "romanos", niveles = null) {
  const numeros = numerosDePuntos(piezas, estilo, niveles);
  return piezas
    .slice(0, hasta + 1)
    .filter((p) => p.tipo === "titulo")
    .map((p) => SANGRIA_RESUMEN.repeat(nivelDe(p)) + textoDePunto(numeros[p.id], p.contenido));
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
// El primer versículo del bosquejo: solo para las prédicas guardadas antes
// de que el versículo base fuera un dato propio (normalizarPredica).
export const textoBase = (piezas) => piezas.find((p) => p.tipo === "versiculo")?.contenido?.cita || "";

// ---------- Mover y quitar ----------

export function mover(piezas, indice, paso) {
  const destino = indice + paso;
  if (destino < 0 || destino >= piezas.length) return piezas;
  const copia = [...piezas];
  [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
  return copia;
}

// La numeración del bosquejo (12-11-2026, pedido del usuario): escribir otro
// número en la cajita de un ítem lo lleva a ese lugar y los demás se corren.
export function moverA(piezas, desde, hasta) {
  const fuera = (n) => !Number.isInteger(n) || n < 0 || n >= piezas.length;
  if (desde === hasta || fuera(desde) || fuera(hasta)) return piezas;
  const copia = [...piezas];
  const [pieza] = copia.splice(desde, 1);
  copia.splice(hasta, 0, pieza);
  return copia;
}

// Lo escrito en la cajita → el índice de destino. "3" con 8 ítems → 2.
// Vacío, con letras, con decimales o fuera de 1..total → null (se ignora).
export function posicionEscrita(texto, total) {
  const limpio = String(texto ?? "").trim();
  if (!/^\d+$/.test(limpio)) return null;
  const numero = Number(limpio);
  return numero >= 1 && numero <= total ? numero - 1 : null;
}

export const quitar = (piezas, id) => piezas.filter((p) => p.id !== id);

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

// El versículo base escrito → la cita bien escrita («juan 3 16» → «Juan 3:16»).
// Vacío → "" (se quita); lo que no es una cita → null (no se guarda).
export function citaBase(texto, libros) {
  const limpio = String(texto ?? "").trim();
  if (!limpio) return "";
  return parsearCita(limpio, libros)?.cita ?? null;
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
    const donde = [p.titulo, p.serie, p.base, ...p.piezas.map((x) => (x.tipo === "versiculo" ? x.contenido?.cita : ""))];
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

const DIAS_LARGOS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const MESES_LARGOS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

// "2026-11-21" → "Sábado 21 de noviembre" (el día marcado del calendario). Sin fecha, "".
export function fechaLarga(fecha) {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha || "");
  if (!partes) return "";
  const dia = new Date(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3]));
  return `${DIAS_LARGOS[dia.getDay()]} ${dia.getDate()} de ${MESES_LARGOS[dia.getMonth()]}`;
}

// La hoja de almanaque del bosquejo: "2026-11-15" → { mes: "NOV", dia: 15,
// semana: "domingo" }. Sin fecha (o mal escrita), null.
export function hojaDeFecha(fecha) {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha || "");
  if (!partes) return null;
  const dia = new Date(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3]));
  return { mes: MESES[dia.getMonth()].toUpperCase(), dia: dia.getDate(), semana: DIAS_LARGOS[dia.getDay()].toLowerCase() };
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
