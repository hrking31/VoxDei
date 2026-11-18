import PantallaPrevia from "../Predica/PantallaPrevia.jsx";
import FranjaTurno from "../Cronograma/FranjaTurno.jsx";
import { useMiniPantalla } from "./useMiniPantalla.js";
import { pantallaAbierta } from "../PantallaTemplo/presencia.js";

// Guía de la pantalla del templo (18-11-2026, pedido del usuario): lo que
// hace la mini pantalla del púlpito de Prédica, en todas las secciones que
// proyectan. Va a la derecha, en el computador, y copia lo que de verdad hay en
// el templo (leído de RTDB, como ControlDisplay): el centro, la franja de
// título y el ticker; y se oscurece con «No se ve en el templo» si nada se ve.
// Mide lo mismo que la columna derecha del púlpito de Prédica (w-90) y no se
// pliega (pedido del usuario). Es fija y mide el alto de la pantalla; no se
// desplaza: lo que lleva debajo (la ranura) se encoge para caber, y
// `overflow-y-auto` queda solo como último recurso en pantallas muy bajas.
// `overflow-x-clip` recorta lo que sobra a los lados.
//
// Debajo lleva una ranura (`refRanura`) donde las secciones colocan sus botones
// con <EnLaGuia> (ver AccionesGuia.js); vacía, no ocupa sitio.
export default function PantallaGuia({ refRanura }) {
  const { espejo, visibles, centro, noSeVe, pantallaTemplo } = useMiniPantalla();

  const capas = [
    { clave: "titulo", nombre: "Título", activa: visibles.titulo, color: "text-app-accent" },
    { clave: "texto", nombre: "Texto", activa: visibles.texto, color: "text-app-main" },
    { clave: "ticker", nombre: "Ticker", activa: visibles.ticker, color: "text-app-success" },
  ];

  return (
    <aside
      data-guia-templo
      data-estado-guia={noSeVe || !pantallaAbierta(pantallaTemplo) ? "oculto" : "vivo"}
      aria-label="Guía de la pantalla del templo"
      className="group/guia scrollbar-custom sticky top-0 flex h-svh w-90 shrink-0 flex-col gap-4 self-start overflow-y-auto overflow-x-clip border-l border-app-border bg-app-light p-5 has-[[data-barra-capitulos]]:pb-0"
    >
      {/* La franja del servicio y de la pantalla va arriba de esta columna, de
          borde a borde, como en el púlpito de Prédica (pedido del usuario). Las
          secciones con guía ya no la pintan en su encabezado. */}
      <div className="-mx-5 -mt-5">
        <FranjaTurno enGuia />
      </div>

      <PantallaPrevia
        pieza={centro}
        etiqueta="En el templo ahora"
        oculta={noSeVe}
        estadoPantalla={pantallaTemplo}
        titulo={visibles.titulo && !visibles.espera ? espejo.titulo : ""}
        ticker={visibles.ticker ? espejo.ticker : ""}
        textoVacio="Sin texto en pantalla"
      />

      {/* Si la sección pone sus botones de visibilidad en la ranura, ellos ya dicen
          qué está encendido: la lista sobra. */}
      <ul className="m-0 flex list-none justify-between gap-2 p-0 text-xs font-semibold group-has-[[data-botones-visibilidad]]/guia:hidden">
        {capas.map((capa) => (
          <li key={capa.clave} data-capa-guia={capa.clave} data-activa={capa.activa} className={capa.activa ? capa.color : "text-app-muted opacity-50"}>
            {capa.nombre} {capa.activa ? "visible" : "oculto"}
          </li>
        ))}
      </ul>

      {/* Ranura de los botones de cada sección (ver EnLaGuia) */}
      <div ref={refRanura} data-acciones-guia className="flex min-h-0 flex-1 flex-col empty:hidden" />
    </aside>
  );
}
