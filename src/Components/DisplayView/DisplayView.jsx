import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { onValue, ref } from "firebase/database";
import { database } from "../Firebase/Firebase";
import TickerMessage from "../TickerMessage/TickerMessage";

export default function DisplayView() {
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [ticker, setTicker] = useState("");

  useEffect(() => {
    const textRef = ref(database, "displayMessage");
    onValue(textRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setText(data.text);
      }
    });
  }, []);

    useEffect(() => {
      const textRef = ref(database, "displayTicker");
      onValue(textRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setTicker(data.text);
        }
      });
    }, []);
    console.log(ticker);
    

  return (
    <div className="relative h-screen w-screen bg-black text-white  flex items-center justify-center text-center p-5">
      <button
        onClick={() => navigate("/")}
        className="absolute top-4 left-4 mt-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold w-48 py-2 px-4 rounded shadow"
      >
        Volver
      </button>

      <div className="h-screen w-screen bg-black text-white text-[3rem] flex items-center justify-center text-center p-5 ">
        {text}
      </div >
      <TickerMessage message={ticker} />
    </div>
  );
}
