// import { useEffect, useRef } from "react";
// import { useNavigate } from "react-router-dom";
// import Reloj from "../Reloj/Reloj";

// export default function TickerMessage({ message, velocidad }) {
//   const navigate = useNavigate();
//   const containerRef = useRef(null);
//   const textRef = useRef(null);
//   const requestRef = useRef(null);
//   const positionRef = useRef(0);

//   useEffect(() => {
//     const container = containerRef.current;
//     const text = textRef.current;

//     if (!container || !text) return;

//     const textWidth = text.offsetWidth / 3; // Dividir por 3 ya que el mensaje se repite tres veces
//     // const containerWidth = container.offsetWidth;

//     const animar = () => {
//       positionRef.current -= velocidad;

//       // Restablece la posición cuando el primer mensaje haya desaparecido completamente de la vista
//       if (positionRef.current <= -textWidth) {
//         positionRef.current += textWidth; // Retroceder la longitud del mensaje
//       }

//       text.style.transform = `translateX(${positionRef.current}px)`;

//       requestRef.current = requestAnimationFrame(animar);
//     };

//     requestRef.current = requestAnimationFrame(animar);

//     return () => cancelAnimationFrame(requestRef.current);
//   }, [velocidad]);

//   return (
//     <div
//       ref={containerRef}
//       className="w-full fixed bottom-0 left-0 z-40 flex items-center bg-blue-600 h-14 overflow-hidden"
//     >
//       <button
//         onClick={() => navigate("/ViewSelector")}
//         className="fixed z-50 flex items-center h-14"
//       >
//         <Reloj />
//       </button>

//       <div
//         ref={textRef}
//         className="text-white font-bold text-2xl whitespace-nowrap ml-4"
//       >
//         {message} {message} {message}
//       </div>
//     </div>
//   );
// }

import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Reloj from "../Reloj/Reloj";

export default function TickerMessage({ message, velocidad = 1 }) {
  const navigate = useNavigate();
  const trackRef = useRef(null);
  const req = useRef(null);
  const pos = useRef(0);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const singleTextWidth = track.scrollWidth / 2;

    const animate = () => {
      pos.current -= velocidad;

      // Cuando la primera copia salió completamente
      if (Math.abs(pos.current) >= singleTextWidth) {
        pos.current = 0;
      }

      track.style.transform = `translateX(${pos.current}px)`;
      req.current = requestAnimationFrame(animate);
    };

    req.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(req.current);
  }, [velocidad]);

  return (
    <div className="w-full fixed bottom-0 left-0 z-40 bg-blue-600 h-14 flex items-center overflow-hidden">
      <button
        onClick={() => navigate("/ViewSelector")}
        className="absolute left-0 z-50 flex items-center h-14 px-3 bg-blue-600"
      >
        <Reloj />
      </button>

      <div className="flex-1 overflow-hidden">
        <div
          ref={trackRef}
          className="flex whitespace-nowrap text-white font-bold text-2xl"
        >
          <span className="mr-20">{message}</span>
          <span className="mr-20">{message}</span>
        </div>
      </div>
    </div>
  );
}
