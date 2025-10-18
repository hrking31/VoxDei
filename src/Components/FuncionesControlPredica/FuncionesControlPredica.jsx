import { db } from "../Firebase/Firebase";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";

// Guardar prédica
export const guardarPredica = async (
  index,
  items,
  setSlots,
  editar,
  showNotif
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
export const handleSlotClick = async ({
  index,
  slots,
  editar,
  predicaItems,
  setPredicaItems,
  setSlots,
  setEditar,
  setNumSlots,
  showNotif,
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
          showNotif("info", `📥 Predica ${index + 1} cargada`);
        }
        return;
      }
      // Slot vacío → guardar si hay items
      else if (predicaItems && predicaItems.length > 0) {
        await guardarPredica(index, predicaItems, setSlots, editar, showNotif);
      } else {
        showNotif("warning", `🚫 No hay nada que guardar en Slot ${index + 1}`);
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
          showNotif("info", `🗑️ Predica ${index + 1} eliminada`);
        } else {
          // Actualizar
          await guardarPredica(
            index,
            predicaItems,
            setSlots,
            editar,
            showNotif
          );
        }
      }
    }

    setEditar(false);
    setNumSlots("");
  } catch (error) {
    showNotif("error", "❌ Error al procesar la prédica");
    console.error(error);
  }
};

// Consultar versiculos
export const obtenerVersiculo = async (
  sigla,
  capitulo,
  numeroVersiculo,
  showNotif
) => {
  try {
    if (!sigla || !capitulo || !numeroVersiculo) {
      showNotif(
        "error",
        "⚠️ Parámetros inválidos. Debes enviar libro, capítulo y versículo."
      );
      return;
    }

    const docId = `${sigla.toUpperCase()}_${capitulo}`;
    const ref = doc(db, "biblia", docId);
    const snapshot = await getDoc(ref);

    if (!snapshot.exists()) {
      showNotif("error", "📄 Documento no encontrado");
      return;
    }

    const data = snapshot.data();
    const texto = data.versiculos?.[numeroVersiculo.toString()];

    if (!texto) {
      showNotif("error", "🔎 Versículo no encontrado");
      return;
    }
    showNotif("success", "✅ Versículo encontrado");

    return {
      texto,
      libro: data.libro,
      capitulo: data.capitulo,
      numero: numeroVersiculo,
    };
  } catch (error) {
    console.error("Error en obtenerVersiculo:", error);
    showNotif("error", `⚠️ Error inesperado: ${error.message}`);
    return null;
  }
};
