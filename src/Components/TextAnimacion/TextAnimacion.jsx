// import { useEffect, useRef } from "react";

// export default function TextAnimacion({
//   mensaje,
//   titulo,
//   predica,
//   versiculo,
//   versiculos,
//   capitulo,
//   speed,
//   estado,
//   display,
//   cita,
// }) {
//   const containerRef = useRef(null);
//   const textRef = useRef(null);
//   const requestRef = useRef(null);
//   const positionRef = useRef(0);
//   const speedRef = useRef(speed * 10);

//   useEffect(() => {
//     speedRef.current = estado ? speed * 10 : 0;
//   }, [speed, estado]);

//   useEffect(() => {
//     const container = containerRef.current;
//     const text = textRef.current;

//     if (!container || !text) return;

//     const containerHeight = container.offsetHeight;
//     const textHeight = text.offsetHeight;

//     container.style.justifyContent =
//       display === "capitulo" || display === "versiculos"
//         ? "flex-start"
//         : "center";

//     const lineHeight = 58;
//     const linesPerScreen = Math.floor(containerHeight / lineHeight);
//     const initialLines = Math.round(linesPerScreen / 2);
//     const finalLines = Math.round(linesPerScreen / 2);

//     const initialPosition = containerHeight - initialLines * lineHeight;
//     positionRef.current = initialPosition > 0 ? initialPosition : 0;
//     text.style.transform = `translateY(${Math.round(positionRef.current)}px)`;

//     const stopPosition = -(textHeight - finalLines * lineHeight);

//     let previousTime = null;

//     const animar = (time) => {
//       if (!previousTime) previousTime = time;
//       const delta = (time - previousTime) / 1000;
//       previousTime = time;

//       if (speedRef.current > 0) {
//         const move = speedRef.current * delta;
//         const nextPosition = positionRef.current - move;

//         if (nextPosition <= stopPosition) {
//           positionRef.current = stopPosition > 0 ? 0 : stopPosition;
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
//   }, [display]);

//   const versos = versiculos?.match(/\d+\.\s[\s\S]*?(?=\d+\.|$)/g) || [];

//   return (
//     <div
//       ref={containerRef}
//       className="flex flex-col items-center justify-center p-5 text-white h-screen overflow-hidden"
//     >
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

//       <div>
//         {display === "predica" ? (
//           <div className="text-[3rem] text-center whitespace-pre-wrap break-words">
//             {predica}
//           </div>
//         ) : display === "mensaje" ? (
//           <div className="text-[3rem] text-center whitespace-pre-wrap break-words">
//             {mensaje}
//           </div>
//         ) : display === "versiculo" ? (
//           <>
//             <h2 className="font-bold sm:text-3xl  text-app-muted mb-6">
//               {titulo}
//             </h2>
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
