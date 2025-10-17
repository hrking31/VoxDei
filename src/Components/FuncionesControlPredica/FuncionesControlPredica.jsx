import { db } from "../Firebase/Firebase";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";

// 🔹 Mostrar notificación
export const showNotif = (setNotif, type, message) => {
  setNotif({ open: true, type, message });
};

// 🔹 Guardar prédica
export const guardarPredica = async (
  index,
  items,
  setSlots,
  editar,
  setNotif
) => {
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
      showNotif(setNotif, "success", `🔄  Predica ${index + 1} actualizada`);
    } else {
      showNotif(setNotif, "success", `💾 Predica ${index + 1} guardada`);
    }
  } catch (error) {
    showNotif(setNotif, "error", "❌ Error al guardar la prédica");
    console.error(error);
  }
};

// 🔹 Manejar click en slot
export const handleSlotClick = async ({
  index,
  slots,
  editar,
  predicaItems,
  setPredicaItems,
  setSlots,
  setEditar,
  setNumSlots,
  setNotif,
}) => {
  try {
    const slotOcupado = slots[index];

    if (!editar) {
      // Modo lectura → cargar prédica si existe
      if (slotOcupado) {
        const snap = await getDoc(doc(db, "predicas", `predica${index + 1}`));
        if (snap.exists()) {
          setPredicaItems(snap.data().items);
          setNumSlots(index + 1);
          showNotif(setNotif, "info", `📥 Predica ${index + 1} cargada`);
        }
        return;
      }
      // Slot vacío → guardar si hay items
      else if (predicaItems && predicaItems.length > 0) {
        await guardarPredica(index, predicaItems, setSlots, editar, setNotif);
      } else {
        showNotif(
          setNotif,
          "warning",
          `🚫 No hay nada que guardar en Slot ${index + 1}`
        );
      }
    }

    // Modo editar
    if (editar) {
      if (slotOcupado) {
        if (!predicaItems || predicaItems.length === 0) {
          // Eliminar
          await deleteDoc(doc(db, "predicas", `predica${index + 1}`));
          setSlots((prev) => {
            const nuevo = [...prev];
            nuevo[index] = false;
            return nuevo;
          });
          showNotif(setNotif, "info", `🗑️ Predica ${index + 1} eliminada`);
        } else {
          // Actualizar
          await guardarPredica(index, predicaItems, setSlots, editar, setNotif);
        }
      }
    }

    setEditar(false);
    setNumSlots("");
  } catch (error) {
    showNotif(setNotif, "error", "❌ Error al procesar la prédica");
    console.error(error);
  }
};
