import { doc, setDoc } from "firebase/firestore";
import { db } from "../Firebase/Firebase";
// import bibleData from "../../assets/RVR1960.json"; //cargar el archivo bibleData a la carpeta assets, se encuentra en gitHub VoxDei Rey

const SubirBiblia = () => {
  const subirBiblia = async () => {
    try {
      for (const libro of bibleData.books) {
        const sigla = libro.book_usfm;
        const nombreLibro = libro.name;

        for (const capituloData of libro.chapters) {
          if (!capituloData.is_chapter) continue;

          const chapterId = capituloData.chapter_usfm;
          const match = chapterId.match(/^([A-Z]+)\.(\d+)$/);
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
        }
      }

      alert("✅ Toda la Biblia fue subida correctamente a Firestore");
    } catch (error) {
      console.error("❌ Error al subir la Biblia:", error);
    }
  };

  return (
    <button onClick={subirBiblia}>📖 Subir toda la Biblia a Firestore</button>
  );
};

export default SubirBiblia;