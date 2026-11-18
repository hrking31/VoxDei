// Mini pantalla del templo: cómo se ve (o se verá) una pieza proyectada.
// `grande` para el púlpito; sin él, la vista previa al preparar.
// `oculta` (solo el púlpito, 12-11-2026): lo que está en el templo no se ve
// (todo oculto, o apagado su interruptor). La mini pantalla se oscurece y lo
// dice con el ojo tachado, en el rojo de «OCULTA»: es la guía del predicador.
import { EyeSlashIcon, PowerIcon } from "@heroicons/react/24/solid";
import { pantallaAbierta, TEXTO_NO_ABIERTA } from "../PantallaTemplo/presencia.js";
import ResumenPuntos from "../ControlDisplay/ResumenPuntos.jsx";

// `titulo` y `ticker` (solo el púlpito, 12-11-2026): la franja de título,
// en pequeño arriba, y el anuncio pasando abajo, como en el templo. Llegan
// solo si están encendidos y tienen texto.
export default function PantallaPrevia({ pieza, grande = false, etiqueta = "Así se verá en el templo", oculta = false, titulo = "", ticker = "", textoVacio = "Toca un ítem para verlo aquí", estadoPantalla = null }) {
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
      className={`pantalla-templo crt relative m-0 flex aspect-video w-full flex-col items-center justify-center overflow-hidden rounded-crt ${
        grande ? "gap-3 border-8 px-8 py-6" : "gap-2 border-4 px-4 py-3"
      }`}
    >
      {pieza?.tipo === "imagen" ? (
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
      {titulo && (
        <p
          data-mini-titulo
          className={`absolute inset-x-0 top-0 m-0 truncate px-3 pt-1.5 text-center font-bold text-app-texto/90 ${grande ? "text-sm" : "text-diminuto"}`}
        >
          {titulo}
        </p>
      )}
      {ticker && (
        <div data-mini-ticker className={`absolute inset-x-0 bottom-0 overflow-hidden bg-app-dark/80 ${grande ? "py-1 text-xs" : "py-0.5 text-diminuto"}`}>
          <span className="ticker-mini font-bold text-app-texto motion-safe:animate-ticker-mini">{ticker}</span>
        </div>
      )}
      {textoAviso && (
        <div
          data-aviso-oculta
          className={`absolute inset-0 flex flex-col items-center justify-center gap-2 bg-app-velo backdrop-grayscale ${
            estadoPantalla === "apagada" ? "text-app-muted" : "text-app-error"
          }`}
        >
          <IconoAviso className={grande ? "h-12 w-12" : "h-8 w-8"} aria-hidden="true" />
          <b className={`tracking-wide uppercase ${grande ? "text-base" : "text-xs"}`}>{textoAviso}</b>
        </div>
      )}
    </figure>
  );
}
