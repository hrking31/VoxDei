import { useNavigate } from "react-router-dom";

export default function VistaNoAutorizada() {
  const navigate = useNavigate();

  return (
    <div className="max-w-md mx-auto text-center mt-28 p-4">
      <h1 className="text-4xl font-bold text-app-error mb-6">
        Acceso denegado
      </h1>

      <p className="text-app-main mb-6">
        No tienes permiso para ver esta página.
      </p>

      <button
        onClick={() => navigate("/ViewSelector")}
        className="bg-app-error text-app-muted px-6 py-2 rounded-lg hover:bg-app-accent transition"
      >
        Volver al inicio
      </button>
    </div>
  );
}
