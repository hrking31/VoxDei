import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ref, set, update } from "firebase/database";
import { database, db, auth} from "../Firebase/Firebase";
import { doc, setDoc } from "firebase/firestore";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import EmojiButton from "../EmojiButton/EmojiButton";
import { useAppContext } from "../Context/AppContext";

export default function ControlMenssage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [itemSeleccionado, setItemSeleccionado] = useState(null);
  const {
    visibleTitulo,
    setVisibleTitulo,
    visibleTexto,
    setVisibleTexto,
    messageItems,
    setMessageItems,
  } = useAppContext();
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
    const textToSend = item?.text || message;

    if (!textToSend.trim()) return;

    set(ref(database, "displayMessage"), {
      text: textToSend,
      display: "mensaje",
      timestamp: item?.timestamp || Date.now(),
    });
  };

  const toggleVisibleTitulo = () => {
    const nuevoEstado = !visibleTitulo;
    setVisibleTitulo(nuevoEstado);

    update(ref(database, `displayVisibleTitulo/${auth.currentUser.uid}`), {
      visibleTitulo: nuevoEstado,
      timestamp: Date.now(),
    });
  };

  const toggleVisibleTexto = () => {
    const nuevoEstado = !visibleTexto;
    setVisibleTexto(nuevoEstado);

    update(ref(database, "displayVisibleTexto"), {
      visibleTexto: nuevoEstado,
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

      <div className="grid grid-cols-12">
        {/*textarea de mensaje*/}
        <div className="col-span-9 flex flex-col p-2 md:p-2">
          <textarea
            ref={textareaRef}
            className="w-full border text-app-muted border-app-border rounded resize-none focus:outline-none focus:ring-2 focus:ring-app-main scrollbar-custom text-sm md:text-base break-words min-h-[4rem] p-1"
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
            className={`w-full h-10 flex items-center justify-center text-center rounded text-xs sm:text-sm md:text-xs lg:text-base break-words
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
        <div className="flex justify-center col-span-8 sm:col-span-10 p-2">
          <div className="flex gap-2 w-full">
            <button
              type="button"
              onClick={() => {
                handleMessage(message), setMessage("");
              }}
              className={`w-full py-1.5 flex items-center justify-center text-center rounded text-xs sm:text-sm md:text-base break-words ${
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
              className="w-full py-1.5 flex items-center justify-center text-center text-xs sm:text-sm md:text-base break-words font-bold text-app-muted rounded inset-shadow-sm inset-shadow-app-muted hover:text-app-error hover:inset-shadow-app-error cursor-pointer"
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
          </div>
        </div>

        <div className="col-span-4 sm:col-span-2 flex items-center justify-center xl:px-2.5 gap-4 p-2 xl:p-0">
          <button
            onClick={toggleVisibleTitulo}
            className="w-full py-1.5 xl:py-3 flex items-center justify-center border-2 rounded font-semibold text-app-accent transition-all duration-200"
          >
            {visibleTitulo ? (
              <EyeIcon className="w-6 h-6" />
            ) : (
              <EyeSlashIcon className="w-6 h-6" />
            )}
          </button>

          <button
            onClick={toggleVisibleTexto}
            className="w-full py-1.5 xl:py-3 flex items-center justify-center border-2 rounded font-semibold text-app-main transition-all duration-200"
          >
            {visibleTexto ? (
              <EyeIcon className="w-6 h-6" />
            ) : (
              <EyeSlashIcon className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 p-1 sm:p-4">
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
