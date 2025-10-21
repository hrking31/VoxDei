import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { database, db } from "../Firebase/Firebase";
import { ref, set } from "firebase/database";
import { doc, setDoc } from "firebase/firestore";
import EmojiButton from "../EmojiButton/EmojiButton";
import { useAppContext } from "../Context/AppContext";

export default function ControlTicker() {
  const navigate = useNavigate();
  const [ticker, setTicker] = useState("");
  const {tickerItems, setTickerItems } = useAppContext();
  const [itemSeleccionado, setItemSeleccionado] = useState(null);
  const [velocidad, setVelocidad] = useState(2);
  const { showNotif } = useAppContext();

  // proyecta un ticker de la bd o del imput
  const handleTicker = (item) => {
    const textToSend = item?.text || ticker;

    if (!textToSend.trim()) return;

    set(ref(database, "displayTicker"), {
      text: textToSend,
      timestamp: item?.timestamp || Date.now(),
    });
  };

  const configSpeed = (nuevoValor) => {
    setVelocidad(nuevoValor);
    set(ref(database, "speedTicker"), {
      velocidad: nuevoValor,
    });
  };

  // agrega un ticker a la bd
  const agregarElemento = async () => {
    try {
      // Validar campo
      if (ticker.trim() === "") return;

      const nuevoTicker = {
        text: ticker,
        timestamp: Date.now(),
      };

      if (tickerItems.length < 6) {
        // Si hay menos de 6, agregar normalmente
        const num = tickerItems.length + 1;
        const tickerFinal = { ...nuevoTicker, num };

        // Guardar en Firestore
        await setDoc(doc(db, "tickers", `ticker${num}`), tickerFinal);

        // Actualizar estado local
        setTickerItems((prev) => [...prev, tickerFinal]);

        showNotif("success", `✅ Ticker ${num} agregado correctamente`);
      } else {
        // Si ya hay 6, sobrescribir el más antiguo
        const ordenados = [...tickerItems].sort(
          (a, b) => a.timestamp - b.timestamp
        );
        const masAntiguo = ordenados[0]; // el primero

        const tickerFinal = {
          ...nuevoTicker,
          num: masAntiguo.num, // reusar su número
        };

        // Sobrescribir en Firestore
        await setDoc(
          doc(db, "tickers", `ticker${masAntiguo.num}`),
          tickerFinal
        );

        setTickerItems((prev) => {
          const actualizados = prev.map((item) =>
            item.num === masAntiguo.num ? tickerFinal : item
          );
          return actualizados.sort((a, b) => a.num - b.num);
        });
        showNotif(
          "info",
          `🔄 Se reemplazó el ticker ${masAntiguo.num} por uno nuevo`
        );
      }

      setTicker("");
    } catch (error) {
      console.error("Error al agregar el ticker:", error);
      showNotif("error", "❌ Error al guardar el ticker");
    }
  };

  return (
    <div>
      <h1 className="text-2xl text-left font-bold text-app-main p-2">
        Panel de Control Ticker
      </h1>

      <div className="grid grid-cols-12">
        {/*textarea de mensaje*/}
        <div className="col-span-10 flex p-1 md:p-2">
          <textarea
            className="w-full border text-app-muted border-app-border rounded resize-none focus:outline-none focus:ring-2 focus:ring-app-main scrollbar-custom text-sm md:text-base break-words p-1"
            name="ticker"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            placeholder="Escribe tu mensaje aquí..."
          />
        </div>

        {/* boton guardar */}
        <div className="col-span-2 flex justify-center p-1 md:p-2">
          <button
            type="button"
            onClick={() => {
              agregarElemento(ticker), setTicker("");
            }}
            className={`w-full px-3.5 py-1.5 flex items-center justify-center text-center rounded text-xs sm:text-sm md:text-xs lg:text-base break-words
               ${
                 !ticker
                   ? "bg-transparent border-2 border-app-border font-bold text-app-border cursor-default"
                   : "bg-green-500 text-white cursor-pointer"
               }`}
            disabled={!ticker}
          >
            Guardar
          </button>
        </div>
      </div>

      {/* botones y velocidad */}
      <div className="grid grid-cols-12 md:gris-cols-6 mb-2">
        <div className="flex justify-center col-span-12 md:col-span-6 p-4">
          <div className="flex gap-2 w-full px-2 md:px-6">
            <button
              type="button"
              onClick={() => {
                handleTicker(ticker), setTicker("");
              }}
              className={`w-full px-3.5 py-1.5 flex items-center justify-center text-center rounded text-xs sm:text-sm md:text-base break-words ${
                !ticker
                  ? "bg-transparent border-2 border-app-border font-bold text-app-border cursor-default"
                  : "bg-green-500 text-white cursor-pointer"
              }`}
              disabled={!ticker}
            >
              Proyectar
            </button>

            {/* boton cancelar */}
            <button
              onClick={() => setTicker("")}
              className="w-full px-3.5 py-1.5 flex items-center justify-center text-center text-xs sm:text-sm md:text-base break-words font-bold text-app-muted rounded  inset-shadow-sm inset-shadow-app-muted hover:text-app-error hover:inset-shadow-app-error cursor-pointer"
            >
              Cancelar
            </button>

            {/* boton salir */}
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 p-4">
        {tickerItems.map((item) => (
          <div
            key={item.num}
            onClick={() => {
              handleTicker(item);
              setItemSeleccionado(item.timestamp);
            }}
            className={`relative p-3 border-app-border rounded-lg cursor-pointer transition-colors ${
              itemSeleccionado === item.timestamp
                ? "bg-yellow-100 shadow-md"
                : "hover:bg-app-border active:bg-app-light"
            }`}
          >
            <div className="p-5">
              <h2 className="text-xl font-bold text-app-main mb-2">
                Ticker {item.num}
              </h2>
              <p className="font-semibold text-app-muted text-sm leading-relaxed">
                {item.text}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
