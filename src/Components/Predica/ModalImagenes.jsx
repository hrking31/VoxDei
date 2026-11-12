import { useEffect } from "react";
import { PhotoIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { useImagenesIglesia } from "../Imagenes/imagenesIglesia.js";

// «Mis imágenes» de Preparar (11 de noviembre de 2026): las que la iglesia ya
// tiene en la sección Imágenes; tocar una la agrega al bosquejo. Solo escucha
// la colección mientras está abierta. Escape o tocar fuera la cierra.
export default function ModalImagenes({ abierto, groupId, onElegir, onCerrar }) {
  const imagenes = useImagenesIglesia(groupId, abierto);

  useEffect(() => {
    if (!abierto) return undefined;
    const alPulsar = (e) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", alPulsar);
    return () => window.removeEventListener("keydown", alPulsar);
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-app-velo p-4" onClick={onCerrar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-mis-imagenes"
        className="flex max-h-4/5 w-full max-w-2xl flex-col gap-4 rounded-2xl border border-app-border bg-app-dark p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id="titulo-mis-imagenes" className="text-lg font-bold text-app-texto">
            Mis imágenes
          </h2>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="grid h-10 w-10 place-items-center rounded-xl text-app-muted hover:text-app-texto">
            <XMarkIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {imagenes === null ? (
          <p className="m-0 py-10 text-center text-sm text-app-muted">Cargando imágenes…</p>
        ) : imagenes.length === 0 ? (
          <p className="m-0 flex flex-col items-center gap-2 py-10 text-center text-sm text-app-muted">
            <PhotoIcon className="h-8 w-8" aria-hidden="true" />
            Aún no hay imágenes. Súbelas con «Subir imagen» o en la sección Imágenes.
          </p>
        ) : (
          <ul className="scrollbar-custom m-0 grid min-h-0 list-none grid-cols-2 gap-2 overflow-y-auto p-0 sm:grid-cols-4">
            {imagenes.map((imagen) => (
              <li key={imagen.id}>
                <button
                  type="button"
                  onClick={() => onElegir(imagen)}
                  aria-label={`Agregar ${imagen.name || "imagen"}`}
                  title={imagen.name}
                  className="block aspect-video w-full overflow-hidden rounded-xl border-2 border-transparent bg-app-aviso transition hover:border-app-main focus-visible:border-app-main"
                >
                  <img src={imagen.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
