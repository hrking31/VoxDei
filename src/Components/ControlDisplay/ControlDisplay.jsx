import { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";
import { database, auth } from "../Firebase/Firebase";
import { useAppContext } from "../Context/AppContext";
import TickerAnimacion from "../TickerAnimacion/TickerAnimacion";
import { useAuth } from "../../Components/Context/AuthContext.jsx";
import useScreenType from "../../Components/Hooks/useScreenType.js";
import { ArrowsPointingOutIcon } from "@heroicons/react/24/outline";

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
  const { visibleTitulo, visibleTexto, visibleTicker, velocidadTicker } =
    useAppContext();
  const { userData } = useAuth();

  // Estilos según tipo de pantalla
  const sizes = {
    proyector: {
      text: "text-[clamp(2.5rem,4vw,4rem)]",
      title: "text-[clamp(3rem,5vw,5rem)]",
      verseTitle: "text-[clamp(1.8rem,3vw,2.3rem)]",
      verseCite: "text-[clamp(1.4rem,2.5vw,1.8rem)]",
      tickerText: "text-[clamp(1.8rem,3vw,2.3rem)]",
      tickerHeight: "h-[clamp(3.5rem,6vw,4rem)]",
      speed: 1.4,
      padding: "p-8",
    },
    desktop: {
      text: "text-[clamp(1.5rem,3vw,2.5rem)]",
      title: "text-[clamp(2rem,4vw,3rem)]",
      verseTitle: "text-[clamp(1.2rem,2.5vw,1.6rem)]",
      verseCite: "text-[clamp(1rem,2vw,1.3rem)]",
      tickerText: "text-[clamp(1.2rem,2.5vw,1.6rem)]",
      tickerHeight: "h-[clamp(2.5rem,4vw,3rem)]",
      speed: 1.2,
      padding: "p-5",
    },
    movil: {
      text: "text-[clamp(1rem,2.5vw,1.25rem)]",
      title: "text-[clamp(1.2rem,3vw,1.5rem)]",
      verseTitle: "text-base",
      verseCite: "text-sm",
      tickerText: "text-base",
      tickerHeight: "h-10",
      speed: 0.6,
      padding: "p-3",
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
    const tickerRef = ref(database, `displayTicker/${userData.groupId}`);
    const unsubscribe = onValue(tickerRef, (snapshot) => {
      const data = snapshot.val();
      if (data && typeof data.text === "string") {
        setTicker(data.text);
      }
    });
    return () => unsubscribe();
  }, []);

  //Display Message
  useEffect(() => {
    const messageRef = ref(database, `displayMessage/${userData.groupId}`);
    const unsubscribe = onValue(messageRef, (snapshot) => {
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
    });
    return () => unsubscribe();
  }, []);

  // Display Titulo
  useEffect(() => {
    if (!auth.currentUser) return;

    const tituloRef = ref(database, `displayTitulo/${userData.groupId}`);
    const unsubscribe = onValue(tituloRef, (snapshot) => {
      const data = snapshot.val();
      if (
        data &&
        typeof data.text === "string" &&
        typeof data.display === "string"
      ) {
        setTituloPredica(data.text);
        setDisplay(data.display);
      }
    });
    return () => unsubscribe();
  }, []);

  // Display Versiculo
  useEffect(() => {
    const versiculoRef = ref(database, `displayVersiculo/${userData.groupId}`);
    const unsubscribe = onValue(versiculoRef, (snapshot) => {
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
    });
    return () => unsubscribe();
  }, []);

  return (
    <div
      className={`relative h-screen w-screen bg-black font-bold text-white overflow-hidden ${style.padding}`}
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

      {/* CONTENEDOR PRINCIPAL */}
      <div className="absolute inset-0 flex flex-col text-center">
        {/* TÍTULO ( si está visible) */}
        {visibleTitulo && (
          <div className="pb-1 px-6">
            <h1 className={`${style.text}`}>{tituloPredica}</h1>
          </div>
        )}

        {/* MENSAJE / PREDICA / VERSÍCULO */}
        {visibleTexto && (
          <div className="flex-1 flex items-center justify-center px-8">
            {display === "mensajePredica" ? (
              <div
                className={`${style.text} text-center whitespace-pre-wrap wrap-break-words`}
              >
                {mensajePredica}
              </div>
            ) : display === "mensaje" ? (
              <div
                className={`${style.text} text-center whitespace-pre-wrap wrap-break-words`}
              >
                {mensaje}
              </div>
            ) : display === "versiculo" ? (
              <div className="flex flex-col items-center justify-center w-full relative">
                <h2
                  className={`font-bold ${style.verseTitle} text-app-muted mb-6`}
                >
                  {tituloVersiculo}
                </h2>
                <div
                  className={`${style.text} text-center whitespace-pre-wrap wrap-break-words`}
                >
                  {versiculo}
                </div>
                <div className={`mt-4 self-end ${style.verseCite}`}>{cita}</div>
              </div>
            ) : null}
          </div>
        )}

        {/* ESPACIO PARA EL TICKER */}
        {visibleTicker && <div className={`${style.tickerHeight}`} />}
      </div>

      {/* TICKER */}
      {visibleTicker && (
        <TickerAnimacion
          message={ticker}
          velocidad={velocidadTicker}
          style={style}
        />
      )}
    </div>
  );
}
