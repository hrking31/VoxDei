import * as librosRVR from "../LibrosBiblia/LibrosBiblia.js";

// Lógica del Orden del culto (9 de noviembre de 2026): funciones puras, sin
// Firebase, para probarlas sin red.
//
// Un orden es una lista de pasos que se arma antes del servicio y durante el
// culto se proyecta con un solo botón, «Siguiente». Tipos de paso:
//   { id, tipo: "mensaje",   texto }
//   { id, tipo: "titulo",    texto }
//   { id, tipo: "ticker",    texto }
//   { id, tipo: "versiculo", cita, texto }
//   { id, tipo: "cancion",   cancionId, titulo, laminas: string[] }
// Las canciones guardan una copia de sus láminas: en pleno culto no hace falta
// leer el catálogo, y si alguien edita la canción, el orden ya armado no cambia.

export const TIPOS_PASO = {
  mensaje: "Mensaje",
  cancion: "Canción",
  versiculo: "Versículo",
  titulo: "Título",
  ticker: "Anuncio",
};

// ---------- Citas bíblicas escritas a mano: «Juan 3:16» ----------


// «S. Juan» → «juan», «1 Corintios» → «1corintios», sin tildes ni mayúsculas.
function normalizarLibro(nombre) {
  return nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/^(s\.|san)\s+/, "")
    .replace(/[^a-z0-9]/g, "");
}

// Un índice por catálogo, armado la primera vez que se usa.
const indices = new WeakMap();
function indiceDe(libros) {
  if (!indices.has(libros)) {
    const todos = [...libros.librosAntiguo, ...libros.librosNuevo];
    indices.set(libros, todos.map((libro) => ({ libro, clave: normalizarLibro(libro.nombre) })));
  }
  return indices.get(libros);
}

// Entre varios libros que empiezan igual, el que es el comienzo de todos los
// demás: «est» → Ester y no «Ester (dc)», «dan» → Daniel. Si no hay uno así,
// la cita es ambigua («jo»: Job, Joel, Jonás, Josué…).
function elegirEntre(empiezan) {
  if (empiezan.length === 1) return empiezan[0];
  const corto = empiezan.reduce((a, b) => (b.clave.length < a.clave.length ? b : a), empiezan[0]);
  return corto && empiezan.every((l) => l.clave.startsWith(corto.clave)) ? corto : null;
}

// Entiende «Juan 3:16», «juan 3 16», «San Juan 3.16», «1 Cor 13:4», «sal 23:1».
// El nombre puede ser el comienzo del libro si no hay dos que empiecen igual.
// Devuelve { sigla, libro, capitulo, versiculo, cita } o null si no existe.
// `libros`: el catálogo contra el que se valida ({ librosAntiguo, librosNuevo });
// sin él, la RVR1960. TEMPORAL DHH: Prédica le pasa el de la Biblia elegida
// para reconocer los deuterocanónicos («Tobit 4:7»). Al quitar la DHH se puede
// dejar el parámetro: sin él todo sigue igual.
export function parsearCita(texto, libros = librosRVR) {
  const partes = String(texto || "").match(/^\s*(.+?)\s+(\d+)\s*[:.,\s]\s*(\d+)\s*$/);
  if (!partes) return null;

  const clave = normalizarLibro(partes[1]);
  if (!clave) return null;
  const indice = indiceDe(libros);
  const exacto = indice.find((l) => l.clave === clave);
  const elegido = exacto || elegirEntre(indice.filter((l) => l.clave.startsWith(clave)));
  if (!elegido) return null;

  const { libro } = elegido;
  const capitulo = Number(partes[2]);
  const versiculo = Number(partes[3]);
  if (capitulo < 1 || capitulo > libro.capitulos) return null;
  if (versiculo < 1 || versiculo > (libro[`capitulo${capitulo}`] || 0)) return null;

  const nombre = libro.nombre.replace(/^S\.\s+/, "");
  return {
    sigla: libro.sigla,
    libro: nombre,
    capitulo,
    versiculo,
    cita: `${nombre} ${capitulo}:${versiculo}`,
  };
}

