import { useState } from "react";
import { motion } from "framer-motion";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { librosAntiguo, librosNuevo } from "../LibrosBiblia/LibrosBiblia";

// Normaliza texto (minúsculas, sin acentos, y sin "S. " inicial)
const normalizar = (texto) =>
  texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^s\.\s*/i, ""); // Elimina "S. " al inicio (como "S. Mateo")

export default function BuscadorLibros({ open, setOpen, onLibroSeleccionado }) {
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState([]);

  const handleBuscar = (valor) => {
    setQuery(valor);

    if (valor.trim() === "") {
      setResultados([]);
      return;
    }

    const filtro = normalizar(valor);

    // Filtra todos los libros que incluyan la secuencia buscada
    const coincidenciasNuevo = librosNuevo.filter((libro) =>
      normalizar(libro.nombre).includes(filtro)
    );

    const coincidenciasAntiguo = librosAntiguo.filter((libro) =>
      normalizar(libro.nombre).includes(filtro)
    );

    const todos = [...coincidenciasNuevo, ...coincidenciasAntiguo].sort(
      (a, b) => normalizar(a.nombre).localeCompare(normalizar(b.nombre))
    );

    setResultados(todos);
  };

  const handleSeleccionarLibro = (libro) => {
    setQuery(libro.nombre);
    setResultados([]);
    onLibroSeleccionado(libro);
  };

  return (
    <div className="flex items-center justify-center w-full">
      <motion.div
        animate={{
          width: open ? 700 : 40,
          backgroundColor: open ? "#ffffff" : "rgba(0, 0, 0, 0)",
          boxShadow: open ? "0 2px 8px rgba(0,0,0,0.2)" : "none",
        }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className={`flex items-center ${
          open ? "rounded-full overflow-hidden" : ""
        }`}
      >
        {/* Ícono de lupa */}
        <button
          onClick={() => setOpen(!open)}
          className={`focus:outline-none bg-app-main ${
            open ? "p-1" : "rounded p-0.5 "
          }`}
        >
          <MagnifyingGlassIcon
            className={`w-6 sm:w-7 h-6 sm:h-7 p-1 ${
              open ? "text-app-light" : "text-app-light "
            }`}
          />
        </button>

        {/* Campo de búsqueda */}
        {open && (
          <motion.input
            type="text"
            value={query}
            onChange={(e) => handleBuscar(e.target.value)}
            placeholder="Buscar..."
            autoFocus
            className="flex-1 bg-transparent px-2 py-1 text-gray-800 focus:outline-none"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          />
        )}
      </motion.div>

      {/* Resultados */}
      {resultados.length > 0 && (
        <ul className="absolute top-20 text-app-main bg-app-light border border-app-accent rounded-md shadow-lg max-h-60 overflow-y-auto z-10">
          {resultados.map((libro, idx) => (
            <li
              key={idx}
              onClick={() => handleSeleccionarLibro(libro)}
              className="px-3 py-2 cursor-pointer hover:bg-app-dark transition text-sm"
            >
              {libro.nombre}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
