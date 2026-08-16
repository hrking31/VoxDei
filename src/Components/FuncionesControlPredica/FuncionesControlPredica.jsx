import { db } from "../Firebase/Firebase";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { docIglesia, PREDICAS } from "../Firebase/RutasIglesia";

// Guardar prédica en la iglesia indicada
export const guardarPredica = async (
  groupId,
  index,
  items,
  setSlots,
  editar,
  showNotif
) => {
  try {
    await setDoc(docIglesia(groupId, PREDICAS, `predica${index + 1}`), {
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
    showNotif("error", "Error al guardar la prédica");
    console.error(error);
  }
};

// Manejar click en slot
export const handleSlotClick = async ({
  groupId,
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
        const snap = await getDoc(
          docIglesia(groupId, PREDICAS, `predica${index + 1}`)
        );
        if (snap.exists()) {
          setPredicaItems(snap.data().items);
          setNumSlots(index + 1);
          showNotif("info", `📥 Predica ${index + 1} cargada`);
        }
        return;
      }
      // Slot vacío → guardar si hay items
      else if (predicaItems && predicaItems.length > 0) {
        await guardarPredica(
          groupId,
          index,
          predicaItems,
          setSlots,
          editar,
          showNotif
        );
      } else {
        showNotif("warning", `🚫 No hay nada que guardar en Slot ${index + 1}`);
      }
    }

    // Modo editar
    if (editar) {
      if (slotOcupado) {
        if (!predicaItems || predicaItems.length === 0) {
          // Eliminar
          await deleteDoc(docIglesia(groupId, PREDICAS, `predica${index + 1}`));
          setSlots((prev) => {
            const nuevo = [...prev];
            nuevo[index] = false;
            return nuevo;
          });
          showNotif("info", `🗑️ Predica ${index + 1} eliminada`);
        } else {
          // Actualizar
          await guardarPredica(
            groupId,
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
    showNotif("error", "Error al procesar la prédica");
    console.error(error);
  }
};

// Consultar versiculosy capitulos
export const obtenerVersiculo = async (
  sigla,
  capitulo,
  numeroVersiculo,
  tipo,
  showNotif
) => {
  try {
    if (!sigla || !capitulo || !numeroVersiculo) {
      showNotif(
        "error",
        "Parámetros inválidos. Debes enviar libro, capítulo y versículo."
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
    let texto;
    if (tipo === "versiculo") {
      texto = data.versiculos?.[numeroVersiculo.toString()] || null;
    } else {
      texto = data.chapter_html || null;
    }

    if (!texto) {
      showNotif(
        "error",
        tipo === "capitulo"
          ? "🔎 Capítulo no encontrado"
          : "🔎 Versículo no encontrado"
      );
      return;
    }
    showNotif(
      "success",
      tipo === "capitulo" ? "Capítulo encontrado" : "Versículo encontrado"
    );

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
