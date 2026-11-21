import { Fragment } from "react";
import { ENCENDIDOS, SEGMENTOS } from "./segmentosReloj.js";

// El tiempo que lleva el púlpito como un reloj digital de siete segmentos (20-11-2026, el usuario
// mandó la foto de un despertador de referencia y luego pidió «solo los números, sin el recuadro»):
// únicamente las cifras, en claro, con los dos puntos de siempre, sobre el fondo de la franja del reloj;
// sin cuerpo, sin pantalla, sin brillo y sin parpadeo. Los dígitos se dibujan en SVG (no hay una letra
// de siete segmentos a mano) con los segmentos «a» a «g» de toda la vida (tablas en segmentosReloj.js).
//
// `tiempo` es el texto que ya da `relojDesde` («12:34» o «1:02:03»): no cambia, solo se pinta distinto.
// El texto sigue ahí, oculto a la vista, para los lectores de pantalla y para quien copie la página.

function Digito({ cifra }) {
  const encendidos = ENCENDIDOS[cifra] || "";
  return (
    <svg data-digito={cifra} viewBox="0 0 50 90" className="h-full w-auto" fill="currentColor" aria-hidden="true">
      {[...encendidos].map((segmento) => (
        <polygon key={segmento} data-segmento={segmento} points={SEGMENTOS[segmento]} />
      ))}
    </svg>
  );
}

// Los dos puntos, uno arriba y otro abajo, cuadrados como en la referencia.
function DosPuntos() {
  return (
    <svg data-dos-puntos viewBox="0 0 12 90" className="h-full w-auto" fill="currentColor" aria-hidden="true">
      <rect x="1.5" y="26" width="9" height="9" />
      <rect x="1.5" y="55" width="9" height="9" />
    </svg>
  );
}

export default function RelojSegmentos({ tiempo, className = "" }) {
  const partes = String(tiempo).split(":");
  return (
    <span data-reloj-segmentos className={`inline-flex h-10 items-center gap-1.5 text-app-texto ${className}`}>
      <span className="sr-only">{tiempo}</span>
      {partes.map((parte, i) => (
        <Fragment key={i}>
          {i > 0 && <DosPuntos />}
          <span className="flex h-full items-center gap-1.5" aria-hidden="true">
            {[...parte].map((cifra, j) => (
              <Digito key={j} cifra={cifra} />
            ))}
          </span>
        </Fragment>
      ))}
    </span>
  );
}
