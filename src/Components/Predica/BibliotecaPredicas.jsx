import { useEffect, useMemo, useState } from "react";
import {
  CheckCircleIcon,
  MagnifyingGlassIcon,
  MicrophoneIcon,
  PencilSquareIcon,
  PlayIcon,
  PlusIcon,
  Squares2X2Icon,
  XMarkIcon,
} from "@heroicons/react/24/solid";
import CalendarioPredicas from "./CalendarioPredicas.jsx";
import {
  ESTADOS,
  agruparPorMes,
  cuantosItems,
  estadoVisible,
  fechaCorta,
  fechaLarga,
  filtrarPredicas,
  hoyLocal,
  ordenarPredicas,
} from "./utilesPredica.js";
import { tonoDe } from "./tonosPredica.js";

// Los filtros son botones con ícono y el nombre debajo, en una fila, en todos los
// tamaños (13-11-2026, pedido del usuario; antes, chips de dos por fila).
const FILTROS = [
  { clave: "todas", nombre: "Todas", Icono: Squares2X2Icon },
  { clave: "borrador", nombre: "Borradores", Icono: PencilSquareIcon },
  { clave: "terminada", nombre: "Terminadas", Icono: CheckCircleIcon },
  { clave: "predicada", nombre: "Predicadas", Icono: MicrophoneIcon },
];

