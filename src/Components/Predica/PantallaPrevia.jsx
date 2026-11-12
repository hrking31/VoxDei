// Mini pantalla del templo: cómo se ve (o se verá) una pieza proyectada.
// `grande` para el púlpito; sin él, la vista previa al preparar.
export default function PantallaPrevia({ pieza, grande = false, etiqueta = "Así se verá en el templo" }) {
  const texto = pieza?.tipo === "versiculo" ? pieza.contenido?.texto : pieza?.contenido;
  const cita = pieza?.tipo === "versiculo" ? pieza.contenido?.cita : null;

  return (
    <figure
      aria-label={etiqueta}
      data-pantalla-previa
      className={`pantalla-templo m-0 flex aspect-video w-full flex-col items-center justify-center overflow-hidden border-app-aviso shadow-xl ${
        grande ? "gap-3 rounded-xl border-8 px-8 py-6" : "gap-2 rounded-lg border-4 px-4 py-3"
      }`}
    >
      {pieza?.tipo === "imagen" ? (
        // Como en el templo: la imagen ocupa el centro, entera.
        <img src={pieza.contenido?.url} alt={pieza.contenido?.nombre || "Imagen"} className="h-full w-full rounded object-contain" />
      ) : pieza ? (
        <>
          <p
            className={`m-0 text-center text-app-texto ${pieza.tipo === "titulo" ? "font-bold" : ""} ${
              grande ? "text-lg leading-snug sm:text-2xl" : "text-xs leading-snug"
            } line-clamp-6`}
          >
            {texto}
          </p>
          {cita && (
            <figcaption className={`font-bold tracking-widest text-app-main uppercase ${grande ? "text-sm" : "text-diminuto"}`}>
              {cita}
            </figcaption>
          )}
        </>
      ) : (
        <p className={`m-0 text-center text-app-muted ${grande ? "text-base" : "text-xs"}`}>
          Toca una pieza para verla aquí
        </p>
      )}
    </figure>
  );
}
