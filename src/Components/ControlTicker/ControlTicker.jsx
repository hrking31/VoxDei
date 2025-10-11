import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ref, set } from "firebase/database";
import { database } from "../Firebase/Firebase";
import EmojiButton from "../EmojiButton/EmojiButton";

export default function ControlTicker() {
  const navigate = useNavigate();
  const [ticker, setTicker] = useState("");
  const [velocidad, setVelocidad] = useState(2);

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
      <h1 className="text-2xl text-left font-bold text-app-main p-2">
        Panel de Control Ticker
      </h1>

      <div className="grid grid-cols-12 mb-2">
        {/*textarea de mensaje*/}
        <div className="col-span-12 flex p-2">
          <textarea
            className="w-full border text-app-muted border-app-border rounded resize-none focus:outline-none focus:ring-2 focus:ring-app-main scrollbar-custom text-sm md:text-base break-words p-1"
            name="ticker"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            placeholder="Escribe tu mensaje aquí..."
          />
        </div>
      </div>

      {/* botones y velocidad */}
      <div className="grid grid-cols-12 md:gris-cols-6 mb-2">
        <div className="flex justify-center col-span-12 md:col-span-6 p-4">
          <div className="flex gap-2 w-full ">
            <button
              type="button"
              onClick={handleTicker}
              className={`w-full px-3.5 py-1.5 flex items-center justify-center text-center rounded text-xs sm:text-sm md:text-base break-words ${
                !ticker
                  ? "bg-transparent border-2 border-app-border font-bold text-app-border cursor-default"
                  : "bg-green-500 text-white cursor-pointer"
              }`}
              disabled={!ticker}
            >
              Proyectar
            </button>

            <button
              onClick={() => setTicker("")}
              className="w-full px-3.5 py-1.5 flex items-center justify-center text-center text-xs sm:text-sm md:text-base break-words font-bold text-app-muted rounded  inset-shadow-sm inset-shadow-app-muted hover:text-app-error hover:inset-shadow-app-error cursor-pointer"
            >
              Limpiar
            </button>

            <button
              type="button"
              onClick={() => navigate("/")}
              className="w-full px-3.5 py-1.5 flex items-center justify-center text-center text-xs sm:text-sm md:text-base break-words font-bold text-app-muted rounded inset-shadow-sm inset-shadow-app-muted hover:text-app-error hover:inset-shadow-app-error cursor-pointer"
            >
              Salida
            </button>
          </div>
        </div>

        {/* velocidad de lectura y emojis*/}
        <div className="col-span-2 md:col-span-1 col-start-1 row-end-1 md:col-start-auto md:row-end-auto flex items-center justify-center p-3">
          <EmojiButton
            onSelect={(emoji) => setTicker((prev) => prev + emoji)}
          />
        </div>

        <div className="flex justify-center col-span-10 md:col-span-5 col-start-3 row-end-1 md:col-start-auto md:row-end-auto p4">
          <div className="flex items-center space-x-0.5 sm:space-x-2">
            <label className="text-app-muted text-xs sm:text-sm md:text-base break-words">
              Velocidad lectura
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={velocidad}
              onChange={(e) => configSpeed(Number(e.target.value))}
              className="w-50 sm:w-60 md:w-40 accent-app-main"
            />
            <span className="text-app-muted text-xs sm:text-sm md:text-base break-words">
              {velocidad}s
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
