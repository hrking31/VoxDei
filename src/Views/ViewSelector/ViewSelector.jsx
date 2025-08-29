import { useNavigate } from "react-router-dom";

export default function ViewSelector() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center h-screen justify-center gap-4">
      <button
        onClick={() => navigate("/ViewDisplay")}
        className="mt-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold w-48 py-2 px-4 rounded shadow"
      >
        Presentación
      </button>

      <button
        onClick={() => navigate("/ViewTicker")}
        className="mt-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold w-48 py-2 px-4 rounded shadow"
      >
        Gestión Ticker
      </button>

      <button
        onClick={() => navigate("/ViewMessage")}
        className="mt-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold w-48 py-2 px-4 rounded shadow"
      >
        Gestión Mensaje
      </button>

      <button
        onClick={() => navigate("/ViewPanel")}
        className="mt-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold w-48 py-2 px-4 rounded shadow"
      >
        Gestión Imagen
      </button>

      <button
        onClick={() => navigate("/ViewPanel")}
        className="mt-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold w-48 py-2 px-4 rounded shadow"
      >
        Gestión Video
      </button>

      <button
        onClick={() => navigate("/ViewVersiculo")}
        className="mt-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold w-48 py-2 px-4 rounded shadow"
      >
        Gestión Versiculo
      </button>

      <button
        onClick={() => navigate("/ViewVersiculos")}
        className="mt-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold w-48 py-2 px-4 rounded shadow"
      >
        Gestión Versiculos
      </button>
    </div>
  );
}
