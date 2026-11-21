// La lista de versículos recientes (los que se proyectaron), con «Limpiar recientes».
// La usan la pestaña «Recientes» de SelectorLibros (computador) y la ventana «Recientes»
// del celular (20-11-2026, pedido del usuario: ese botón pasó a la barra de abajo).
//   recientes: [{ sigla, capitulo, versiculo, cita, texto }], el más reciente primero
//   grande: filas más altas, para el dedo
//   alElegirReciente(r) · alLimpiarRecientes()
export default function ListaRecientes({ recientes = [], grande = false, alElegirReciente, alLimpiarRecientes }) {
  return (
    <div data-recientes aria-label="Versículos recientes">
      {recientes.length ? (
        <>
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {recientes.map((r) => (
              <li key={`${r.sigla}-${r.capitulo}-${r.versiculo}`}>
                <button
                  type="button"
                  data-reciente
                  aria-label={`Ir a ${r.cita}`}
                  onClick={() => alElegirReciente?.(r)}
                  className={`w-full rounded-md border border-app-border px-2.5 text-left transition hover:border-app-agua ${grande ? "py-2.5" : "py-1.5"}`}
                >
                  <b className={`block text-app-agua ${grande ? "text-sm" : "text-xs"}`}>{r.cita}</b>
                  <span className={`block truncate text-app-muted ${grande ? "text-sm" : "text-xs"}`}>{r.texto}</span>
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            data-limpiar-recientes
            onClick={() => alLimpiarRecientes?.()}
            className="mt-2 w-full py-1 text-center text-xs text-app-muted hover:text-app-main"
          >
            Limpiar recientes
          </button>
        </>
      ) : (
        <p className="m-0 p-3 text-center text-sm text-app-muted">Aún no has proyectado versículos.</p>
      )}
    </div>
  );
}
