import { useEffect, useState } from "react";
import { useAuth } from "../Context/AuthContext";
import { useAppContext } from "../Context/AppContext";
import { useEspejoTemplo } from "./useEspejoTemplo.js";
import { piezaDelCentro, seVeAlgo } from "./utilesGuia.js";

// Lo que hay que saber para dibujar la mini pantalla del templo en cualquier
// sección (la guía del computador y la vista del celular de Biblia): lo último
// que se envió (leído de RTDB), qué capas están visibles, qué ocupa el centro y
// si nada se ve. Solo lee.
export function useMiniPantalla() {
  const { userData } = useAuth();
  const { visibleTitulo, visibleTexto, visibleTicker, visibleImagen, visibleVideo, visibleEspera, pantallaTemplo } = useAppContext();
  const espejo = useEspejoTemplo(userData?.groupId);
  const [indice, setIndice] = useState(0);

  const visibles = {
    titulo: Boolean(visibleTitulo),
    texto: Boolean(visibleTexto),
    ticker: Boolean(visibleTicker),
    imagen: Boolean(visibleImagen),
    video: Boolean(visibleVideo),
    espera: Boolean(visibleEspera),
  };

  // El carrusel rota como en el templo.
  const total = espejo.imagenes.length;
  useEffect(() => {
    setIndice(0);
  }, [espejo.imagenes]);
  useEffect(() => {
    if (!visibles.imagen || total <= 1) return undefined;
    const rotar = setInterval(() => setIndice((i) => (i + 1) % total), espejo.intervalo);
    return () => clearInterval(rotar);
  }, [visibles.imagen, total, espejo.intervalo]);

  const centro = piezaDelCentro(espejo, visibles, indice);
  const noSeVe = !seVeAlgo(centro, espejo, visibles);

  return { espejo, visibles, centro, noSeVe, pantallaTemplo };
}
