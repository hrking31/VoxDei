import { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../Firebase/Firebase";

// Herramienta de carga masiva de la Biblia. Es de un solo uso: normalmente
// está desmontada (ver ViewDisplay).
//
// El archivo con la Biblia se elige desde el disco en vez de importarse: antes
// se usaba una variable `bibleData` cuyo import estaba comentado, así que el
// componente reventaba apenas se pulsaba el botón.
//
// OJO: las reglas de seguridad dejan la colección `biblia` como solo lectura,
// porque es contenido común a todas las iglesias. Para volver a cargarla hay
// que hacerlo con credenciales de administrador (un script con firebase-admin)
// o permitir la escritura temporalmente en firestore.rules.
const SubirBiblia = () => {
  const [subiendo, setSubiendo] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [bibleData, setBibleData] = useState(null);

  const cargarArchivo = async (evento) => {
    const archivo = evento.target.files?.[0];
    if (!archivo) return;

    try {
      const contenido = JSON.parse(await archivo.text());

      if (!Array.isArray(contenido?.books)) {
        setMensaje("❌ El archivo no tiene la lista de libros esperada.");
        setBibleData(null);
        return;
      }

      setBibleData(contenido);
      setMensaje(`📗 Archivo listo: ${contenido.books.length} libros.`);
    } catch (error) {
      console.error("Error al leer el archivo:", error);
      setMensaje("❌ No se pudo leer el archivo. ¿Es un JSON válido?");
      setBibleData(null);
    }
  };

  const subirBiblia = async () => {
    if (!bibleData) {
      setMensaje("🚫 Primero elige el archivo con la Biblia.");
      return;
    }

    setSubiendo(true);
    setMensaje("🚀 Iniciando subida de la Biblia...");

    const fallidos = [];

    try {
      for (const libro of bibleData.books) {
        const sigla = libro.book_usfm;
        const nombreLibro = libro.name;

        for (const capituloData of libro.chapters) {
          if (!capituloData.is_chapter) continue;

          const chapterId = capituloData.chapter_usfm;
          const match = chapterId.match(/^(\d?[A-Z]+)\.(\d+)$/);
          if (!match) continue;

          const capitulo = parseInt(match[2]);

          const versiculos = {};
          let chapterHTML = "";

          for (const item of capituloData.items) {
            if (item.type === "verse") {
              const numero = item.verse_numbers?.[0]?.toString() ?? "0";
              const texto = item.lines?.join(" ") ?? "⚠️ Sin texto";
              versiculos[numero] = texto;
              chapterHTML += `<p><b>${numero}</b> ${texto}</p>`;
            }
            if (item.type === "heading1") {
              chapterHTML += `<h2>${item.lines?.join(" ")}</h2>`;
            }
          }

          if (Object.keys(versiculos).length === 0) {
            console.warn(`⚠️ Capítulo ${sigla} ${capitulo} sin versículos`);
            fallidos.push(`${sigla} ${capitulo}`);
            continue;
          }

          const docId = `${sigla}_${capitulo}`;
          await setDoc(doc(db, "biblia", docId), {
            sigla,
            libro: nombreLibro,
            capitulo,
            versiculos,
            chapter_html: chapterHTML,
          });

          setMensaje(`📖 Subiendo: ${nombreLibro} capítulo ${capitulo}`);
        }
      }

      setMensaje("🎉 Toda la Biblia fue subida correctamente a Firestore!");

      if (fallidos.length > 0) {
        console.warn("⚠️ Los siguientes capítulos no se subieron:", fallidos);
      }
    } catch (error) {
      console.error("❌ Error al subir la Biblia:", error);
      setMensaje(
        "❌ Error al subir la Biblia. Si dice que faltan permisos, es " +
          "porque la colección está protegida como solo lectura."
      );
    }

    setSubiendo(false);
  };

  return (
    <div className="flex flex-col items-center gap-3 mt-8 text-app-muted">
      <input
        type="file"
        accept="application/json,.json"
        onChange={cargarArchivo}
        className="border border-app-border rounded p-1 text-sm"
      />

      <button
        onClick={subirBiblia}
        disabled={subiendo || !bibleData}
        className={`px-6 py-3 rounded-lg text-white font-semibold ${
          subiendo || !bibleData
            ? "bg-app-border cursor-not-allowed"
            : "bg-green-500"
        }`}
      >
        {subiendo ? "⏳ Subiendo..." : "📖 Subir toda la Biblia"}
      </button>

      {mensaje && <p className="text-sm">{mensaje}</p>}
    </div>
  );
};

export default SubirBiblia;
