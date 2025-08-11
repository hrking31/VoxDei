import { useNavigate } from "react-router-dom";
import ControlMessage from "../../Components/ControlMessage/Controlmessage";

export default function ViewMessage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col pb-16">
      <ControlMessage />

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
