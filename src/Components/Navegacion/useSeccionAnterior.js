import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { seccionDeRuta } from "./Secciones.js";

// Sección en la que se estuvo justo antes de la actual, con la ÚLTIMA
// dirección que se vio en ella: si se dejó abierta una canción
// (/ViewCancion/abc), volver lleva a esa canción, no a la lista.
//
// Devuelve { ruta, seccion } o null. Moverse dentro de una misma sección (de
// la lista a una canción) no cambia cuál es la anterior.
export function useSeccionAnterior() {
  const { pathname } = useLocation();
  const ultima = useRef(pathname);
  const [anterior, setAnterior] = useState(null);

  useEffect(() => {
    const previa = ultima.current;
    ultima.current = pathname;
    if (previa === pathname) return;
    const antes = seccionDeRuta(previa);
    const ahora = seccionDeRuta(pathname);
    if (antes && ahora && antes !== ahora) setAnterior({ ruta: previa, seccion: antes });
  }, [pathname]);

  return anterior && seccionDeRuta(pathname) !== anterior.seccion ? anterior : null;
}
