import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ref, set } from "firebase/database";
import { database } from "../Firebase/Firebase";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import EmojiButton from "../EmojiButton/EmojiButton";

export default function ControlMenssage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [visiblePredica, setVisiblePredica] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        textareaRef.current.scrollHeight + "px";
    }
  }, [message]);

  const handleMessage = () => {
    set(ref(database, "displayMessage"), {
      text: message,
      display: "mensaje",
      timestamp: Date.now(),
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

  return (
    <div>
      <h1 className="text-2xl text-left font-bold text-app-main p-2">
        Panel de Control Mensajes
      </h1>

      <div className="grid grid-cols-12 gap-1 mb-2 ">
        {/*textarea de mensaje*/}
        <div className="col-span-12 flex p-2">
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
      </div>

      {/* contador de caracteres*/}
      <div className="grid grid-cols-12">
        <div className="col-span-12 flex text-sm text-app-muted justify-end mb-2 pr-3">
          <p className="">{message.length} / 600</p>
        </div>
      </div>

      {/* botones de acciones*/}
      <div className="grid grid-cols-12">
        <div className="flex justify-center col-span-8 md:col-span-10 p-4">
          <div className="flex gap-2 w-full px-2 md:px-6">
            <button
              type="button"
              onClick={handleMessage}
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
        <div className="col-span-2 sm:col-span-1 col-start-1 row-end-1 md:col-start-auto md:row-end-auto flex items-center justify-center p-4 ">
          <EmojiButton
            onSelect={(emoji) => setMessage((prev) => prev + emoji)}
          />
        </div>

        <button
          onClick={toggleVisible}
          className="px-3.5 py-1.5 col-span-2 sm:col-span-1 col-start-3 row-end-1 md:col-start-auto md:row-end-auto flex items-center justify-center font-semibold text-app-muted transition-all duration-200"
        >
          {visiblePredica ? (
            <EyeIcon className="w-6 h-6" />
          ) : (
            <EyeSlashIcon className="w-6 h-6" />
          )}
        </button>
      </div>
    </div>
  );
}
