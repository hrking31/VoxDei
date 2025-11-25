import { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";
import { database, auth } from "../Firebase/Firebase";
import { useAppContext } from "../Context/AppContext";
import TickerAnimacion from "../TickerAnimacion/TickerAnimacion";
import { useAuth } from "../../Components/Context/AuthContext.jsx";

export default function DisplayView() {
  const [display, setDisplay] = useState("");
  const [ticker, setTicker] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [tituloPredica, setTituloPredica] = useState("");
  const [mensajePredica, setMensajePredica] = useState("");
  const [versiculo, setVersiculo] = useState("");
  const [tituloVersiculo, setTituloVersiculo] = useState("");
  const [cita, setCita] = useState("");
  const { visibleTitulo, visibleTexto, velocidadTicker } = useAppContext();
  const { user, userData } = useAuth();

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

  // Display Message
  // useEffect(() => {
  //   const messageRef = ref(database, `displayMessage/${userData.groupId}`);
  //   const unsubscribe = onValue(messageRef, (snapshot) => {
  //     const data = snapshot.val();
  //     if (
  //       data &&
  //       typeof data.text === "string" &&
  //       typeof data.display === "string"
  //     ) {
  //       if (data.display === "mensaje") {
  //         setMensaje(data.text);
  //         setDisplay(data.display);
  //       } else {
  //         setMensajePredica(data.text);
  //         setDisplay(data.display);
  //       }
  //     }
  //   });
  //   return () => unsubscribe();
  // }, []);
  // useEffect(() => {
  //   const groupRef = ref(database, `displayMessage/${userData.groupId}`);

  //   const unsubscribe = onValue(groupRef, (snapshot) => {
  //     const data = snapshot.val();

  //     if (!data) return;

  //     // Recorremos todos los usuarios del grupo
  //     Object.values(data).forEach((item) => {
  //       if (item.display === "mensaje") {
  //         setMensaje(item.text);
  //         setDisplay(item.display);
  //       } else {
  //         setMensajePredica(item.text);
  //         setDisplay(item.display);
  //       }
  //     });
  //   });

  //   return () => unsubscribe();
  // }, []);
  useEffect(() => {
    if (!userData?.groupId) return;

    const messagesRef = ref(database, `displayMessage/${userData.groupId}`);

    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setMensaje("");
        setMensajePredica("");
        setDisplay("");
        return;
      }

      // Convertir el objeto { uid1: {...}, uid2: {...} } en array
      const messages = Object.values(data);

      // Ordenar por timestamp (el más reciente primero)
      messages.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

      // Tomar el mensaje más reciente
      const latest = messages[0];

      if (latest?.display === "mensaje") {
        setMensaje(latest.text || "");
        setMensajePredica(""); // opcional: limpiar el otro
      } else if (latest?.display === "predica") {
        setMensajePredica(latest.text || "");
        setMensaje(""); // opcional
      }

      setDisplay(latest?.display || "");
    });

    return () => unsubscribe();
  }, [userData?.groupId]);


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
    <div className="relative h-screen w-screen bg-black font-bold text-white flex items-center justify-center text-center overflow-hidden p-5">
      {visibleTitulo && (
        <div className="absolute top-2 left-0 w-full text-5xl font-bold text-app-muted text-center z-10 pointer-events-none">
          {tituloPredica}
        </div>
      )}

      {visibleTexto && (
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
                {tituloVersiculo}
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
      <TickerAnimacion message={ticker} velocidad={velocidadTicker} />
    </div>
  );
}
