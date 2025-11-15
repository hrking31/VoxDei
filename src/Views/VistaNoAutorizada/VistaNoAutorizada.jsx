import { useNavigate, useLocation } from "react-router-dom";

export default function VistaNoAutorizada() {
  const navigate = useNavigate();
  const location = useLocation(); // Contiene la ruta de donde vino

  const handleVolver = () => {
    // Si viene de ViewDisplay, redirige a ViewSelector, si no a ViewGestion
    if (location.state?.from?.pathname === "/ViewDisplay") {
      navigate("/ViewSelector");
    } else {
      navigate("/ViewGestion");
    }
  };

  return (
    <div className="max-w-md mx-auto text-center mt-28 p-4">
      <h1 className="text-4xl font-bold text-app-error mb-6">
        Acceso denegado
      </h1>

      <p className="text-app-main mb-6">
        No tienes permiso para ver esta página.
      </p>

      <button
        onClick={handleVolver}
        className="bg-app-error text-app-dark font-bold px-6 py-2 rounded-lg hover:bg-app-accent transition"
      >
        Volver al inicio
      </button>
    </div>
  );
}
