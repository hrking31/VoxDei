import { useEffect, useState, useRef, useCallback } from "react";
import { onValue, ref } from "firebase/database";
import { database, auth } from "../Firebase/Firebase";
import { useAppContext } from "../Context/AppContext";
import TickerAnimacion from "../TickerAnimacion/TickerAnimacion";
import { useAuth } from "../../Components/Context/AuthContext";
import useScreenType from "../../Components/Hooks/useScreenType.js";
import {
  fondoDe,
  sombraDe,
  escalar,
  estiloMarcaAgua,
} from "../Estilos/EstilosProyeccion";
import { cargarApiYouTube, TOLERANCIA_SEGUNDOS } from "../Video/YouTube";
import { ArrowsPointingOutIcon } from "@heroicons/react/24/outline";
import { Simbolo } from "../Logo/Logo.jsx";
import PantallaEspera from "../PantallaEspera/PantallaEspera.jsx";
import { usePresenciaPantalla } from "../PantallaTemplo/usePresenciaPantalla.js";

export default function DisplayView() {
  const [visible, setVisible] = useState(true);
  const screenType = useScreenType();
  const [display, setDisplay] = useState("");
  const [ticker, setTicker] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [tituloPredica, setTituloPredica] = useState("");
  const [mensajePredica, setMensajePredica] = useState("");
  const [versiculo, setVersiculo] = useState("");
  const [tituloVersiculo, setTituloVersiculo] = useState("");
  const [cita, setCita] = useState("");
  // Imágenes: una lista (con una sola entrada si es imagen suelta) y la
  // posición que se está mostrando.
  const [imagenes, setImagenes] = useState([]);
  const [intervaloImagen, setIntervaloImagen] = useState(5000);
  const [indiceImagen, setIndiceImagen] = useState(0);
  // Video de YouTube: la orden que llega del panel y el reproductor
  const [video, setVideo] = useState(null);
  const [apiVideoLista, setApiVideoLista] = useState(false);
  // El navegador no deja sonar un video hasta que alguien toca la pantalla.
  // El botón de pantalla completa cuenta como ese toque.
  const [audioPermitido, setAudioPermitido] = useState(false);
  const contenedorVideo = useRef(null);
  const reproductor = useRef(null);
  const {
    visibleTitulo,
    visibleTexto,
    visibleTicker,
    visibleImagen,
    visibleVideo,
    visibleEspera,
    velocidadTicker,
    estilos,
  } = useAppContext();
  const { userData } = useAuth();
  const groupId = userData.groupId;

  // Avisa a los demás equipos que esta pantalla está encendida y si está en
  // pantalla completa (el botón del centro solo se ve cuando no lo está).
  usePresenciaPantalla(groupId, !visible, userData.name);

  // Reconexión de las suscripciones en vivo.
  //
  // Realtime Database se reconecta sola tras un corte de red, pero si cancela
  // una suscripción (permiso denegado mientras la sesión cambia, por ejemplo)
  // no la reanuda: la pantalla del templo se quedaba con lo último que vio.
  // Al cancelarse cualquiera, se programa UN reintento que las rehace todas;
  // la ref evita que seis cancelaciones a la vez disparen seis reintentos.
  const [reintento, setReintento] = useState(0);
  const reintentoPendiente = useRef(null);

  const alCortarse = useCallback((error) => {
    console.error("Proyección: se cortó una suscripción", error);
    if (reintentoPendiente.current) return;

    reintentoPendiente.current = setTimeout(() => {
      reintentoPendiente.current = null;
      setReintento((n) => n + 1);
    }, 5000);
  }, []);

  useEffect(() => () => clearTimeout(reintentoPendiente.current), []);

  // Tamaños base según el tipo de pantalla, como valores CSS: los ajustes del
  // panel de estilos los multiplican por su porcentaje (ver `escalar`).
  const sizes = {
    proyector: {
      text: "clamp(2.5rem,4vw,4rem)",
      title: "clamp(3rem,5vw,5rem)",
      verseTitle: "clamp(1.8rem,3vw,2.3rem)",
      verseCite: "clamp(1.4rem,2.5vw,1.8rem)",
      tickerText: "clamp(1.8rem,3vw,2.3rem)",
      tickerHeight: "clamp(3.5rem,6vw,4rem)",
      speed: 1.4,
    },
    desktop: {
      text: "clamp(1.5rem,3vw,2.5rem)",
      title: "clamp(2rem,4vw,3rem)",
      verseTitle: "clamp(1.2rem,2.5vw,1.6rem)",
      verseCite: "clamp(1rem,2vw,1.3rem)",
      tickerText: "clamp(1.2rem,2.5vw,1.6rem)",
      tickerHeight: "clamp(2.5rem,4vw,3rem)",
      speed: 1.2,
    },
    movil: {
      text: "clamp(1rem,2.5vw,1.25rem)",
      title: "clamp(1.2rem,3vw,1.5rem)",
      verseTitle: "1rem",
      verseCite: "0.875rem",
      tickerText: "1rem",
      tickerHeight: "2.5rem",
      speed: 0.6,
    },
  };

  const style = sizes[screenType];

  // Fullscreen Activation
  const activarFullscreen = () => {
    const el = document.documentElement;

    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen(); // Safari
    else if (el.msRequestFullscreen) el.msRequestFullscreen(); // Edge viejo

    setVisible(false); // Ocultar el botón

    // Este toque es lo que habilita el sonido de los videos: sin él, el
    // navegador los deja mudos.
    setAudioPermitido(true);
    reproductor.current?.unMute?.();
  };

  // Detectar cambio de fullscreen
  useEffect(() => {
    const detectarCambio = () => {
      if (!document.fullscreenElement) {
        // Si el usuario sale de fullscreen → vuelve a mostrar botón
        setVisible(true);
      } else {
        setVisible(false);
      }
    };

    document.addEventListener("fullscreenchange", detectarCambio);
    document.addEventListener("webkitfullscreenchange", detectarCambio);

    return () => {
      document.removeEventListener("fullscreenchange", detectarCambio);
      document.removeEventListener("webkitfullscreenchange", detectarCambio);
    };
  }, []);

  // Display Ticker
  useEffect(() => {
    const tickerRef = ref(database, `displayTicker/${groupId}`);
    const unsubscribe = onValue(
      tickerRef,
      (snapshot) => {
        const data = snapshot.val();
        if (data && typeof data.text === "string") {
          setTicker(data.text);
        }
      },
      alCortarse
    );
    return () => unsubscribe();
  }, [groupId, reintento, alCortarse]);

  //Display Message
  useEffect(() => {
    const messageRef = ref(database, `displayMessage/${groupId}`);
    const unsubscribe = onValue(
      messageRef,
      (snapshot) => {
        const data = snapshot.val();
        if (
          data &&
          typeof data.text === "string" &&
          typeof data.display === "string"
        ) {
          if (data.display === "mensaje") {
            setMensaje(data.text);
            setDisplay(data.display);
          } else {
            setMensajePredica(data.text);
            setDisplay(data.display);
          }
        }
      },
      alCortarse
    );
    return () => unsubscribe();
  }, [groupId, reintento, alCortarse]);

  // Display Titulo
  useEffect(() => {
    if (!auth.currentUser) return;

    const tituloRef = ref(database, `displayTitulo/${groupId}`);
    const unsubscribe = onValue(
      tituloRef,
      (snapshot) => {
        const data = snapshot.val();
        if (
          data &&
          typeof data.text === "string" &&
          typeof data.display === "string"
        ) {
          setTituloPredica(data.text);
          setDisplay(data.display);
        }
      },
      alCortarse
    );
    return () => unsubscribe();
  }, [groupId, reintento, alCortarse]);

  // Display Versiculo
  useEffect(() => {
    const versiculoRef = ref(database, `displayVersiculo/${groupId}`);
    const unsubscribe = onValue(
      versiculoRef,
      (snapshot) => {
        const data = snapshot.val();
        if (
          data &&
          (data.titulo === undefined || typeof data.titulo === "string") &&
          typeof data.text === "string" &&
          typeof data.cita === "string" &&
          typeof data.display === "string"
        ) {
          setTituloVersiculo(data.titulo);
          setVersiculo(data.text);
          setCita(data.cita);
          setDisplay(data.display);
        }
      },
      alCortarse
    );
    return () => unsubscribe();
  }, [groupId, reintento, alCortarse]);

  // Display Imagen
  useEffect(() => {
    const imagenRef = ref(database, `displayImage/${groupId}`);
    const unsubscribe = onValue(
      imagenRef,
      (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        // "single" trae una imagen; "carousel" trae varias.
        const lista =
          data.type === "carousel" && Array.isArray(data.images)
            ? data.images
            : data.image
              ? [data.image]
              : [];

        setImagenes(lista);
        setIndiceImagen(0);
        if (data.interval) setIntervaloImagen(data.interval);
      },
      alCortarse
    );
    return () => unsubscribe();
  }, [groupId, reintento, alCortarse]);

  // Display Video
  useEffect(() => {
    const videoRef = ref(database, `displayVideo/${groupId}`);
    const unsubscribe = onValue(
      videoRef,
      (snapshot) => {
        const data = snapshot.val();
        if (data?.videoId) setVideo(data);
      },
      alCortarse
    );
    return () => unsubscribe();
  }, [groupId, reintento, alCortarse]);

  // El reproductor de YouTube se carga solo cuando hace falta
  useEffect(() => {
    if (!video?.videoId || !visibleVideo || apiVideoLista) return;

    cargarApiYouTube()
      .then(() => setApiVideoLista(true))
      .catch((error) => console.error("Reproductor de YouTube:", error));
  }, [video?.videoId, visibleVideo, apiVideoLista]);

  // Lleva el reproductor al punto que indica el panel.
  //
  // Se suma el tiempo que tardó en llegar la orden: si el mensaje se demoró
  // dos segundos, el video arranca dos segundos más adelante y no queda
  // rezagado respecto de lo que el operador está viendo.
  const aplicarOrden = useCallback(
    (yt, orden) => {
      if (!yt?.getPlayerState || !orden?.videoId) return;

      const retraso =
        orden.estado === "reproduciendo"
          ? (Date.now() - (orden.marcaTiempo || Date.now())) / 1000
          : 0;
      const objetivo = Math.max(0, (orden.posicion || 0) + retraso);

      const actual = yt.getVideoData?.()?.video_id;

      if (actual !== orden.videoId) {
        yt.loadVideoById({
          videoId: orden.videoId,
          startSeconds: objetivo,
        });
      } else if (Math.abs((yt.getCurrentTime?.() || 0) - objetivo) >
        TOLERANCIA_SEGUNDOS) {
        yt.seekTo(objetivo, true);
      }

      if (orden.estado === "reproduciendo") yt.playVideo?.();
      else yt.pauseVideo?.();
    },
    []
  );

  // Crear el reproductor la primera vez y obedecer las órdenes siguientes
  useEffect(() => {
    if (!apiVideoLista || !visibleVideo || !video?.videoId) return;

    if (reproductor.current) {
      aplicarOrden(reproductor.current, video);
      return;
    }

    if (!contenedorVideo.current) return;

    reproductor.current = new window.YT.Player(contenedorVideo.current, {
      videoId: video.videoId,
      playerVars: {
        controls: 0, // los controles están en el panel, no en la pantalla
        rel: 0, // sin videos sugeridos al terminar
        modestbranding: 1,
        playsinline: 1,
        disablekb: 1,
      },
      events: {
        onReady: (evento) => {
          // Arranca mudo por obligación del navegador; se activa el sonido en
          // cuanto alguien haya tocado la pantalla.
          if (audioPermitido) evento.target.unMute();
          else evento.target.mute();

          aplicarOrden(evento.target, video);
        },
      },
    });
  }, [apiVideoLista, visibleVideo, video, audioPermitido, aplicarOrden]);

  // Pasar las imágenes del carrusel
  useEffect(() => {
    if (!visibleImagen || imagenes.length <= 1) return;

    const temporizador = setInterval(() => {
      setIndiceImagen((actual) => (actual + 1) % imagenes.length);
    }, intervaloImagen);

    return () => clearInterval(temporizador);
  }, [visibleImagen, imagenes, intervaloImagen]);

  const imagenActual = imagenes[indiceImagen];
  // La pantalla de espera manda sobre todo lo del centro (video, imagen,
  // texto) y sobre el título; el ticker sigue a su aire.
  const enEspera = Boolean(visibleEspera);
  const hayVideo = Boolean(visibleVideo && video?.videoId) && !enEspera;

  // Apariencia configurada desde el panel de estilos
  const sombra = sombraDe(estilos);
  const transicion = estilos.transicion.fundido
    ? `opacity ${estilos.transicion.duracion}ms ease-in-out`
    : "none";

  // Fundido de entrada al cambiar de contenido. Se dispara porque cada bloque
  // lleva una `key` con su texto: al cambiar, React lo vuelve a montar.
  const animacion = estilos.transicion.fundido
    ? `aparecer ${estilos.transicion.duracion}ms ease-in-out`
    : "none";

  const estiloTexto = {
    color: estilos.texto.color,
    fontSize: escalar(style.text, estilos.texto.tamano),
    fontWeight: estilos.texto.negrita ? 700 : 400,
    lineHeight: `${estilos.texto.interlineado}%`,
    textAlign: estilos.texto.alineacion,
    textShadow: sombra,
  };

  return (
    <div
      className="relative h-screen w-screen overflow-hidden"
      style={fondoDe(estilos)}
    >
      {/* BOTÓN DE PANTALLA COMPLETA */}
      {visible && (
        <button
          onClick={activarFullscreen}
          className="fixed inset-0 flex items-center justify-center z-50 bg-black/40"
        >
          <div className="flex flex-col items-center gap-4">
            <ArrowsPointingOutIcon className="w-24 h-24 text-white animate-pulse" />
          </div>
        </button>
      )}

      {/* CONTENEDOR PRINCIPAL
          El relleno es el margen de seguridad: muchos proyectores recortan los
          bordes de la imagen. */}
      <div
        className="absolute inset-0 flex flex-col"
        style={{ padding: `${estilos.legibilidad.margen}%` }}
      >
        {/* PANTALLA DE ESPERA: logo, iglesia y cuenta regresiva */}
        {enEspera && (
          <div className="flex-1 overflow-hidden">
            <PantallaEspera tamanos={style} />
          </div>
        )}

        {/* TÍTULO ( si está visible) */}
        {visibleTitulo && !enEspera && (
          <div className="pb-1 px-6">
            <h1
              style={{
                color: estilos.titulo.color,
                fontSize: escalar(style.text, estilos.titulo.tamano),
                fontWeight: estilos.titulo.negrita ? 700 : 400,
                textTransform: estilos.titulo.mayusculas ? "uppercase" : "none",
                textAlign: estilos.titulo.alineacion,
                textShadow: sombra,
              }}
            >
              {tituloPredica}
            </h1>
          </div>
        )}

        {/* VIDEO: manda sobre lo demás mientras esté encendido */}
        <div
          className={`flex-1 items-center justify-center overflow-hidden ${
            hayVideo ? "flex" : "hidden"
          }`}
        >
          {/* El contenedor no se desmonta al apagar el video: si desapareciera
              del DOM habría que reconstruir el reproductor cada vez. */}
          <div className="w-full h-full max-w-full max-h-full">
            <div ref={contenedorVideo} className="w-full h-full" />
          </div>
        </div>

        {/* IMAGEN: ocupa el centro y reemplaza al texto mientras esté encendida */}
        {!enEspera && !hayVideo && visibleImagen && imagenActual && (
          <div className="flex-1 flex items-center justify-center overflow-hidden px-4">
            <img
              key={imagenActual}
              src={imagenActual}
              alt=""
              className="max-h-full max-w-full object-contain"
              style={{ animation: `aparecer ${estilos.transicion.duracion}ms` }}
            />
          </div>
        )}

        {/* MENSAJE / PREDICA / VERSÍCULO */}
        {visibleTexto && !enEspera && !hayVideo && !(visibleImagen && imagenActual) && (
          <div
            className="flex-1 flex items-center justify-center px-8"
            style={{ transition: transicion }}
          >
            {display === "mensajePredica" || display === "mensaje" ? (
              <div
                key={display === "mensaje" ? mensaje : mensajePredica}
                className="w-full whitespace-pre-wrap wrap-break-words"
                style={{ ...estiloTexto, animation: animacion }}
              >
                {display === "mensaje" ? mensaje : mensajePredica}
              </div>
            ) : display === "versiculo" ? (
              <div
                key={versiculo}
                className="flex flex-col items-center justify-center w-full relative"
                style={{ animation: animacion }}
              >
                <h2
                  className="font-bold mb-6"
                  style={{
                    color: estilos.versiculo.colorTitulo,
                    fontSize: style.verseTitle,
                    textShadow: sombra,
                  }}
                >
                  {tituloVersiculo}
                </h2>

                <div
                  className="w-full whitespace-pre-wrap wrap-break-words"
                  style={estiloTexto}
                >
                  {versiculo}
                </div>

                {estilos.versiculo.mostrarCita && (
                  <div
                    className="mt-4 self-end"
                    style={{
                      color: estilos.versiculo.colorCita,
                      fontSize: escalar(
                        style.verseCite,
                        estilos.versiculo.tamanoCita
                      ),
                      textShadow: sombra,
                    }}
                  >
                    {cita}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}

        {/* ESPACIO PARA EL TICKER */}
        {visibleTicker && (
          <div
            style={{
              height: escalar(style.tickerHeight, estilos.ticker.altura),
            }}
          />
        )}
      </div>

      {/* MARCA DE AGUA: el símbolo tenue en una esquina, encima del ticker.
          En la pantalla de espera sobra: el logo ya está en grande. */}
      {estilos.marcaAgua.visible && !enEspera && (
        <Simbolo
          alt=""
          className="h-auto"
          style={estiloMarcaAgua(
            estilos,
            visibleTicker
              ? escalar(style.tickerHeight, estilos.ticker.altura)
              : null
          )}
        />
      )}

      {/* TICKER */}
      {visibleTicker && (
        <TickerAnimacion
          message={ticker}
          velocidad={velocidadTicker}
          style={style}
          estilos={estilos}
        />
      )}
    </div>
  );
}
