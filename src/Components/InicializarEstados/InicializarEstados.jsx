import { useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../Components/Firebase/Firebase";
import { useAppContext } from "../../Components/Context/AppContext";

export default function InicializarEstados() {
  const { setSlots, setTickerItems, showNotif } = useAppContext();

  useEffect(() => {
    const loadSlots = async () => {
      try {
        const estados = [];
        for (let i = 1; i <= 5; i++) {
          const snap = await getDoc(doc(db, "predicas", `predica${i}`));
          estados.push(snap.exists());
        }
        setSlots(estados);
        // Notificación de éxito
      } catch (error) {
        console.error("Error al cargar los slots:", error);
        showNotif("error", "❌ No se pudieron cargar los slots");
      }
    };

    const loadTickers = async () => {
      try {
        const docs = await Promise.all(
          Array.from({ length: 6 }, (_, i) =>
            getDoc(doc(db, "tickers", `ticker${i + 1}`))
          )
        );

        const data = docs
          .filter((snap) => snap.exists())
          .map((snap) => snap.data());

        setTickerItems(data);
      } catch (error) {
        console.error("Error al cargar los tickers:", error);
        showNotif("error", "❌ No se pudieron cargar los tickers");
      }
    };

    loadSlots();
    loadTickers();
  }, [setSlots, setTickerItems]);

  return null;
}
