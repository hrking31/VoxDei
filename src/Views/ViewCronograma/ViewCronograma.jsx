import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDaysIcon,
  ChevronUpIcon,
  PlusIcon,
} from "@heroicons/react/24/solid";
import { useAuth } from "../../Components/Context/AuthContext";
import { useAppContext } from "../../Components/Context/AppContext";
import { esPastor, puedeProgramar } from "../../Components/Roles/Roles.js";
import { useTurno } from "../../Components/Hooks/useTurno.js";
import { useEquipo } from "../../Components/Cronograma/useEquipo.js";
import FranjaTurno from "../../Components/Cronograma/FranjaTurno.jsx";
import FormularioServicio from "../../Components/Cronograma/FormularioServicio.jsx";
import ListaServicios from "../../Components/Cronograma/ListaServicios.jsx";
import CalendarioServicios from "../../Components/Cronograma/CalendarioServicios.jsx";
import PestanasCronograma from "../../Components/Cronograma/PestanasCronograma.jsx";
import ListaProgramacion from "../../Components/Cronograma/ListaProgramacion.jsx";
import EditorProgramacion from "../../Components/Cronograma/EditorProgramacion.jsx";
import AdministrarCargos from "../../Components/Cronograma/AdministrarCargos.jsx";
import { proximasFechas } from "../../Components/Cronograma/programacion.js";
import { ocurrenciaEn } from "../../Components/Cronograma/utilesServicios.js";
import { fechaISO } from "../../Components/Cronograma/UtilesCronograma.js";

