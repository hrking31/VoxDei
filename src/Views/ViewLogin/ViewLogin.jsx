import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LockClosedIcon } from "@heroicons/react/24/solid";
import { useAuth } from "../../Components/Context/AuthContext.jsx";

export default function ViewLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [user, setUser] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const handleChange = ({ target: { name, value } }) =>
    setUser((prev) => ({ ...prev, [name]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    try {
      await login(user.email, user.password);

      navigate("/ViewSelector");
    } catch (error) {
      if (error.code === "auth/wrong-password") {
        setError("Contraseña incorrecta");
      } else if (error.code === "auth/user-not-found") {
        setError("Usuario no registrado");
      } else {
        setError("Error al iniciar sesión");
      }
    }
  };

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
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col">
            <label className="text-sm font-medium text-app-main mb-1">
              Correo electrónico
            </label>
            <input
              type="email"
              name="email"
              placeholder="ejemplo@correo.com"
              value={user.email}
              onChange={handleChange}
              required
              className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-app-main transition"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium text-app-main mb-1">
              Contraseña
            </label>
            <input
              type="password"
              name="password"
              placeholder="********"
              value={user.password}
              onChange={handleChange}
              required
              className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-app-main transition"
            />
          </div>

          <button
            type="submit"
            className="flex items-center justify-center gap-2 bg-app-main text-white py-3 rounded-lg font-semibold hover:bg-app-main/90 transition mt-4"
          >
            <LockClosedIcon className="w-5 h-5" />
            Iniciar sesión
          </button>
        </form>

        {/* <p className="text-center text-sm text-app-muted mt-4">
          ¿Olvidaste tu contraseña?
          <button
            onClick={() => navigate("/reset")}
            className="text-app-main hover:underline ml-1"
          >
            Recuperar
          </button>
        </p> */}
      </div>
    </div>
  );
}
