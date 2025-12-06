import { useEffect, useRef } from "react";

export default function TickerMessage({ message, velocidad, style }) {
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
      className={`w-screen fixed bottom-0 left-0 z-40 flex
        items-center bg-blue-600 overflow-hidden ${style.tickerHeight}`}
    >
      {/* Texto en movimiento */}
      <div
        ref={textRef}
        className={`absolute left-0 text-white font-bold whitespace-nowrap ${style.tickerText}`}
      >
        {message}
      </div>
    </div>
  );
}