// Mis prédicas: todas las que el pastor quiera (sin el límite de 5 de antes),
// con buscador, filtros y calendario. En el computador es la columna de la
// izquierda; en el celular, la pantalla de entrada.
// Computador: un día libre del calendario pone su fecha en la vacía
// (`onElegirFecha`), que se crea al escribir. Celular: lo marca y debajo
// ofrece «Crear para este día» (`onNueva`). Nada se crea con solo tocar
// (12-11-2026, pedido del usuario).
export default function BibliotecaPredicas({ predicas, abiertaId, onAbrir, onNueva, onPredicar, fechaVacia = null, onElegirFecha, compacta = false }) {
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("todas");
  const [marcada, setMarcada] = useState(null); // celular: el día tocado
  const hoy = hoyLocal();

  const tocarDia = (fecha, delDia) => {
    if (compacta) setMarcada((antes) => (antes === fecha ? null : fecha));
    else if (delDia.length) onAbrir(delDia[0].id);
    else onElegirFecha?.(fecha);
  };
  const delMarcado = marcada ? predicas.filter((p) => p.fecha === marcada) : [];

  const { proximas, anteriores } = useMemo(
    () => ordenarPredicas(filtrarPredicas(predicas, busqueda, filtro), hoy),
    [predicas, busqueda, filtro, hoy]
  );
  const abierta = predicas.find((p) => p.id === abiertaId);

  // Celular: el diálogo del día elegido se cierra con Escape.
  useEffect(() => {
    if (!compacta || !marcada) return;
    const alPulsarTecla = (e) => {
      if (e.key === "Escape") setMarcada(null);
    };
    document.addEventListener("keydown", alPulsarTecla);
    return () => document.removeEventListener("keydown", alPulsarTecla);
  }, [compacta, marcada]);

  // Línea de tiempo (11 de noviembre de 2026, «Lista 2» del lienzo, elegida
  // por el usuario): una línea vertical, un punto del color del estado por
  // prédica y los meses como títulos.
  const fila = (p) => {
    const visible = estadoVisible(p, hoy);
    const tono = tonoDe(visible);
    const esAbierta = p.id === abiertaId;
    // El punto va sobre la línea, fuera del recuadro, con espacio: así el
    // recuadro de la abierta no se pega al punto (pedido del usuario).
    return (
      <li key={p.id} className="relative pl-6">
        <span
          aria-hidden="true"
          data-punto={visible}
          className={`absolute top-3.5 left-0.5 h-3 w-3 rounded-full border-2 border-app-light ${tono.punto} ${esAbierta ? `ring-4 ${tono.halo}` : ""}`}
        />
        <button
          type="button"
          onClick={() => onAbrir(p.id)}
          aria-current={esAbierta ? "true" : undefined}
          data-estado={visible}
          className={`flex w-full flex-col gap-0.5 rounded-xl border px-3 py-2.5 text-left transition ${
            esAbierta ? tono.abierta : "border-transparent hover:bg-app-border/30"
          }`}
        >
          <span className="flex w-full items-center justify-between gap-2">
            <span className="truncate text-xs text-app-muted">
              {[fechaCorta(p.fecha), cuantosItems(p.piezas.length)].filter(Boolean).join(" · ")}
            </span>
            {/* La palabra del estado solo en «Sin predicar», que es un aviso; en
                las demás lo dice el color del punto (12-11-2026, pedido del
                usuario: la lista se veía cargada). El lector de pantalla la
                sigue oyendo. */}
            {visible === "sin-predicar" ? (
              <Etiqueta tono={tono.letra}>{ESTADOS[visible]}</Etiqueta>
            ) : (
              <span className="sr-only">{ESTADOS[visible]}</span>
            )}
          </span>
          <b className="truncate text-sm text-app-texto">{p.titulo}</b>
          {/* El versículo base va junto a la serie, no arriba: así arriba caben
              la fecha y los ítems (12-11-2026, pedido del usuario). */}
          {(p.serie || p.base) && (
            <span data-serie-y-base className="truncate text-xs">
              {p.serie && <span className="text-app-azul">Serie · {p.serie}</span>}
              {p.serie && p.base && <span className="text-app-muted"> · </span>}
              {p.base && <span className="text-app-agua">{p.base}</span>}
            </span>
          )}
        </button>
      </li>
    );
  };

  const linea = (lista) => (
    <div className="relative">
      <span aria-hidden="true" className="absolute top-2 bottom-2 left-1.75 w-0.5 rounded-full bg-app-border" />
      {agruparPorMes(lista, hoy).map((mes) => (
        <section key={mes.clave} data-mes={mes.clave} aria-label={mes.nombre}>
          {/* El mes en dorado (12-11-2026, pedido del usuario). */}
          <h4 className="pt-2 pb-1 pl-9 text-xs font-bold tracking-wide text-app-main uppercase">{mes.nombre}</h4>
          <ul className="flex flex-col gap-0.5">{mes.predicas.map(fila)}</ul>
        </section>
      ))}
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg leading-none font-bold text-app-texto">Mis prédicas</h2>
        {/* Computador: la entrada al púlpito de la abierta (12-11-2026, pedido
            del usuario; antes aquí iba «Nueva»: la nueva es la vacía que se ve
            al entrar, y antes «Predicar» iba encima del título). */}
        {!compacta && (
          <button
            type="button"
            onClick={onPredicar}
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-app-main px-4 text-sm font-bold text-app-dark"
          >
            <PlayIcon className="h-4 w-4" aria-hidden="true" />
            Predicar
          </button>
        )}
        {/* Celular: «Nueva» a la derecha del título (13-11-2026, pedido del
            usuario; antes ahí iba «Predicar», y antes un botón flotante abajo).
            Crea con la fecha de fábrica, el próximo domingo. */}
        {compacta && (
          <button
            type="button"
            data-nueva-predica
            onClick={() => onNueva()}
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-app-main px-4 text-sm font-bold text-app-dark"
          >
            <PlusIcon className="h-4 w-4" aria-hidden="true" />
            Nueva
          </button>
        )}
      </div>

      {/* Un poco más alto en el celular (`compacta`), pedido del usuario
          (13-11-2026); en tableta y computador sigue en h-10. */}
      <label className={`flex items-center gap-2 rounded-xl border border-app-border bg-app-aviso px-3 text-app-muted focus-within:border-app-main ${compacta ? "h-12" : "h-10"}`}>
        <MagnifyingGlassIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="sr-only">Buscar prédica</span>
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Título, texto o serie"
          className="min-w-0 flex-1 bg-transparent text-sm text-app-texto outline-none"
        />
      </label>

      {/* Cuatro botones del mismo ancho en una fila, con el color de su estado,
          ícono y el nombre debajo (13-11-2026, pedido del usuario; los chips de
          dos por fila eran del 11-11-2026). */}
      <div role="group" aria-label="Filtrar" className="grid grid-cols-4 gap-1.5">
        {FILTROS.map(({ clave, nombre, Icono }) => (
          <button
            key={clave}
            type="button"
            aria-pressed={filtro === clave}
            onClick={() => setFiltro(clave)}
            className={`flex h-11 flex-col items-center justify-center gap-0.5 rounded-xl border px-1 text-pie leading-none font-semibold transition ${
              filtro === clave ? tonoDe(clave).chip : `border-app-border ${tonoDe(clave).letra} hover:border-current`
            }`}
          >
            <Icono className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span className="max-w-full truncate">{nombre}</span>
          </button>
        ))}
      </div>

      <div className="scrollbar-custom -mx-1 min-h-0 flex-1 overflow-y-auto px-1">
        {proximas.length > 0 && (
          <>
            <Titulo>Próximas</Titulo>
            {linea(proximas)}
          </>
        )}
        {anteriores.length > 0 && (
          <>
            <Titulo>Anteriores</Titulo>
            {linea(anteriores)}
          </>
        )}
        {proximas.length + anteriores.length === 0 && (
          <p className="px-2 py-6 text-center text-sm text-app-muted">
            {predicas.length
              ? "Ninguna coincide con la búsqueda."
              : compacta
                ? "Aún no tienes prédicas. Toca «Nueva» o un día del calendario para crear la primera."
                : "Aún no tienes prédicas. Escribe la primera en el bosquejo."}
          </p>
        )}
      </div>

      {/* El calendario va abajo, después de la lista (pedido del usuario, 11-11-2026). */}
      <CalendarioPredicas
        predicas={predicas}
        abiertaFecha={abierta?.fecha}
        marcada={compacta ? marcada : fechaVacia}
        onTocarDia={tocarDia}
        hoy={hoy}
        compacto={compacta}
      />

      {/* Celular: lo que se hace con el día tocado sale en un diálogo, no en un
          recuadro debajo del calendario (13-11-2026, pedido del usuario). Se
          cierra con la X, con Escape o tocando fuera. */}
      {compacta && marcada && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-app-velo p-4" onClick={() => setMarcada(null)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="pred-dia-elegido"
            data-dia-elegido
            className="flex w-full max-w-sm flex-col gap-3 rounded-2xl border border-app-border bg-app-light p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <h3 id="pred-dia-elegido" className="text-base font-bold text-app-texto">
                {fechaLarga(marcada)}
              </h3>
              <button type="button" onClick={() => setMarcada(null)} aria-label="Cerrar" className="-mt-1 -mr-1 grid h-9 w-9 shrink-0 place-items-center rounded-xl text-app-muted hover:text-app-texto">
                <XMarkIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            {delMarcado.length ? (
              delMarcado.map((p) => (
                <div key={p.id} className="flex flex-col gap-2">
                  <span className="flex flex-col">
                    <b className="truncate text-sm text-app-texto">{p.titulo}</b>
                    <span className={`text-xs ${tonoDe(estadoVisible(p, hoy)).letra}`}>{ESTADOS[estadoVisible(p, hoy)]}</span>
                  </span>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => onAbrir(p.id)} className="h-11 flex-1 rounded-xl border border-app-border text-sm font-semibold text-app-texto">
                      Preparar
                    </button>
                    <button
                      type="button"
                      onClick={() => onAbrir(p.id, "predicar")}
                      className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-app-main text-sm font-bold text-app-dark"
                    >
                      <PlayIcon className="h-3.5 w-3.5" aria-hidden="true" />
                      Predicar
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <>
                <span className="text-xs text-app-muted">Sin prédica</span>
                <button
                  type="button"
                  onClick={() => onNueva(marcada)}
                  className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-app-main text-sm font-bold text-app-dark"
                >
                  <PlusIcon className="h-4 w-4" aria-hidden="true" />
                  Crear para este día
                </button>
              </>
            )}
          </section>
        </div>
      )}

      {/* Hoy solo informa; si algún día se cobra por cantidad, aquí va el plan. */}
      {/* Sin la línea de arriba en ningún tamaño (13-11-2026, pedido del usuario: el
          calendario ya tiene su borde). Celular: letra más pequeña y menos alto. */}
      <p
        data-contador-predicas
        className={`flex justify-between text-app-muted ${compacta ? "text-pie leading-none" : "text-xs"}`}
      >
        <span>
          <b className="text-app-texto">{predicas.length}</b> {predicas.length === 1 ? "prédica guardada" : "prédicas guardadas"}
        </span>
        <span>Sin límite</span>
      </p>
    </div>
  );
}

function Titulo({ children }) {
  return <h3 className="px-2 pt-3 pb-1 text-diminuto font-semibold tracking-widest text-app-muted uppercase">{children}</h3>;
}

// El estado en la lista: solo el texto, del color del estado (pedido del
// usuario, 11-11-2026; antes, una pastilla con borde y fondo).
function Etiqueta({ tono, children }) {
  return <span className={`shrink-0 text-diminuto font-bold tracking-wide uppercase ${tono}`}>{children}</span>;
}
