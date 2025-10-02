import { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";
import { database } from "../Firebase/Firebase";
import TickerMessage from "../TickerMessage/TickerMessage";
import TextAnimacion from "../TextAnimacion/TextAnimacion";

export default function DisplayView() {
  const [display, setDisplay] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [titulo, setTitulo]= useState("")
  const [versiculo, setVersiculo] = useState("");
  const [versiculos, setVersiculos] = useState("");
  const [capitulo, setCapitulo] = useState("");
  const [cita, setCita] = useState("");
  const [ticker, setTicker] = useState("");
  const [velocidad, setVelocidad] = useState("");
  const [estado, setEstado] = useState("");

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
  
  useEffect(() => {
    const versiculoRef = ref(database, "displayVersiculo");
    const unsubscribe = onValue(versiculoRef, (snapshot) => {
      const data = snapshot.val();
      if (
        data &&
        typeof data.titulo === "string" &&
        typeof data.text === "string" &&
        typeof data.cita === "string" &&
        typeof data.display === "string"
      ) {
        setTitulo(data.titulo)
        setVersiculo(data.text);
        setCita(data.cita);
        setDisplay(data.display);
      }
    });
    return () => unsubscribe();
  }, []);
  
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

  return (
    <div className="relative h-screen w-screen bg-black text-white  flex items-center justify-center text-center p-5 overflow-hidden">
      <TextAnimacion
        mensaje={mensaje}
        titulo={titulo}
        versiculo={versiculo}
        versiculos={versiculos}
        capitulo={capitulo}
        speed={velocidad}
        estado={estado}
        display={display}
        cita={cita}
      />
      <TickerMessage message={ticker} />
    </div>
  );
}
