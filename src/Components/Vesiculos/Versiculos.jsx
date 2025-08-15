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
