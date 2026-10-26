// Escrituras del modo ensayo en Realtime Database.
//
// El ensayo es estado del momento, como lo que está en pantalla, por eso vive
// en RTDB (`turnoEnsayo/{groupId}`) y no en Firestore. Cualquiera de la
// iglesia puede iniciarlo, tomarlo o terminarlo: la regla de quién puede pulsar
// cada botón la aplica FranjaTurno. Si se añade otro nodo, recuerda
// database.rules.json y NODOS_PROYECCION en functions/index.js.

import { ref, remove, serverTimestamp, set } from "firebase/database";
import { database } from "../Firebase/Firebase";

// `asignado` es { uid, nombre }: quien inicia el ensayo puede dárselo a otro.
export function iniciarEnsayo(groupId, asignado, iniciadoPor) {
  return set(ref(database, `turnoEnsayo/${groupId}`), {
    uid: asignado.uid,
    nombre: asignado.nombre,
    inicio: serverTimestamp(),
    iniciadoPor,
  });
}

export function terminarEnsayo(groupId) {
  return remove(ref(database, `turnoEnsayo/${groupId}`));
}
