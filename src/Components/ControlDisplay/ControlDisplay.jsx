import { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";
import { database } from "../Firebase/Firebase";
import TickerMessage from "../TickerMessage/TickerMessage";

export default function DisplayView() {
  const [display, setDisplay] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [versiculo, setVersiculo] = useState("");
  const [capitulo, setCapitulo] = useState("");
  const [cita, setCita] = useState("");
  const [ticker, setTicker] = useState("");
  const [velocidad, setVelocidad] = useState(10);

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
    const versiculoRef = ref(database, "displayVersiculo");
    const unsubscribe = onValue(versiculoRef, (snapshot) => {
      const data = snapshot.val();
      if (
        data &&
        typeof data.text === "string" &&
        typeof data.cita === "string" &&
        typeof data.display === "string"
      ) {
        setVersiculo(data.text);
        setCita(data.cita);
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
    const speedRef = ref(database, "speedVersiculo");
    const unsubscribe = onValue(speedRef, (snapshot) => {
      const data = snapshot.val();
      if (data && data.velocidad !== undefined) {
        setVelocidad(data.velocidad);
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

  const versos = versiculo.match(/\d+\.\s[^]+?(?=(?:\s\d+\.|$))/g) || [
    versiculo,
  ];
  const activarAnimacion = versos.length > 1 || versiculo.length > 200;

  return (
    <div className="relative h-screen w-screen bg-black text-white  flex items-center justify-center text-center p-5 overflow-hidden">
      <div className=" flex flex-col items-center justify-center p-5 text-white">
        {display === "mensaje" ? (
          <div className="text-[3rem] text-center">{mensaje}</div>
        ) : display === "versiculo" ? (
          <>
            <div
              className={` text-[3rem] leading-snug whitespace-pre-wrap ${
                activarAnimacion ? "animate-message" : ""
              }`}
              style={{ "--animation-speed": `${velocidad}s` }}
            >
              {versos.map((vers, i) => (
                <p key={i}>{vers.trim()}</p>
              ))}
            </div>
            <div className="text-[1.5rem] self-end mt-4 text-right">{cita}</div>
          </>
        ) : display === "capitulo" ? (
          <div
            className={` text-[3rem] leading-snug whitespace-pre-wrap ${
              activarAnimacion ? "animate-message" : ""
            }`}
            dangerouslySetInnerHTML={{ __html: capitulo }}
          />
        ) : null}
      </div>
      <TickerMessage message={ticker} />
    </div>
  );
}
