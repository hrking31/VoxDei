import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ref, set, update } from "firebase/database";
import { database, db } from "../Firebase/Firebase";
import { doc, setDoc } from "firebase/firestore";
import {
  BookmarkIcon,
  ChatBubbleLeftRightIcon,
  TagIcon,
  TvIcon,
} from "@heroicons/react/24/solid";
import EmojiButton from "../EmojiButton/EmojiButton";
import { useAppContext } from "../Context/AppContext";
import { useAuth } from "../../Components/Context/AuthContext.jsx";
import ModalVisibilidad from "../ModalVisibilidad/ModalVisibilidad.jsx";

export default function ControlMenssage() {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [message, setMessage] = useState("");
  const [itemSeleccionado, setItemSeleccionado] = useState(null);
  const {
    messageItems,
    visibleAll,
    setVisibleAll,
    visibleTicker,
    setVisibleTicker,
    visibleTitulo,
    setVisibleTitulo,
    visibleTexto,
    setVisibleTexto,
    isDesktop,
    showNotif,
  } = useAppContext();
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        textareaRef.current.scrollHeight + "px";
    }
  }, [message]);

  // proyecta un mensaje de la bd o del imput
  const handleMessage = (item) => {
    const textToSend = item?.text || message;

    if (!textToSend.trim()) return;

    set(ref(database, `displayMessage/${userData.groupId}`), {
      text: textToSend,
      display: "mensaje",
      timestamp: item?.timestamp || Date.now(),
    });
  };

  // Visibilidad del titulo
  const toggleVisibleTitulo = () => {
    const nuevoEstado = !visibleTitulo;
    setVisibleTitulo(nuevoEstado);
    setVisibleAll(nuevoEstado);

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
    setVisibleAll(nuevoEstado);

    set(ref(database, `displayVisibleTicker/${userData.groupId}`), {
      visibleTicker: nuevoEstado,
      timestamp: Date.now(),
    });
  };

  // agrega un mensaje  a la bd
  const agregarElemento = async () => {
    try {
      // Validar campo
      if (message.trim() === "") return;

      const nuevoMessage = {
        text: message,
        timestamp: Date.now(),
      };

      if (messageItems.length < 6) {
        // Si hay menos de 6, agregar normalmente
        const num = messageItems.length + 1;
        const messageFinal = { ...nuevoMessage, num };

        // Guardar en Firestore
        await setDoc(doc(db, "messages", `message${num}`), messageFinal);
        showNotif("success", `✅ Mensaje ${num} agregado correctamente`);
      } else {
        // Si ya hay 6, sobrescribir el más antiguo
        const ordenados = [...messageItems].sort(
          (a, b) => a.timestamp - b.timestamp
        );
        const masAntiguo = ordenados[0]; // el primero

        const messageFinal = {
          ...nuevoMessage,
          num: masAntiguo.num, // reusar su número
        };

        // Sobrescribir en Firestore
        await setDoc(
          doc(db, "messages", `message${masAntiguo.num}`),
          messageFinal
        );

        showNotif(
          "info",
          `🔄 Se reemplazó el mensaje ${masAntiguo.num} por uno nuevo`
        );
      }

      setMessage("");
    } catch (error) {
      console.error("Error al agregar el mensaje:", error);
      showNotif("error", "❌ Error al guardar el mensaje");
    }
  };

  return (
    <div>
      <div className="sticky top-0 shadow-[inset_0_-2px_0_rgba(250,204,21,0.9)] bg-app-light z-10 ">
        <h1 className="text-left font-bold text-app-main px-2">
          Panel de Control Mensajes
        </h1>

        <div className="grid grid-cols-12">
          {/*textarea de mensaje*/}
          <div className="col-span-9 flex flex-col p-2 md:p-2">
            <textarea
              ref={textareaRef}
              className="w-full border text-app-muted border-app-border rounded resize-none focus:outline-none focus:ring-2 focus:ring-app-main scrollbar-custom text-sm md:text-base wrap-break-words min-h-[4rem] p-1"
              name="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Escribe tu mensaje aquí..."
              maxLength={600}
            />
            <p className="col-span-12 flex text-sm text-app-muted justify-end px-3">
              {message.length} / 600
            </p>
          </div>

          {/* boton guardar */}
          <div className="col-span-3 flex flex-col sm:flex-row items-center justify-center gap-2 p-2">
            <div className=" flex items-center justify-center">
              <EmojiButton
                onSelect={(emoji) => setMessage((prev) => prev + emoji)}
              />
            </div>

            <button
              type="button"
              onClick={() => {
                agregarElemento(message), setMessage("");
              }}
              className={`w-full h-10 flex items-center justify-center text-center rounded text-xs sm:text-sm md:text-xs lg:text-base wrap-break-words
              ${
                !message
                  ? "bg-transparent border-2 border-app-border font-bold text-app-border cursor-not-allowed"
                  : "bg-green-500 text-white cursor-pointer"
              }`}
              disabled={!message}
            >
              Guardar
            </button>
          </div>
        </div>

        {/* botones de acciones*/}
        <div className="grid grid-cols-12">
          <div className="w-full flex justify-center col-span-12 gap-2 p-2">
            <button
              type="button"
              onClick={() => {
                handleMessage(message), setMessage("");
              }}
              className={`w-full py-1.5 flex items-center justify-center text-center rounded text-xs sm:text-sm md:text-base wrap-break-words ${
                !message
                  ? "bg-transparent border-2 border-app-border font-bold text-app-border cursor-default"
                  : "bg-green-500 text-white cursor-pointer"
              }`}
              disabled={!message}
            >
              Proyectar
            </button>

            <button
              onClick={() => setMessage("")}
              className="w-full py-1.5 flex items-center justify-center text-center text-xs sm:text-sm md:text-base wrap-break-words font-bold text-app-muted rounded inset-shadow-sm inset-shadow-app-muted hover:text-app-error hover:inset-shadow-app-error cursor-pointer"
            >
              Cancelar
            </button>

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
                {/* Boton visibilidad solo texto */}
                <button
                  onClick={() => {
                    toggleVisibleTicker();
                    toggleVisibleTitulo();
                  }}
                  className="h-full font-semibold text-app-main px-2 flex items-center justify-center transition-all duration-200"
                >
                  {visibleAll ? (
                    <TvIcon className="w-8 h-8 text-app-muted" />
                  ) : (
                    <TvIcon className="w-8 h-8" />
                  )}
                </button>
              </div>
            ) : (
              <ModalVisibilidad
                toggleVisibleTicker={toggleVisibleTicker}
                toggleVisibleTitulo={toggleVisibleTitulo}
                toggleVisibleTexto={toggleVisibleTexto}
                toggleVisibleAll={() => {
                  toggleVisibleTicker();
                  toggleVisibleTitulo();
                }}
                colorClass={"text-app-main"}
              />
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 p-1 sm:p-4">
        {messageItems.map((item) => (
          <div
            key={item.id || `msg-${item.num}-${Date.now()}`}
            onClick={() => {
              handleMessage(item);
              setItemSeleccionado(item.id || item.num);
            }}
            className={`relative p-3 border-app-border rounded-lg cursor-pointer transition-colors ${
              itemSeleccionado === item.timestamp
                ? "bg-yellow-100 shadow-md"
                : "hover:bg-app-border active:bg-app-light"
            }`}
          >
            <div className="sm:p-5">
              <h2 className="flex sm:justify-center mb-0.5 sm:mb-2 sm:text-xl font-bold text-app-main">
                {item.num}. Mensaje
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
