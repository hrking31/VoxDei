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
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gradient-to-b from-app-light/50 to-white">
      <div className="flex-1 flex items-center justify-center w-full">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-md p-8 border border-gray-100">
          <h2 className="text-2xl font-bold text-app-main text-center mb-6">
            Recuperar Contraseña
          </h2>

          <form onSubmit={handleReset} className="flex flex-col gap-4">
            <div>
              <label className="text-sm font-medium text-app-main mb-1 block">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu_correo@ejemplo.com"
                className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-app-main w-full text-app-muted no-autofill"
              />
            </div>

            <button
              type="submit"
              className="bg-app-main text-white py-3 rounded-lg font-semibold hover:bg-app-main/90 transition"
            >
              Enviar enlace de recuperación
            </button>
          </form>

          {message && (
            <p className="text-app-muted mt-4 text-center">{message}</p>
          )}
          {error && <p className="text-app-error mt-4 text-center">{error}</p>}

          <button
            onClick={() => navigate("/ViewLogin")}
            className="text-app-main hover:underline mt-6 text-sm w-full text-center"
          >
            Volver al inicio de sesión
          </button>
        </div>
      </div>
      <Footer />
    </div>
  );
}
