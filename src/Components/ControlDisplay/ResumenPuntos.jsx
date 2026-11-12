import { lineasDeResumen } from "./alineacionMensaje.js";

// El «Resumen de puntos vistos» de Prédica con sangría francesa (12-11-2026,
// pedido del usuario): si un punto ocupa varias líneas, las siguientes se
// alinean con su texto, no con su número. Cuatro columnas (utilidad
// `lista-resumen`): el número del punto, el del subpunto, el del
// sub-subpunto y el texto. Cada nivel pone su número en su columna y el texto
// desde la siguiente. Lo usan el templo (ControlDisplay) y la mini pantalla
// del púlpito (PantallaPrevia), para que se vean igual.
const COLUMNAS = [
  { numero: "col-start-1", texto: "col-span-3 col-start-2", renglon: "punto" },
  { numero: "col-start-2", texto: "col-span-2 col-start-3", renglon: "subpunto" },
  { numero: "col-start-3", texto: "col-start-4", renglon: "subsubpunto" },
];

export default function ResumenPuntos({ texto, className = "", style }) {
  return (
    <div data-lista-resumen className={`lista-resumen ${className}`} style={style}>
      {lineasDeResumen(texto).map((linea, i) => {
        if (!linea.etiqueta) {
          return (
            <span key={i} data-renglon="texto" className="col-span-4 col-start-1">
              {linea.texto}
            </span>
          );
        }
        const columnas = COLUMNAS[linea.nivel] || COLUMNAS[0];
        return (
          <div key={i} data-renglon={columnas.renglon} className="contents">
            <span className={columnas.numero}>{linea.etiqueta}</span>
            <span className={columnas.texto}>{linea.texto}</span>
          </div>
        );
      })}
    </div>
  );
}
