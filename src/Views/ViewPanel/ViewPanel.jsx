import ControlPanel from "../../Components/ControlPanel/ControlPanel";
import { useNavigate } from "react-router-dom";

export default function ViewPanel() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col pb-16">
      <ControlPanel />

      <button
        onClick={() => navigate("/")}
        className="mt-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded shadow "
      >
        Volver
      </button>
    </div>
  );
}
