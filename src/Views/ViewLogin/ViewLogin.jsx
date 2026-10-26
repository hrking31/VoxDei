import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { LockClosedIcon } from "@heroicons/react/24/solid";
import { useAuth } from "../../Components/Context/AuthContext";
import { useAppContext } from "../../Components/Context/AppContext";
import Footer from "../../Components/Footer/Footer.jsx";
import CampoClave from "../../Components/CampoClave/CampoClave.jsx";

export default function ViewLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, user: sesion, loading: cargandoSesion } = useAuth();
  const { showNotif } = useAppContext();
  const [user, setUser] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  // Adónde iba antes de que ProtectedRoutes lo mandara aquí
  const destino = location.state?.from?.pathname || "/ViewSelector";

  // Con sesión ya iniciada no hay nada que hacer aquí. Es lo que recupera la
  // ventana del proyector: si se cerró la sesión en el panel, esa ventana cae
  // en el login; al volver a entrar desde el panel, la sesión llega también a
  // ella y regresa sola a /VOXDEI.
  if (!cargandoSesion && sesion) return <Navigate to={destino} replace />;

  const handleChange = ({ target: { name, value } }) => {
    setUser((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    // Validación básica antes de enviar
    if (!user.email || !user.password) {
      showNotif("error", "Por favor ingresa tu correo y contraseña.");
      return;
    }

    setLoading(true);
    try {
      await login(user.email, user.password);
      navigate(destino, { replace: true });
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
          "Credenciales inválidas. Verifica tu correo y contraseña.",      };

      showNotif(
        "error",
        errorMessages[err.code] || "Error al iniciar sesión. Intenta nuevamente."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-svh flex flex-col bg-linear-to-b from-gray-900 to-gray-800">
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
                <CampoClave
                  name="password"
                  placeholder="********"
                  autoComplete="current-password"
                  value={user.password}
                  onChange={handleChange}
                  className="p-2.5 sm:p-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 focus:outline-none focus:ring-2 focus:ring-app-main"
                />
              </div>

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
