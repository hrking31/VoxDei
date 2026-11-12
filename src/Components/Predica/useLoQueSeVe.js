import { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";
import { database } from "../Firebase/Firebase";

// Lo que dice ahora mismo la pantalla del templo en la franja de título y en
// el anuncio (ticker), leído de los mismos nodos que lee ControlDisplay. Lo
// usa la mini pantalla del púlpito para ser una copia fiel de lo que se ve,
// aunque el título o el anuncio los haya enviado otra sección (12-11-2026,
// pedido del usuario). Solo lee: no escribe nada.
export function useLoQueSeVe(groupId) {
  const [titulo, setTitulo] = useState("");
  const [ticker, setTicker] = useState("");

  useEffect(() => {
    if (!groupId) return undefined;
    const dejarTitulo = onValue(ref(database, `displayTitulo/${groupId}`), (foto) => setTitulo(foto.val()?.text || ""));
    const dejarTicker = onValue(ref(database, `displayTicker/${groupId}`), (foto) => setTicker(foto.val()?.text || ""));
    return () => {
      dejarTitulo();
      dejarTicker();
    };
  }, [groupId]);

  return { titulo, ticker };
}