// Cronograma de la iglesia, con dos pestañas (25-11-2026, pedido del usuario):
//
// - «Servicios»: la plantilla de lo que se repite (nombre, días y hora): arriba las fechas
//   especiales (de una sola vez) y debajo la semana que se repite, una tarjeta por servicio;
//   con filtros arriba. Ya NO lleva operador: el servicio se repite y quién sirve cada fecha
//   se decide en la programación.
// - «Programación»: las próximas fechas con servicio y quién tiene cada cargo
//   (Conductor, Proyección, Alabanza...). Quien tenga un cargo que proyecta tiene el turno
//   de la pantalla ese día. La ven todos; la editan pastor, pastora y líder.
//
// Solo pastor y pastora crean y editan servicios (ViewServicioEditar, y firestore.rules lo
// vuelve a exigir). Los ensayos ya no se dan desde aquí (25-11-2026, pedido del usuario): se
// PROGRAMAN como un servicio más («Ensayo de alabanza», con su día, hora y su gente en los
// cargos que proyectan), y así la columna tiene todo el espacio para el formulario. El ensayo
// de cada quien, al momento, sigue en la franja de los paneles (Iniciar / Terminar).
//
// En el computador, quien programa (pastor, pastora y líder) tiene una columna fija a la
// derecha: arriba el cambio entre las dos pestañas, luego el calendario (todo el año, mes a
// mes) y, según la pestaña, el formulario del servicio (solo pastor y pastora) o los cargos de
// la fecha elegida. En el celular, la tableta y para los operadores no hay columna: las pestañas
// van en el centro, «Servicio» abre la página de ViewServicioEditar y la programación se edita
// bajo la fecha elegida.
export default function ViewCronograma() {
  const navigate = useNavigate();
  const { user, userData } = useAuth();
  const { servicios, cargos, programacion, desfaseReloj, isDesktop } =
    useAppContext();
  const { turno } = useTurno();
  const equipo = useEquipo();
  const [pestana, setPestana] = useState("servicios");
  // Servicio que se corrige en la columna (null = uno nuevo); `reinicio` vacía el formulario
  const [editando, setEditando] = useState(null);
  const [reinicio, setReinicio] = useState(0);
  // Día de una sola vez tocado en el calendario: queda como fecha del formulario nuevo
  const [fechaNueva, setFechaNueva] = useState("");
  // Día marcado en el calendario de «Servicios»
  const [fechaCal, setFechaCal] = useState(null);
  // Fecha de la programación que se está asignando (una ocurrencia: servicio + fecha)
  const [seleccion, setSeleccion] = useState(null);

  const pastor = esPastor(userData);
  const programa = puedeProgramar(userData);
  const enServicios = pestana === "servicios";
  const conColumna = Boolean(isDesktop) && programa;
  const columnaServicio = conColumna && pastor && enServicios;
  const hoyISO = fechaISO(new Date());

  const terminarFormulario = () => {
    setEditando(null);
    setFechaNueva("");
    setFechaCal(null);
    setReinicio((n) => n + 1);
  };

  const ocurrencias = useMemo(
    () => proximasFechas(servicios, Date.now() + (desfaseReloj || 0)),
    [servicios, desfaseReloj],
  );
  // En el computador la columna nunca queda vacía: sin elegir, va la primera fecha.
  const elegida = seleccion || (isDesktop ? ocurrencias[0] : null);

  // Un día que YA PASÓ se puede ver tocándolo en el calendario (25-11-2026): su tarjeta sale arriba de
  // la lista, marcada como pasada y en solo lectura, para que también se vea en el celular. La
  // programación de los días pasados no se borra; solo salen de la lista de «próximas».
  const esPasada = (o) =>
    Boolean(o) && o.fin <= Date.now() + (desfaseReloj || 0);
  const listaOcurrencias =
    seleccion &&
    esPasada(seleccion) &&
    !ocurrencias.some((o) => o.id === seleccion.id)
      ? [{ ...seleccion, pasada: true }, ...ocurrencias]
      : ocurrencias;

  const tocarServicio = (servicio) => {
    if (columnaServicio) {
      setEditando(servicio.id);
      setFechaNueva("");
      setFechaCal(null);
    } else {
      navigate(`/ViewServicioEditar/${servicio.id}`);
    }
  };

  // Tocar un día del calendario: en «Servicios», corrige el servicio de ese día o, si está libre,
  // lo deja como fecha de uno nuevo; en «Programación», elige esa fecha para asignar los cargos.
  const tocarDia = (fecha, marcas) => {
    if (enServicios) {
      if (!pastor) return;
      setFechaCal(fecha);
      if (marcas.servicios.length) {
        setEditando(marcas.servicios[0].id);
        setFechaNueva("");
      } else {
        setEditando(null);
        setFechaNueva(fecha);
        setReinicio((n) => n + 1);
      }
    } else if (programa) {
      const ocurrencia = ocurrenciaEn(servicios, fecha);
      if (ocurrencia) setSeleccion(ocurrencia);
    }
  };

  // Franja de la columna: UN SOLO control, título y botón a la vez (25-11-2026, pedido del usuario):
  // ocupa todo el ancho de la columna y se DESLIZA. El dorado macizo (la «pastilla») es lo que estás
  // viendo y se corre de una opción a la otra al tocarla, como los botones de la Biblia
  // (SelectorBiblia) pero de borde a borde; la opción de la que sales queda apagada. Sin flechas.
  const franjaCambio = (
    <div
      data-titulo-columna
      role="group"
      aria-label="Cronograma"
      className="relative flex h-12 shrink-0 items-stretch overflow-hidden border-b border-app-main/40 bg-app-main/10"
    >
      <span
        aria-hidden="true"
        data-pastilla
        data-en={pestana}
        className={`absolute inset-y-0 left-0 w-1/2 bg-app-main transition-transform duration-300 ease-out motion-reduce:transition-none ${
          enServicios ? "translate-x-0" : "translate-x-full"
        }`}
      />
      {[
        ["servicios", "Servicios"],
        ["programacion", "Programación"],
      ].map(([clave, texto]) => (
        <button
          key={clave}
          type="button"
          aria-pressed={pestana === clave}
          onClick={() => setPestana(clave)}
          className={`relative z-10 flex-1 text-sm font-semibold transition-colors duration-300 ${
            pestana === clave
              ? "text-app-dark"
              : "text-app-muted hover:text-app-main"
          }`}
        >
          {texto}
        </button>
      ))}
    </div>
  );

  // Los cargos se administran en un plegable, junto al editor de la fecha. Al abrirlo (25-11-2026,
  // pedido del usuario) se expande y SUBE hasta quedar a la vista, en vez de abrirse abajo, fuera de
  // la pantalla. Con «reducir movimiento», sin animación.
  const plegableCargos = useRef(null);
  const subirAlAbrir = (evento) => {
    if (!evento.currentTarget.open) return;
    const plegable = plegableCargos.current;
    if (typeof plegable?.scrollIntoView !== "function") return;
    const sinMovimiento = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    )?.matches;
    // Esperamos al cuadro siguiente: el plegable ya está abierto y se conoce su alto
    requestAnimationFrame(() =>
      plegable.scrollIntoView({
        behavior: sinMovimiento ? "auto" : "smooth",
        block: "start",
      }),
    );
  };
  // En la columna del computador, «Administrar cargos» va FIJO al pie, siempre a la vista (antes quedaba
  // al final de todos los cargos y no se veía al abrir). Al pulsarlo, su panel se expande hacia ARRIBA y le
  // quita alto al editor de la fecha, sin sacar nada de la pantalla.
  const [cargosAbierto, setCargosAbierto] = useState(false);
  const footerCargos = programa && (
    <div
      data-cargos-pie
      className={`flex flex-col border-t border-app-main/40 bg-app-light ${cargosAbierto ? "min-h-0 flex-1" : "shrink-0"}`}
    >
      {cargosAbierto && (
        <div
          data-panel-cargos
          className="scrollbar-custom min-h-0 flex-1 overflow-y-auto border-b border-app-border p-5"
        >
          <AdministrarCargos cargos={cargos || []} />
        </div>
      )}
      <button
        type="button"
        aria-expanded={cargosAbierto}
        onClick={() => setCargosAbierto((abierto) => !abierto)}
        className="flex h-12 w-full items-center justify-between px-5 text-sm font-bold text-app-main transition hover:bg-app-main/10"
      >
        Administrar cargos
        <ChevronUpIcon
          className={`h-4 w-4 transition-transform duration-300 ${cargosAbierto ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
    </div>
  );
  const administrarCargos = programa && (
    <details
      ref={plegableCargos}
      onToggle={subirAlAbrir}
      data-cargos
      className="group rounded-lg border border-app-border"
    >
      <summary className="cursor-pointer select-none px-3 py-2 text-sm font-bold text-app-main">
        Administrar cargos
      </summary>
      <div className="border-t border-app-border p-3">
        <AdministrarCargos cargos={cargos || []} />
      </div>
    </details>
  );

  const editorDeFecha = (ocurrencia) =>
    esPasada(ocurrencia) ? (
      <p data-fecha-pasada className="m-0 text-sm text-app-muted">
        Esta fecha ya pasó: solo puedes verla. Elige una próxima para programar.
      </p>
    ) : (
      <EditorProgramacion
        key={ocurrencia.id}
        ocurrencia={ocurrencia}
        cargos={cargos || []}
        equipo={equipo}
        programacion={programacion?.[ocurrencia.id]}
      />
    );

  const botonNuevo = editando && (
    <button
      type="button"
      onClick={terminarFormulario}
      className="self-start rounded px-2.5 py-1 text-xs font-bold text-app-main inset-shadow-sm inset-shadow-app-main transition hover:bg-app-main hover:text-app-dark"
    >
      <PlusIcon className="mr-0.5 inline h-3 w-3" aria-hidden="true" />
      Nuevo
    </button>
  );

  return (
    <div className="h-pantalla flex overflow-hidden bg-linear-to-b from-app-dark/50 to-app-light/50">
      <div className="flex min-w-0 flex-1 flex-col">
        {/* ENCABEZADO: en el computador no lleva la barra de arriba que dice dónde estamos (25-11-2026,
            pedido del usuario; la barra lateral ya lo dice); el título queda solo para los lectores
            de pantalla. En el celular y la tableta sigue, con el botón «Servicio». */}
        {isDesktop ? (
          <h1 className="sr-only">Cronograma</h1>
        ) : (
          <div className="shrink-0 border-b border-app-main bg-app-light px-2">
            <div className="flex items-center justify-between gap-2 py-1">
              <h1 className="font-bold text-app-main hidden lg:flex items-center gap-1 truncate">
                <CalendarDaysIcon className="w-5 h-5 shrink-0" />
                <span className="truncate">Cronograma</span>
              </h1>

              <div className="flex items-center gap-2 shrink-0 ml-auto">
                {pastor && (
                  <button
                    onClick={() => navigate("/ViewServicioEditar")}
                    className="px-3 py-1.5 text-xs sm:text-sm font-bold text-app-main rounded inset-shadow-sm inset-shadow-app-main hover:bg-app-main hover:text-app-dark transition flex items-center gap-1"
                  >
                    <PlusIcon className="w-4 h-4" />
                    Servicio
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* En el computador no lleva la franja verde del turno y de la pantalla (25-11-2026,
          pedido del usuario); en el celular y la tableta sí, porque ahí se gestiona el ensayo. */}
        {!isDesktop && <FranjaTurno siempre />}

        {/* Sin columna (celular, tableta y operadores), el cambio de pestaña va en el centro */}
        {!conColumna && (
          <PestanasCronograma valor={pestana} alCambiar={setPestana} />
        )}

        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-custom p-2 sm:p-4">
          <div
            className={`mx-auto flex flex-col gap-4 ${enServicios ? "max-w-6xl" : "max-w-3xl"}`}
          >
            {pestana === "programacion" ? (
              <>
                <ListaProgramacion
                  ocurrencias={listaOcurrencias}
                  cargos={cargos || []}
                  programacion={programacion}
                  elegida={programa ? elegida?.id : null}
                  alElegir={
                    programa
                      ? (id) =>
                          setSeleccion(
                            listaOcurrencias.find((o) => o.id === id) || null,
                          )
                      : null
                  }
                  miUid={user?.uid}
                  renderEditor={programa && !isDesktop ? editorDeFecha : null}
                />
                {programa && !isDesktop && administrarCargos}
              </>
            ) : (
              <>
                <ListaServicios
                  servicios={servicios}
                  hoyISO={hoyISO}
                  diaDeHoy={new Date().getDay()}
                  turno={turno}
                  editando={columnaServicio ? editando : null}
                  alTocar={pastor ? tocarServicio : null}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {conColumna && (
        <aside
          data-columna-cronograma
          {...(enServicios
            ? { "data-columna-servicio": true }
            : { "data-columna-programacion": true })}
          aria-label={enServicios ? "Servicio" : "Programación"}
          className="flex h-full w-90 shrink-0 flex-col border-l border-app-border bg-app-light"
        >
          {franjaCambio}
          <div
            data-area-columna
            className={`min-h-0 flex-1 overflow-y-auto scrollbar-custom p-5 ${!enServicios && cargosAbierto ? "hidden" : ""}`}
          >
            <div className="flex flex-col gap-6">
              <CalendarioServicios
                servicios={servicios}
                elegida={enServicios ? fechaCal : elegida?.fecha}
                alTocarDia={tocarDia}
              />
              {enServicios ? (
                pastor ? (
                  <>
                    {botonNuevo}
                    <FormularioServicio
                      key={`${editando || "nuevo"}-${reinicio}-${fechaNueva}`}
                      id={editando}
                      fechaInicial={fechaNueva}
                      alTerminar={terminarFormulario}
                      alNoExistir={terminarFormulario}
                      className="flex flex-col gap-6"
                    />
                  </>
                ) : (
                  <p className="m-0 text-sm text-app-muted">
                    Solo el pastor o la pastora crean y corrigen los servicios.
                    Aquí ves cuándo caen.
                  </p>
                )
              ) : (
                <>
                  {elegida ? (
                    editorDeFecha(elegida)
                  ) : (
                    <p className="m-0 text-sm text-app-muted">
                      No hay servicios próximos. Crea uno en la pestaña
                      «Servicios».
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
          {!enServicios && footerCargos}
        </aside>
      )}
    </div>
  );
}
