import { useNavigate } from "react-router-dom";
import ControlTicker from "../../Components/ControlTicker/ControlTicker";

export default function ViewTicker() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col pb-16">
      <ControlTicker />

      <div className="  flex justify-center">
        <button
          onClick={() => navigate("/")}
          className="mt-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold w-48 py-2 px-4 rounded shadow "
        >
          Volver
        </button>
      </div>
    </div>
  );
}
