import {
  ClockIcon,
  ExclamationTriangleIcon,
  VideoCameraIcon,
} from "@heroicons/react/24/solid";
import {
  asignadosConTurno,
  ordenarCargos,
  personasDeCargo,
} from "./programacion.js";
import { textoFecha } from "./textosProgramacion.js";
import { textoHora } from "./UtilesCronograma.js";

// Color y texto de cada respuesta (el punto de la ficha de la persona)
const PUNTO = {
  pendiente: "bg-app-main",
  confirmado: "bg-app-success",
  no_puede: "bg-app-error",
};
const TITULO_PUNTO = {
  pendiente: "Sin responder",
  confirmado: "Confirmado",
  no_puede: "No puede",
};

// Las próximas fechas con servicio y quién sirve en cada cargo (25-11-2026). Quien puede
// programar (pastor, pastora y líder) toca una fecha para asignarla (`alElegir`); los demás
// la ven y nada más. `renderEditor(ocurrencia)` pinta el editor debajo de la fecha elegida
// cuando no hay columna a la derecha (celular y tableta).
//
// Cada fecha es una tarjeta con una «hoja de calendario» a la izquierda (día de la semana, número
// y mes), el nombre del servicio con su hora, y los cargos como filas de fichas: cada persona
// lleva un punto con su respuesta (dorado sin responder, verde confirmado, rojo no puede). Los
// cargos que proyectan llevan una cámara. Abajo, un avance de cuántos cargos están cubiertos.
export default function ListaProgramacion({
  ocurrencias,
  cargos,
  programacion,
  elegida,
  alElegir,
  miUid,
  renderEditor,
}) {
  const lista = ordenarCargos(cargos);
  const hayCargoQueProyecta = lista.some((c) => c.proyecta);

  if (ocurrencias.length === 0) {
    return (
      <p className="py-8 text-center text-app-muted">
        No hay servicios próximos. Crea uno en la pestaña «Servicios».
      </p>
    );
  }

  return (
    // Contenedor de consulta: dos columnas cuando el espacio donde está lo permite (no según la
    // ventana), una sola en el celular. La fecha elegida con su editor abajo ocupa las dos.
    <div className="@container">
      <ul
        data-lista-programacion
        className="m-0 grid list-none grid-cols-1 items-start gap-3 p-0 @2xl:grid-cols-2"
      >
        {ocurrencias.map((ocurrencia) => {
          const prog = programacion?.[ocurrencia.id];
          const conCargos = lista.filter(
            (c) => personasDeCargo(prog, c.id).length > 0,
          );
          const sinProyeccion =
            hayCargoQueProyecta && asignadosConTurno(prog, lista).length === 0;
          const seleccionada = elegida === ocurrencia.id;
          const inicio = new Date(ocurrencia.inicio);
          const cubiertos = conCargos.length;
          const total = lista.length;
          const contenido = (
            <>
              {/* Hoja de calendario */}
              <div
                aria-hidden="true"
                data-hoja
                className={`flex w-14 shrink-0 self-start flex-col overflow-hidden rounded-lg border text-center ${
                  seleccionada
                    ? "border-app-main"
                    : "border-app-border group-hover:border-app-main/60"
                }`}
              >
                <span
                  className={`py-0.5 text-[10px] font-bold uppercase tracking-widest ${
                    seleccionada
                      ? "bg-app-main text-app-dark"
                      : "bg-app-main/20 text-app-main"
                  }`}
                >
                  {inicio
                    .toLocaleDateString("es", { weekday: "short" })
                    .replace(".", "")}
                </span>
                <span className="pt-1 text-2xl font-black leading-none text-app-texto">
                  {inicio.getDate()}
                </span>
                <span className="pb-1 text-[10px] uppercase tracking-wider text-app-muted">
                  {inicio
                    .toLocaleDateString("es", { month: "short" })
                    .replace(".", "")}
                </span>
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                  <p className="m-0 flex min-w-0 items-center gap-1.5 font-bold text-app-texto">
                    <span className="truncate">
                      {ocurrencia.servicio.nombre || "Servicio"}
                    </span>
                    {ocurrencia.pasada && (
                      <span
                        data-pasada
                        className="shrink-0 rounded-full bg-app-border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-app-muted"
                      >
                        Pasado
                      </span>
                    )}
                  </p>
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-app-dark/60 px-2 py-0.5 text-xs text-app-muted">
                    <ClockIcon className="h-3 w-3" aria-hidden="true" />
                    {textoHora(ocurrencia.servicio.inicio)} –{" "}
                    {textoHora(ocurrencia.servicio.fin)}
                  </span>
                </div>
                <p className="m-0 -mt-1.5 text-xs capitalize text-app-muted">
                  {textoFecha(ocurrencia.inicio)}
                </p>

                {conCargos.length === 0 ? (
                  <p className="m-0 rounded-md border border-dashed border-app-border px-2 py-1.5 text-center text-sm italic text-app-muted">
                    Sin asignar
                  </p>
                ) : (
                  <dl className="m-0 flex flex-col gap-1.5">
                    {conCargos.map((cargo) => (
                      <div
                        key={cargo.id}
                        className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm"
                      >
                        <dt className="flex shrink-0 items-center gap-1 text-xs font-semibold uppercase tracking-wide text-app-muted">
                          {cargo.proyecta && (
                            <VideoCameraIcon
                              className="h-3 w-3 text-app-main"
                              aria-hidden="true"
                            />
                          )}
                          {cargo.nombre}:
                        </dt>
                        <dd className="m-0 flex min-w-0 flex-wrap gap-1">
                          {personasDeCargo(prog, cargo.id).map((p) => {
                            const estado = p.estado || "pendiente";
                            return (
                              <span
                                key={p.uid}
                                data-estado={estado}
                                title={TITULO_PUNTO[estado]}
                                className={`flex items-center gap-1.5 rounded-full border px-2 py-0.5 ${
                                  p.uid === miUid
                                    ? "border-app-main/60 bg-app-main/15 font-bold text-app-main"
                                    : "border-app-border bg-app-dark/40 text-app-texto"
                                } ${estado === "no_puede" ? "text-app-error line-through" : ""}`}
                              >
                                <span
                                  aria-hidden="true"
                                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${PUNTO[estado]}`}
                                />
                                {p.uid === miUid ? "Tú" : p.nombre}
                              </span>
                            );
                          })}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2">
                  {sinProyeccion ? (
                    <span className="flex items-center gap-1 rounded-full bg-app-error/15 px-2 py-0.5 text-xs font-bold text-app-error">
                      <ExclamationTriangleIcon
                        className="h-3 w-3"
                        aria-hidden="true"
                      />
                      <span>Sin proyección asignada</span>
                    </span>
                  ) : (
                    <span />
                  )}
                  {total > 0 && (
                    <span
                      data-avance
                      title={`${cubiertos} de ${total} cargos con alguien`}
                      className="flex items-center gap-1.5 text-[11px] text-app-muted"
                    >
                      <span
                        aria-hidden="true"
                        className="h-1 w-12 overflow-hidden rounded-full bg-app-border"
                      >
                        <span
                          className="block h-full rounded-full bg-app-main"
                          style={{ width: `${(cubiertos / total) * 100}%` }}
                        />
                      </span>
                      {cubiertos}/{total}
                    </span>
                  )}
                </div>
              </div>
            </>
          );
          const clases = `group relative flex w-full gap-3 overflow-hidden rounded-xl border p-3 text-left shadow-sm transition ${
            ocurrencia.pasada ? "opacity-80" : ""
          } ${
            seleccionada
              ? "border-app-main bg-linear-to-br from-app-main/15 to-app-light"
              : "border-app-border bg-app-light/60"
          }`;
          return (
            <li
              key={ocurrencia.id}
              data-fecha-programada={ocurrencia.id}
              className={`flex flex-col gap-2 ${seleccionada && renderEditor ? "@2xl:col-span-2" : ""}`}
            >
              {alElegir ? (
                <button
                  type="button"
                  onClick={() => alElegir(ocurrencia.id)}
                  aria-pressed={seleccionada}
                  className={`${clases} hover:border-app-main hover:shadow-md`}
                >
                  {contenido}
                </button>
              ) : (
                <div className={clases}>{contenido}</div>
              )}
              {seleccionada && renderEditor && (
                <div className="rounded-lg border border-app-border bg-app-light p-3">
                  {renderEditor(ocurrencia)}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
