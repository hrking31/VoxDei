import { useEffect, useRef } from "react";

export default function TextAnimacion({
  capitulo,
  versiculos,
  versiculo,
  mensaje,
  display,
  cita,
  speed,
  estado,
}) {
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const requestRef = useRef(null);
  const positionRef = useRef(0);

  const velocidad = estado ? speed : 0;

  useEffect(() => {
    const container = containerRef.current;
    const text = textRef.current;

    if (!container || !text) return;

    const animar = () => {
      if (velocidad > 0) {
        positionRef.current -= velocidad;
        const textHeight = text.offsetHeight;
        const containerHeight = container.offsetHeight;
        if (positionRef.current < -containerHeight) {
          positionRef.current = containerHeight;
        }
      }
      text.style.transform = `translateY(${positionRef.current}px)`;

      requestRef.current = requestAnimationFrame(animar);
    };

    requestRef.current = requestAnimationFrame(animar);

    return () => cancelAnimationFrame(requestRef.current);
  }, [speed, estado]);

  const versos = versiculos.match(/\d+\.\s[\s\S]*?(?=\d+\.|$)/g);

  return (
    <div
      ref={containerRef}
      className="flex flex-col items-center justify-center p-5 text-white h-screen overflow-hidden"
    >
      <div
        ref={textRef}
        className="text-[3rem] leading-snug whitespace-pre-wrap "
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
