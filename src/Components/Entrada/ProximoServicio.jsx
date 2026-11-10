import { useEffect, useState } from "react";
import { useAppContext } from "../Context/AppContext";
import { contenidoEspera } from "../PantallaEspera/utilesEspera.js";
import { textoServicio } from "../ResumenDia/utilesResumen.js";

// Una línea con el próximo servicio (o el que está en curso) y quién maneja
// la pantalla. Se recalcula cada segundo por la cuenta regresiva.
export default function ProximoServicio() {
  const { servicios, desfaseReloj } = useAppContext();
  const [ahora, setAhora] = useState(() => Date.now() + (desfaseReloj || 0));

  useEffect(() => {
    const actualizar = () => setAhora(Date.now() + (desfaseReloj || 0));
    actualizar();
    const temporizador = setInterval(actualizar, 1000);
    return () => clearInterval(temporizador);
  }, [desfaseReloj]);

  const contenido = contenidoEspera(servicios, ahora);
  const { principal } = textoServicio(contenido);

  return (
    <span className="flex min-w-0 items-center gap-2">
      <i
        aria-hidden="true"
        className={`h-2 w-2 shrink-0 rounded-full ${contenido.modo === "nada" ? "bg-app-border" : "bg-app-success"}`}
      />
      <span className="min-w-0">
        {contenido.modo === "nada" ? (
          principal
        ) : (
          <>
            {contenido.modo === "enCurso" ? "Ahora: " : "Próximo: "}
            <b className="font-semibold text-app-texto">{principal}</b>
            {contenido.operador && ` · ${contenido.operador}`}
          </>
        )}
      </span>
    </span>
  );
}
