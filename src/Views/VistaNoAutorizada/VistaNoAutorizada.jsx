import { useNavigate, useLocation } from "react-router-dom";
import { Simbolo } from "../../Components/Logo/Logo.jsx";

export default function VistaNoAutorizada() {
  const navigate = useNavigate();
  const location = useLocation(); // Contiene la ruta de donde vino

  const handleVolver = () => {
    // Si viene de la pantalla de proyección, redirige a ViewSelector; si no,
    // al panel de gestión. La ruta del proyector es /VOXDEI.
    if (location.state?.from?.pathname === "/VOXDEI") {
      navigate("/ViewSelector");
    } else {
      navigate("/ViewInicio");
    }
  };

  return (
    <div className="max-w-md mx-auto text-center mt-28 p-4">
      <Simbolo alt="" className="mx-auto mb-6 h-16 w-16 grayscale brightness-75 opacity-60" />
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
