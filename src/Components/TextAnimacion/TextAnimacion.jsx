// import { useEffect, useRef } from "react";

// export default function TextAnimacion({
//   capitulo,
//   versiculos,
//   versiculo,
//   mensaje,
//   display,
//   cita,
//   speed,
//   estado,
// }) {
//   const containerRef = useRef(null);
//   const textRef = useRef(null);
//   const requestRef = useRef(null);
//   const positionRef = useRef(0);

//   const velocidad = estado ? speed : 0;

//   useEffect(() => {
//     const container = containerRef.current;
//     const text = textRef.current;

//     if (!container || !text) return;

//     const animar = () => {
//       if (velocidad > 0) {
//         positionRef.current -= velocidad;
//         const textHeight = text.offsetHeight;
//         const containerHeight = container.offsetHeight;
//         if (positionRef.current < -containerHeight) {
//           positionRef.current = containerHeight;
//         }
//       }
//       text.style.transform = `translateY(${positionRef.current}px)`;

//       requestRef.current = requestAnimationFrame(animar);
//     };

//     requestRef.current = requestAnimationFrame(animar);

//     return () => cancelAnimationFrame(requestRef.current);
//   }, [speed, estado]);

//   const versos = versiculos.match(/\d+\.\s[\s\S]*?(?=\d+\.|$)/g);

//   return (
//     <div
//       ref={containerRef}
//       className="flex flex-col items-center justify-center p-5 text-white h-screen overflow-hidden"
//     >
//       <div
//         ref={textRef}
//         className="text-[3rem] leading-snug whitespace-pre-wrap "
//       >
//         {display === "versiculos" ? (
//           <>
//             <div className="text-[3rem] leading-snug whitespace-pre-wrap">
//               {versos.map((vers, i) => (
//                 <p key={i}>{vers.trim()}</p>
//               ))}
//             </div>
//             <div className="text-[1.5rem] self-end mt-4 text-right">{cita}</div>
//           </>
//         ) : display === "capitulo" ? (
//           <>
//             <div
//               className=" text-[3rem] leading-snug whitespace-pre-wrap "
//               dangerouslySetInnerHTML={{ __html: capitulo }}
//             />
//             <div className="text-[1.5rem] self-end mt-4 text-right">{cita}</div>
//           </>
//         ) : null}
//       </div>

//       <div>
//         {display === "mensaje" ? (
//           <div className="text-[3rem] text-center whitespace-pre-wrap break-words">
//             {mensaje}
//           </div>
//         ) : display === "versiculo" ? (
//           <>
//             <div className="text-[3rem] text-center whitespace-pre-wrap break-words">
//               {versiculo}
//             </div>
//             <div className="text-[1.5rem] self-end mt-4 text-right">{cita}</div>
//           </>
//         ) : null}
//       </div>
//     </div>
//   );
// }

// import { useEffect, useRef } from "react";

// export default function TextAnimacion({
//   capitulo,
//   versiculos,
//   versiculo,
//   mensaje,
//   display,
//   cita,
//   speed,
//   estado,
// }) {
//   const containerRef = useRef(null);
//   const textRef = useRef(null);
//   const requestRef = useRef(null);
//   const positionRef = useRef(0);

//   const velocidad = estado ? speed : 0;

//   useEffect(() => {
//     const container = containerRef.current;
//     const text = textRef.current;

//     if (!container || !text) return;

//     const containerHeight = container.offsetHeight;
//     const textHeight = text.offsetHeight;

//     // Inicia desde 1/4 de la pantalla hacia abajo
//     positionRef.current = containerHeight * 0.25;

//     // Aplicar posición inicial
//     text.style.transform = `translateY(${positionRef.current}px)`;

//     // Iniciar animación después de 5 segundos
//     const startAnimation = setTimeout(() => {
//       const animar = () => {
//         if (velocidad > 0) {
//           positionRef.current -= velocidad;

//           // Detener cuando la parte inferior del texto alcanza la mitad superior
//           if (positionRef.current <= -(textHeight - containerHeight / 2)) {
//             positionRef.current = -(textHeight - containerHeight / 2);
//             text.style.transform = `translateY(${positionRef.current}px)`;
//             cancelAnimationFrame(requestRef.current);
//             return;
//           }

//           text.style.transform = `translateY(${positionRef.current}px)`;
//         }

//         requestRef.current = requestAnimationFrame(animar);
//       };

//       requestRef.current = requestAnimationFrame(animar);
//     }, 5000); // Retraso de 5 segundos

//     return () => {
//       clearTimeout(startAnimation);
//       cancelAnimationFrame(requestRef.current);
//     };
//   }, [velocidad, display, mensaje, versiculo]);

//   const versos = versiculos?.match(/\d+\.\s[\s\S]*?(?=\d+\.|$)/g) || [];

