import { StarIcon, PencilIcon, TrashIcon, TvIcon } from "@heroicons/react/24/solid";

// Recuadro de favoritos que comparten Ticker y Mensajes: las mismas tarjetas y
// las mismas acciones. El texto proyectado se marca en verde, igual que la
// lámina en pantalla de las canciones.
//
// `etiqueta` es el nombre en singular ("Mensaje" / "Ticker"), que se usa en los
// títulos de cada tarjeta.
export default function FavoritosTexto({
  etiqueta,
  items,
  numProyectado,
  onProyectar,
  onEditar,
  onEliminar,
}) {
  return (
    <div className="p-2 sm:p-4">
      <div className="flex items-center gap-2 mb-2">
        <h2 className="font-bold text-app-main flex items-center gap-1 min-w-0">
          <StarIcon className="w-5 h-5 text-app-main shrink-0" />
          <span className="truncate">Favoritos</span>
        </h2>

        {/* La cuenta, en un chip gris para no competir con el título */}
        <span className="shrink-0 rounded-full bg-app-border/40 px-2 py-0.5 text-xs text-app-muted">
          {items.length} de 6
        </span>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-app-muted">
          Escribe un texto arriba y tócale la estrella para guardarlo aquí y
          reutilizarlo cuando quieras.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {items.map((item) => {
            const enPantalla = numProyectado === item.num;

            return (
              <div
                key={item.num}
                className={`flex flex-col rounded-lg border-2 p-2 transition-colors ${
                  enPantalla
                    ? "border-app-success bg-app-success/10"
                    : "border-app-border hover:border-app-main"
                }`}
              >
                {/* Los botones arriba, a la derecha; el texto debajo */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-app-main truncate">
                    {etiqueta} {item.num}
                    {enPantalla && " · en pantalla"}
                  </span>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => onProyectar(item)}
                      title="Proyectar"
                      className="p-1 rounded-full hover:bg-app-border"
                    >
                      <TvIcon
                        className={`w-5 h-5 ${
                          enPantalla ? "text-app-success" : "text-app-muted"
                        }`}
                      />
                    </button>

                    <button
                      onClick={() => onEditar(item)}
                      title="Editar"
                      className="p-1 rounded-full hover:bg-app-border"
                    >
                      <PencilIcon className="w-5 h-5 text-app-muted" />
                    </button>

                    <button
                      onClick={() => onEliminar(item)}
                      title="Eliminar"
                      className="p-1 rounded-full hover:bg-app-border"
                    >
                      <TrashIcon className="w-5 h-5 text-app-muted hover:text-app-error" />
                    </button>
                  </div>
                </div>

                <p className="font-semibold text-app-muted text-sm leading-relaxed line-clamp-3 wrap-break-words">
                  {item.text}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
