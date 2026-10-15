import { useNavigate } from "react-router-dom";
import {
  ArrowPathIcon,
  ExclamationTriangleIcon,
  WifiIcon,
} from "@heroicons/react/24/solid";
import { useAuth } from "../Context/AuthContext";

// Pantalla para quien tiene sesión pero no tiene ficha cargada.
//
// Antes ese caso no tenía salida: ViewSelector mostraba "Preparando..." para
// siempre y las rutas con rol mandaban a /VistaNoAutorizada. Hay dos causas:
//   - errorPerfil: la ficha existe pero no se pudo leer (sin internet).
//   - sin errorPerfil: la ficha no existe; un registro que se cortó entre
//     crear la cuenta y guardar la ficha. ViewRegister sabe terminarlo.
export default function PerfilNoDisponible() {
  const navigate = useNavigate();
  const { errorPerfil, recargarPerfil, logout } = useAuth();

  // El orden importa: primero salir de la ruta protegida y después cerrar la
  // sesión. Al revés, ProtectedRoutes ve la sesión cerrada antes que la
  // navegación y manda a /ViewLogin.
  const terminarRegistro = async () => {
    navigate("/ViewRegister");
    await logout();
  };

  // Aquí no hace falta navegar: con la sesión cerrada, ProtectedRoutes ya
  // lleva al login.
  const cerrarSesion = () => logout();

  const Icono = errorPerfil ? WifiIcon : ExclamationTriangleIcon;

  return (
    <div className="min-h-svh flex items-center justify-center px-4 bg-linear-to-b from-gray-900 to-gray-800">
      <div className="w-full max-w-md bg-gray-900/40 border border-gray-700 shadow-xl p-6 text-center space-y-4">
        <Icono className="w-12 h-12 text-app-main mx-auto" />

        <h1 className="text-2xl font-bold text-app-main">
          {errorPerfil
            ? "No pudimos cargar tu cuenta"
            : "Tu registro quedó incompleto"}
        </h1>

        <p className="text-app-muted">
          {errorPerfil
            ? "Revisa tu conexión a internet e inténtalo de nuevo."
            : "La cuenta existe, pero no se terminó de guardar la ficha de tu iglesia. Vuelve a registrarla con el mismo correo y la misma contraseña y se completará."}
        </p>

        <div className="flex flex-col gap-2">
          {errorPerfil ? (
            <button
              onClick={recargarPerfil}
              className="flex items-center justify-center gap-2 bg-app-main text-black py-2.5 rounded-lg font-semibold hover:bg-app-main/90 transition"
            >
              <ArrowPathIcon className="w-5 h-5" />
              Reintentar
            </button>
          ) : (
            <button
              onClick={terminarRegistro}
              className="bg-app-main text-black py-2.5 rounded-lg font-semibold hover:bg-app-main/90 transition"
            >
              Terminar registro
            </button>
          )}

          <button
            onClick={cerrarSesion}
            className="py-2.5 rounded-lg font-semibold text-app-muted border border-gray-700 hover:bg-gray-800 transition"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
