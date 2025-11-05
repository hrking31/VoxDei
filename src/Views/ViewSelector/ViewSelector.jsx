import { useNavigate } from "react-router-dom";
import {
  PlayCircleIcon,
  Squares2X2Icon,
  XMarkIcon,
} from "@heroicons/react/24/solid";
import { useAuth } from "../../Components/Context/AuthContext.jsx";

export default function ViewSelector() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handlerLogout = async () => {
    await logout();
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen p-6 bg-gradient-to-b from-app-light/50 to-white">
      {/* Botón Cerrar */}
      <button
        onClick={handlerLogout}
        className="absolute top-4 right-4 p-2 rounded-full hover:bg-app-main transition"
        aria-label="Cerrar"
      >
        <XMarkIcon className="w-6 h-6 text-app-muted hover:text-app-dark" />
      </button>

      {/* Encabezado */}
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-app-main tracking-tight">
          Bienvenidos a VOXDEI
        </h1>
        <p className="text-app-muted text-base sm:text-lg mt-2">
          ¿Cómo quieres usar este dispositivo?
        </p>
      </div>

      {/* Contenedor de botones */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-3xl">
        {/* Botón Presentación */}
        <button
          onClick={() => navigate("/ViewDisplay")}
          className="flex flex-col items-center justify-center p-8 sm:p-10 bg-white rounded-2xl shadow-md hover:shadow-xl transform hover:-translate-y-1 hover:scale-105 transition-all duration-300 border border-gray-100"
        >
          <PlayCircleIcon className="w-14 h-14 text-app-main mb-3" />
          <span className="text-base sm:text-lg font-semibold text-app-main text-center">
            Presentación
          </span>
          <p className="text-sm text-app-muted mt-1 text-center">
            Muestra el contenido en la pantalla principal
          </p>
        </button>

        {/* Botón Administrador */}
        <button
          onClick={() => navigate("/ViewGestion")}
          className="flex flex-col items-center justify-center p-8 sm:p-10 bg-white rounded-2xl shadow-md hover:shadow-xl transform hover:-translate-y-1 hover:scale-105 transition-all duration-300 border border-gray-100"
        >
          <Squares2X2Icon className="w-14 h-14 text-app-main mb-3" />
          <span className="text-base sm:text-lg font-semibold text-app-main text-center">
            Administrador
          </span>
          <p className="text-sm text-app-muted mt-1 text-center">
            Gestiona tickers, mensajes, predicas, versiculos, usuarios y estilos
          </p>
        </button>
      </div>
    </div>
  );
}
