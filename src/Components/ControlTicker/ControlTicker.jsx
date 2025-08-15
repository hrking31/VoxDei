import { useState } from "react";
import { ref, set } from "firebase/database";
import { database } from "../Firebase/Firebase";

export default function ControlTicker() {
  const [ticker, setTicker] = useState("");
  const [velocidad, setVelocidad] = useState(10);

  const handleTicker = () => {
    set(ref(database, "displayTicker"), {
      text: ticker,
      timestamp: Date.now(),
    });
  };

  const configSpeed = (nuevoValor) => {
    setVelocidad(nuevoValor);
    set(ref(database, "speedTicker"), {
      velocidad: nuevoValor,
    });
  };

  return (
    <div>
      <h1 className="text-2xl text-left font-bold p-2">
        Panel de Control Ticker
      </h1>

      <div className="p-5 max-w-3xl mx-auto">
        <input
          className="w-full h-24 border border-gray-300 rounded p-2 mb-4 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          name="ticker"
          value={ticker}
          onChange={(e) => setTicker(e.target.value)}
        />

        <div className="flex flex-col ">
          <button
            onClick={handleTicker}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded shadow"
          >
            Proyectar
          </button>

          <div className="flex items-center space-x-2">
            <label className="text-black">Velocidad lectura</label>
            <input
              type="range"
              min="10"
              max="50"
              value={velocidad}
              onChange={(e) => configSpeed(Number(e.target.value))}
              className="w-48 accent-blue-500"
            />
            <span className="text-black">{velocidad}s</span>
          </div>
        </div>
      </div>
    </div>
  );
}
