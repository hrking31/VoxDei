// El cambio entre «Servicios» y «Programación» del Cronograma para quien NO tiene la columna
// derecha (celular, tableta y operadores): unas pestañas arriba del centro (25-11-2026). En el
// computador, quien programa lo cambia con la franja dorada de la columna, que es título y botón
// a la vez (ver ViewCronograma).
const PESTANAS = [
  ["servicios", "Servicios"],
  ["programacion", "Programación"],
];

export default function PestanasCronograma({ valor, alCambiar }) {
  return (
    <div className="shrink-0 px-2 pt-2 sm:px-4">
      <div role="tablist" aria-label="Cronograma" className="inline-flex overflow-hidden rounded border border-app-border">
        {PESTANAS.map(([clave, texto]) => (
          <button
            key={clave}
            type="button"
            role="tab"
            aria-selected={valor === clave}
            onClick={() => alCambiar(clave)}
            className={`px-3 py-1.5 text-xs font-bold transition sm:text-sm ${
              valor === clave ? "bg-app-main text-app-dark" : "text-app-muted hover:text-app-texto"
            }`}
          >
            {texto}
          </button>
        ))}
      </div>
    </div>
  );
}
