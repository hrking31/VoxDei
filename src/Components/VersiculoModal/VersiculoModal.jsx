export default function VersiculoModal({ open, onClose, selecLibro, onVersiculo}) {
  if (open !== "versiculo" || !selecLibro) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-lg max-w-4xl w-full p-6 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold mb-4">
          Capitulo {selecLibro.capitulo}
        </h2>

        <ul className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from(
            { length: selecLibro[`capitulo${selecLibro.capitulo}`] },
            (_, i) => i + 1
          ).map((capitulo) => (
            <li
              key={capitulo}
              className="border-b py-2 cursor-pointer hover:bg-gray-200 rounded"
              onClick={() => onVersiculo(capitulo)}
            >
              <span className="font-semibold">{capitulo}</span>
            </li>
          ))}
        </ul>

        <button
          onClick={onClose}
          className="mt-6 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
