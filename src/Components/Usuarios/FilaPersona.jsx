import { ChevronRightIcon } from "@heroicons/react/24/solid";
import { normalizarRol } from "../Roles/Roles.js";
import { esDueno, etiquetaDePersona, iniciales } from "./utilesUsuarios.js";

// Insignia por rol, con los colores del tema: pastores en violeta, operador en plata.
const TONO_ROL = {
  Pastor: "bg-app-violeta/15 text-app-violeta",
  Pastora: "bg-app-violeta/15 text-app-violeta",
};
const TONO_ESTANDAR = "bg-app-plata/15 text-app-plata";

// Una persona del equipo. Toda la fila es un botón que abre su ficha.
export default function FilaPersona({ usuario, miUid, alAbrir }) {
  const dueno = esDueno(usuario);
  const soyYo = usuario.id === miUid;
  const tono = TONO_ROL[normalizarRol(usuario.role)] || TONO_ESTANDAR;

  return (
    <li>
      <button
        type="button"
        onClick={() => alAbrir(usuario)}
        aria-label={`Ver la ficha de ${etiquetaDePersona(usuario, miUid)}`}
        data-persona={usuario.id}
        className="group flex w-full items-center gap-3 rounded-xl border border-app-border bg-app-light px-3 py-2.5 text-left transition hover:border-app-main/60 hover:bg-app-light/70 focus-visible:outline-2 focus-visible:outline-app-main"
      >
        <span className="relative shrink-0">
          {usuario.photo ? (
            <img
              src={usuario.photo}
              alt=""
              className={`h-11 w-11 rounded-full object-cover ring-2 ${dueno ? "ring-app-main" : "ring-app-border"}`}
            />
          ) : (
            <span
              aria-hidden="true"
              className={`grid h-11 w-11 place-items-center rounded-full bg-app-dark text-sm font-bold text-app-main ring-2 ${dueno ? "ring-app-main" : "ring-app-border"}`}
            >
              {iniciales(usuario.name)}
            </span>
          )}
          {/* El dueño se marca con una corona en la esquina de la foto. */}
          {dueno && (
            <span
              data-dueno
              aria-hidden="true"
              title="Dueño de la iglesia"
              className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-app-main text-app-dark ring-2 ring-app-light"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3">
                <path d="M3 18h18v2H3v-2zm0-2L1.5 6.5l5 3.5L12 4l5.5 6 5-3.5L21 16H3z" />
              </svg>
            </span>
          )}
        </span>

        <span className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold text-app-texto">{usuario.name}</span>
            {soyYo && (
              <span data-tu className="shrink-0 rounded-full bg-app-success/15 px-1.5 py-0.5 text-pie font-bold text-app-success">
                Tú
              </span>
            )}
          </span>
          <span className="truncate text-xs text-app-muted">{usuario.email}</span>
        </span>

        <span className={`shrink-0 rounded-full px-2 py-0.5 text-chip font-semibold ${tono}`}>{usuario.role}</span>

        <ChevronRightIcon aria-hidden="true" className="h-4 w-4 shrink-0 text-app-muted transition group-hover:text-app-main" />
      </button>
    </li>
  );
}
