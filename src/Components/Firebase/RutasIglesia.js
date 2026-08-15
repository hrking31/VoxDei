// Rutas de Firestore por iglesia.
//
// Todo el contenido que pertenece a una iglesia cuelga de su groupId:
//
//   iglesias/{groupId}/predicas/predica1..5
//   iglesias/{groupId}/tickers/ticker1..6
//   iglesias/{groupId}/messages/message1..6
//
// Antes estas colecciones vivían en la raíz con IDs fijos, así que dos iglesias
// escribían sobre el mismo documento y se pisaban entre sí.
//
// La colección `biblia` NO va aquí a propósito: es contenido común a todas las
// iglesias y se consulta desde la raíz.

import { collection, doc } from "firebase/firestore";
import { db } from "./Firebase";

export const COLECCION_IGLESIAS = "iglesias";

export const PREDICAS = "predicas";
export const TICKERS = "tickers";
export const MESSAGES = "messages";

// Ajustes de la iglesia. Por ahora solo el documento `estilos`, con la
// apariencia de la pantalla de proyección.
export const CONFIGURACION = "configuracion";
export const ESTILOS = "estilos";

// Lista de canciones que la iglesia va a usar ese día. Es lo único del módulo
// de canciones que es privado: el catálogo en sí es común (ver CANCIONES).
export const REPERTORIO = "repertorio";
export const REPERTORIO_ACTUAL = "actual";

// Catálogo de canciones COMPARTIDO por todas las iglesias, igual que `biblia`.
// Vive en la raíz, no dentro de iglesias/{groupId}. Cualquier iglesia puede
// agregar canciones; cada una solo edita o borra las que subió (campo
// `creadoPor`).
export const CANCIONES = "canciones";

// Falla pronto y con un mensaje claro: sin groupId, Firestore construiría una
// ruta inválida y el error sería incomprensible.
function exigirGroupId(groupId) {
  if (!groupId) {
    throw new Error(
      "Falta el groupId de la iglesia: el usuario no pertenece a ninguna.",
    );
  }
  return groupId;
}

// Colección de una iglesia. Ej: colIglesia(groupId, TICKERS)
export function colIglesia(groupId, nombre) {
  return collection(db, COLECCION_IGLESIAS, exigirGroupId(groupId), nombre);
}

// Documento de una iglesia. Ej: docIglesia(groupId, TICKERS, "ticker1")
export function docIglesia(groupId, nombre, id) {
  return doc(db, COLECCION_IGLESIAS, exigirGroupId(groupId), nombre, id);
}
