import { motion } from "framer-motion";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

export default function BuscadorExpandible({ open, setOpen, query, handleBuscar }) {
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
            open ? "p-1" : "p-0.5 "
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
    </div>
  );
}
