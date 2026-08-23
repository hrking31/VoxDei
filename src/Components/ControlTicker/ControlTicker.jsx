import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { database } from "../Firebase/Firebase";
import { ref, set, update } from "firebase/database";
import { setDoc, deleteDoc } from "firebase/firestore";
import { docIglesia, TICKERS } from "../Firebase/RutasIglesia";
import EmojiButton from "../EmojiButton/EmojiButton";
import {
  BookmarkIcon,
  ChatBubbleLeftRightIcon,
  StarIcon,
  TagIcon,
  TvIcon,
} from "@heroicons/react/24/solid";
import { useAppContext } from "../Context/AppContext";
import { useAuth } from "../../Components/Context/AuthContext";
import ModalVisibilidad from "../ModalVisibilidad/ModalVisibilidad.jsx";
import FavoritosTexto from "../Favoritos/FavoritosTexto.jsx";

// Cuántos tickers caben en favoritos. Los documentos son ticker1..ticker6.
const TOPE_FAVORITOS = 6;

export default function ControlTicker() {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [ticker, setTicker] = useState("");
  // Cuál de los favoritos está en la pantalla del templo
  const [numProyectado, setNumProyectado] = useState(null);
  // Si se está corrigiendo un favorito, su número: al guardar se escribe encima
  // en vez de ocupar otro sitio
  const [numEditando, setNumEditando] = useState(null);
  const {
    tickerItems,
    velocidadTicker,
    setVelocidadTicker,
    visibleTicker,
    setVisibleTicker,
    visibleTitulo,
    setVisibleTitulo,
    visibleTexto,
    setVisibleTexto,
    isDesktop,
    showNotif,
    confirmAction,
  } = useAppContext();

  // Proyecta un ticker de la bd o del imput
  const handleTicker = (item) => {
    const textToSend = item?.text || ticker;

    if (!textToSend.trim()) return;

    set(ref(database, `displayTicker/${userData.groupId}`), {
      text: textToSend,
      timestamp: item?.timestamp || Date.now(),
    });

    // Solo un favorito puede quedar marcado como el que está en pantalla
    setNumProyectado(item?.num ?? null);
  };

  // Visibilidad del titulo
  const toggleVisibleTitulo = () => {
    const nuevoEstado = !visibleTitulo;
    setVisibleTitulo(nuevoEstado);

    update(ref(database, `displayVisibleTitulo/${userData.groupId}`), {
      visibleTitulo: nuevoEstado,
      timestamp: Date.now(),
    });
  };

  // Visibilidad del texto
  const toggleVisibleTexto = () => {
    const nuevoEstado = !visibleTexto;
    setVisibleTexto(nuevoEstado);

    update(ref(database, `displayVisibleTexto/${userData.groupId}`), {
      visibleTexto: nuevoEstado,
      timestamp: Date.now(),
    });
  };

  // Visibilidad del ticker
  const toggleVisibleTicker = () => {
    const nuevoEstado = !visibleTicker;
    setVisibleTicker(nuevoEstado);

    set(ref(database, `displayVisibleTicker/${userData.groupId}`), {
      visibleTicker: nuevoEstado,
      timestamp: Date.now(),
    });
  };

  // Visibilidad solo ticker
  const setAllVisible = () => {
    setVisibleTicker(true);
    setVisibleTitulo(false);
    setVisibleTexto(false);
    const timestamp = Date.now();

    set(ref(database, `displayVisibleTicker/${userData.groupId}`), {
      visibleTicker: true,
      timestamp,
    });

    update(ref(database, `displayVisibleTitulo/${userData.groupId}`), {
      visibleTitulo: false,
      timestamp,
    });

    update(ref(database, `displayVisibleTexto/${userData.groupId}`), {
      visibleTexto: false,
      timestamp,
    });
  };

  // Configura la velocidad del ticker
  const configSpeed = (nuevoValor) => {
    setVelocidadTicker(nuevoValor);
    set(ref(database, `speedTicker/${userData.groupId}`), {
      velocidad: nuevoValor,
    });
  };

  // A qué documento va lo que se está guardando: el que se corrige, el primer
  // hueco libre o, si ya están los seis, el más antiguo.
  const numeroDestino = () => {
    if (numEditando) return { num: numEditando, reemplaza: false };

    const usados = tickerItems.map((item) => item.num);
    for (let num = 1; num <= TOPE_FAVORITOS; num++) {
      if (!usados.includes(num)) return { num, reemplaza: false };
    }

    const masAntiguo = [...tickerItems].sort(
      (a, b) => a.timestamp - b.timestamp
    )[0];
    return { num: masAntiguo.num, reemplaza: true };
  };

  // Guarda el ticker en favoritos: es el botón que antes decía "Guardar"
  const guardarFavorito = async () => {
    if (ticker.trim() === "") return;

    try {
      const { num, reemplaza } = numeroDestino();

      await setDoc(docIglesia(userData.groupId, TICKERS, `ticker${num}`), {
        text: ticker,
        timestamp: Date.now(),
        num,
      });

      if (numEditando) {
        showNotif("success", `Ticker ${num} corregido`);
      } else if (reemplaza) {
        showNotif("info", `Se reemplazó el ticker ${num} por uno nuevo`);
      } else {
        showNotif("success", `Ticker ${num} guardado en favoritos`);
      }

      setTicker("");
      setNumEditando(null);
    } catch (error) {
      console.error("Error al agregar el ticker:", error);
      showNotif("error", "Error al guardar el ticker");
    }
  };

  // Lleva el texto del favorito al recuadro de escritura para corregirlo
  const editarFavorito = (item) => {
    setTicker(item.text);
    setNumEditando(item.num);
    showNotif("info", `Editando el ticker ${item.num}`);
  };

  const eliminarFavorito = async (item) => {
    const accepted = await confirmAction(
      `¿Eliminar el ticker ${item.num} de favoritos?`
    );
    if (!accepted) return;

    try {
      await deleteDoc(
        docIglesia(userData.groupId, TICKERS, `ticker${item.num}`)
      );

      if (numEditando === item.num) setNumEditando(null);
      if (numProyectado === item.num) setNumProyectado(null);

      showNotif("success", "Ticker eliminado");
    } catch (error) {
      console.error("Error al eliminar el ticker:", error);
      showNotif("error", "No se pudo eliminar el ticker");
    }
  };

  return (
    <div className="min-h-dvh bg-linear-to-b from-app-dark/50 to-app-light/50">
      <div className="sticky top-0 border-b border-app-main bg-app-light z-10 ">
        <h1 className="font-bold text-app-main flex items-center gap-1 px-2">
          <TagIcon className="w-5 h-5 shrink-0" />
          <span>Ticker</span>
          {numEditando && (
            <span className="text-xs font-normal text-app-muted">
              · corrigiendo el ticker {numEditando}
            </span>
          )}
        </h1>

        <div className="grid grid-cols-12">
          {/*textarea de mensaje*/}
          <div className="col-span-9 flex flex-col p-2 md:p-2">
            <textarea
              className="w-full border text-app-muted border-app-border rounded resize-none focus:outline-none focus:ring-2 focus:ring-app-main scrollbar-custom text-sm md:text-base break-normal h-24 sm:h-16 p-1"
              name="ticker"
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              placeholder="Escribe tu mensaje aquí..."
            />
          </div>

          {/* emoji y estrella de favoritos */}
          <div className="col-span-3 flex flex-col sm:flex-row items-center justify-center gap-2 p-2">
            <div className=" flex items-center justify-center">
              <EmojiButton
                onSelect={(emoji) => setTicker((prev) => prev + emoji)}
              />
            </div>

            <button
              type="button"
              onClick={guardarFavorito}
              title={
                numEditando
                  ? `Guardar la corrección del ticker ${numEditando}`
                  : "Agregar a favoritos"
              }
              className={`p-1 rounded-full transition ${
                !ticker
                  ? "text-app-border cursor-default"
                  : "text-app-main hover:bg-app-border cursor-pointer"
              }`}
              disabled={!ticker}
            >
              <StarIcon className="w-8 h-8" />
            </button>
          </div>
        </div>

        {/* botones y velocidad */}
        <div className="grid grid-cols-12 md:gris-cols-6">
          {/* velocidad de lectura */}
          <div className="flex flex-col lg:flex-row justify-center items-center col-span-12 md:col-span-6">
            <div className="w-full flex items-center space-x-0.5 sm:space-x-2 p-2 gap-1">
              <label className="flex justify-center items-center text-app-muted text-xs sm:text-sm md:text-base break-normal">
                Velocidad de Lectura
              </label>
              <input
                type="range"
                min="0.1"
                max="2"
                step="0.1"
                value={velocidadTicker}
                onChange={(e) => {
                  const nuevaVelocidad = Number(e.target.value);
                  setVelocidadTicker(nuevaVelocidad);
                  configSpeed(nuevaVelocidad);
                }}
                className="w-full accent-app-main"
              />
              <span className="w-10 flex justify-center text-app-muted text-xs sm:text-sm md:text-base break-normal p-2">
                {velocidadTicker}s
              </span>
            </div>
          </div>

          <div className="w-full flex justify-center col-span-12 md:col-span-6 gap-2 p-2">
            <button
              type="button"
              onClick={() => {
                handleTicker(), setTicker("");
              }}
              className={`w-full py-1.5 flex items-center justify-center text-center rounded text-xs sm:text-sm md:text-base break-normal ${
                !ticker
                  ? "bg-transparent border-2 border-app-border font-bold text-app-border cursor-default"
                  : "bg-green-500 text-white cursor-pointer"
              }`}
              disabled={!ticker}
            >
              Proyectar
            </button>
            {/* Boton cancelar */}
            <button
              onClick={() => {
                setTicker("");
                setNumEditando(null);
              }}
              className="w-full py-1.5 flex items-center justify-center text-center text-xs sm:text-sm md:text-base break-normal font-bold text-app-muted rounded  inset-shadow-sm inset-shadow-app-muted hover:text-app-error hover:inset-shadow-app-error cursor-pointer"
            >
              Cancelar
            </button>

            {/* Boton salir */}
            <button
              type="button"
              onClick={() => navigate("/ViewGestion")}
              className="w-full py-1.5 boton-salida"
            >
              Salida
            </button>

            {/* Boton visibilidad ticker, titulo, texto */}
            {isDesktop ? (
              <div className="flex items-center gap-4">
                {/* Boton visibilidad ticker */}
                <button
                  onClick={toggleVisibleTicker}
                  className="h-full font-semibold text-app-muted px-2 flex items-center justify-center transition-all
              duration-200"
                >
                  {visibleTicker ? (
                    <TagIcon className="w-8 h-8 text-app-success" />
                  ) : (
                    <TagIcon className="w-8 h-8" />
                  )}
                </button>
                {/* Boton visibilidad titulo */}
                <button
                  onClick={toggleVisibleTitulo}
                  className="h-full font-semibold text-app-muted px-2 flex items-center justify-center transition-all
              duration-200"
                >
                  {visibleTitulo ? (
                    <BookmarkIcon className="w-8 h-8 text-app-accent" />
                  ) : (
                    <BookmarkIcon className="w-8 h-8" />
                  )}
                </button>
                {/* Boton visibilidad texto */}
                <button
                  onClick={toggleVisibleTexto}
                  className="h-full font-semibold text-app-muted px-2 flex items-center justify-center transition-all duration-200"
                >
                  {visibleTexto ? (
                    <ChatBubbleLeftRightIcon className="w-8 h-8 text-app-main" />
                  ) : (
                    <ChatBubbleLeftRightIcon className="w-8 h-8" />
                  )}
                </button>
                {/* Boton visibilidad solo ticker */}
                <button
                  onClick={setAllVisible}
                  className="h-full font-semibold px-2 flex items-center justify-center transition-all duration-200"
                >
                  <TvIcon className="w-8 h-8 text-app-success" />
                </button>
              </div>
            ) : (
              <ModalVisibilidad
                toggleVisibleTicker={toggleVisibleTicker}
                toggleVisibleTitulo={toggleVisibleTitulo}
                toggleVisibleTexto={toggleVisibleTexto}
                setAllVisible={setAllVisible}
                colorClass={"text-app-success"}
              />
            )}
          </div>
        </div>
      </div>

      <FavoritosTexto
        etiqueta="Ticker"
        items={tickerItems}
        numProyectado={numProyectado}
        onProyectar={handleTicker}
        onEditar={editarFavorito}
        onEliminar={eliminarFavorito}
      />
    </div>
  );
}
