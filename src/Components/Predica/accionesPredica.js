import { addDoc, deleteDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { ref, set } from "firebase/database";
import { database } from "../Firebase/Firebase";
import { colIglesia, docIglesia, PREDICAS } from "../Firebase/RutasIglesia";
import { documentoDePredica, proximoDomingo } from "./utilesPredica.js";

// Firestore: una prédica por documento en iglesias/{groupId}/predicas/{id}.
// La regla general de iglesias/{groupId} ya las cubre y eliminarMiCuenta las
// borra con la iglesia (recursiveDelete). Cada documento cuenta: es lo que
// permitiría, a futuro, cobrar por cantidad de prédicas guardadas.

export async function crearPredica(groupId, datos = {}) {
  const documento = documentoDePredica({
    titulo: datos.titulo || "Nueva prédica",
    fecha: datos.fecha ?? proximoDomingo(),
    serie: datos.serie || "",
    base: datos.base || "",
    numeracion: datos.numeracion,
    numeracionNiveles: datos.numeracionNiveles,
    estado: "borrador",
    piezas: datos.piezas || [],
  });
  const nuevo = await addDoc(colIglesia(groupId, PREDICAS), {
    ...documento,
    creado: serverTimestamp(),
    actualizado: serverTimestamp(),
  });
  return nuevo.id;
}

// Guarda la prédica completa (sin merge: una antigua deja atrás sus `items`).
export function guardarPredica(groupId, predica) {
  return setDoc(docIglesia(groupId, PREDICAS, predica.id), {
    ...documentoDePredica(predica),
    creado: predica.creado ?? serverTimestamp(),
    actualizado: serverTimestamp(),
  });
}

export function borrarPredica(groupId, id) {
  return deleteDoc(docIglesia(groupId, PREDICAS, id));
}

// RTDB: lo mismo que escribía la Prédica de antes, canal por tipo de pieza.
// Las rutas van escritas enteras para que NodosProyeccion.test.js las vea.
//
// Imagen (11 de noviembre de 2026): por el canal de la sección Imágenes
// (`displayImage`, una sola) y la enciende. Como la imagen tapa el texto en el
// templo, proyectar otra pieza con `imagenEncendida` la apaga primero.
//
// `tituloArriba` (12-11-2026): el nombre de la prédica sube a la franja de
// título. Se escribe primero y con el mismo `display` del ítem que va
// después: en el templo los dos canales cambian `display` y, con valores
// distintos, el último pisaría al otro y el centro quedaría vacío.
// Los puntos ya no van por displayTitulo: el púlpito los manda como mensaje,
// con su número («I. La fe…»).
export async function proyectarPieza(groupId, pieza, { imagenEncendida = false, tituloArriba = null } = {}) {
  const timestamp = Date.now();
  if (tituloArriba !== null) {
    const display = pieza.tipo === "versiculo" ? "versiculo" : "mensajePredica";
    await set(ref(database, `displayTitulo/${groupId}`), { text: tituloArriba, display, timestamp });
  }
  if (pieza.tipo === "imagen") {
    const url = pieza.contenido?.url;
    await set(ref(database, `displayImage/${groupId}`), { type: "single", images: [url], image: url, interval: 5000, timestamp });
    return set(ref(database, `displayVisibleImagen/${groupId}`), { visibleImagen: true, timestamp });
  }
  if (imagenEncendida) await apagarImagen(groupId);
  if (pieza.tipo === "versiculo") {
    return set(ref(database, `displayVersiculo/${groupId}`), {
      text: pieza.contenido.texto,
      cita: pieza.contenido.cita,
      display: "versiculo",
      // Para el aviso de derechos del templo. Las piezas de antes de que se
      // guardara la versión son RVR1960 (no había otra).
      version: pieza.contenido.version || "RVR1960",
      timestamp,
    });
  }
  return set(ref(database, `displayMessage/${groupId}`), {
    text: pieza.contenido,
    display: "mensajePredica",
    // El resumen de puntos vistos: alineado, no según Estilos y colores.
    ...(pieza.alineacion ? { alineacion: pieza.alineacion } : {}),
    timestamp,
  });
}

export function apagarImagen(groupId) {
  return set(ref(database, `displayVisibleImagen/${groupId}`), { visibleImagen: false, timestamp: Date.now() });
}

// «Mostrar» del púlpito: vuelve a encender la imagen que «Ocultar» apagó.
export function encenderImagen(groupId) {
  return set(ref(database, `displayVisibleImagen/${groupId}`), { visibleImagen: true, timestamp: Date.now() });
}

// Interruptores de lo que se ve en el templo (título, texto, anuncio).
export function cambiarVisible(groupId, cual, valor) {
  const timestamp = Date.now();
  if (cual === "titulo") return set(ref(database, `displayVisibleTitulo/${groupId}`), { visibleTitulo: valor, timestamp });
  if (cual === "texto") return set(ref(database, `displayVisibleTexto/${groupId}`), { visibleTexto: valor, timestamp });
  return set(ref(database, `displayVisibleTicker/${groupId}`), { visibleTicker: valor, timestamp });
}
