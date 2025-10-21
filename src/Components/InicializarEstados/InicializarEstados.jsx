import { useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { database, db } from "../../Components/Firebase/Firebase";
import { ref, set } from "firebase/database";
import { useAppContext } from "../../Components/Context/AppContext";

export default function InicializarEstados() {
  const {
    setSlots,
    setTickerItems,
    setMessageItems,
    showNotif,
    setVisiblePredica,
    setVisibleTitulo,
  } = useAppContext();

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

    const loadMessage = async () => {
      try {
        const docs = await Promise.all(
          Array.from({ length: 6 }, (_, i) =>
            getDoc(doc(db, "messages", `message${i + 1}`))
          )
        );

        const data = docs
          .filter((snap) => snap.exists())
          .map((snap) => snap.data());

        setMessageItems(data);
      } catch (error) {
        console.error("Error al cargar los mensajess:", error);
        showNotif("error", "❌ No se pudieron cargar los mensajes");
      }
    };

    const visibleMessage = async () => {
      set(ref(database, "displayVisible"), {
        visible: false,
        timestamp: Date.now(),
      });

      setVisiblePredica(false);
    };

    const visibleTitulo = async () => {
      set(ref(database, "displayTitulo"), {
        visible: false,
        timestamp: Date.now(),
      });

      setVisibleTitulo(false);
    };

    loadSlots();
    loadTickers();
    loadMessage();
    visibleMessage();
    visibleTitulo();
  }, [
    setSlots,
    setTickerItems,
    setMessageItems,
    setVisiblePredica,
    setVisibleTitulo,
  ]);

  return null;
}
