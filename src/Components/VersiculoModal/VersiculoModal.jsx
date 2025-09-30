import { XMarkIcon } from "@heroicons/react/24/solid";

export default function VersiculoModal({
  open,
  onClose,
  selecLibro,
  onVersiculo,
}) {
  if (open !== "versiculo" || !selecLibro) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 bg-app-dark overflow-auto"
      onClick={onClose}
    >
      <div
        className="bg-app-light rounded-lg shadow-lg max-w-4xl w-full p-6 max-h-[80vh] overflow-y-auto  scrollbar-custom"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center ">
          <h2 className="text-2xl text-app-main font-bold ">
            Capitulo {selecLibro.capitulo}
          </h2>

          <button
            onClick={onClose}
            className=" text-app-accent hover:text-app-error"
          >
            <XMarkIcon className="h-8 w-8 " />
          </button>
        </div>

        <ul className="grid grid-cols-6 sm:grid-cols-6 md:grid-cols-4 lg:grid-cols-4 text-app-muted gap-4">
          {Array.from(
            { length: selecLibro[`capitulo${selecLibro.capitulo}`] },
            (_, i) => i + 1
          ).map((capitulo) => (
            <li
              key={capitulo}
              className="border-b py-2 cursor-pointer hover:bg-app-border hover:text-app-main rounded"
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
