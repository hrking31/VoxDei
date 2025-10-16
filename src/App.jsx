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

  return (
    <PredicaProvider initialSlots={initialSlots}>
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
