import { createContext, useContext, useEffect, useState } from "react";
import { db } from "../Firebase/Firebase";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";

const PredicaContext = createContext();

export function PredicaProvider({ children }) {
  const [slots, setSlots] = useState([false, false, false, false, false]);
  const [editar, setEditar] = useState(false);
  const [numSlots, setNumSlots] = useState("");
  const [predicaItems, setPredicaItems] = useState([]);
  const [notif, setNotif] = useState({
    open: false,
    type: "info",
    message: "",
  });

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

      if (editar) {
        showNotif("success", `🔄  Predica ${index + 1} actualizada`);
      } else {
        showNotif("success", `💾 Predica ${index + 1} guardada`);
      }
    } catch (error) {
      showNotif("error", "❌ Error al guardar la prédica");
      console.error(error);
    }
  };

  // Manejar click en slot
  const handleSlotClick = async (index) => {
    try {
      const slotOcupado = slots[index];
      if (!editar) {
        // Modo solo lectura → cargar predica si existe
        if (slotOcupado) {
          const snap = await getDoc(doc(db, "predicas", `predica${index + 1}`));
          if (snap.exists()) {
            setPredicaItems(snap.data().items);
            setNumSlots(index + 1);
            showNotif("info", `📥 Predica ${index + 1} cargada`);
          }
          return;
        }
        // Slot vacío → guardar solo si hay items
        else if (predicaItems && predicaItems.length > 0) {
          await guardarPredica(index, predicaItems);
        } else {
          showNotif(
            "warning",
            `🚫 No hay nada que guardar en Slot ${index + 1}`
          );
        }
      }

      // Modo editar
      if (editar) {
        if (slotOcupado) {
          if (!predicaItems || predicaItems.length === 0) {
            // items tenía datos, pero ahora está vacío → borrar
            await deleteDoc(doc(db, "predicas", `predica${index + 1}`));
            setSlots((prev) => {
              const nuevo = [...prev];
              nuevo[index] = false;
              return nuevo;
            });
            showNotif("info", `🗑️ Predica ${index + 1} eliminada`);
          } else {
            // items modifico los datos → actualizar
            await guardarPredica(index, predicaItems);
          }
        }
      }

      setEditar(false); // salir de edición al terminar
      setNumSlots(""); // limpiar selección
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
