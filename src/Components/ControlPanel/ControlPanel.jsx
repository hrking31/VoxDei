import { useState } from "react";
import { ref, set } from "firebase/database";
import { database } from "../Firebase/Firebase";
import VersiculoViewer from "../../Components/Vesiculos/Versiculos";

export default function ControlPanel() {
  const [data, setData] = useState({
    message: "",
    ticker: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleMessage = () => {
    set(ref(database, "displayMessage"), {
      text: data.message,
      timestamp: Date.now(),
    });
  };

  const handleTicker = () => {
    set(ref(database, "displayTicker"), {
      text: data.ticker,
      timestamp: Date.now(),
    });
  };

  return (
    <div>
      <h1 className="text-2xl text-left font-bold p-2">Panel de Control</h1>

      <div className="p-5 max-w-3xl mx-auto">
        <h2 className="text-2xl text-left font-bold p-2">Mensaje</h2>
        {/* <textarea
          className="w-full h-24 border border-gray-300 rounded p-2 mb-4 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        /> */}
        <input
          className="w-full h-24 border border-gray-300 rounded p-2 mb-4 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          name="message"
          value={data.message}
          onChange={handleChange}
        />

        <div className="flex flex-col ">
          <button
            onClick={handleMessage}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded shadow"
          >
            Proyectar
          </button>
        </div>

        <h2 className="text-2xl text-left font-bold p-2">Ticker</h2>

        <input
          className="w-full h-24 border border-gray-300 rounded p-2 mb-4 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          name="ticker"
          value={data.ticker}
          onChange={handleChange}
        />

        <div className="flex flex-col ">
          <button
            onClick={handleTicker}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded shadow"
          >
            Proyectar
          </button>
        </div>

        <VersiculoViewer />
      </div>
    </div>
  );
}
