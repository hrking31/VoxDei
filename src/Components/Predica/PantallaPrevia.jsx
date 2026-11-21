// Mini pantalla del templo: cómo se ve (o se verá) una pieza proyectada.
// `grande` para el púlpito; sin él, la vista previa al preparar.
// `oculta` (solo el púlpito, 12-11-2026): lo que está en el templo no se ve
// (todo oculto, o apagado su interruptor). La mini pantalla se oscurece y lo
// dice con el ojo tachado, en el rojo de «OCULTA»: es la guía del predicador.
import { useLayoutEffect, useRef, useState } from "react";
import { EyeSlashIcon, PowerIcon } from "@heroicons/react/24/solid";
import { pantallaAbierta, TEXTO_NO_ABIERTA } from "../PantallaTemplo/presencia.js";
import ResumenPuntos from "../ControlDisplay/ResumenPuntos.jsx";
import EscenaGuia from "../PantallaGuia/EscenaGuia.jsx";
import { MEDIDAS_POR_DEFECTO } from "../PantallaGuia/utilesGuia.js";

// Lo que dibuja la escena: un mensaje (los puntos ya llegan como mensaje) o un versículo.
const centroParaEscena = (pieza) =>
  pieza.tipo === "versiculo"
    ? { tipo: "versiculo", contenido: { titulo: "", version: "RVR1960", ...pieza.contenido } }
    : { tipo: "mensaje", contenido: String(pieza.contenido ?? ""), alineacion: pieza.alineacion };

