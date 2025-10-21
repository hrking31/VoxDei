import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ref, set, update } from "firebase/database";
import { database, db } from "../Firebase/Firebase";
import { doc, setDoc } from "firebase/firestore";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import EmojiButton from "../EmojiButton/EmojiButton";
import { useAppContext } from "../Context/AppContext";

export default function ControlMenssage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const {messageItems, setMessageItems } = useAppContext();
  const [itemSeleccionado, setItemSeleccionado] = useState(null);
  const {visiblePredica, setVisiblePredica} = useAppContext();
  const {visibleTitulo, setVisibleTitulo} = useAppContext();
  const { showNotif } = useAppContext();
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
    const textToSend = item?.text ||message;

    if (!textToSend.trim()) return;

    set(ref(database, "displayMessage"), {
      text: textToSend,
      display: "mensaje",
      timestamp: item?.timestamp || Date.now(),
    });
  };

  const toggleVisible = () => {
    const newValue = !visiblePredica;
    setVisiblePredica(newValue);
    set(ref(database, "displayVisible"), {
      visible: newValue,
      timestamp: Date.now(),
    });
  };

  const toggleVisibleTitulo = (e) => {
    e.stopPropagation();

    const nuevoEstado = !visibleTitulo;
    setVisibleTitulo(nuevoEstado);

    // Actualiza solo el campo "visible" en Firebase
    update(ref(database, "displayTitulo"), {
      visible: nuevoEstado,
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

        // Actualizar estado local
        setMessageItems((prev) => [...prev, messageFinal]);

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

        setMessageItems((prev) => {
          const actualizados = prev.map((item) =>
            item.num === masAntiguo.num ? messageFinal : item
          );
          return actualizados.sort((a, b) => a.num - b.num);
        });
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
      <h1 className="text-2xl text-left font-bold text-app-main p-2">
        Panel de Control Mensajes
      </h1>

      <div className="grid grid-cols-12 gap-1 mb-2 ">
        {/*textarea de mensaje*/}
        <div className="col-span-10 flex p-1 md:p-2">
          <textarea
            ref={textareaRef}
            className="w-full border text-app-muted border-app-border rounded resize-none focus:outline-none focus:ring-2 focus:ring-app-main scrollbar-custom text-sm md:text-base break-words p-1"
            name="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Escribe tu mensaje aquí..."
            maxLength={600}
          />
        </div>

        {/* boton guardar */}
        <div className="col-span-2 flex justify-center p-1 md:p-2">
          <button
            type="button"
            onClick={() => {
              agregarElemento(message), setMessage("");
            }}
            className={`w-full px-3.5 py-1.5 flex items-center justify-center text-center rounded text-xs sm:text-sm md:text-xs lg:text-base break-words
               ${
                 !message
                   ? "bg-transparent border-2 border-app-border font-bold text-app-border cursor-default"
                   : "bg-green-500 text-white cursor-pointer"
               }`}
            disabled={!message}
          >
            Guardar
          </button>
        </div>
      </div>

      {/* contador de caracteres*/}
      <div className="grid grid-cols-12">
        <div className="col-span-12 flex text-sm text-app-muted justify-end mb-2 pr-3">
          <p className="">{message.length} / 600</p>
        </div>
      </div>

      {/* botones de acciones*/}
      <div className="grid grid-cols-12 p-2 sm:p-0">
        <div className="flex justify-center p-1 md:p-4 col-span-8 sm:col-span-9 col-start-5 row-end-1 md:col-start-auto md:row-end-auto">
          <div className="flex gap-2 w-full">
            <button
              type="button"
              onClick={() => {
                handleMessage(message), setMessage("");
              }}
              className={`w-full px-3.5 py-1.5 flex items-center justify-center text-center rounded text-xs sm:text-sm md:text-base break-words ${
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
              className="w-full px-3.5 py-1.5 flex items-center justify-center text-center text-xs sm:text-sm md:text-base break-words font-bold text-app-muted rounded inset-shadow-sm inset-shadow-app-muted hover:text-app-error hover:inset-shadow-app-error cursor-pointer"
            >
              Cancelar
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

        <div className="col-span-1 col-start-1 row-end-1 md:col-start-auto md:row-end-auto flex items-center justify-center p-1">
          <EmojiButton
            onSelect={(emoji) => setMessage((prev) => prev + emoji)}
          />
        </div>

        <div className="col-span-3 sm:col-span-2 col-start-2 row-end-1 md:col-start-auto md:row-end-auto flex items-center justify-center gap-3 sm:gap-10 ">
          <div className="flex p-1">
            <button
              onClick={(e) => toggleVisibleTitulo(e)}
              className="font-semibold text-app-accent transition-all duration-200"
            >
              {visibleTitulo ? (
                <EyeIcon className="w-6 sm:w-8 h-6 sm:h-8" />
              ) : (
                <EyeSlashIcon className="w-6 sm:w-8 h-6 sm:h-8" />
              )}
            </button>
          </div>

          <div className="flex p-1">
            <button
              onClick={toggleVisible}
              className="font-semibold text-app-main transition-all
              duration-200"
            >
              {visiblePredica ? (
                <EyeIcon className="w-6 sm:w-8 h-6 sm:h-8" />
              ) : (
                <EyeSlashIcon className="w-6 sm:w-8 h-6 sm:h-8" />
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 p-4">
        {messageItems.map((item) => (
          <div
            key={item.num}
            onClick={() => {
              handleMessage(item);
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
                Mensaje {item.num}
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
