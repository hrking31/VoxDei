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
  const containerRef = useRef(null);
  const textRef = useRef(null);

  // En la ventana de proyección
  const volver = () => {
    if (window.opener) {
      window.opener.focus(); // Lleva el foco a la ventana original
    }
    window.close(); // Cierra la ventana de proyección
  };

  useEffect(() => {
    const container = containerRef.current;
    const text = textRef.current;

    if (!container || !text) return;

    let position = container.offsetWidth; // empieza desde la derecha
    const textWidth = text.offsetWidth;

    const animate = () => {
      position -= velocidad;

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
      className="w-screen fixed bottom-0 left-0 z-40 flex
        items-center bg-blue-600 h-14 overflow-hidden"
    >
      {/* Botón reloj */}
      <button
        // onClick={() => navigate("/ViewSelector")}
        onClick={volver}
        className="absolute  z-50 flex items-center h-14"
      >
        <Reloj />
      </button>

      {/* Texto en movimiento */}
      <div
        ref={textRef}
        className="absolute left-0 text-white font-bold text-2xl whitespace-nowrap"
      >
        {message}
      </div>
    </div>
  );
}

