import { CheckCircleIcon } from "@heroicons/react/24/solid";
import { REQUISITOS_CLAVE } from "../Validaciones/Validaciones.js";

// Lista de requisitos debajo del campo de una contraseña nueva: cada uno se
// marca en verde en cuanto la contraseña lo cumple.
export default function RequisitosClave({ clave }) {
  return (
    <ul className="text-xs px-1 grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-0.5">
      {REQUISITOS_CLAVE.map(({ texto, cumple }) => {
        const ok = cumple(clave);
        return (
          <li
            key={texto}
            className={`flex items-center gap-1.5 ${ok ? "text-app-success" : "text-app-muted"}`}
          >
            <CheckCircleIcon
              className={`w-4 h-4 shrink-0 ${ok ? "" : "opacity-30"}`}
            />
            {texto}
          </li>
        );
      })}
    </ul>
  );
}
