import { ClockIcon } from "@heroicons/react/24/solid";
import EstadoPantalla from "../Entrada/EstadoPantalla.jsx";
import { ETIQUETA_BOTON } from "./utilesFranja.js";

// Cómo se ve la franja del turno. Solo dibuja: los textos salen de
// estadoFranja. La monta FranjaTurno (con los botones que funcionan) y la Ayuda
// (`ejemplo`: los botones son dibujo, no se pueden pulsar, y no es una región
// que el lector de pantalla anuncie al cambiar).
//
// Un solo renglón (11 de noviembre de 2026) con el estilo de siempre: todo el
// fondo verde si puedes proyectar o rojo si no (el usuario probó un fondo
// oscuro con solo una línea de color y pidió volver al verde). A la derecha,
// la pantalla del templo (EstadoPantalla); `pantalla` la fija en los ejemplos.
export default function VistaFranja({ estado, alPulsar, pantalla, ejemplo = false }) {
  const { puedo, titulo, explicacion, completo, botones } = estado;
  const boton = "shrink-0 rounded px-2 py-0.5 text-xs font-bold inset-shadow-sm transition";
  const estiloBoton = {
    iniciar: "text-app-main inset-shadow-app-main hover:bg-app-main hover:text-app-dark",
    tomar: "text-app-main inset-shadow-app-main hover:bg-app-main hover:text-app-dark",
    terminar: "text-app-muted inset-shadow-app-muted hover:text-app-error hover:inset-shadow-app-error",
  };

  return (
    <div
      data-franja-turno={puedo ? "puedo" : "no-puedo"}
      className={`flex h-8 shrink-0 items-center gap-2 border-b px-3 text-xs sm:text-sm ${
        puedo
          ? "border-app-success bg-app-success/10 text-app-success"
          : "border-app-error bg-app-error/10 text-app-error"
      }`}
    >
      <ClockIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <p role={ejemplo ? undefined : "status"} title={completo} className="m-0 min-w-0 flex-1 truncate">
        <b>{titulo}</b>
        <span className="sr-only">. {explicacion}</span>
      </p>

      {botones.map((clave) =>
        ejemplo ? (
          <span key={clave} className={`${boton} ${estiloBoton[clave]}`}>
            {ETIQUETA_BOTON[clave]}
          </span>
        ) : (
          <button key={clave} type="button" onClick={() => alPulsar(clave)} className={`${boton} ${estiloBoton[clave]}`}>
            {ETIQUETA_BOTON[clave]}
          </button>
        )
      )}

      <EstadoPantalla estado={pantalla} />
    </div>
  );
}
