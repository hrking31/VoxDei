// import { useState } from "react";
// import { doc, getDoc } from "firebase/firestore";
// import { database, db } from "../Firebase/Firebase";
// import { ref, set } from "firebase/database";

// const obtenerVersiculo = async (sigla, capitulo, numeroVersiculo) => {
//   const docId = `${sigla.toUpperCase()}_${capitulo}`;
//   const ref = doc(db, "biblia", docId);
//   const snapshot = await getDoc(ref);

//   if (!snapshot.exists()) {
//     throw new Error("❌ Documento no encontrado");
//   }

//   const data = snapshot.data();
//   const texto = data.versiculos?.[numeroVersiculo.toString()];

//   if (!texto) {
//     throw new Error("⚠️ Versículo no encontrado");
//   }

//   return {
//     texto,
//     libro: data.libro,
//     capitulo: data.capitulo,
//     numero: numeroVersiculo,
//   };
// };

// const VersiculoViewer = () => {
//   const [resultado, setResultado] = useState(null);
//   const [error, setError] = useState("");
//   const [sigla, setSigla] = useState("GEN");
//   const [capitulo, setCapitulo] = useState(1);
//   const [versiculo, setVersiculo] = useState(1);

//   const manejarConsulta = async () => {
//     try {
//       const data = await obtenerVersiculo(sigla, capitulo, versiculo);
//       setResultado(data);
//       console.log(data);
//       setError("");
//     } catch (err) {
//       setResultado(null);
//       setError(err.message);
//     }
//   };

//   const handleProject = () => {
//     set(ref(database, "displayMessage"), {
//       text: resultado.texto,
//       timestamp: Date.now(),
//     });
//   };

//   return (
//     <div className="max-w-xl mx-auto p-8 font-sans">
//       <h2 className="text-xl font-bold mb-4">🔎 Consultar versículo</h2>

//       <div className="flex flex-wrap gap-2 mb-4">
//         <input
//           type="text"
//           placeholder="Sigla (ej. GEN)"
//           value={sigla}
//           onChange={(e) => setSigla(e.target.value)}
//           className="border border-gray-300 rounded px-2 py-1 w-24"
//         />
//         <input
//           type="number"
//           placeholder="Capítulo"
//           value={capitulo}
//           onChange={(e) => setCapitulo(Number(e.target.value))}
//           className="border border-gray-300 rounded px-2 py-1 w-20"
//         />
//         <input
//           type="number"
//           placeholder="Versículo"
//           value={versiculo}
//           onChange={(e) => setVersiculo(Number(e.target.value))}
//           className="border border-gray-300 rounded px-2 py-1 w-20"
//         />
//       </div>

//       <div className="flex flex-col gap-2">
//         <button
//           onClick={manejarConsulta}
//           className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded shadow"
//         >
//           📖 Obtener Versículo
//         </button>

//       {resultado && (
//         <div className="mt-6 p-4 border border-gray-300 rounded-lg bg-white text-black shadow">
//           <strong className="block mb-2">
//             {resultado.libro} {resultado.capitulo}:{resultado.numero}
//           </strong>
//           <p>{resultado.texto}</p>
//         </div>
//       )}

//               <button
//                 onClick={handleProject}
//                 className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded shadow"
//               >
//                 Proyectar
//               </button>
//             </div>

//       {error && <p className="text-red-600 mt-4 font-medium">{error}</p>}
//     </div>
//   );
// };

// export default VersiculoViewer;

import React, { useState } from "react";
import { db } from "../Firebase/Firebase";
import { doc, getDoc } from "firebase/firestore";
import {
  librosAntiguo,
  librosNuevo,
} from "../LibrosBiblia/LibrosBibliaincompleto";

// Traducción de libros con números
const traducirLibrosNumerados = (libros) => {
  return libros.map((libro) => {
    switch (libro.sigla) {
      case "1RE":
        return { ...libro, sigla: "1KI", nombre: "1 Kings" };
      case "2RE":
        return { ...libro, sigla: "2KI", nombre: "2 Kings" };
      case "1CR":
        return { ...libro, sigla: "1CH", nombre: "1 Chronicles" };
      case "2CR":
        return { ...libro, sigla: "2CH", nombre: "2 Chronicles" };
      default:
        return libro;
    }
  });
};

// Función para contar la cantidad de versículos de un capítulo
const contarVersiculos = async (sigla, numeroCapitulo) => {
  const docId = `${sigla}_${numeroCapitulo}`;
  const snapshot = await getDoc(doc(db, "biblia", docId));

  if (!snapshot.exists()) return 0; // vacío si no existe

  const data = snapshot.data();
  return Object.keys(data.versiculos || {}).length;
};

// Función para generar el JSON de la Biblia con cantidad de versículos
const generarBibliaJson = async (setMensaje) => {
  setMensaje("⏳ Iniciando generación de la Biblia...");

  const biblia = { antiguo: [], nuevo: [] };

  const procesarLibros = async (libros, tipo) => {
    const librosTraducidos = traducirLibrosNumerados(libros);
    for (const libro of librosTraducidos) {
      const libroData = {
        sigla: libro.sigla,
        nombre: libro.nombre,
        capitulos: libro.capitulos,
      };

      for (let i = 1; i <= libro.capitulos; i++) {
        const cantidad = await contarVersiculos(libro.sigla, i);
        libroData[`capitulo${i}`] = cantidad;

        if (cantidad === 0) {
          console.warn(`⚠️ Vacío: ${libro.sigla} Cap ${i}`);
        }
      }

      biblia[tipo].push(libroData);
    }
  };

  await procesarLibros(librosAntiguo, "antiguo");
  await procesarLibros(librosNuevo, "nuevo");

  // Descargar como JSON
  const dataStr =
    "data:text/json;charset=utf-8," +
    encodeURIComponent(JSON.stringify(biblia, null, 2));
  const dlAnchor = document.createElement("a");
  dlAnchor.setAttribute("href", dataStr);
  dlAnchor.setAttribute("download", "biblia_cantidad_versiculos.json");
  dlAnchor.click();

  setMensaje("✅ JSON generado y descargado correctamente");
  console.log("✅ JSON generado y descargado");
};

const DescargarCantidadVersiculos = () => {
  const [subiendo, setSubiendo] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const manejarGeneracion = async () => {
    setSubiendo(true);
    await generarBibliaJson(setMensaje);
    setSubiendo(false);
  };

  return (
    <div
      style={{ textAlign: "center", padding: "2rem", fontFamily: "sans-serif" }}
    >
      <h2>📥 Descargar cantidad de versículos por capítulo</h2>
      <button
        onClick={manejarGeneracion}
        disabled={subiendo}
        style={{
          padding: "1rem 2rem",
          fontSize: "1.2rem",
          borderRadius: "8px",
          border: "none",
          backgroundColor: subiendo ? "#ccc" : "#4CAF50",
          color: "white",
          cursor: subiendo ? "not-allowed" : "pointer",
        }}
      >
        {subiendo ? "⏳ Generando..." : "Generar y Descargar JSON"}
      </button>

      {mensaje && (
        <p style={{ marginTop: "1rem", fontSize: "1rem", color: "#333" }}>
          {mensaje}
        </p>
      )}
      <p style={{ marginTop: "0.5rem", fontSize: "0.9rem", color: "#555" }}>
        ⚠️ Se mostrarán advertencias en la consola si algún capítulo no tiene
        versículos.
      </p>
    </div>
  );
};

export default DescargarCantidadVersiculos;
