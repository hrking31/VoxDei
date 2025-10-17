import { Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./Components/Firebase/Firebase";
import {
  ViewTicker,
  ViewMessage,
  ViewVersiculo,
  ViewVersiculos,
  ViewDisplay,
  ViewSelector,
  ViewPredica,
} from "./Views/index";
import { PredicaProvider } from "./Components/PredicaContext/PredicaContext";

export default function App() {
  const [initialSlots, setInitialSlots] = useState(null);
  const [tickerItems, setTickerItems] = useState(null);
  console.log("tickers",tickerItems);

  // Cargar estado inicial de los botones de prédica
  useEffect(() => {
    const loadSlots = async () => {
      const estados = [];
      for (let i = 1; i <= 5; i++) {
        const snap = await getDoc(doc(db, "predicas", `predica${i}`));
        estados.push(snap.exists());
      }
      setInitialSlots(estados);
    };
    loadSlots();
  }, []);

  
useEffect(() => {
  const loadTickers = async () => {
    try {
      const docs = await Promise.all(
        Array.from({ length: 6 }, (_, i) =>
          getDoc(doc(db, "tickers", `ticker${i + 1}`))
        )
      );

      const data = docs.map((snap, i) => ({
        id: `ticker${i + 1}`,
        data: snap.exists() ? [snap.data()] : [],
      }));

      setTickerItems(data);
    } catch (error) {
      console.error("Error al cargar los tickers:", error);
    }
  };

  loadTickers();
}, []);




  return (
    <PredicaProvider initialSlots={initialSlots} initialTicker={tickerItems}>
      <Routes>
        <Route path="/" element={<ViewSelector />} />
        <Route path="/viewdisplay" element={<ViewDisplay />} />
        <Route path="/viewTicker" element={<ViewTicker />} />
        <Route path="/ViewMessage" element={<ViewMessage />} />
        <Route path="/ViewVersiculo" element={<ViewVersiculo />} />
        <Route path="/ViewVersiculos" element={<ViewVersiculos />} />
        <Route path="/ViewPredica" element={<ViewPredica />} />
      </Routes>
    </PredicaProvider>
  );
}
