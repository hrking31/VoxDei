import { useEffect, useReducer, useRef } from "react";
import EscenaGuia from "../PantallaGuia/EscenaGuia.jsx";
import { ALINEACION_RESUMEN } from "./utilesPredica.js";
import { candidatoActual, claveDeCandidato, estadoInicial, lineasConNumeracion, paso } from "./utilesPuntos.js";

// Reparte los puntos en PANTALLAS según lo que cabe en la pantalla real del templo (20-11-2026,
// pedido del usuario). No se ve: dibuja el grupo de puntos que toca probar sobre una escena a
// TAMAÑO REAL (las medidas de la ventana del templo, o las de un proyector de 1920×1080 si no hay
// ninguna), con los estilos, la numeración y el título reales, y mide si cabe. Si cabe, prueba con un
// punto más; si no, cierra la pantalla con los que cabían y el siguiente empieza otra. Los cortes
// manuales cierran la pantalla antes del punto cortado. La máquina de pasos es pura (utilesPuntos.js).
//
// Avisa UNA vez al terminar: `alTerminar([{ ids, estado, llenado }])`. Cada vez que cambia algo de lo que
// influye (los puntos, los cortes, la numeración, los estilos, las medidas o el título) vuelve a empezar:
// el que lo usa le pasa una `firma` que cambia con ellos y se usa de `key`.
//   puntos:  los puntos del bosquejo, en orden  ·  cortes: ids de los puntos con corte manual
//   numeros: { [idDelPunto]: «IV.» } con la numeración del bosquejo (continúa de pantalla a pantalla)
function Medidor({ puntos, cortes, numeros, medidas, estilos, titulo, alTerminar }) {
  const [estado, dispatch] = useReducer(paso, undefined, () => estadoInicial(puntos, cortes));
  const avisar = useRef(alTerminar);
  avisar.current = alTerminar;
  useEffect(() => {
    if (estado.terminado) avisar.current?.(estado.grupos);
  }, [estado.terminado, estado.grupos]);

  if (estado.terminado) return null;
  const candidatos = candidatoActual(estado)
    .map((id) => puntos.find((p) => p.id === id))
    .filter(Boolean);
  // La clave dice a qué grupo corresponde la medida: una repetida (la de al cargar la tipografía)
  // llega con la clave de un grupo que ya pasó y se ignora.
  const clave = claveDeCandidato(estado);

  return (
    <div
      aria-hidden="true"
      data-medidor-puntos
      style={{ position: "fixed", top: 0, left: -100000, visibility: "hidden", pointerEvents: "none" }}
    >
      <EscenaGuia
        centro={{ tipo: "mensaje", contenido: lineasConNumeracion(candidatos, numeros).join("\n"), alineacion: ALINEACION_RESUMEN }}
        titulo={titulo}
        ticker=""
        estilos={estilos}
        medidas={medidas}
        alMedir={(veredicto, detalle) => dispatch({ clave, estado: veredicto, llenado: detalle?.llenado ?? null })}
      />
    </div>
  );
}

export default function MedidorPuntos({ firma, ...resto }) {
  return <Medidor key={firma} {...resto} />;
}
