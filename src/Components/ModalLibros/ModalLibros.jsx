import { useMemo } from "react";
import { XMarkIcon } from "@heroicons/react/24/solid";
import { librosAntiguo, librosNuevo } from "../LibrosBiblia/LibrosBiblia";

export default function LibrosModal({ open, onClose, tipo, onLibro }) {
  if (open !== "libro") return null;

  const TipoLibros = useMemo(
    () => (tipo === "antiguo" ? librosAntiguo : librosNuevo),
    [tipo]
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-libros"
      className="fixed inset-0 flex items-center justify-center z-50 bg-app-dark/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-app-light rounded-lg shadow-lg w-[90%] sm:w-[600px] md:w-[700px] lg:w-[800px] 
                   h-[80vh] max-h-[80vh] p-6 overflow-y-auto scrollbar-custom"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Encabezado */}
        <div className="flex justify-between items-center mb-4 shrink-0">
          <h2
            id="titulo-libros"
            className="text-2xl text-app-main font-bold truncate"
          >
            {tipo === "antiguo"
              ? "Libros Antiguo Testamento"
              : "Libros Nuevo Testamento"}
          </h2>
          <button
            onClick={onClose}
            className="text-app-accent hover:text-app-error transition-colors"
          >
            <XMarkIcon className="h-8 w-8" />
          </button>
        </div>

        {/* Contenido scrollable */}
        <ul className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-app-muted overflow-y-auto scrollbar-custom flex-grow">
          {TipoLibros.map((libro, index) => (
            <li
              key={index}
              className="border-b py-2 cursor-pointer hover:bg-app-border hover:text-app-main rounded"
              onClick={() => onLibro(libro)}
            >
              <span className="font-semibold">{libro.nombre}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
