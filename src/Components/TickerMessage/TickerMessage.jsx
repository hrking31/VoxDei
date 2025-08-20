// import { useEffect, useState} from "react";
// import { useNavigate } from "react-router-dom";
// import { onValue, ref } from "firebase/database";
// import { database } from "../Firebase/Firebase";
// import Reloj from "../Reloj/Reloj";

// export default function TickerMessage({ message }) {
//     const navigate = useNavigate();
//     const [velocidad, setVelocidad] = useState(10);

//     useEffect(() => {
//       const speedRef = ref(database, "speedTicker");
//       const unsubscribe = onValue(speedRef, (snapshot) => {
//         const data = snapshot.val();
//         if (data && data.velocidad !== undefined) {
//           setVelocidad(data.velocidad);
//         }
//       });
//       return () => unsubscribe();
//     }, []);

//     return (
//       <div className="w-full fixed bottom-0 left-0 z-50 flex items-center bg-blue-600 h-14 overflow-hidden">
//         <button onClick={() => navigate("/")}>
//           <Reloj />
//         </button>

//         <div className="flex-1 overflow-hidden">
//           <div
//             className="flex animate-marquee"
//             style={{ "--animation-speed": `${velocidad}s` }}
//           >
//             <span className="flex whitespace-nowrap">
//               <span className="text-white font-bold text-2xl mr-2 ">
//                 {message}
//               </span>
//               <span className="text-white font-bold text-2xl ">{message}</span>
//             </span>
//           </div>
//         </div>
//       </div>
//     );
//   }

// import { useEffect, useState, useRef } from "react";
// import { useNavigate } from "react-router-dom";
// import { onValue, ref } from "firebase/database";
// import { database } from "../Firebase/Firebase";
// import Reloj from "../Reloj/Reloj";

// export default function TickerMessage({ message }) {
//   const navigate = useNavigate();
//   const containerRef = useRef(null);
//   const textRef = useRef(null);
//   const requestRef = useRef(null);
//   const positionRef = useRef(0);
//   const [velocidad, setVelocidad] = useState(2);

//   useEffect(() => {
//     const speedRef = ref(database, "speedTicker");
//     const unsubscribe = onValue(speedRef, (snapshot) => {
//       const data = snapshot.val();
//       if (data && data.velocidad !== undefined) {
//         setVelocidad(data.velocidad);
//       }
//     });
//     return () => unsubscribe();
//   }, []);

//   useEffect(() => {
//     const container = containerRef.current;
//     const text = textRef.current;

//     if (!container || !text) return;

//     const animar = () => {
//       positionRef.current -= velocidad; // mover X píxeles por frame

//       // ancho total del texto
//       const textWidth = text.offsetWidth;
//       const containerWidth = container.offsetWidth;

//       // si el texto salió completamente de la pantalla
//       if (positionRef.current < -textWidth) {
//         positionRef.current = containerWidth; // reiniciamos desde la derecha
//       }

//       // aplicamos la posición
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
//       <div className=" fixed z-50 flex items-center h-14 ">
//         <button onClick={() => navigate("/")}>
//           <Reloj />
//         </button>
//       </div>

//       <div
//         ref={textRef}
//         className="text-white font-bold text-2xl whitespace-nowrap"
//       >
//         {message}
//       </div>
//     </div>
//   );
// }

import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { onValue, ref } from "firebase/database";
import { database } from "../Firebase/Firebase";
import Reloj from "../Reloj/Reloj";

export default function TickerMessage({ message }) {
  const navigate = useNavigate();

  // Referencias para acceder directamente a elementos y variables persistentes
  const containerRef = useRef(null); // contenedor del ticker
  const textRef = useRef(null); // texto que se mueve
  const requestRef = useRef(null); // id de la animación
  const positionRef = useRef(0); // posición X actual del texto

  // Velocidad controlada desde Firebase
  const [velocidad, setVelocidad] = useState(2);

  // Escuchar cambios en Firebase -> "speedTicker/velocidad"
  useEffect(() => {
    const speedRef = ref(database, "speedTicker");

    const unsubscribe = onValue(speedRef, (snapshot) => {
      const data = snapshot.val();
      if (data && data.velocidad !== undefined) {
        setVelocidad(data.velocidad);
      }
    });

    return () => unsubscribe(); // limpiamos el listener de Firebase
  }, []);

  // Animación del texto
  useEffect(() => {
    const container = containerRef.current;
    const text = textRef.current;

    if (!container || !text) return;

    const animar = () => {
      // Mover el texto X píxeles hacia la izquierda por frame
      positionRef.current -= velocidad;

      const textWidth = text.offsetWidth; // ancho del texto
      const containerWidth = container.offsetWidth; // ancho del contenedor

      // Si el texto salió completamente, lo reiniciamos desde la derecha
      if (positionRef.current < -textWidth) {
        positionRef.current = containerWidth;
      }

      // Aplicamos el movimiento con transform
      text.style.transform = `translateX(${positionRef.current}px)`;

      // Continuamos animando
      requestRef.current = requestAnimationFrame(animar);
    };

    // Iniciamos la animación
    requestRef.current = requestAnimationFrame(animar);

    // Limpiamos animación al desmontar
    return () => cancelAnimationFrame(requestRef.current);
  }, [velocidad]);

  return (
    <div
      ref={containerRef}
      className="w-full fixed bottom-0 left-0 z-40 flex items-center bg-blue-600 h-14 overflow-hidden"
    >
      <button
        onClick={() => navigate("/")}
        className=" fixed z-50 flex items-center h-14 "
      >
        <Reloj />
      </button>

      <div
        ref={textRef}
        className="text-white font-bold text-2xl whitespace-nowrap ml-4"
      >
        {message}
      </div>
    </div>
  );
}
