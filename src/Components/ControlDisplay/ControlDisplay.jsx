import { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";
import { database } from "../Firebase/Firebase";
import TickerAnimacion from "../TickerAnimacion/TickerAnimacion";
import TextAnimacion from "../TextAnimacion/TextAnimacion";

export default function DisplayView() {
  const [display, setDisplay] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [predica, setPredica] = useState("");
  const [titulo, setTitulo] = useState("");
  const [tituloPredica, setTituloPredica] = useState("");
  const [visibleTitulo, setVisibleTitulo] = useState(false);
  const [visiblePredica, setVisiblePredica] = useState(false);
  const [versiculo, setVersiculo] = useState("");
  const [versiculos, setVersiculos] = useState("");
  const [capitulo, setCapitulo] = useState("");
  const [cita, setCita] = useState("");
  const [ticker, setTicker] = useState("");
  const [velocidad, setVelocidad] = useState("");
  const [estado, setEstado] = useState("");

  // Capitulo Text
  useEffect(() => {
    const capituloRef = ref(database, "displayCapitulo");
    const unsubscribe = onValue(capituloRef, (snapshot) => {
      const data = snapshot.val();
      if (
        data &&
        typeof data.text === "string" &&
        typeof data.cita === "string" &&
        typeof data.display === "string"
      ) {
        setCapitulo(data.text);
        setCita(data.cita);
        setDisplay(data.display);
      }
    });
    return () => unsubscribe();
  }, []);

  // Versiculo Text
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

  // Versiculos Text
  useEffect(() => {
    const versiculosRef = ref(database, "displayVersiculos");
    const unsubscribe = onValue(versiculosRef, (snapshot) => {
      const data = snapshot.val();
      if (
        data &&
        typeof data.text === "string" &&
        typeof data.cita === "string" &&
        typeof data.display === "string"
      ) {
        setVersiculos(data.text);
        setCita(data.cita);
        setDisplay(data.display);
      }
    });
    return () => unsubscribe();
  }, []);

  // Titulo Predica
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

  // Mensaje Text
  useEffect(() => {
    const messageRef = ref(database, "displayMessage");
    const unsubscribe = onValue(messageRef, (snapshot) => {
      const data = snapshot.val();
      if (
        data &&
        typeof data.text === "string" &&
        typeof data.display === "string"
      ) {
        setMensaje(data.text);
        setDisplay(data.display);
      }
    });
    return () => unsubscribe();
  }, []);

  // Predica Text
  useEffect(() => {
    const predicaRef = ref(database, "displayPredica");
    const unsubscribe = onValue(predicaRef, (snapshot) => {
      const data = snapshot.val();
      if (
        data &&
        typeof data.text === "string" &&
        typeof data.display === "string"
      ) {
        setPredica(data.text);
        setDisplay(data.display);
      }
    });
    return () => unsubscribe();
  }, []);

  // Speed and State
  useEffect(() => {
    const speedRef = ref(database, "speedVersiculo");
    const unsubscribe = onValue(speedRef, (snapshot) => {
      const data = snapshot.val();
      if (data && data.velocidad !== undefined) {
        setVelocidad(data.velocidad);
        setEstado(data.estado);
      }
    });
    return () => unsubscribe();
  }, []);

  // Ticker Message
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
    <div className="relative h-screen w-screen bg-black text-white  flex items-center justify-center text-center p-5 overflow-hidden">
      {visibleTitulo && (
        <div className="absolute top-2 left-0 w-full text-5xl font-bold text-app-muted text-center z-10 pointer-events-none">
          {tituloPredica}
        </div>
      )}

      {visiblePredica && (
        <div className="absolute top-2 left-0 w-full text-5xl font-bold text-app-muted text-center z-10 pointer-events-none">
          <TextAnimacion
            mensaje={mensaje}
            titulo={titulo}
            predica={predica}
            versiculo={versiculo}
            versiculos={versiculos}
            capitulo={capitulo}
            speed={velocidad}
            estado={estado}
            display={display}
            cita={cita}
          />
        </div>
      )}
      <TickerAnimacion message={ticker} />
    </div>
  );
}
