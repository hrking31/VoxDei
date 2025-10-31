import { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";
import { database } from "../Firebase/Firebase";
import TickerAnimacion from "../TickerAnimacion/TickerAnimacion";

export default function DisplayView() {
  const [display, setDisplay] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [mensajePredica, setMensajePredica] = useState("");
  const [titulo, setTitulo] = useState("");
  const [tituloPredica, setTituloPredica] = useState("");
  const [visibleTitulo, setVisibleTitulo] = useState(false);
  const [visiblePredica, setVisiblePredica] = useState(false);
  const [versiculo, setVersiculo] = useState("");
  const [cita, setCita] = useState("");
  const [ticker, setTicker] = useState("");

  // Display Versiculo
  useEffect(() => {
    const versiculoRef = ref(database, "displayVersiculo");
    const unsubscribe = onValue(versiculoRef, (snapshot) => {
      const data = snapshot.val();
      if (
        data &&
        (data.titulo === undefined || typeof data.titulo === "string") &&
        typeof data.text === "string" &&
        typeof data.cita === "string" &&
        typeof data.display === "string"
      ) {
        setTitulo(data.titulo);
        setVersiculo(data.text);
        setCita(data.cita);
        setDisplay(data.display);
      }
    });
    return () => unsubscribe();
  }, []);

  // Display Titulo
  useEffect(() => {
    const tituloRef = ref(database, "displayTitulo");
    const unsubscribe = onValue(tituloRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        if (typeof data.text === "string") {
          setTituloPredica(data.text);
        }
        if (typeof data.visible === "boolean") {
          setVisibleTitulo(data.visible);
        }

        if (data.display && data.display !== "titulo") {
          setDisplay(data.display);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Display Message
  useEffect(() => {
    const messageRef = ref(database, "displayMessage");
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

  // Display Ticker
  useEffect(() => {
    const tickerRef = ref(database, "displayTicker");
    const unsubscribe = onValue(tickerRef, (snapshot) => {
      const data = snapshot.val();
      if (data && typeof data.text === "string") {
        setTicker(data.text);
      }
    });
    return () => unsubscribe();
  }, []);

  // Display Visible
  useEffect(() => {
    const visibleRef = ref(database, "displayVisible");
    const unsubscribe = onValue(visibleRef, (snapshot) => {
      const data = snapshot.val();
      if (data && typeof data.visible === "boolean") {
        setVisiblePredica(data.visible);
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="relative h-screen w-screen bg-black font-bold text-white flex items-center justify-center text-center overflow-hidden p-5">
      {visibleTitulo && (
        <div className="absolute top-2 left-0 w-full text-5xl font-bold text-app-muted text-center z-10 pointer-events-none">
          {tituloPredica}
        </div>
      )}

      {visiblePredica && (
        <div className="flex flex-col items-center justify-center h-screen overflow-hidden p-5">
          {display === "mensajePredica" ? (
            <div className="text-[3rem] text-center whitespace-pre-wrap break-words">
              {mensajePredica}
            </div>
          ) : display === "mensaje" ? (
            <div className="text-[3rem] text-center whitespace-pre-wrap break-words">
              {mensaje}
            </div>
          ) : display === "versiculo" ? (
            <>
              <h2 className="font-bold sm:text-3xl  text-app-muted mb-6">
                {titulo}
              </h2>
              <div className="text-[3rem] text-center whitespace-pre-wrap break-words">
                {versiculo}
              </div>
              <div className="text-[1.5rem] self-end mt-4 text-right">
                {cita}
              </div>
            </>
          ) : null}
        </div>
      )}
      <TickerAnimacion message={ticker} />
    </div>
  );
}
