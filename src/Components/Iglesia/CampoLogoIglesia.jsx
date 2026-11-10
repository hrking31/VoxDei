import { useId } from "react";
import { BuildingLibraryIcon } from "@heroicons/react/24/outline";

// Elegir el logo de la iglesia, con vista previa. Lo usan el registro y la
// edición de los datos de la iglesia. `vista` es la URL a mostrar (la del
// archivo elegido o la del logo guardado).
export default function CampoLogoIglesia({ vista, onElegir }) {
  const id = useId();
  return (
    <div className="flex shrink-0 flex-col items-center gap-1">
      <input
        id={id}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const archivo = e.target.files?.[0];
          if (archivo) onElegir(archivo);
        }}
      />
      <label
        htmlFor={id}
        title="Logo de la iglesia (opcional)"
        className="grid h-14 w-14 cursor-pointer place-items-center overflow-hidden rounded-xl border border-dashed border-app-border bg-app-dark transition hover:border-app-main"
      >
        {vista ? (
          <img src={vista} alt="Logo de la iglesia" className="h-full w-full object-cover" />
        ) : (
          <BuildingLibraryIcon className="h-7 w-7 text-app-muted" aria-hidden="true" />
        )}
        <span className="sr-only">Elegir el logo de la iglesia</span>
      </label>
      <span className="text-xs text-app-muted">Logo</span>
    </div>
  );
}
