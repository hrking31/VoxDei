import { db } from "../Firebase/Firebase";
import { doc, getDoc } from "firebase/firestore";
import { leerCapituloDHH } from "../Biblia/bibliaDHH";
import { libroEnVersion } from "../Biblia/versionesBiblia";

// Lee un capítulo de la versión elegida: la RVR1960 de Firestore (`biblia`) y,
// TEMPORAL DHH, la Dios Habla Hoy del repositorio público (ver bibliaDHH.js).
// Las dos devuelven la misma forma, así que lo demás no distingue la versión.
const leerCapitulo = async (sigla, capitulo, version, showNotif) => {
  if (version === "DHHS94") {
    try {
      return await leerCapituloDHH(sigla, capitulo, libroEnVersion(sigla, version)?.nombre);
    } catch (error) {
      console.error("No se pudo bajar la Dios Habla Hoy:", error);
      showNotif("error", "No se pudo cargar la Dios Habla Hoy. Revisa el internet o cambia a RVR1960.");
      return undefined;
    }
  }
  const snapshot = await getDoc(doc(db, "biblia", `${sigla.toUpperCase()}_${capitulo}`));
  return snapshot.exists() ? snapshot.data() : null;
};

// Consultar versiculosy capitulos. `version`: la Biblia elegida en SelectorBiblia
// (`versionBiblia` del contexto); sin ella, la RVR1960.
export const obtenerVersiculo = async (
  sigla,
  capitulo,
  numeroVersiculo,
  tipo,
  showNotif,
  version = "RVR1960"
) => {
  try {
    if (!sigla || !capitulo || !numeroVersiculo) {
      showNotif(
        "error",
        "Parámetros inválidos. Debes enviar libro, capítulo y versículo."
      );
      return;
    }

    const data = await leerCapitulo(sigla, capitulo, version, showNotif);
    if (data === undefined) return; // ya avisó
    if (!data) {
      showNotif("error", "📄 Documento no encontrado");
      return;
    }

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
