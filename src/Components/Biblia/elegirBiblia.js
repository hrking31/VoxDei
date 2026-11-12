import { setDoc, serverTimestamp } from "firebase/firestore";
import { docIglesia, CONFIGURACION, BIBLIA_ELEGIDA } from "../Firebase/RutasIglesia";

// TEMPORAL DHH (10-11-2026): guarda la Biblia elegida para toda la iglesia
// (iglesias/{g}/configuracion/biblia). La regla general de iglesias/{groupId}
// deja escribir a cualquiera de la iglesia, así que el operador también puede
// cambiarla. InicializarEstados la escucha y la pone en `versionBiblia`.
export function guardarVersionBiblia(groupId, version) {
  return setDoc(
    docIglesia(groupId, CONFIGURACION, BIBLIA_ELEGIDA),
    { version, actualizado: serverTimestamp() },
    { merge: true }
  );
}
