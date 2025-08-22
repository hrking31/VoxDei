import { useState, useRef, useEffect } from "react";
import { ref, set } from "firebase/database";
import { database } from "../Firebase/Firebase";

export default function ControlMenssage() {
  const [message, setMessage] = useState("");
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

  return (
    <div>
      <h1 className="text-2xl text-left font-bold p-2">
        Panel de Control Mensaje
      </h1>

      <div className="p-5 max-w-3xl mx-auto">
        <textarea
          ref={textareaRef}
          className="w-full border border-gray-300 rounded p-2 mb-4 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          name="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Escribe tu mensaje aquí..."
        />

        <div className="flex flex-roll w-full justify-center items-center gap-4">
          <button
            onClick={handleMessage}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded shadow"
          >
            Proyectar
          </button>

          <button
            onClick={() => setMessage("")}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded shadow"
          >
           Limpiar
          </button>
        </div>
      </div>
    </div>
  );
}
