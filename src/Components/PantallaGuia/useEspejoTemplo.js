import { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";
import { database } from "../Firebase/Firebase";
import { alineacionValida } from "../ControlDisplay/alineacionMensaje.js";
import { MEDIDAS_POR_DEFECTO, imagenesDeNodo, medidasDeTemplo } from "./utilesGuia.js";

const INICIAL = {
  display: "",
  mensaje: "",
  mensajePredica: "",
  alineacion: null,
  versiculo: "",
  cita: "",
  tituloVersiculo: "",
  version: "RVR1960",
  titulo: "",
  ticker: "",
  imagenes: [],
  intervalo: 5000,
  video: null,
};

// Lo último que se envió a la pantalla del templo, leído de los mismos nodos y
// con las mismas condiciones que ControlDisplay (incluido que `display` es un
// único valor y gana el último que llegue). Solo lee: no escribe nada.
export function useEspejoTemplo(groupId) {
  const [espejo, setEspejo] = useState(INICIAL);

  useEffect(() => {
    if (!groupId) return undefined;
    const poner = (cambios) => setEspejo((previo) => ({ ...previo, ...cambios }));
    const sinError = () => {};

    const dejar = [
      onValue(ref(database, `displayTicker/${groupId}`), (foto) => {
        const datos = foto.val();
        if (datos && typeof datos.text === "string") poner({ ticker: datos.text });
      }, sinError),

      onValue(ref(database, `displayMessage/${groupId}`), (foto) => {
        const datos = foto.val();
        if (!datos || typeof datos.text !== "string" || typeof datos.display !== "string") return;
        if (datos.display === "mensaje") poner({ mensaje: datos.text, display: datos.display });
        else poner({ mensajePredica: datos.text, alineacion: alineacionValida(datos.alineacion), display: datos.display });
      }, sinError),

      onValue(ref(database, `displayTitulo/${groupId}`), (foto) => {
        const datos = foto.val();
        if (datos && typeof datos.text === "string" && typeof datos.display === "string") poner({ titulo: datos.text, display: datos.display });
      }, sinError),

      onValue(ref(database, `displayVersiculo/${groupId}`), (foto) => {
        const datos = foto.val();
        if (
          datos &&
          (datos.titulo === undefined || typeof datos.titulo === "string") &&
          typeof datos.text === "string" &&
          typeof datos.cita === "string" &&
          typeof datos.display === "string"
        ) {
          poner({
            versiculo: datos.text,
            cita: datos.cita,
            tituloVersiculo: datos.titulo || "",
            // Sin versión (envíos de antes): la RVR1960, la de siempre.
            version: typeof datos.version === "string" ? datos.version : "RVR1960",
            display: datos.display,
          });
        }
      }, sinError),

      onValue(ref(database, `displayImage/${groupId}`), (foto) => {
        const datos = foto.val();
        if (!datos) return;
        poner({ imagenes: imagenesDeNodo(datos), ...(datos.interval ? { intervalo: datos.interval } : {}) });
      }, sinError),

      onValue(ref(database, `displayVideo/${groupId}`), (foto) => {
        const datos = foto.val();
        if (datos?.videoId) poner({ video: datos });
      }, sinError),
    ];

    return () => dejar.forEach((cancelar) => cancelar());
  }, [groupId]);

  return espejo;
}

// Las medidas reales de la pantalla del templo (ancho, alto y tipo), leídas de
// la presencia de sus ventanas. Solo lee. Sin ventana abierta, las de un
// proyector de 1920×1080.
export function useMedidasTemplo(groupId) {
  const [medidas, setMedidas] = useState(MEDIDAS_POR_DEFECTO);

  useEffect(() => {
    if (!groupId) return undefined;
    const dejar = onValue(
      ref(database, `pantallaTemplo/${groupId}`),
      (foto) => {
        const nuevas = medidasDeTemplo(foto.val());
        setMedidas((previas) => (previas.ancho === nuevas.ancho && previas.alto === nuevas.alto && previas.tipo === nuevas.tipo ? previas : nuevas));
      },
      () => {}
    );
    return () => dejar();
  }, [groupId]);

  return medidas;
}
