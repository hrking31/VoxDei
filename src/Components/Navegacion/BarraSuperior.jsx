import { useLocation } from "react-router-dom";
import { Bars3Icon, ChevronDownIcon, ClockIcon } from "@heroicons/react/24/solid";
import { useAuth } from "../Context/AuthContext";
import { useTurno } from "../Hooks/useTurno.js";
import { estadoFranja } from "../Cronograma/utilesFranja.js";
import EstadoPantalla from "../Entrada/EstadoPantalla.jsx";
import { seccionDeRuta } from "./Secciones.js";
// Barra de arriba del panel en el celular. Lleva un solo botón: el ícono y el
// nombre de la sección en que se está, con una flechita ▾, y al tocarlo abre
// la barra lateral (la misma del computador). Hace de título y de menú a la
// vez (13 de noviembre de 2026, idea del usuario); la flechita es lo que avisa
// de que se toca. Fuera de una sección conocida queda el ☰ con «Menú».
//
// Va `fixed` y lleva `data-barra-superior`: con eso index.css activa
// --alto-barra, y las pantallas (h-pantalla) y los encabezados pegajosos le
// dejan sitio sin que cada una tenga que preguntar.
export default function BarraSuperior({ menuAbierto, onAbrirMenu }) {
  const { pathname } = useLocation();
  const seccion = seccionDeRuta(pathname);
  const Icono = seccion?.Icono ?? Bars3Icon;
  const { user, userData } = useAuth();
  const { turno } = useTurno();
  const franja = estadoFranja(turno, userData, user?.uid);

  return (
    <header
      data-barra-superior
      className="fixed inset-x-0 top-0 z-30 flex h-barra-superior items-center border-b border-app-border bg-app-light px-2"
    >
      <button
        type="button"
        onClick={onAbrirMenu}
        aria-label="Abrir el menú"
        aria-haspopup="true"
        aria-expanded={menuAbierto}
        className="flex h-9 min-w-0 items-center gap-2 rounded-lg px-2 text-app-main hover:bg-app-dark"
      >
        <Icono className="h-5 w-5 shrink-0" aria-hidden="true" />
        <span data-seccion-actual className="truncate text-sm font-medium">
          {seccion ? seccion.nombre : "Menú"}
        </span>
        <ChevronDownIcon className="h-4 w-4 shrink-0 text-app-muted" aria-hidden="true" />
      </button>

      {/* Estado del servicio y de la pantalla del templo (14-11-2026, pedido
          del usuario): a la derecha, siempre a la vista. */}
      <div className="flex min-w-0 flex-1 items-center gap-2 pl-2">
        {/* Repartidos en el ancho: el culto en el centro, la pantalla a la derecha. */}
        <p
          data-turno-barra={franja.puedo ? "puedo" : "no-puedo"}
          title={franja.completo}
          className={`m-0 flex min-w-0 flex-1 items-center justify-center gap-1 text-xs font-bold ${franja.puedo ? "text-app-success" : "text-app-error"}`}
        >
          <ClockIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{franja.titulo}</span>
        </p>
        <EstadoPantalla sinChip />
      </div>
    </header>
  );
}
