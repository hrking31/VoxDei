import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import simboloSvg from "../../assets/voxdei-simbolo.svg?raw";
import { useTurno } from "../Hooks/useTurno.js";
import { seccionDeRuta } from "./Secciones.js";
import { colorDelTema, iconoConPunto, tituloDePestana } from "./iconoPestana.js";

// Sin pantalla. Mientras se está en el panel, la pestaña del navegador dice
// si te toca proyectar —punto verde— o no —punto rojo—, igual que la franja
// del cronograma, y lleva el nombre de la sección. Con varias pestañas
// abiertas se sabe de un vistazo. Al salir del panel vuelve todo a como era.
export default function IconoPestana() {
  const { puedoProyectar } = useTurno();
  const { pathname } = useLocation();

  useEffect(() => {
    const enlace = document.querySelector('link[rel="icon"]');
    if (!enlace) return;
    const original = enlace.getAttribute("href");
    enlace.setAttribute(
      "href",
      iconoConPunto(simboloSvg, {
        relleno: colorDelTema(puedoProyectar ? "--color-app-success" : "--color-app-error"),
        borde: colorDelTema("--color-app-dark"),
      })
    );
    return () => enlace.setAttribute("href", original);
  }, [puedoProyectar]);

  useEffect(() => {
    document.title = tituloDePestana(seccionDeRuta(pathname)?.nombre);
    return () => {
      document.title = tituloDePestana();
    };
  }, [pathname]);

  return null;
}