// `titulo` y `ticker` (solo el púlpito, 12-11-2026): la franja de título,
// en pequeño arriba, y el anuncio pasando abajo, como en el templo. Llegan
// solo si están encendidos y tienen texto.
//
// `estilos` y `medidas` (20-11-2026, pedido del usuario: Pruebas tiene que mostrar cómo
// queda de verdad): con los estilos, el texto (mensaje o versículo) se dibuja con la misma
// escena del semáforo de cabida (EscenaGuia), A TAMAÑO REAL de la pantalla del templo y
// reducida al marco, con la letra, los márgenes y el título reales. Lo que se sale en el
// templo se corta aquí también, en vez de recortarse en silencio como el dibujo simple.
// Sin `estilos` queda el dibujo simple de siempre (letra fija pequeña).
//
// `ajustarAlto` (20-11-2026, pedido del usuario: Pruebas en el computador sin desplazamiento):
// el marco toma el mayor tamaño que cabe en su contenedor, tanto de ancho como de alto, con la
// proporción de la pantalla del templo. El contenedor debe ser `container-type: size` y tener
// alto propio (`flex-1 min-h-0`): el ancho sale de `min(100cqw, 100cqh × proporción)`.
export default function PantallaPrevia({ pieza, grande = false, etiqueta = "Así se verá en el templo", oculta = false, titulo = "", ticker = "", textoVacio = "Toca un ítem para verlo aquí", estadoPantalla = null, estilos = null, medidas = MEDIDAS_POR_DEFECTO, ajustarAlto = false }) {
  const caja = useRef(null);
  const [escala, setEscala] = useState(0.15);
  const [cabida, setCabida] = useState("bien");
  const enEscena = Boolean(estilos) && Boolean(pieza) && pieza.tipo !== "imagen" && estadoPantalla !== "apagada";

  // La escena mide lo que el templo; aquí se reduce al ancho del marco.
  useLayoutEffect(() => {
    const el = caja.current;
    if (!enEscena || !el) return undefined;
    const ajustar = () => {
      if (el.clientWidth > 0) setEscala(el.clientWidth / medidas.ancho);
    };
    ajustar();
    if (typeof ResizeObserver === "undefined") return undefined;
    const observador = new ResizeObserver(ajustar);
    observador.observe(el);
    return () => observador.disconnect();
  }, [enEscena, medidas.ancho]);

  // REGLA (18-11-2026, pedido del usuario): con la pantalla del templo APAGADA la mini
  // pantalla no muestra nada de lo enviado (ni texto, ni versículo, ni imagen, ni
  // título, ni ticker): queda como un televisor apagado, solo con su aviso. Con la
  // pantalla oculta, en cambio, se sigue viendo lo enviado, atenuado.
  if (estadoPantalla === "apagada") {
    pieza = null;
    titulo = "";
    ticker = "";
  }
  const texto = pieza?.tipo === "versiculo" ? pieza.contenido?.texto : pieza?.contenido;
  const cita = pieza?.tipo === "versiculo" ? pieza.contenido?.cita : null;

  // El estado de la pantalla del templo (apagada, oculta, ventana, maximizada o
  // completa) pinta el marco (utilidad `crt`). Si no está abierta, lo dice en vez
  // de aparentar que se proyecta; si está abierta pero nada se ve (`oculta`),
  // dice «No se ve en el templo».
  const noAbierta = !pantallaAbierta(estadoPantalla);
  const textoAviso = noAbierta ? TEXTO_NO_ABIERTA[estadoPantalla] || "Pantalla oculta" : oculta ? "No se ve en el templo" : null;
  const IconoAviso = estadoPantalla === "apagada" ? PowerIcon : EyeSlashIcon;

  return (
    <figure
      aria-label={etiqueta}
      data-pantalla-previa
      data-oculta={textoAviso ? true : undefined}
      data-estado={estadoPantalla || undefined}
      data-cabida={enEscena ? cabida : undefined}
      data-ajustar-alto={ajustarAlto || undefined}
      style={
        ajustarAlto
          ? { aspectRatio: `${medidas.ancho} / ${medidas.alto}`, width: `min(100cqw, calc(100cqh * ${medidas.ancho / medidas.alto}))` }
          : enEscena
            ? { aspectRatio: `${medidas.ancho} / ${medidas.alto}` }
            : undefined
      }
      className={`pantalla-templo crt relative m-0 flex flex-col items-center justify-center overflow-hidden rounded-crt ${ajustarAlto ? "" : "w-full"} ${enEscena || ajustarAlto ? "" : "aspect-video"} ${
        grande ? "gap-3 border-8 px-8 py-6" : "gap-2 border-4 px-4 py-3"
      }`}
    >
      {enEscena ? (
        <div ref={caja} data-escena-previa className="absolute inset-0 overflow-hidden">
          <div style={{ width: medidas.ancho, height: medidas.alto, transform: `scale(${escala})`, transformOrigin: "top left" }}>
            <EscenaGuia centro={centroParaEscena(pieza)} titulo={titulo} ticker={ticker} estilos={estilos} medidas={medidas} alMedir={setCabida} />
          </div>
        </div>
      ) : pieza?.tipo === "imagen" ? (
        // Como en el templo: la imagen ocupa el centro, entera.
        <img src={pieza.contenido?.url} alt={pieza.contenido?.nombre || "Imagen"} className="h-full w-full rounded object-contain" />
      ) : pieza ? (
        <>
          {pieza.alineacion ? (
            // El resumen de puntos vistos, igual que en el templo: en lista,
            // con sangría francesa.
            <ResumenPuntos
              texto={texto}
              className={`mx-auto w-fit max-w-full text-app-texto ${grande ? "text-base leading-snug sm:text-lg" : "text-diminuto leading-snug"}`}
            />
          ) : (
            <p
              className={`m-0 whitespace-pre-wrap text-center text-app-texto ${pieza.tipo === "titulo" ? "font-bold" : ""} ${
                grande ? "text-lg leading-snug sm:text-2xl" : "text-xs leading-snug"
              } line-clamp-6`}
            >
              {texto}
            </p>
          )}
          {cita && (
            <figcaption className={`font-bold tracking-widest text-app-main uppercase ${grande ? "text-sm" : "text-diminuto"}`}>
              {cita}
            </figcaption>
          )}
        </>
      ) : textoAviso ? null : (
        // Con un aviso encima (pantalla apagada, oculta o sin nada que ver) el texto
        // de «vacío» sobra: se veía a través del aviso y se pisaban (18-11-2026).
        <p className={`m-0 text-center text-app-muted ${grande ? "text-base" : "text-xs"}`}>
          {textoVacio}
        </p>
      )}
      {!enEscena && titulo && (
        <p
          data-mini-titulo
          className={`absolute inset-x-0 top-0 m-0 truncate px-3 pt-1.5 text-center font-bold text-app-texto/90 ${grande ? "text-sm" : "text-diminuto"}`}
        >
          {titulo}
        </p>
      )}
      {!enEscena && ticker && (
        <div data-mini-ticker className={`absolute inset-x-0 bottom-0 overflow-hidden bg-app-dark/80 ${grande ? "py-1 text-xs" : "py-0.5 text-diminuto"}`}>
          <span className="ticker-mini font-bold text-app-texto motion-safe:animate-ticker-mini">{ticker}</span>
        </div>
      )}
      {textoAviso && (
        <div
          data-aviso-oculta
          className={`absolute inset-0 flex flex-col items-center justify-center gap-2 backdrop-grayscale ${
            estadoPantalla === "apagada" ? "bg-app-aviso text-app-muted" : "bg-app-velo text-app-error"
          }`}
        >
          <IconoAviso className={grande ? "h-12 w-12" : "h-8 w-8"} aria-hidden="true" />
          <b className={`tracking-wide uppercase ${grande ? "text-base" : "text-xs"}`}>{textoAviso}</b>
        </div>
      )}
    </figure>
  );
}
