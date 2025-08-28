import { XMarkIcon } from "@heroicons/react/24/solid";

export default function VersiculoFinalModal({
  open,
  onClose,
  selecLibro,
  onVersiculo,
}) {
  if (open !== "versiculoFinal" || !selecLibro) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-lg max-w-4xl w-full p-6 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center ">
          <h2 className="text-2xl font-bold">
            Versiculo {selecLibro.versiculo} al ...
          </h2>

          <button
            onClick={onClose}
            className=" text-red-500 hover:text-red-700"
          >
            <XMarkIcon className="h-8 w-8 " />
          </button>
        </div>

        <ul className="grid grid-cols-6 sm:grid-cols-6 md:grid-cols-4 lg:grid-cols-4 gap-4">
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
      </div>
    </div>
  );
}
