import { ArrowLeftStartOnRectangleIcon } from "@heroicons/react/24/solid";
import { useAuth } from "../Context/AuthContext";
import { useAppContext } from "../Context/AppContext";
import { datosDeIglesia } from "../Iglesia/datosIglesia.js";
import { iniciales } from "./utilesEntrada.js";

// Encabezado de usuario de la pantalla de entrada (25 de noviembre de 2026, pedido
// del usuario, estilo de la «opción 3» del lienzo): una fila sin barra ni borde sobre
// el fondo, con la foto pequeña (anillo dorado) y una sola línea «Nombre · Rol · Iglesia»;
// a la derecha, cerrar sesión (con confirmación). El nombre se corta con «…» si no
// cabe; el texto completo sale al pasar el mouse. En el celular, si la iglesia
// tiene sigla, se muestra la sigla.
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
    <header className="flex items-center justify-between gap-3 px-4 py-3 sm:px-8 sm:py-3">
      <div className="flex min-w-0 items-center gap-3">
        {userData.photo ? (
          <img
            src={userData.photo}
            alt=""
            className="h-8 w-8 shrink-0 rounded-full object-cover ring-2 ring-app-main sm:h-12 sm:w-12"
          />
        ) : (
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-app-main text-xs font-bold text-app-main sm:h-12 sm:w-12 sm:text-base">
            {iniciales(nombre)}
          </span>
        )}
        <p className="flex min-w-0 items-center gap-2 text-sm text-app-muted sm:text-base">
          <span title={nombre} className="truncate font-semibold text-app-texto">
            {nombre}
          </span>
          {userData.role && (
            <>
              <span aria-hidden="true">·</span>
              <span className="shrink-0">{userData.role}</span>
            </>
          )}
          {nombreIglesia && (
            <>
              <span aria-hidden="true">·</span>
              <span title={datos.nombre} className="truncate">
                {nombreIglesia}
              </span>
            </>
          )}
        </p>
      </div>

      <button
        type="button"
        onClick={cerrarSesion}
        aria-label="Cerrar sesión"
        title="Cerrar sesión"
        className="flex min-h-11 shrink-0 items-center gap-1.5 px-2 text-sm text-app-muted transition hover:text-app-error"
      >
        <ArrowLeftStartOnRectangleIcon className="h-4 w-4 sm:hidden" aria-hidden="true" />
        <span className="hidden sm:inline">Cerrar sesión</span>
      </button>
    </header>
  );
}
