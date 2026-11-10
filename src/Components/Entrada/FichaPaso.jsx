import { ArrowRightIcon } from "@heroicons/react/24/solid";

// Ficha de la entrada: se toca entera. Número (si hay dos pasos), dibujo,
// título con flecha y una o dos líneas.
export default function FichaPaso({ numero, titulo, lineas, principal, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex w-full flex-1 flex-col gap-2.5 rounded-2xl border bg-app-light p-3 text-left transition hover:-translate-y-0.5 hover:border-app-main/80 hover:shadow-barra ${
        principal ? "border-app-main/70" : "border-app-border"
      }`}
    >
      {numero && (
        <span className="absolute left-5 top-5 z-10 grid h-6 w-6 place-items-center rounded-full bg-app-main text-xs font-bold text-app-dark">
          {numero}
        </span>
      )}
      <span className="block h-24 sm:h-36">{children}</span>
      <span className="flex items-center justify-between gap-2 px-1 text-xl font-bold text-app-texto">
        {titulo}
        <ArrowRightIcon className="h-5 w-5 text-app-main transition group-hover:translate-x-1" aria-hidden="true" />
      </span>
      <span className="flex flex-col gap-0.5 px-1 pb-0.5 text-xs text-app-muted">
        {lineas.map((linea) => (
          <span key={linea}>{linea}</span>
        ))}
      </span>
    </button>
  );
}
