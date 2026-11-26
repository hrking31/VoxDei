import { useNavigate, useParams } from "react-router-dom";
import { CalendarDaysIcon } from "@heroicons/react/24/solid";
import FormularioServicio from "../../Components/Cronograma/FormularioServicio.jsx";

// Alta y corrección de un servicio del cronograma en su propia página (celular y
// enlaces ya existentes); en el computador el Cronograma lleva el mismo formulario
// en su columna derecha (FormularioServicio). Solo pastor y pastora llegan aquí
// (ruta con ROLES_PASTORES) y firestore.rules lo vuelve a exigir.
//
// Sin id es un servicio nuevo; con id se corrige uno existente.
export default function ViewServicioEditar() {
  const navigate = useNavigate();
  const { id } = useParams();
  const volver = () => navigate("/ViewCronograma");

  return (
    <div className="h-pantalla flex flex-col overflow-hidden bg-linear-to-b from-app-dark/50 to-app-light/50">
      {/* ENCABEZADO */}
      <div className="shrink-0 border-b border-app-main bg-app-light px-2">
        <div className="flex items-center justify-between gap-2 py-1">
          <h1 className="font-bold text-app-main flex items-center gap-1 truncate">
            <CalendarDaysIcon className="w-5 h-5 shrink-0" />
            <span className="truncate">
              {id ? "Editar servicio" : "Nuevo servicio"}
            </span>
          </h1>
          <button
            onClick={volver}
            className="px-3 py-1.5 boton-salida shrink-0"
          >
            Volver
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-custom p-2 sm:p-4">
        <FormularioServicio
          id={id}
          alTerminar={volver}
          alNoExistir={() => navigate("/ViewCronograma", { replace: true })}
        />
      </div>
    </div>
  );
}