// ---------- Avanzar y retroceder ----------
//
// La posición es { paso, lamina }; paso -1 es «todavía no empieza». Una
// canción se recorre lámina por lámina antes de pasar al paso siguiente.

export const INICIO = { paso: -1, lamina: 0 };

const laminasDe = (paso) => (paso?.tipo === "cancion" ? paso.laminas.length : 1);

export function avanzar(pasos, { paso, lamina }) {
  if (!pasos.length) return null;
  if (paso < 0) return { paso: 0, lamina: 0 };
  if (lamina < laminasDe(pasos[paso]) - 1) return { paso, lamina: lamina + 1 };
  if (paso < pasos.length - 1) return { paso: paso + 1, lamina: 0 };
  return null; // ya es el último
}

export function retroceder(pasos, { paso, lamina }) {
  if (paso < 0) return null;
  if (lamina > 0) return { paso, lamina: lamina - 1 };
  if (paso > 0) return { paso: paso - 1, lamina: laminasDe(pasos[paso - 1]) - 1 };
  return null; // ya es el primero
}

export function esElUltimo(pasos, posicion) {
  return posicion.paso >= 0 && avanzar(pasos, posicion) === null;
}

// Texto corto de lo que está en pantalla, para el panel.
export function descripcionPaso(paso, lamina = 0) {
  if (!paso) return "";
  if (paso.tipo === "cancion") {
    return `«${paso.titulo}» · lámina ${lamina + 1} de ${paso.laminas.length}`;
  }
  if (paso.tipo === "versiculo") return `${paso.cita} — ${paso.texto}`;
  return paso.texto;
}

// ---------- Qué escribe cada paso en la pantalla del templo ----------
//
// Las mismas formas que ya escribe cada sección (Mensajes, Canciones,
// Biblia, Prédica, Ticker), para que ControlDisplay no necesite cambios.
// Además se asegura de que se vea: enciende el texto, el título o el ticker
// según el paso, y apaga la pantalla de espera, que taparía todo.
// Devuelve [{ nodo, modo: "set" | "update", datos }].

export function escriturasDePaso(paso, lamina, ahora) {
  const quitarEspera = { nodo: "displayEspera", modo: "set", datos: { activa: false } };
  const mostrarTexto = {
    nodo: "displayVisibleTexto",
    modo: "update",
    datos: { visibleTexto: true, timestamp: ahora },
  };

  switch (paso.tipo) {
    case "mensaje":
    case "cancion":
      return [
        {
          nodo: "displayMessage",
          modo: "set",
          datos: {
            text: paso.tipo === "cancion" ? paso.laminas[lamina] : paso.texto,
            display: "mensaje",
            timestamp: ahora,
          },
        },
        mostrarTexto,
        quitarEspera,
      ];
    case "versiculo":
      return [
        {
          nodo: "displayVersiculo",
          modo: "set",
          // El Orden del culto usa siempre la RVR1960: lo dice el aviso del templo.
          datos: { text: paso.texto, cita: paso.cita, display: "versiculo", version: "RVR1960", timestamp: ahora },
        },
        mostrarTexto,
        quitarEspera,
      ];
    case "titulo":
      return [
        {
          nodo: "displayTitulo",
          modo: "set",
          datos: { text: paso.texto, display: "titulo", timestamp: ahora },
        },
        {
          nodo: "displayVisibleTitulo",
          modo: "update",
          datos: { visibleTitulo: true, timestamp: ahora },
        },
        quitarEspera,
      ];
    case "ticker":
      return [
        { nodo: "displayTicker", modo: "set", datos: { text: paso.texto, timestamp: ahora } },
        {
          nodo: "displayVisibleTicker",
          modo: "set",
          datos: { visibleTicker: true, timestamp: ahora },
        },
      ];
    default:
      return [];
  }
}

// ---------- Editar la lista ----------

export function mover(pasos, indice, desplazamiento) {
  const destino = indice + desplazamiento;
  if (destino < 0 || destino >= pasos.length) return pasos;
  const copia = [...pasos];
  [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
  return copia;
}

export function quitar(pasos, id) {
  return pasos.filter((p) => p.id !== id);
}
