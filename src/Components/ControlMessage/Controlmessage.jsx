import { useState } from "react";
import { ref, set } from "firebase/database";
import { database } from "../Firebase/Firebase";

export default function ControlMenssage() {
  const [message, setMessage] = useState("");

  const handleMessage = () => {
    set(ref(database, "displayMessage"), {
      text: message,
      timestamp: Date.now(),
    });
  };

  return (
    <div>
      <h1 className="text-2xl text-left font-bold p-2">
        Panel de Control Mensaje
      </h1>

      <div className="p-5 max-w-3xl mx-auto">
        <input
          className="w-full h-24 border border-gray-300 rounded p-2 mb-4 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          name="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />

        <div className="flex flex-col ">
          <button
            onClick={handleMessage}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded shadow"
          >
            Proyectar
          </button>
        </div>
      </div>
    </div>
  );
}
