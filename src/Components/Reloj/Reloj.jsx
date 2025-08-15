import { useState, useEffect } from "react";

export default function Reloj() {
  const [hora, setHora] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setHora(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const horaFormateada = hora
    .toLocaleTimeString("es-CO", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    })
    .replace(/\s*a\.?\s*m\.?/i, " am") 
    .replace(/\s*p\.?\s*m\.?/i, " pm");

  return (
    <div className=" text-4xl font-bold bg-white text-gray-700 px-4 py-2  ">
      {horaFormateada}
    </div>
  );
}