//   return (
//     <div
//       ref={containerRef}
//       className="flex flex-col items-center justify-center p-5 text-white h-screen overflow-hidden"
//     >
//       {/* Texto animado */}
//       <div
//         ref={textRef}
//         className="text-[3rem] leading-snug whitespace-pre-wrap"
//       >
//         {display === "versiculos" ? (
//           <>
//             <div className="text-[3rem] leading-snug whitespace-pre-wrap">
//               {versos.map((vers, i) => (
//                 <p key={i}>{vers.trim()}</p>
//               ))}
//             </div>
//             <div className="text-[1.5rem] self-end mt-4 text-right">{cita}</div>
//           </>
//         ) : display === "capitulo" ? (
//           <>
//             <div
//               className=" text-[3rem] leading-snug whitespace-pre-wrap "
//               dangerouslySetInnerHTML={{ __html: capitulo }}
//             />
//             <div className="text-[1.5rem] self-end mt-4 text-right">{cita}</div>
//           </>
//         ) : null}
//       </div>

//       {/* Texto fijo */}
//       <div>
//         {display === "mensaje" ? (
//           <div className="text-[3rem] text-center whitespace-pre-wrap break-words">
//             {mensaje}
//           </div>
//         ) : display === "versiculo" ? (
//           <>
//             <div className="text-[3rem] text-center whitespace-pre-wrap break-words">
//               {versiculo}
//             </div>
//             <div className="text-[1.5rem] self-end mt-4 text-right">{cita}</div>
//           </>
//         ) : null}
//       </div>
//     </div>
//   );
// }

///////////////////////////////el mejor hasta el momento

// import { useEffect, useRef } from "react";

// export default function TextAnimacion({
//   capitulo,
//   versiculos,
//   versiculo,
//   mensaje,
//   display,
//   cita,
//   speed,
//   estado,
// }) {
//   const containerRef = useRef(null);
//   const textRef = useRef(null);
//   const requestRef = useRef(null);
//   const positionRef = useRef(0);
// console.log("Estado",estado);
// console.log("velocidad",speed);
//   const velocidad = estado ? speed * 10 : 0;

//   useEffect(() => {
//     const container = containerRef.current;
//     const text = textRef.current;

//     if (!container || !text) return;

//     const containerHeight = container.offsetHeight;
//     const textHeight = text.offsetHeight;

//     container.style.justifyContent =
//       display === "capitulo"
//         ? "flex-start"
//         : display === "versiculos"
//         ? "flex-start"
//         : "center";

//     // Estimar altura de una línea
//     const lineHeight = 58; // Basado en text-[3rem] y leading-snug
//     const linesPerScreen = Math.floor(containerHeight / lineHeight); // Líneas visibles
//     // const lines =
//     //   display === "versiculos" && versiculos
//     //     ? versiculos.split(/\d+\.\s/).filter((line) => line.trim()).length
//     //     : textHeight / lineHeight;
//     // const totalLines = Math.ceil(lines);

//     // Número de filas iniciales y finales: mitad de las visibles
//     const initialLines = Math.round(linesPerScreen / 2); // Filas iniciales visibles
//     const finalLines = Math.round(linesPerScreen / 2); // Filas finales visibles

//     // Posición inicial: mostrar initialLines filas desde el borde inferior
//     const initialPosition = containerHeight - initialLines * lineHeight;

//     positionRef.current = initialPosition > 0 ? initialPosition : 0;
//     text.style.transform = `translateY(${Math.round(positionRef.current)}px)`;

//     // Posición final: dejar finalLines filas desde el borde superior
//     const stopPosition = -(textHeight - finalLines * lineHeight);

//     // Animación controlada por estado (true activa, false detiene)
//     let previousTime = null;

//     const animar = (time) => {
//       if (!previousTime) previousTime = time;
//       const delta = (time - previousTime) / 1000;
//       previousTime = time;

//       if (estado ) {
//         // Animación solo si estado es true
//         const move = velocidad * delta;
//         const nextPosition = positionRef.current - move;

//         if (nextPosition <= stopPosition) {
//           positionRef.current = stopPosition > 0 ? 0 : stopPosition; // Ajuste para textos cortos
//           text.style.transform = `translateY(${Math.round(
//             positionRef.current
//           )}px)`;
//           cancelAnimationFrame(requestRef.current);
//           return;
//         }

//         positionRef.current = nextPosition;
//         text.style.transform = `translateY(${Math.round(
//           positionRef.current
//         )}px)`;
//       }

//       requestRef.current = requestAnimationFrame(animar);
//     };

//     requestRef.current = requestAnimationFrame(animar);

//     return () => {
//       cancelAnimationFrame(requestRef.current);
//     };
//   }, [ estado, speed, display]);

//   const versos = versiculos?.match(/\d+\.\s[\s\S]*?(?=\d+\.|$)/g) || [];

