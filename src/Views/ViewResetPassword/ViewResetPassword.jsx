import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../../Components/Firebase/Firebase";
import { useNavigate } from "react-router-dom";

export default function ResetPassword() {
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
      setMessage("✅ Se ha enviado un enlace de recuperación a tu correo.");
      setTimeout(() => navigate("/ViewLogin"), 3000); // vuelve al login
    } catch (err) {
      if (err.code === "auth/user-not-found") {
        setError("No existe un usuario con este correo.");
      } else if (err.code === "auth/invalid-email") {
        setError("Correo inválido.");
      } else {
        setError("Error al enviar el correo de recuperación.");
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gradient-to-b from-app-light/50 to-white">
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
              required
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
          <p className="text-green-600 mt-4 text-center">{message}</p>
        )}
        {error && <p className="text-red-600 mt-4 text-center">{error}</p>}

        <button
          onClick={() => navigate("/ViewLogin")}
          className="text-app-main hover:underline mt-6 text-sm w-full text-center"
        >
          Volver al inicio de sesión
        </button>
      </div>
    </div>
  );
}
