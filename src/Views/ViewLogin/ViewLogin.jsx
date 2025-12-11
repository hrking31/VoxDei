import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LockClosedIcon } from "@heroicons/react/24/solid";
import { useAuth } from "../../Components/Context/AuthContext.jsx";
import Footer from "../../Components/Footer/Footer.jsx";

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

    // Validación básica antes de enviar
    if (!user.email || !user.password) {
      setError("Por favor ingresa tu correo y contraseña.");
      return;
    }

    setLoading(true);
    try {
      await login(user.email, user.password);
      navigate("/ViewSelector");
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
    <div className="min-h-screen bg-linear-to-b from-gray-900 to-gray-800 flex flex-col ">
      {/* <div className="relative flex flex-col items-center justify-center min-h-screen p-6 bg-gradient-to-b from-app-light/50 to-white"> */}
      <div className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-md space-y-4">
          {/* Encabezado */}
          <div className="text-center mb-6">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-app-main drop-shadow-md">
              Iniciar Sesión
            </h1>
            <p className="text-app-muted text-base sm:text-lg mt-2">
              Accede a tu cuenta para continuar
            </p>
          </div>

          {/* Formulario */}
          <div className="w-full max-w-md bg-gray-900/40 backdrop-blur-sm border border-gray-700 shadow-xl p-3 sm:p-5">
            {/* <div className="w-full max-w-sm bg-white rounded-2xl shadow-md p-8 border border-gray-100"> */}
            <form
              onSubmit={handleSubmit}
              noValidate
              className="flex flex-col form-dark2 gap-4"
            >
              {/* Correo */}
              <div className="flex flex-col mt-3">
                <input
                  type="email"
                  name="email"
                  placeholder="ejemplo@correo.com"
                  value={user.email}
                  onChange={handleChange}
                  className="p-2.5 sm:p-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 focus:outline-none focus:ring-2 focus:ring-app-main"
                />
              </div>

              {/* Contraseña */}
              <div className="flex flex-col">
                <input
                  type="password"
                  name="password"
                  placeholder="********"
                  value={user.password}
                  onChange={handleChange}
                  className="p-2.5 sm:p-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 focus:outline-none focus:ring-2 focus:ring-app-main"
                />
              </div>

              {/* Mensajes */}
              {error && (
                <p className="text-app-error text-center text-sm font-medium mt-2">
                  {error}
                </p>
              )}
              {message && (
                <p className="text-app-success text-center text-sm font-medium mt-2">
                  {message}
                </p>
              )}

              {/* Botón de envío */}
              <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center gap-2 bg-app-main text-white py-2.5 sm:py-3 rounded-lg font-semibold hover:bg-app-main/90 transition mt-4"
              >
                <LockClosedIcon className="w-5 h-5" />
                {loading ? "Iniciando sesión..." : "Iniciar sesión"}
              </button>
            </form>

            {/* Enlace de recuperación */}
            <p className="text-center text-sm text-app-muted mt-6">
              ¿Olvidaste tu contraseña?{" "}
              <button
                onClick={() => navigate("/ResetPassword")}
                className="text-app-main font-semibold hover:underline"
              >
                Recuperar
              </button>
            </p>
          </div>

          {/* Enlace de registro */}
          <div className="w-full max-w-md bg-gray-900/40 backdrop-blur-sm border border-gray-700 shadow-xl p-8 text-center">
            {/* <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center"> */}
            <p className="text-sm text-app-muted">
              ¿Tu iglesia aún no está registrada?{" "}
              <button
                onClick={() => navigate("/ViewRegister")}
                className="text-app-main font-semibold hover:underline"
              >
                Regístrala aquí
              </button>
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
