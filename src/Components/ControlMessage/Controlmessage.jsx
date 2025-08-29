// import { useState, useRef, useEffect } from "react";
// import { ref, set } from "firebase/database";
// import { database } from "../Firebase/Firebase";

// export default function ControlMenssage() {
//   const [message, setMessage] = useState("");
//   const textareaRef = useRef(null);

//   useEffect(() => {
//     if (textareaRef.current) {
//       textareaRef.current.style.height = "auto";
//       textareaRef.current.style.height =
//         textareaRef.current.scrollHeight + "px";
//     }
//   }, [message]);

//   const handleMessage = () => {
//     set(ref(database, "displayMessage"), {
//       text: message,
//       display: "mensaje",
//       timestamp: Date.now(),
//     });
//   };

//   return (
//     <div>
//       <h1 className="text-2xl text-left font-bold p-2">
//         Panel de Control Mensajes
//       </h1>

//       <div className="p-5 max-w-3xl mx-auto">
//         <textarea
//           ref={textareaRef}
//           className="w-full border border-gray-300 rounded p-2 mb-4 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
//           name="message"
//           value={message}
//           onChange={(e) => setMessage(e.target.value)}
//           placeholder="Escribe tu mensaje aquí..."
//           maxLength={600}
//         />
//         <p className="text-sm text-gray-500 text-right">
//           {message.length} / 600
//         </p>

//         <div className="flex flex-roll w-full justify-center items-center gap-4">
//           <button
//             onClick={handleMessage}
//             className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded shadow"
//           >
//             Proyectar
//           </button>

//           <button
//             onClick={() => setMessage("")}
//             className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded shadow"
//           >
//             Limpiar
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }



import { useState, useRef, useEffect } from "react";
import { ref, set } from "firebase/database";
import { database } from "../Firebase/Firebase";

export default function ControlMenssage() {
  const [message, setMessage] = useState("");
  const textareaRef = useRef(null);

  const MAX_LINES = 8;
  const MAX_CHARS = 600;

  // Ajusta altura automáticamente
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        textareaRef.current.scrollHeight + "px";
    }
  }, [message]);

  const handleChange = (e) => {
    const value = e.target.value;
    const textarea = textareaRef.current;

    if (textarea) {
      const lineHeight = parseInt(
        window.getComputedStyle(textarea).lineHeight,
        10
      );
      const lines = Math.floor(textarea.scrollHeight / lineHeight);

      // Solo actualiza si no supera las líneas máximas
      if (lines <= MAX_LINES) {
        setMessage(value.slice(0, MAX_CHARS));
      }
    }
  };

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
        Panel de Control Mensajes
      </h1>

      <div className="p-5 max-w-3xl mx-auto">
        <textarea
          ref={textareaRef}
          className="w-full border border-gray-300 rounded p-2 mb-1 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          name="message"
          value={message}
          onChange={handleChange}
          placeholder="Escribe tu mensaje aquí..."
          maxLength={MAX_CHARS}
        />
        <div className="flex justify-between text-sm text-gray-500">
          <span>
            {message.split("\n").length} / {MAX_LINES} líneas
          </span>
          <span>
            {message.length} / {MAX_CHARS} caracteres
          </span>
        </div>

        <div className="flex flex-row w-full justify-center items-center gap-4 mt-3">
          <button
            onClick={handleMessage}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded shadow"
          >
            Proyectar
          </button>

          <button
            onClick={() => setMessage("")}
            className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded shadow"
          >
            Limpiar
          </button>
        </div>
      </div>
    </div>
  );
}
