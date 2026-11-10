import { ArrowLeftStartOnRectangleIcon } from "@heroicons/react/24/solid";
import { BuildingLibraryIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../Context/AuthContext";
import { useAppContext } from "../Context/AppContext";
import { datosDeIglesia } from "../Iglesia/datosIglesia.js";
import { iniciales } from "./utilesEntrada.js";

// Encabezado de usuario de la pantalla de entrada: foto con anillo dorado,
// nombre, rol e iglesia; a la derecha, cerrar sesión (con confirmación).
// Nombre e iglesia van en una línea y se cortan con «…» si no caben; el texto
// completo sale al pasar el mouse. En el celular, si la iglesia tiene sigla,
// se muestra la sigla.
export default function EncabezadoUsuario() {
  const { userData, logout } = useAuth();
  const { iglesia, confirmAction, isDesktop } = useAppContext();
  const datos = datosDeIglesia(iglesia, userData);
  const nombreIglesia = !isDesktop && datos.sigla ? datos.sigla : datos.nombre;
  const nombre = userData.name || "Usuario";

  const cerrarSesion = async () => {
    if (await confirmAction("¿Cerrar sesión?")) await logout();
  };

  return (
    <header className="flex items-center justify-between gap-3 border-b border-app-border bg-app-light/80 px-3 py-2.5 sm:px-4">
      <div className="flex min-w-0 items-center gap-3">
        {userData.photo ? (
          <img
            src={userData.photo}
            alt=""
            className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-app-main ring-offset-2 ring-offset-app-dark"
          />
        ) : (
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-app-border text-sm font-bold text-app-texto ring-2 ring-app-main ring-offset-2 ring-offset-app-dark">
            {iniciales(nombre)}
          </span>
        )}
        <div className="flex min-w-0 flex-col gap-1 leading-tight">
          <span title={nombre} className="truncate text-sm font-semibold text-app-texto">
            {nombre}
          </span>
          <span className="flex min-w-0 items-center gap-2 text-xs text-app-muted">
            {userData.role && (
              <span className="shrink-0 rounded-full border border-app-main/40 bg-app-main/10 px-2 font-bold uppercase tracking-wider text-app-main">
                {userData.role}
              </span>
            )}
            {nombreIglesia && (
              <span title={datos.nombre} className="flex min-w-0 items-center gap-1">
                {datos.logo ? (
                  <img src={datos.logo} alt="" className="h-4 w-4 shrink-0 rounded object-cover" />
                ) : (
                  <BuildingLibraryIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                )}
                <span className="truncate">{nombreIglesia}</span>
              </span>
            )}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={cerrarSesion}
        aria-label="Cerrar sesión"
        title="Cerrar sesión"
        className="flex shrink-0 items-center gap-1.5 rounded-full border border-app-border px-3 py-1.5 text-xs text-app-muted transition hover:border-app-error/60 hover:bg-app-error/10 hover:text-app-error"
      >
        <ArrowLeftStartOnRectangleIcon className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">Cerrar sesión</span>
      </button>
    </header>
  );
}
