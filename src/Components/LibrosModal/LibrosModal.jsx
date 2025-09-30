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
      className="fixed inset-0 flex items-center justify-center z-50 bg-app-dark overflow-auto"
      onClick={onClose}
    >
      <div
        className=" bg-app-light rounded-lg shadow-lg max-w-4xl w-full p-6 max-h-[80vh] overflow-y-auto scrollbar-custom"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center">
          <h2 className="text-2xl text-app-main font-bold ">
            {tipo === "antiguo"
              ? "Libros Antiguo Testamento"
              : "Libros Nuevo Testamento"}
          </h2>
          <button
            onClick={onClose}
            className=" text-app-accent hover:text-app-error"
          >
            <XMarkIcon className="h-8 w-8 " />
          </button>
        </div>

        <ul className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4  text-app-muted gap-2">
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
