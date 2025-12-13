import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../../Components/Firebase/Firebase";
import { useNavigate } from "react-router-dom";
import Footer from "../../Components/Footer/Footer.jsx";

export default function ViewResetPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleReset = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    try {
      await sendPasswordResetEmail(auth, email);
      setMessage(
        "✅ Si existe una cuenta asociada a este correo, recibirás un enlace de recuperación."
      );
      setTimeout(() => navigate("/ViewLogin"), 3000); // vuelve al login
    } catch (err) {
      console.log("🔥 Error Firebase:", err.code, err.message);
      const errorMessages = {
        "auth/missing-email": "Debes ingresar un correo electrónico.",
        "auth/invalid-email": "El formato del correo es inválido.",
        "auth/too-many-requests": "Demasiados intentos. Intenta más tarde.",
        "auth/network-request-failed": "Error de conexión. Revisa tu red.",
      };
      setError(
        errorMessages[err.code] || "Error al enviar el correo de recuperación."
      );
    }
  };

  return (
    <div className="min-h-dvh flex flex-col bg-linear-to-b from-gray-900 to-gray-800">
      <div className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-md space-y-4">
          {/* Encabezado */}
          <div className="text-center mb-6">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-app-main tracking-tight">
              Recuperar Contraseña
            </h1>
            <p className="text-app-muted text-base sm:text-lg mt-2">
              Ingresa tu correo para continuar
            </p>
          </div>

          <div className="w-full max-w-md bg-gray-900/40 backdrop-blur-sm border border-gray-700 shadow-xl p-6">
            <form
              onSubmit={handleReset}
              className="flex flex-col form-dark2 gap-4"
            >
              <div className="flex flex-col mt-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu_correo@ejemplo.com"
                  className="p-2.5 sm:p-3  bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-app-main w-full text-gray-300 no-autofill"
                />
              </div>

              <button
                type="submit"
                className="flex items-center justify-center gap-2 bg-app-main text-white py-2.5 sm:py-3 rounded-lg font-semibold hover:bg-app-main/90 transition mt-4"
              >
                Enviar enlace de recuperación
              </button>
            </form>

            {message && (
              <p className="text-app-muted mt-4 text-center">{message}</p>
            )}
            {error && (
              <p className="text-app-error mt-4 text-center">{error}</p>
            )}

            <button
              onClick={() => navigate("/ViewLogin")}
              className="text-app-main hover:underline mt-6 text-sm w-full text-center"
            >
              Volver al inicio de sesión
            </button>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
