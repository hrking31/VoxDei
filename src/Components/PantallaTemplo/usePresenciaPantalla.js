import { useEffect, useRef, useState } from "react";
import { onDisconnect, onValue, ref, remove, serverTimestamp, set, update } from "firebase/database";
import { database } from "../Firebase/Firebase";
import { NODO_PANTALLA, modoVentana, tipoDispositivo } from "./presencia.js";

// Junta lo que cuenta el navegador sobre esta ventana y decide su modo.
function leerModo() {
  return modoVentana({
    oculta: document.visibilityState === "hidden",
    completa: Boolean(document.fullscreenElement || document.webkitFullscreenElement),
    movil: tipoDispositivo() !== "computador",
    interior: { ancho: window.innerWidth, alto: window.innerHeight },
    exterior: { ancho: window.outerWidth, alto: window.outerHeight },
    pantalla: window.screen,
  });
}

// Modo de esta ventana, al día: se revisa al minimizarla o taparla
// (visibilitychange), al entrar o salir de pantalla completa y al cambiar de
// tamaño (maximizar, restaurar, F11, girar el celular).
export function useModoVentana() {
  const [modo, setModo] = useState(leerModo);

  useEffect(() => {
    const revisar = () => setModo(leerModo());
    const eventos = [
      [document, "visibilitychange"],
      [document, "fullscreenchange"],
      [document, "webkitfullscreenchange"],
      [window, "resize"],
    ];
    eventos.forEach(([objeto, evento]) => objeto.addEventListener(evento, revisar));
    revisar();
    return () => eventos.forEach(([objeto, evento]) => objeto.removeEventListener(evento, revisar));
  }, []);

  return modo;
}

// Lo usa la pantalla del templo (ControlDisplay): anota que esta ventana está
// abierta y en qué modo, y deja dicho a Firebase que borre la nota al
// desconectarse. Ver presencia.js.
export function usePresenciaPantalla(groupId, nombre) {
  const id = useRef(null);
  // TEMPORAL (10-11-2026), DESHACER al terminar las pruebas en local: volver a
  // `crypto.randomUUID()` a secas. Solo existe por pruebas con el celular en
  // http://192.168.x.x:5173, donde el navegador no ofrece randomUUID (exige
  // https); en producción (https) nunca hace falta.
  if (!id.current) {
    id.current = crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }
  const modo = useModoVentana();
  const modoRef = useRef(modo);
  modoRef.current = modo;

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
          modo: modoRef.current,
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
    update(ref(database, `${NODO_PANTALLA}/${groupId}/${id.current}`), { modo }).catch(() => {});
  }, [groupId, modo]);
}
