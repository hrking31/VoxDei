import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { onValue, ref } from "firebase/database";
import { database } from "../Firebase/Firebase";
import Reloj from "../Reloj/Reloj";

export default function TickerMessage({ message }) {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const requestRef = useRef(null);
  const positionRef = useRef(0);

  const [velocidad, setVelocidad] = useState(2);

  useEffect(() => {
    const speedRef = ref(database, "speedTicker");

    const unsubscribe = onValue(speedRef, (snapshot) => {
      const data = snapshot.val();
      if (data && data.velocidad !== undefined) {
        setVelocidad(data.velocidad);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const text = textRef.current;

    if (!container || !text) return;

    const textWidth = text.offsetWidth / 3; // Dividir por 3 ya que el mensaje se repite tres veces
    const containerWidth = container.offsetWidth;

    const animar = () => {
      positionRef.current -= velocidad;

      // Restablece la posición cuando el primer mensaje haya desaparecido completamente de la vista
      if (positionRef.current <= -textWidth) {
        positionRef.current += textWidth; // Retroceder la longitud del mensaje
      }

      text.style.transform = `translateX(${positionRef.current}px)`;

      requestRef.current = requestAnimationFrame(animar);
    };

    requestRef.current = requestAnimationFrame(animar);

    return () => cancelAnimationFrame(requestRef.current);
  }, [velocidad]);

  return (
    <div
      ref={containerRef}
      className="w-full fixed bottom-0 left-0 z-40 flex items-center bg-blue-600 h-14 overflow-hidden"
    >
      <button
        onClick={() => navigate("/")}
        className="fixed z-50 flex items-center h-14"
      >
        <Reloj />
      </button>

      <div
        ref={textRef}
        className="text-white font-bold text-2xl whitespace-nowrap ml-4"
      >
        {message} {message} {message}
      </div>
    </div>
  );
}
