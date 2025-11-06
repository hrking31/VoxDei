import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LockClosedIcon } from "@heroicons/react/24/solid";
import { useAuth } from "../../Components/Context/AuthContext.jsx";

export default function ViewLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [user, setUser] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = ({ target: { name, value } }) => {
    setUser((prev) => ({ ...prev, [name]: value }));
    setError("");
    setMessage("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    // 🔹 Validación básica antes de enviar
    if (!user.email || !user.password) {
      setError("Por favor ingresa tu correo y contraseña.");
      return;
    }

    setLoading(true);
    try {
      await login(user.email, user.password);
      setMessage("✅ Inicio de sesión exitoso. Redirigiendo...");
      setTimeout(() => navigate("/ViewSelector"), 2000);
    } catch (err) {
      console.error("Error de inicio de sesión:", err.code);

      const errorMessages = {
        "auth/invalid-email": "El formato del correo no es válido.",
        "auth/user-not-found": "No se encontró una cuenta con este correo.",
        "auth/wrong-password": "Contraseña incorrecta.",
        "auth/too-many-requests":
          "Demasiados intentos fallidos. Intenta de nuevo más tarde.",
        "auth/network-request-failed": "Error de red. Revisa tu conexión.",
        "auth/invalid-credential":
          "Credenciales inválidas. Verifica tu correo y contraseña.",
      };

      setError(
        errorMessages[err.code] ||
          "Error al iniciar sesión. Intenta nuevamente."
      );
    } finally {
      setLoading(false);
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

      {/* Formulario */}
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-md p-8 border border-gray-100">
        <form
          onSubmit={handleSubmit}
          noValidate
          className="flex flex-col gap-4"
        >
          {/* Correo */}
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
              className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-app-main transition text-app-muted"
            />
          </div>

          {/* Contraseña */}
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
              className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-app-main transition text-app-muted"
            />
          </div>

          {/* Mensajes */}
          {error && (
            <p className="text-red-500 text-center text-sm font-medium mt-2">
              {error}
            </p>
          )}
          {message && (
            <p className="text-green-600 text-center text-sm font-medium mt-2">
              {message}
            </p>
          )}

          {/* Botón de envío */}
          <button
            type="submit"
            disabled={loading}
            className={`flex items-center justify-center gap-2 bg-app-main text-white py-3 rounded-lg font-semibold hover:bg-app-main/90 transition mt-4 ${
              loading ? "opacity-70 cursor-not-allowed" : ""
            }`}
          >
            <LockClosedIcon className="w-5 h-5" />
            {loading ? "Iniciando sesión..." : "Iniciar sesión"}
          </button>
        </form>

        {/* Enlace de recuperación */}
        <p className="text-center text-sm text-app-muted mt-4">
          ¿Olvidaste tu contraseña?
          <button
            onClick={() => navigate("/ResetPassword")}
            className="text-app-main hover:underline ml-1"
          >
            Recuperar
          </button>
        </p>
      </div>
    </div>
  );
}