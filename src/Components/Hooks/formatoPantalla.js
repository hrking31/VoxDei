import { useEffect, useState } from "react";
import { useAppContext } from "../Context/AppContext";

// El formato de la pantalla del panel (12-11-2026, propuesta aprobada por el
// usuario: https://claude.ai/artifact/TbjJUe59Na4bgcTAMn1hd2).
//   celular     menos de 744 px de ancho
//   tableta     de 744 a 1023 (el iPad mini de pie y parecidos)
//   escritorio  1024 o más (PC); es lo mismo que isDesktop
// Toda tableta, de cualquier tamaño (20-11-2026, pedido del usuario: «copia el diseño del iPad mini a
// los demás tamaños de iPad»): un dispositivo táctil (el dedo es su puntero principal) de hasta
// ANCHO_TABLETA_MAXIMO px —el iPad Pro de 13" acostado mide 1376— usa el formato «tableta» aunque
// pase de 1023 px. Un PC con mouse sigue siendo escritorio sea cual sea su ancho.
// `baja`: escritorio con menos de 800 px de alto (un PC de 1280×720 o
// 1366×768): ahí se pliegan cosas para que todo quepa sin desplazar.
const ANCHO_TABLETA = 744;
const ANCHO_ESCRITORIO = 1024;
const ALTO_BAJO = 800;
// El iPad Pro de 13" acostado mide 1376 (el de 12,9", 1366) y el Surface Pro, 1368 a 1440 según la escala: el tope
// deja margen para ellos.
const ANCHO_TABLETA_MAXIMO = 1500;

// ¿El puntero principal es el dedo? (celulares y tabletas). Un iPad con teclado y trackpad puede dejar de decir
// «coarse» y además se presenta como un Mac: por eso también se reconoce por ser «Mac» con pantalla táctil (un Mac
// de verdad no tiene puntos táctiles).
export const esIPadConTeclado = () => typeof navigator !== "undefined" && /Macintosh/.test(navigator.userAgent || "") && (navigator.maxTouchPoints || 0) > 1;
// Un Surface Pro (Windows) con el teclado puesto tiene como puntero principal el trackpad, pero su pantalla es táctil:
// por eso también cuenta "any-pointer: coarse" (algún puntero táctil). Un computador sin pantalla táctil no lo cumple.
export const esTactil = () => {
  if (typeof window === "undefined") return false;
  const consulta = (c) => typeof window.matchMedia === "function" && window.matchMedia(c).matches;
  return consulta("(pointer: coarse)") || consulta("(any-pointer: coarse)") || esIPadConTeclado();
};

// El lado corto de la pantalla del APARATO, en px CSS (24-11-2026). Vale igual de pie que acostado: iOS siempre da las
// medidas de pie y Android las intercambia, y el mínimo sirve en los dos casos. 0 si no se sabe (las pruebas, jsdom).
export const ladoCortoDelDispositivo = () => {
  if (typeof window === "undefined" || !window.screen) return 0;
  return Math.min(window.screen.width || 0, window.screen.height || 0);
};

export function formatoDe(ancho, tactil = esTactil(), ladoCorto = ladoCortoDelDispositivo()) {
  // Un celular (táctil y de lado corto menor a 744 px: de ahí hacia abajo, y el iPad mini es la tableta más pequeña) es
  // «celular» también acostado (24-11-2026, pedido del usuario: «la misma vista de cuando está en vertical, pero con
  // scroll»). Sin esto, acostado mide ~844 px de ancho y se le montaba el diseño de tableta.
  if (tactil && ladoCorto > 0 && ladoCorto < ANCHO_TABLETA) return "celular";
  if (tactil && ancho >= ANCHO_TABLETA && ancho <= ANCHO_TABLETA_MAXIMO) return "tableta";
  if (ancho >= ANCHO_ESCRITORIO) return "escritorio";
  if (ancho >= ANCHO_TABLETA) return "tableta";
  return "celular";
}

export const esBaja = (ancho, alto, tactil = esTactil(), ladoCorto) => formatoDe(ancho, tactil, ladoCorto) === "escritorio" && alto < ALTO_BAJO;

// El panel «de escritorio» (barra lateral, columnas): solo el formato escritorio. Antes era `ancho >= 1024`.
export const esEscritorio = (ancho, tactil = esTactil(), ladoCorto) => formatoDe(ancho, tactil, ladoCorto) === "escritorio";

