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
    <div className="relative flex items-center justify-center w-full h-full">
      {/* Botón cerrado */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="w-full h-full flex items-center justify-center rounded bg-app-main focus:outline-none"
        >
          <MagnifyingGlassIcon className="w-5 sm:w-6 h-5 sm:h-6 text-app-light" />
        </button>
      )}

      {/* Campo de búsqueda */}
      {open && (
        <div className="flex items-center w-full bg-app-light border-2 border-app-border rounded-full shadow-md overflow-hidden">
          <button
            onClick={() => {
              setOpen(false);
              setResultados([]);
              setQuery("");
            }}
            className="flex items-center justify-center p-1.5 bg-app-main focus:outline-none"
          >
            <MagnifyingGlassIcon className="w-6 sm:w-7 h-6 sm:h-7 p-1 text-app-light" />
          </button>
          <motion.input
            type="text"
            value={query}
            onChange={(e) => handleBuscar(e.target.value)}
            placeholder="Buscar..."
            autoFocus
            className="flex-1 bg-transparent px-3 py-2 text-app-muted focus:outline-none text-sm sm:text-base"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          />
        </div>
      )}

      {/* Resultados */}
      {resultados.length > 0 && (
        <ul
          className="
            absolute 
            top-[110%] 
            left-1/2 
            -translate-x-1/2 
            w-[100%] sm:w-[90%] 
            bg-app-light
            border-2 border-app-border
            rounded-lg 
            shadow-lg 
            max-h-64 
            overflow-y-auto 
            z-20 
            text-app-muted
            text-sm sm:text-base
            scrollbar-custom
          "
        >
          {resultados.map((libro, idx) => (
            <li
              key={idx}
              onClick={() => handleSeleccionarLibro(libro)}
              className="px-4 py-2 cursor-pointer hover:bg-app-main hover:text-white transition-colors duration-200"
            >
              {libro.nombre}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
