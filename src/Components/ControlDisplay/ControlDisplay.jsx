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
  const { visibleTitulo, visibleTexto, velocidadTicker } = useAppContext();
  const { userData } = useAuth();

  const sizes = {
    proyector: {
      text: "text-[5rem]",
      title: "text-6xl",
      tickerHeight: "h-24",
      padding: "p-10",
    },
    desktop: {
      text: "text-[3rem]",
      title: "text-5xl",
      tickerHeight: "h-16",
      padding: "p-6",
    },
    movil: {
      text: "text-xl",
      title: "text-2xl",
      tickerHeight: "h-10",
      padding: "p-3",
    },
  };

  const style = sizes[screenType];

  const activarFullscreen = () => {
    const el = document.documentElement;

    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen(); // Safari
    else if (el.msRequestFullscreen) el.msRequestFullscreen(); // Edge viejo

    setVisible(false); // Ocultar el botón
  };
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
    // <div className="relative h-screen w-screen bg-black font-bold text-white flex items-center justify-center text-center overflow-hidden p-5">
    // <div className="fixed inset-0 bg-black font-bold text-white flex items-center justify-center text-center overflow-hidden p-4">
    <div
      className={`relative h-screen w-screen bg-black font-bold text-white flex items-center justify-center text-center overflow-hidden ${style.padding}`}
    >
      {visible && (
        <button
          onClick={activarFullscreen}
          className="
            fixed
            inset-0
            flex
            items-center
            justify-center
            z-50
            bg-black/40
          "
        >
          <div className="flex flex-col items-center gap-4">
            <ArrowsPointingOutIcon className="w-24 h-24 text-white animate-pulse" />
            <p className="text-white text-xl tracking-wider">
              ACTIVAR PANTALLA COMPLETA
            </p>
          </div>
        </button>
      )}
      {visibleTitulo && (
        // <div className="absolute top-2 left-0 w-full text-5xl font-bold text-app-muted text-center z-10 pointer-events-none">
        <div className="absolute top-12 left-0 w-full text-center px-6">
          <h1 className={`${style.text}`}>{tituloPredica}</h1>
        </div>
      )}

      {visibleTexto && (
        // <div className="flex flex-col items-center justify-center h-screen overflow-hidden p-5">
        <div className="absolute inset-0 flex items-center justify-center px-8 text-center">
          {display === "mensajePredica" ? (
            // <div className="text-[3rem] text-center whitespace-pre-wrap break-words">
            <div
              className={`${style.text} text-center whitespace-pre-wrap break-words`}
            >
              {mensajePredica}
            </div>
          ) : display === "mensaje" ? (
            // <div className="text-[3rem] text-center whitespace-pre-wrap break-words">
            <div
              className={`${style.text} text-center whitespace-pre-wrap break-words`}
            >
              {mensaje}
            </div>
          ) : display === "versiculo" ? (
            <>
              <div className="flex flex-col items-center justify-center w-full relative">
                <h2 className="font-bold sm:text-3xl  text-app-muted mb-6">
                  {tituloVersiculo}
                </h2>
                {/* <div className="text-[3rem] text-center whitespace-pre-wrap break-words"> */}
                <div
                  className={`${style.text} text-center whitespace-pre-wrap break-words`}
                >
                  {versiculo}
                </div>
                {/* <div className="text-[1.5rem] self-end mt-4 text-right"> */}
                <div className="absolute -bottom-6 right-0">{cita}</div>
              </div>
            </>
          ) : null}
        </div>
      )}
      <TickerAnimacion message={ticker} velocidad={velocidadTicker} />
    </div>
  );
}
