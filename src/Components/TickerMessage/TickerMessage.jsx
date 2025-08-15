import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { onValue, ref } from "firebase/database";
import { database } from "../Firebase/Firebase";
import Reloj from "../Reloj/Reloj";

export default function TickerMessage({ message }) {
  const navigate = useNavigate();
  const [velocidad, setVelocidad] = useState(10);

  useEffect(() => {
    const speedRef = ref(database, "speedTicker");
    const unsubscribe = onValue(speedRef, (snapshot) => {
      const data = snapshot.val();
      if (data && data.velocidad !== undefined) {
        setVelocidad(data.velocidad);
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="w-full fixed bottom-0 left-0 z-50 flex items-center bg-blue-600 h-14 overflow-hidden">
      <button onClick={() => navigate("/")}>
        <Reloj />
      </button>

      <div className="flex-1 overflow-hidden">
        <div
          className="flex animate-marquee"
          style={{ "--animation-speed": `${velocidad}s` }}
        >
          <span className="flex whitespace-nowrap">
            <span className="text-white font-bold text-2xl mr-2 ">
              {message}
            </span>
            <span className="text-white font-bold text-2xl ">{message}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
