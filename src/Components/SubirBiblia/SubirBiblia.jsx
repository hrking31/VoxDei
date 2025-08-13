import React, { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../Firebase/Firebase";
import bibleData from "../../assets/RVR1960.json"; 

const SubirBiblia = () => {
  const [subiendo, setSubiendo] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const subirBiblia = async () => {
    setSubiendo(true);
    setMensaje("🚀 Iniciando subida de la Biblia...");
    console.log("🚀 Iniciando subida de la Biblia...");

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

          console.log(`✅ Subido: ${nombreLibro} capítulo ${capitulo}`);
          setMensaje(`📖 Subiendo: ${nombreLibro} capítulo ${capitulo}`);
        }
      }

      setMensaje("🎉 Toda la Biblia fue subida correctamente a Firestore!");
      console.log("🎉 Toda la Biblia fue subida correctamente a Firestore!");
      if (fallidos.length > 0) {
        console.warn("⚠️ Los siguientes capítulos no se subieron:", fallidos);
      }
    } catch (error) {
      console.error("❌ Error al subir la Biblia:", error);
      setMensaje("❌ Error al subir la Biblia, revisa la consola.");
    }

    setSubiendo(false);
  };

  return (
    <div style={{ textAlign: "center", marginTop: "2rem" }}>
      <button
        onClick={subirBiblia}
        disabled={subiendo}
        style={{
          padding: "1rem 2rem",
          fontSize: "1.2rem",
          backgroundColor: subiendo ? "#ccc" : "#4caf50",
          color: "white",
          border: "none",
          borderRadius: "8px",
          cursor: subiendo ? "not-allowed" : "pointer",
        }}
      >
        {subiendo ? "⏳ Subiendo..." : "📖 Subir toda la Biblia"}
      </button>
      {mensaje && (
        <p style={{ marginTop: "1rem", fontSize: "1rem", color: "#333" }}>
          {mensaje}
        </p>
      )}
    </div>
  );
};

export default SubirBiblia;
