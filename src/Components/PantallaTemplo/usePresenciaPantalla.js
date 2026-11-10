import { useEffect, useRef } from "react";
import { onDisconnect, onValue, ref, remove, serverTimestamp, set, update } from "firebase/database";
import { database } from "../Firebase/Firebase";
import { NODO_PANTALLA, tipoDispositivo } from "./presencia.js";

// Lo usa la pantalla del templo (ControlDisplay): anota que esta ventana está
// encendida y si está en pantalla completa, y deja dicho a Firebase que borre
// la nota al desconectarse. Ver presencia.js.
export function usePresenciaPantalla(groupId, completa, nombre) {
  const id = useRef(null);
  if (!id.current) id.current = crypto.randomUUID();
  const completaRef = useRef(completa);
  completaRef.current = completa;

  useEffect(() => {
    if (!groupId) return;
    const ventana = ref(database, `${NODO_PANTALLA}/${groupId}/${id.current}`);

    // Tras un corte, onDisconnect ya borró la nota: al volver la conexión se
    // escribe otra vez. Por eso se escucha .info/connected y no se escribe una
    // sola vez al abrir.
    const quitarEscucha = onValue(ref(database, ".info/connected"), async (snap) => {
      if (snap.val() !== true) return;
      try {
        await onDisconnect(ventana).remove();
        await set(ventana, {
          completa: completaRef.current,
          dispositivo: tipoDispositivo(),
          por: nombre || "",
          desde: serverTimestamp(),
        });
      } catch (error) {
        console.error("Presencia de la pantalla del templo:", error);
      }
    });

    return () => {
      quitarEscucha();
      remove(ventana).catch(() => {});
    };
  }, [groupId, nombre]);

  useEffect(() => {
    if (!groupId) return;
    update(ref(database, `${NODO_PANTALLA}/${groupId}/${id.current}`), { completa }).catch(() => {});
  }, [groupId, completa]);
}
