import { useNavigate } from "react-router-dom";
import { LockClosedIcon } from "@heroicons/react/24/solid";

export default function ViewLogin() {
  const navigate = useNavigate();

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen p-6 bg-gradient-to-b from-app-light/50 to-white">
      {/* Encabezado */}
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-app-main tracking-tight">
          Iniciar Sesión
        </h1>
        <p className="text-app-muted text-base sm:text-lg mt-2">
          Accede a tu cuenta para continuar
        </p>
      </div>

      {/* Formulario de Login */}
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-md p-8 border border-gray-100">
        <form className="flex flex-col gap-4">
          <div className="flex flex-col">
            <label className="text-sm font-medium text-app-main mb-1">
              Correo electrónico
            </label>
            <input
              type="email"
              placeholder="ejemplo@correo.com"
              className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-app-main transition"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium text-app-main mb-1">
              Contraseña
            </label>
            <input
              type="password"
              placeholder="********"
              className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-app-main transition"
            />
          </div>

          <button
            type="submit"
            onClick={(e) => {
              e.preventDefault();
              navigate("/ViewSelector");
            }}
            className="flex items-center justify-center gap-2 bg-app-main text-white py-3 rounded-lg font-semibold hover:bg-app-main/90 transition mt-4"
          >
            <LockClosedIcon className="w-5 h-5" />
            Iniciar sesión
          </button>
        </form>

        <p className="text-center text-sm text-app-muted mt-4">
          ¿Olvidaste tu contraseña?
          <button
            onClick={() => navigate("/reset")}
            className="text-app-main hover:underline ml-1"
          >
            Recuperar
          </button>
        </p>
      </div>
    </div>
  );
}
