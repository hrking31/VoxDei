import { ArrowRightIcon } from "@heroicons/react/24/solid";

// Ficha de la entrada: se toca entera. Número (si hay dos pasos), dibujo,
// título con flecha y una o dos líneas.
// `relleno` (25 de noviembre de 2026, estilo de la «opción 3» del lienzo): la ficha va
// rellena de dorado, con el texto oscuro; sin él, solo lleva el borde dorado.
export default function FichaPaso({ numero, titulo, lineas, relleno = false, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex w-full flex-1 flex-col gap-2.5 rounded-2xl border-2 border-app-main p-3 text-center transition hover:-translate-y-0.5 hover:shadow-barra ${
        relleno ? "bg-app-main" : "bg-transparent"
      }`}
    >
      {numero && (
        <span className={`absolute left-5 top-5 z-10 grid h-6 w-6 place-items-center rounded-full text-xs font-bold ${
            relleno ? "bg-app-dark text-app-main ring-1 ring-app-main" : "bg-app-main text-app-dark"
          }`}>
          {numero}
        </span>
      )}
      <span className="block h-24 sm:h-48 lg:h-60">{children}</span>
      {/* Centrado, como los botones de la entrada de siempre */}
      <span
        className={`flex items-center justify-center gap-2 px-1 text-xl font-bold lg:text-2xl ${relleno ? "text-app-dark" : "text-app-texto"}`}
      >
        {titulo}
        <ArrowRightIcon className={`h-5 w-5 transition group-hover:translate-x-1 ${relleno ? "text-app-dark" : "text-app-main"}`} aria-hidden="true" />
      </span>
      <span
        className={`flex flex-col items-center gap-0.5 px-1 pb-0.5 text-xs sm:text-sm lg:text-base ${relleno ? "text-app-dark" : "text-app-muted"}`}
      >
        {lineas.map((linea) => (
          <span key={linea}>{linea}</span>
        ))}
      </span>
    </button>
  );
}
