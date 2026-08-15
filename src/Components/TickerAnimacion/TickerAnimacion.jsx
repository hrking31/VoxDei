import { useEffect, useRef } from "react";
import { escalar } from "../Estilos/EstilosProyeccion";

export default function TickerMessage({ message, velocidad, style, estilos }) {
  const containerRef = useRef(null);
  const textRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    const text = textRef.current;

    if (!container || !text) return;

    // Velocidad según tipo de pantalla
    let speed = velocidad * (style.speed || 1);

    let position = container.offsetWidth; // empieza desde la derecha
    const textWidth = text.offsetWidth;

    const animate = () => {
      position -= speed;

      // Cuando el texto salga completamente, vuelve a empezar
      if (position < -textWidth) {
        position = container.offsetWidth;
      }

      text.style.transform = `translateX(${position}px)`;

      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, [message, velocidad]);

  return (
    <div
      ref={containerRef}
      className="w-screen fixed bottom-0 left-0 z-40 flex items-center overflow-hidden"
      style={{
        backgroundColor: estilos.ticker.colorFondo,
        height: escalar(style.tickerHeight, estilos.ticker.altura),
      }}
    >
      {/* Texto en movimiento */}
      <div
        ref={textRef}
        className="absolute left-0 font-bold whitespace-nowrap"
        style={{
          color: estilos.ticker.colorTexto,
          fontSize: escalar(style.tickerText, estilos.ticker.tamano),
        }}
      >
        {message}
      </div>
    </div>
  );
}