// Lo lee del contexto (lo actualiza InicializarEstados en cada resize). Si
// no está (pruebas antiguas), lo deduce de isDesktop.
export function useFormato() {
  const { isDesktop, formatoPantalla, pantallaBaja } = useAppContext();
  const formato = formatoPantalla || (isDesktop ? "escritorio" : "celular");
  return { formato, baja: formato === "escritorio" && Boolean(pantallaBaja) };
}

// ¿La pantalla está acostada (más ancha que alta)? Se actualiza al girar el dispositivo o cambiar el tamaño de la
// ventana (20-11-2026: la tableta en horizontal junta sus dos barras de botones en una).
export const esApaisada = (ancho, alto) => ancho > alto;

// Las tabletas grandes acostadas (20-11-2026, pedido del usuario: «iPad Pro y demás en horizontal»): de 1180 px de
// ancho hacia arriba (el iPad Air y el Pro de 11" y de 13" acostados); el iPad mini acostado mide 1133.
// En Prédica usan el diseño del computador, sin la lista de prédicas (la reemplaza un botón).
const ANCHO_TABLETA_GRANDE = 1180;
export const esTabletaGrande = (ancho, alto) => esApaisada(ancho, alto) && ancho >= ANCHO_TABLETA_GRANDE;

// Los mismos puntos de quiebre en el computador (20-11-2026, pedido del usuario: «en diferentes pantallas de PC aplica los
// puntos de quiebre que ya usamos en los iPad y móviles»; «de 1180 en adelante todavía podrías aplicar el de tableta en
// horizontal»):
//   menos de 1180 px  → como el iPad mini acostado (botones solo con íconos, sin columnas laterales, paneles encima)
//   de 1180 a 1599 px → como las tabletas grandes acostadas (lo mismo, con el texto de los botones)
//   1600 px en adelante → el diseño completo del computador
export const ANCHO_ESCRITORIO_COMPLETO = 1600;
export const esAnchoCompacto = (ancho) => ancho < ANCHO_TABLETA_GRANDE;
export const esAnchoReducido = (ancho) => ancho < ANCHO_ESCRITORIO_COMPLETO;
function useAncho(prueba) {
  const [cumple, setCumple] = useState(() => typeof window !== "undefined" && prueba(window.innerWidth));
  useEffect(() => {
    const alCambiar = () => setCumple(prueba(window.innerWidth));
    window.addEventListener("resize", alCambiar);
    return () => window.removeEventListener("resize", alCambiar);
  }, [prueba]);
  return cumple;
}
// Los botones de control de Predicar y Pruebas van solo con íconos por debajo de 1200 px (20-11-2026, pedido del usuario;
// a 1180 px el texto no cabe holgado); de 1200 en adelante, con su texto.
export const ANCHO_CON_TEXTO = 1200;
export const esAnchoSoloIconos = (ancho) => ancho < ANCHO_CON_TEXTO;
export const useAnchoCompacto = () => useAncho(esAnchoCompacto);
export const useAnchoSoloIconos = () => useAncho(esAnchoSoloIconos);
export const useAnchoReducido = () => useAncho(esAnchoReducido);
export function useTabletaGrande() {
  const [grande, setGrande] = useState(() => typeof window !== "undefined" && esTabletaGrande(window.innerWidth, window.innerHeight));
  useEffect(() => {
    const alCambiar = () => setGrande(esTabletaGrande(window.innerWidth, window.innerHeight));
    window.addEventListener("resize", alCambiar);
    window.addEventListener("orientationchange", alCambiar);
    return () => {
      window.removeEventListener("resize", alCambiar);
      window.removeEventListener("orientationchange", alCambiar);
    };
  }, []);
  return grande;
}
export function useApaisado() {
  const [apaisado, setApaisado] = useState(() => typeof window !== "undefined" && esApaisada(window.innerWidth, window.innerHeight));
  useEffect(() => {
    const alCambiar = () => setApaisado(esApaisada(window.innerWidth, window.innerHeight));
    window.addEventListener("resize", alCambiar);
    window.addEventListener("orientationchange", alCambiar);
    return () => {
      window.removeEventListener("resize", alCambiar);
      window.removeEventListener("orientationchange", alCambiar);
    };
  }, []);
  return apaisado;
}
