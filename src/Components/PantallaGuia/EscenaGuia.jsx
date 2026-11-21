import { useLayoutEffect, useMemo, useRef } from "react";
import { escalar, fondoDe, sombraDe } from "../Estilos/EstilosProyeccion.js";
import { TAMANOS_PANTALLA } from "../ControlDisplay/tamanosPantalla.js";
import { bloqueDeMensaje } from "../ControlDisplay/alineacionMensaje.js";
import ResumenPuntos from "../ControlDisplay/ResumenPuntos.jsx";
import { avisoBiblia } from "../LibrosBiblia/avisosBiblia.js";
import { aContenedor, evaluarCabida } from "./utilesGuia.js";

// La pantalla del templo dibujada A TAMAÑO REAL (las medidas de la ventana que
// proyecta). Quien la use la reduce para que quepa. Replica la geometría de
// ControlDisplay (margen de seguridad, título, centro, aviso de la Biblia,
// hueco y barra del ticker) con los mismos tamaños (tamanosPantalla.js), para
// que un versículo ocupe aquí los mismos renglones que en el templo.
//
// `alMedir` recibe «bien» | «justo» | «no-cabe» (ver evaluarCabida) y, como segundo
// argumento, `{ llenado }` (cuánto del espacio del centro ocupa el texto) cuando
// cambia lo que se dibuja y al cargar la tipografía. No incluye el video (va como
// miniatura) ni la marca de agua.
export default function EscenaGuia({ centro, titulo, ticker, estilos, medidas, alMedir }) {
  const { ancho, alto, tipo } = medidas;
  const tam = aContenedor(TAMANOS_PANTALLA[tipo] || TAMANOS_PANTALLA.proyector);
  const columna = useRef(null);
  const espacioCentral = useRef(null);
  const bloque = useRef(null);

  const sombra = sombraDe(estilos);
  const estiloTexto = {
    color: estilos.texto.color,
    fontSize: escalar(tam.text, estilos.texto.tamano),
    fontWeight: estilos.texto.negrita ? 700 : 400,
    lineHeight: `${estilos.texto.interlineado}%`,
    textAlign: estilos.texto.alineacion,
    textShadow: sombra,
  };
  const forma = bloqueDeMensaje(estiloTexto, centro?.alineacion);
  const alturaTicker = escalar(tam.tickerHeight, estilos.ticker.altura);

  // Después de dibujar, se mide sobre la escena a tamaño real (offsetTop y
  // offsetHeight no cambian con la reducción).
  //
  // Se mide SOLO cuando cambia lo que se dibuja (`firma`) y cuando termina de cargar
  // la tipografía, no en cada dibujo (20-11-2026): antes cada aviso de `alMedir` podía
  // provocar otro dibujo del que lo recibe, que volvía a medir y a avisar, y al crear
  // un punto React cortaba con «Maximum update depth exceeded». `alMedir` se lee por
  // una referencia para que su identidad (una flecha nueva en cada dibujo) no cuente.
  const alMedirRef = useRef(alMedir);
  alMedirRef.current = alMedir;
  const firma = useMemo(() => JSON.stringify([centro, titulo, ticker, estilos, medidas]), [centro, titulo, ticker, estilos, medidas]);
  const conAviso = Boolean(alMedir);
  useLayoutEffect(() => {
    if (!conAviso) return undefined;
    let vigente = true;
    const medir = () => {
      const col = columna.current;
      if (!col || !vigente) return;
      const ultimo = col.lastElementChild;
      const relleno = parseFloat(getComputedStyle(col).paddingBottom) || 0;
      const alturaBloque = bloque.current?.offsetHeight || 0;
      const hueco = espacioCentral.current?.offsetHeight || 0;
      alMedirRef.current?.(
        evaluarCabida({
          limite: col.clientHeight - relleno,
          fondo: ultimo ? ultimo.offsetTop + ultimo.offsetHeight : 0,
          bloque: alturaBloque,
          hueco,
        }),
        // Cuánto se llenó el espacio del centro (0 a más de 1 si se pasa): lo usa el medidor de
        // llenado de las pantallas de puntos (20-11-2026). Quien no lo necesita lo ignora.
        { llenado: hueco > 0 ? alturaBloque / hueco : 0 }
      );
    };
    medir();
    document.fonts?.ready?.then(medir);
    return () => {
      vigente = false;
    };
  }, [firma, conAviso]);

  const esImagen = centro?.tipo === "imagen";

  return (
    <div
      data-escena-guia
      className="relative overflow-hidden"
      style={{ width: ancho, height: alto, containerType: "size", ...fondoDe(estilos) }}
    >
      <div ref={columna} className="absolute inset-0 flex flex-col" style={{ padding: `${estilos.legibilidad.margen}%` }}>
        {titulo && (
          <div className="px-6 pb-1" data-escena-titulo>
            <h1
              className="m-0"
              style={{
                color: estilos.titulo.color,
                fontSize: escalar(tam.text, estilos.titulo.tamano),
                fontWeight: estilos.titulo.negrita ? 700 : 400,
                textTransform: estilos.titulo.mayusculas ? "uppercase" : "none",
                textAlign: estilos.titulo.alineacion,
                textShadow: sombra,
              }}
            >
              {titulo}
            </h1>
          </div>
        )}

        {esImagen ? (
          <div ref={espacioCentral} className="flex flex-1 items-center justify-center overflow-hidden px-4">
            <img src={centro.contenido.url} alt={centro.contenido.nombre || ""} className="max-h-full max-w-full object-contain" />
          </div>
        ) : (
          <div ref={espacioCentral} className="flex flex-1 items-center justify-center px-8">
            {centro?.tipo === "mensaje" && centro.alineacion ? (
              <div ref={bloque} className={forma.clase} style={forma.estilo}>
                <ResumenPuntos texto={centro.contenido} className="wrap-break-words" />
              </div>
            ) : centro?.tipo === "mensaje" ? (
              <div ref={bloque} className={`whitespace-pre-wrap wrap-break-words ${forma.clase}`} style={forma.estilo}>
                {centro.contenido}
              </div>
            ) : centro?.tipo === "versiculo" ? (
              <div ref={bloque} className="relative flex w-full flex-col items-center justify-center">
                <h2
                  className="m-0 mb-6 font-bold"
                  style={{ color: estilos.versiculo.colorTitulo, fontSize: tam.verseTitle, textShadow: sombra }}
                >
                  {centro.contenido.titulo}
                </h2>
                <div className="w-full whitespace-pre-wrap wrap-break-words" style={estiloTexto}>
                  {centro.contenido.texto}
                </div>
                {estilos.versiculo.mostrarCita && (
                  <div
                    className="mt-4 self-end"
                    style={{
                      color: estilos.versiculo.colorCita,
                      fontSize: escalar(tam.verseCite, estilos.versiculo.tamanoCita),
                      textShadow: sombra,
                    }}
                  >
                    {centro.contenido.cita}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}

        {centro?.tipo === "versiculo" && (
          <p className="m-0 shrink-0 px-8 pb-2 text-center text-xs leading-snug text-app-texto/50">{avisoBiblia(centro.contenido.version)}</p>
        )}

        {ticker && <div style={{ height: alturaTicker }} />}
      </div>

      {ticker && (
        <div
          data-escena-ticker
          className="absolute inset-x-0 bottom-0 flex items-center overflow-hidden"
          style={{ height: alturaTicker, backgroundColor: estilos.ticker.colorFondo }}
        >
          <span
            className="ticker-mini font-bold motion-safe:animate-ticker-mini"
            style={{ color: estilos.ticker.colorTexto, fontSize: escalar(tam.tickerText, estilos.ticker.tamano) }}
          >
            {ticker}
          </span>
        </div>
      )}
    </div>
  );
}