//   return (
//     <div
//       ref={containerRef}
//       className="flex flex-col items-center justify-center p-5 text-white h-screen overflow-hidden"
//     >
//       {/* Texto animado */}
//       <div
//         ref={textRef}
//         className="text-[3rem] leading-snug whitespace-pre-wrap"
//       >
//         {display === "versiculos" ? (
//           <>
//             <div className="text-[3rem] leading-snug whitespace-pre-wrap">
//               {versos.map((vers, i) => (
//                 <p key={i}>{vers.trim()}</p>
//               ))}
//             </div>
//             <div className="text-[1.5rem] self-end mt-4 text-right">{cita}</div>
//           </>
//         ) : display === "capitulo" ? (
//           <>
//             <div
//               className=" text-[3rem] leading-snug whitespace-pre-wrap "
//               dangerouslySetInnerHTML={{ __html: capitulo }}
//             />
//             <div className="text-[1.5rem] self-end mt-4 text-right">{cita}</div>
//           </>
//         ) : null}
//       </div>

//       {/* Texto fijo */}
//       <div>
//         {display === "mensaje" ? (
//           <div className="text-[3rem] text-center whitespace-pre-wrap break-words">
//             {mensaje}
//           </div>
//         ) : display === "versiculo" ? (
//           <>
//             <div className="text-[3rem] text-center whitespace-pre-wrap break-words">
//               {versiculo}
//             </div>
//             <div className="text-[1.5rem] self-end mt-4 text-right">{cita}</div>
//           </>
//         ) : null}
//       </div>
//     </div>
//   );
// }

import { useEffect, useRef } from "react";

export default function TextAnimacion({
  mensaje,
  titulo,
  versiculo,
  versiculos,
  capitulo,
  speed,
  estado,
  display,
  cita,
}) {
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const requestRef = useRef(null);
  const positionRef = useRef(0);
  const speedRef = useRef(speed * 10);

  useEffect(() => {
    speedRef.current = estado ? speed * 10 : 0;
  }, [speed, estado]);

  useEffect(() => {
    const container = containerRef.current;
    const text = textRef.current;

    if (!container || !text) return;

    const containerHeight = container.offsetHeight;
    const textHeight = text.offsetHeight;

    container.style.justifyContent =
      display === "capitulo" || display === "versiculos"
        ? "flex-start"
        : "center";

    const lineHeight = 58;
    const linesPerScreen = Math.floor(containerHeight / lineHeight);
    const initialLines = Math.round(linesPerScreen / 2);
    const finalLines = Math.round(linesPerScreen / 2);

    const initialPosition = containerHeight - initialLines * lineHeight;
    positionRef.current = initialPosition > 0 ? initialPosition : 0;
    text.style.transform = `translateY(${Math.round(positionRef.current)}px)`;

    const stopPosition = -(textHeight - finalLines * lineHeight);

    let previousTime = null;

    const animar = (time) => {
      if (!previousTime) previousTime = time;
      const delta = (time - previousTime) / 1000;
      previousTime = time;

      if (speedRef.current > 0) {
        const move = speedRef.current * delta;
        const nextPosition = positionRef.current - move;

        if (nextPosition <= stopPosition) {
          positionRef.current = stopPosition > 0 ? 0 : stopPosition;
          text.style.transform = `translateY(${Math.round(
            positionRef.current
          )}px)`;
          cancelAnimationFrame(requestRef.current);
          return;
        }

        positionRef.current = nextPosition;
        text.style.transform = `translateY(${Math.round(
          positionRef.current
        )}px)`;
      }

      requestRef.current = requestAnimationFrame(animar);
    };

    requestRef.current = requestAnimationFrame(animar);

    return () => {
      cancelAnimationFrame(requestRef.current);
    };
  }, [display]);

  const versos = versiculos?.match(/\d+\.\s[\s\S]*?(?=\d+\.|$)/g) || [];

  return (
    <div
      ref={containerRef}
      className="flex flex-col items-center justify-center p-5 text-white h-screen overflow-hidden"
    >
      <div
        ref={textRef}
        className="text-[3rem] leading-snug whitespace-pre-wrap"
      >
        {display === "versiculos" ? (
          <>
            <div className="text-[3rem] leading-snug whitespace-pre-wrap">
              {versos.map((vers, i) => (
                <p key={i}>{vers.trim()}</p>
              ))}
            </div>
            <div className="text-[1.5rem] self-end mt-4 text-right">{cita}</div>
          </>
        ) : display === "capitulo" ? (
          <>
            <div
              className=" text-[3rem] leading-snug whitespace-pre-wrap "
              dangerouslySetInnerHTML={{ __html: capitulo }}
            />
            <div className="text-[1.5rem] self-end mt-4 text-right">{cita}</div>
          </>
        ) : null}
      </div>

      <div>
        {display === "mensaje" ? (
          <div className="text-[3rem] text-center whitespace-pre-wrap break-words">
            {mensaje}
          </div>
        ) : display === "versiculo" ? (
          <>
            <h2 className="font-bold sm:text-3xl  text-app-muted mb-6">
         {titulo}
            </h2>
            <div className="text-[3rem] text-center whitespace-pre-wrap break-words">
              {versiculo}
            </div>
            <div className="text-[1.5rem] self-end mt-4 text-right">{cita}</div>
          </>
        ) : null}
      </div>
    </div>
  );
}
