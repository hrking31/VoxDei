import { useEffect, useState } from "react";
import { onSnapshot } from "firebase/firestore";
import { colIglesia, PREDICAS } from "../Firebase/RutasIglesia";
import { normalizarPredica } from "./utilesPredica.js";

// Todas las prédicas de la iglesia, en vivo. Solo se escucha mientras la
// sección Prédica está abierta. `null` mientras carga.
export function usePredicas(groupId) {
  const [predicas, setPredicas] = useState(null);

  useEffect(() => {
    if (!groupId) return undefined;
    return onSnapshot(
      colIglesia(groupId, PREDICAS),
      (snapshot) => setPredicas(snapshot.docs.map((d) => normalizarPredica(d.id, d.data()))),
      (error) => {
        console.error("Error al cargar las prédicas:", error);
        setPredicas([]);
      }
    );
  }, [groupId]);

  return predicas;
}
