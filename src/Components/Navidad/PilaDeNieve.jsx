import { useEffect, useRef } from "react";

// Dibuja la nieve acumulada abajo (Navidad, 24 de noviembre de 2026): una capa de
// nieve con relieve, pegada al borde de abajo de la ventana, que va subiendo
// conforme aterrizan los copos. La lógica está en `acumulacion.js`; aquí solo se
// pinta, y solo cuando la pila cambia. Es un adorno: no recibe toques. Un canvas
// no usa clases de Tailwind: el color de la nieve se lee del tema (`app-nieve`) y
// el tono azulado de la sombra va escrito aquí.
const SOMBRA = "rgb(206 220 243)";

export default function PilaDeNieve({ pila }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    let cuadro = 0;

    const dibujar = () => {
      cuadro = 0;
      if (!ctx) return;
      const alto = canvas.clientHeight || 24;
      const ancho = canvas.clientWidth || window.innerWidth;
      const escala = canvas.width / ancho;
      ctx.setTransform(escala, 0, 0, escala, 0, 0);
      ctx.clearRect(0, 0, ancho, alto);

      const nieve = getComputedStyle(document.documentElement).getPropertyValue("--color-app-nieve").trim() || "#ffffff";
      const paso = ancho / pila.columnas;
      const punto = (i) => [(i + 0.5) * paso, alto - pila.alturas[i]];

      // Curva suave que pasa por la mitad entre columnas vecinas
      ctx.beginPath();
      ctx.moveTo(0, alto);
      ctx.lineTo(0, alto - pila.alturas[0]);
      for (let i = 0; i < pila.columnas - 1; i++) {
        const [x, y] = punto(i);
        const [x2, y2] = punto(i + 1);
        ctx.quadraticCurveTo(x, y, (x + x2) / 2, (y + y2) / 2);
      }
      ctx.lineTo(ancho, alto - pila.alturas[pila.columnas - 1]);
      ctx.lineTo(ancho, alto);
      ctx.closePath();

      const degradado = ctx.createLinearGradient(0, alto - 20, 0, alto);
      degradado.addColorStop(0, nieve);
      degradado.addColorStop(1, SOMBRA);
      ctx.fillStyle = degradado;
      ctx.fill();
    };

    const pedir = () => {
      if (!cuadro) cuadro = requestAnimationFrame(dibujar);
    };

    const ajustar = () => {
      const escala = Math.min(window.devicePixelRatio || 1, 2);
      const ancho = canvas.clientWidth || window.innerWidth;
      canvas.width = Math.round(ancho * escala);
      canvas.height = Math.round((canvas.clientHeight || 24) * escala);
      pila.redimensionar(ancho);
      pedir();
    };

    pila.alCambiar = pedir;
    ajustar();
    window.addEventListener("resize", ajustar);
    return () => {
      window.removeEventListener("resize", ajustar);
      if (cuadro) cancelAnimationFrame(cuadro);
      pila.alCambiar = null;
    };
  }, [pila]);

  return <canvas ref={ref} aria-hidden="true" data-pila-nieve className="pointer-events-none absolute inset-x-0 bottom-0 h-pila w-full" />;
}
