
import { createContext, useContext, useEffect, useState } from "react";
import { db } from "../Firebase/Firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

const PredicaContext = createContext();

export function PredicaProvider({ children }) {
  const [slots, setSlots] = useState([false, false, false, false, false]);
  const [editar, setEditar] = useState(false);
  const [numSlots, setNumSlots] = useState("");
  const [predicaItems, setPredicaItems] = useState([]);
  const [notif, setNotif] = useState({ open: false, type: "info", message: "" });

  const showNotif = (type, message) => {
    setNotif({ open: true, type, message });
  };

  // Cargar estado inicial de los botones
  useEffect(() => {
    const loadSlots = async () => {
      const estados = [];
      for (let i = 1; i <= 5; i++) {
        const snap = await getDoc(doc(db, "predicas", `predica${i}`));
        estados.push(snap.exists());
      }
      setSlots(estados);
    };
    loadSlots();
  }, []);

  // Guardar prédica
  const guardarPredica = async (index, items) => {
    if (!items || items.length === 0) {
      showNotif("warning", "⚠️ No hay items para guardar");
      return;
    }

    try {
      await setDoc(doc(db, "predicas", `predica${index + 1}`), {
        items,
        updatedAt: new Date().toISOString(),
      });

      setSlots((prev) => {
        const nuevo = [...prev];
        nuevo[index] = true;
        return nuevo;
      });

      showNotif("success", `💾 Predica ${index + 1} guardada`);
    } catch (error) {
      showNotif("error", "❌ Error al guardar la prédica");
      console.error(error);
    }
  };

  // Manejo de click en slot
  const handleSlotClick = async (index) => {
    try {
      if (slots[index]) {
        if (editar) {
          await guardarPredica(index, predicaItems);
          setEditar(false);
          showNotif("success", `✅ Predica ${index + 1} actualizada`);
        } else {
          setNumSlots(index + 1);
          const snap = await getDoc(doc(db, "predicas", `predica${index + 1}`));
          if (snap.exists()) {
            setPredicaItems(snap.data().items);
            showNotif("info", `📥 Predica ${index + 1} cargada`);
          } else {
            showNotif("warning", `⚠️ Slot ${index + 1} está vacío`);
          }
        }
      } else {
        await guardarPredica(index, predicaItems);
      }
    } catch (error) {
      showNotif("error", "❌ Error al procesar la prédica");
      console.error(error);
    }
  };

  return (
    <PredicaContext.Provider
      value={{
        slots,
        editar,
        setEditar,
        numSlots,
        setNumSlots,
        predicaItems,
        setPredicaItems,
        notif,
        setNotif,
        handleSlotClick,
        guardarPredica,
        showNotif,
      }}
    >
      {children}
    </PredicaContext.Provider>
  );
}

export const usePredica = () => useContext(PredicaContext);
