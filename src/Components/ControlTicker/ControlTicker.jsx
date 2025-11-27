import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { database, db } from "../Firebase/Firebase";
import { ref, set } from "firebase/database";
import { doc, setDoc } from "firebase/firestore";
import EmojiButton from "../EmojiButton/EmojiButton";
import { useAppContext } from "../Context/AppContext";
import { useAuth } from "../../Components/Context/AuthContext.jsx";

export default function ControlTicker() {
  const navigate = useNavigate();
   const { userData } = useAuth();
  const [ticker, setTicker] = useState("");
  const [itemSeleccionado, setItemSeleccionado] = useState(null);
  const {
    tickerItems,
    setTickerItems,
    velocidadTicker,
    setVelocidadTicker,
    showNotif,
  } = useAppContext();

  // proyecta un ticker de la bd o del imput
  const handleTicker = (item) => {
    const textToSend = item?.text || ticker;

    if (!textToSend.trim()) return;

    set(ref(database, `displayTicker/${userData.groupId}`), {
      text: textToSend,
      timestamp: item?.timestamp || Date.now(),
    });
  };

  // configura la velocidad del ticker
  const configSpeed = (nuevoValor) => {
    setVelocidadTicker(nuevoValor);
    set(ref(database, `speedTicker/${userData.groupId}`), {
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
        <div className="col-span-9 flex flex-col p-2 md:p-2">
          <textarea
            className="w-full border text-app-muted border-app-border rounded resize-none focus:outline-none focus:ring-2 focus:ring-app-main scrollbar-custom text-sm md:text-base break-words h-[6rem] sm:h-[4rem] p-1"
            name="ticker"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            placeholder="Escribe tu mensaje aquí..."
          />
        </div>

        {/* boton guardar */}
        <div className="col-span-3 flex flex-col sm:flex-row items-center justify-center gap-2 p-2">
          <div className=" flex items-center justify-center">
            <EmojiButton
              onSelect={(emoji) => setTicker((prev) => prev + emoji)}
            />
          </div>

          <button
            type="button"
            onClick={() => {
              agregarElemento(ticker), setTicker("");
            }}
            className={`w-full h-10 flex items-center justify-center text-center rounded text-xs sm:text-sm md:text-xs lg:text-base break-words
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
      <div className="grid grid-cols-12 md:gris-cols-6">
        {/* velocidad de lectura */}
        <div className="flex flex-col lg:flex-row justify-center items-center col-span-12 md:col-span-6">
          <div className="w-full flex items-center space-x-0.5 sm:space-x-2 p-2 gap-1">
            <label className="flex justify-center items-center text-app-muted text-xs sm:text-sm md:text-base break-words">
              Velocidad de Lectura
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={velocidadTicker}
              onChange={(e) => {
                const nuevaVelocidad = Number(e.target.value);
                setVelocidadTicker(nuevaVelocidad);
                configSpeed(nuevaVelocidad);
              }}
              className="w-full accent-app-main"
            />
            <span className="w-10 flex justify-center text-app-muted text-xs sm:text-sm md:text-base break-words p-2">
              {velocidadTicker}s
            </span>
          </div>
        </div>

        <div className="w-full flex justify-center col-span-12 md:col-span-6 gap-2 p-2">
          <button
            type="button"
            onClick={() => {
              handleTicker(ticker), setTicker("");
            }}
            className={`w-full py-1.5 flex items-center justify-center text-center rounded text-xs sm:text-sm md:text-base break-words ${
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
            className="w-full py-1.5 flex items-center justify-center text-center text-xs sm:text-sm md:text-base break-words font-bold text-app-muted rounded  inset-shadow-sm inset-shadow-app-muted hover:text-app-error hover:inset-shadow-app-error cursor-pointer"
          >
            Cancelar
          </button>

          {/* boton salir */}
          <button
            type="button"
            onClick={() => navigate("/ViewGestion")}
            className="w-full py-1.5 boton-salida"
          >
            Salida
          </button>
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
            <div className="sm:p-5">
              <h2 className="flex sm:justify-center mb-0.5 sm:mb-2 sm:text-xl font-bold text-app-main">
                {item.num}. Ticker
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
