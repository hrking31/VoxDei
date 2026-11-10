import { useEffect, useState } from "react";
import { getDoc, doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { ref, set, update } from "firebase/database";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  BackwardIcon,
  BookOpenIcon,
  BookmarkIcon,
  ChatBubbleLeftRightIcon,
  ForwardIcon,
  MusicalNoteIcon,
  PlusIcon,
  QueueListIcon,
  TagIcon,
  TrashIcon,
} from "@heroicons/react/24/solid";
import { db, database } from "../Firebase/Firebase";
import {
  CANCIONES,
  ORDEN_ACTUAL,
  ORDEN_CULTO,
  REPERTORIO,
  REPERTORIO_ACTUAL,
  docIglesia,
} from "../Firebase/RutasIglesia";
import { useAuth } from "../Context/AuthContext";
import { useAppContext } from "../Context/AppContext";
import { useTurno } from "../Hooks/useTurno.js";
import FranjaTurno from "../Cronograma/FranjaTurno.jsx";
import { obtenerVersiculo } from "../FuncionesControlPredica/FuncionesControlPredica";
import {
  INICIO,
  TIPOS_PASO,
  avanzar,
  descripcionPaso,
  esElUltimo,
  escriturasDePaso,
  mover,
  parsearCita,
  quitar,
  retroceder,
} from "./utilesOrden.js";

// Orden del culto (9 de noviembre de 2026). Antes del servicio se arma la
// lista de pasos (pestaña «Preparar»); durante el culto se proyecta con un
// solo botón, «Siguiente» (pestaña «Culto»). La lista vive en Firestore y se
// escucha en vivo: el pastor la prepara en el computador y el operador la
// pasa desde el celular.

const ICONOS = {
  mensaje: ChatBubbleLeftRightIcon,
  cancion: MusicalNoteIcon,
  versiculo: BookOpenIcon,
  titulo: BookmarkIcon,
  ticker: TagIcon,
};

// La posición en el culto se recuerda al recargar la página, solo en este
// dispositivo: en otro celular el operador empieza donde él diga.
const CLAVE_POSICION = "voxdei-orden-posicion";

function leerPosicion() {
  try {
    return JSON.parse(sessionStorage.getItem(CLAVE_POSICION)) || INICIO;
  } catch {
    return INICIO;
  }
}

function guardarPosicion(posicion) {
  try {
    sessionStorage.setItem(CLAVE_POSICION, JSON.stringify(posicion));
  } catch {
    // Sin almacenamiento (navegación privada): solo se pierde al recargar.
  }
}

export default function OrdenCulto() {
  const { userData } = useAuth();
  const { showNotif, confirmAction } = useAppContext();
  const { exigirTurno } = useTurno();
  const groupId = userData.groupId;

  const [pasos, setPasos] = useState([]);
  const [cargado, setCargado] = useState(false);
  const [pestana, setPestana] = useState("culto");
  const [posicion, setPosicion] = useState(leerPosicion);

  useEffect(() => {
    const quitarEscucha = onSnapshot(
      docIglesia(groupId, ORDEN_CULTO, ORDEN_ACTUAL),
      (snapshot) => {
        setPasos(snapshot.data()?.pasos || []);
        setCargado(true);
      },
      (error) => {
        console.error("Error al cargar el orden del culto:", error);
        setCargado(true);
      }
    );
    return () => quitarEscucha();
  }, [groupId]);

  // Si alguien acorta la lista mientras se proyecta, se vuelve al principio.
  const actual = posicion.paso < pasos.length ? posicion : INICIO;
  const pasoActual = pasos[actual.paso];

  const proyectar = async (nueva) => {
    if (!exigirTurno()) return;
    const ahora = Date.now();
    try {
      await Promise.all(
        escriturasDePaso(pasos[nueva.paso], nueva.lamina, ahora).map(({ nodo, modo, datos }) =>
          (modo === "set" ? set : update)(ref(database, `${nodo}/${groupId}`), datos)
        )
      );
      setPosicion(nueva);
      guardarPosicion(nueva);
    } catch (error) {
      console.error("Error al proyectar el paso:", error);
      showNotif("error", "No se pudo enviar a la pantalla. Revisa tu conexión.");
    }
  };

  const siguiente = () => {
    const nueva = avanzar(pasos, actual);
    if (nueva) proyectar(nueva);
    else showNotif("info", "Terminó el orden del culto.");
  };

  const anterior = () => {
    const nueva = retroceder(pasos, actual);
    if (nueva) proyectar(nueva);
  };

  const guardar = async (nuevos) => {
    setPasos(nuevos);
    try {
      await setDoc(docIglesia(groupId, ORDEN_CULTO, ORDEN_ACTUAL), {
        pasos: nuevos,
        actualizado: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error al guardar el orden del culto:", error);
      showNotif("error", "No se pudo guardar el orden del culto. Revisa tu conexión.");
    }
  };

  const vaciar = async () => {
    if (!(await confirmAction("¿Borrar todos los pasos del orden del culto?"))) return;
    await guardar([]);
    setPosicion(INICIO);
    guardarPosicion(INICIO);
  };

  const textoSiguiente =
    actual.paso < 0 ? "Empezar el culto" : esElUltimo(pasos, actual) ? "Fin del culto" : "Siguiente";

  return (
    <div className="h-pantalla flex flex-col overflow-hidden bg-linear-to-b from-app-dark/50 to-app-light/50">
      {/* ENCABEZADO */}
      <div className="shrink-0 border-b border-app-main bg-app-light px-2">
        <div className="flex items-center justify-between gap-2 py-1">
          <h1 className="font-bold text-app-main flex items-center gap-1 truncate">
            <QueueListIcon className="w-5 h-5 shrink-0" />
            <span className="truncate">Orden del culto</span>
          </h1>
          <div className="flex items-center gap-2 shrink-0">
            <div role="tablist" aria-label="Modo" className="flex rounded border border-app-border overflow-hidden">
              {[
                ["culto", "Culto"],
                ["preparar", "Preparar"],
              ].map(([valor, texto]) => (
                <button
                  key={valor}
                  type="button"
                  role="tab"
                  aria-selected={pestana === valor}
                  onClick={() => setPestana(valor)}
                  className={`px-3 py-1.5 text-xs sm:text-sm font-bold transition ${
                    pestana === valor ? "bg-app-main text-app-dark" : "text-app-muted hover:text-app-texto"
                  }`}
                >
                  {texto}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <FranjaTurno />

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-custom p-2 sm:p-4">
        <div className="max-w-3xl mx-auto flex flex-col gap-3">
          {!cargado ? (
            <p className="text-center text-app-muted py-8">Cargando el orden del culto…</p>
          ) : pestana === "culto" ? (
            <Culto
              pasos={pasos}
              actual={actual}
              pasoActual={pasoActual}
              textoSiguiente={textoSiguiente}
              onSiguiente={siguiente}
              onAnterior={anterior}
              onIrA={(indice) => proyectar({ paso: indice, lamina: 0 })}
              onPreparar={() => setPestana("preparar")}
            />
          ) : (
            <Preparar pasos={pasos} guardar={guardar} onVaciar={vaciar} groupId={groupId} />
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Culto

function Culto({ pasos, actual, pasoActual, textoSiguiente, onSiguiente, onAnterior, onIrA, onPreparar }) {
  if (!pasos.length) {
    return (
      <div className="text-center text-app-muted py-8 flex flex-col items-center gap-3">
        <p>Aún no hay pasos en el orden del culto.</p>
        <button
          type="button"
          onClick={onPreparar}
          className="px-4 py-2 rounded-lg font-bold bg-app-main text-app-dark"
        >
          Preparar el orden
        </button>
      </div>
    );
  }

  return (
    <>
      <section className="rounded-lg border border-app-border bg-app-light p-3 text-center" aria-live="polite">
        <p className="text-xs uppercase tracking-widest text-app-muted">En la pantalla del templo</p>
        <p className="mt-1 text-app-texto whitespace-pre-wrap line-clamp-4">
          {pasoActual ? descripcionPaso(pasoActual, actual.lamina) : "Todavía nada. Pulsa «Empezar el culto»."}
        </p>
      </section>

      <button
        type="button"
        onClick={onSiguiente}
        className="h-16 rounded-xl bg-app-main text-app-dark text-lg font-bold flex items-center justify-center gap-2 active:scale-95 transition"
      >
        {textoSiguiente}
        <ForwardIcon className="w-6 h-6" />
      </button>

      <ol className="flex flex-col gap-1.5">
        {pasos.map((paso, indice) => {
          const Icono = ICONOS[paso.tipo];
          const esActual = indice === actual.paso;
          const hecho = indice < actual.paso;
          return (
            <li key={paso.id}>
              <button
                type="button"
                onClick={() => onIrA(indice)}
                aria-current={esActual ? "step" : undefined}
                className={`w-full flex items-center gap-2 rounded-lg border p-2 text-left transition ${
                  esActual
                    ? "border-app-success bg-app-success/10"
                    : "border-app-border bg-app-light/40 hover:border-app-main"
                } ${hecho ? "opacity-50" : ""}`}
              >
                <Icono className={`w-5 h-5 shrink-0 ${esActual ? "text-app-success" : "text-app-muted"}`} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-app-texto">{tituloPaso(paso)}</span>
                  <span className="block text-xs text-app-muted">{TIPOS_PASO[paso.tipo]}</span>
                </span>
                {paso.tipo === "cancion" && (
                  <span className="text-xs text-app-muted tabular-nums">
                    {esActual ? `${actual.lamina + 1}/${paso.laminas.length}` : `${paso.laminas.length} lám.`}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>

      <button
        type="button"
        onClick={onAnterior}
        className="self-start flex items-center gap-1 px-3 py-1.5 text-sm text-app-muted rounded border border-app-border hover:text-app-texto"
      >
        <BackwardIcon className="w-4 h-4" />
        Paso anterior
      </button>
    </>
  );
}

function tituloPaso(paso) {
  if (paso.tipo === "cancion") return paso.titulo;
  if (paso.tipo === "versiculo") return paso.cita;
  return paso.texto;
}

// ------------------------------------------------------------- Preparar

function Preparar({ pasos, guardar, onVaciar, groupId }) {
  const { showNotif } = useAppContext();
  const [tipo, setTipo] = useState("mensaje");
  const [texto, setTexto] = useState("");
  const [cita, setCita] = useState("");
  const [encontrado, setEncontrado] = useState(null);
  const [canciones, setCanciones] = useState(null);

  // Las canciones se eligen de «Canciones de hoy», no del catálogo entero:
  // es la lista que la iglesia ya armó para el servicio.
  useEffect(() => {
    if (tipo !== "cancion" || canciones) return;
    let vigente = true;
    (async () => {
      try {
        const repertorio = await getDoc(docIglesia(groupId, REPERTORIO, REPERTORIO_ACTUAL));
        const ids = repertorio.data()?.canciones || [];
        const docs = await Promise.all(ids.map((id) => getDoc(doc(db, CANCIONES, id))));
        if (!vigente) return;
        setCanciones(
          docs
            .filter((d) => d.exists())
            .map((d) => ({ id: d.id, titulo: d.data().titulo, laminas: d.data().diapositivas || [] }))
        );
      } catch (error) {
        console.error("Error al cargar las canciones de hoy:", error);
        if (vigente) setCanciones([]);
      }
    })();
    return () => {
      vigente = false;
    };
  }, [tipo, canciones, groupId]);

  const agregar = (paso) => guardar([...pasos, { id: crypto.randomUUID(), ...paso }]);

  const agregarTexto = () => {
    if (!texto.trim()) return;
    agregar({ tipo, texto: texto.trim() });
    setTexto("");
  };

  const buscarCita = async () => {
    setEncontrado(null);
    const datos = parsearCita(cita);
    if (!datos) {
      showNotif("warning", "No reconozco esa cita. Escríbela así: Juan 3:16");
      return;
    }
    const resultado = await obtenerVersiculo(datos.sigla, datos.capitulo, datos.versiculo, "versiculo", showNotif);
    if (resultado?.texto) setEncontrado({ cita: datos.cita, texto: resultado.texto });
  };

  const agregarVersiculo = () => {
    agregar({ tipo: "versiculo", ...encontrado });
    setEncontrado(null);
    setCita("");
  };

  return (
    <>
      {/* LA LISTA */}
      {pasos.length > 0 ? (
        <ol className="flex flex-col gap-1.5">
          {pasos.map((paso, indice) => {
            const Icono = ICONOS[paso.tipo];
            return (
              <li
                key={paso.id}
                className="flex items-center gap-2 rounded-lg border border-app-border bg-app-light/40 p-2"
              >
                <Icono className="w-5 h-5 shrink-0 text-app-muted" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-app-texto">{tituloPaso(paso)}</span>
                  <span className="block text-xs text-app-muted">{TIPOS_PASO[paso.tipo]}</span>
                </span>
                <span className="flex shrink-0 gap-1">
                  <BotonIcono etiqueta={`Subir «${tituloPaso(paso)}»`} disabled={indice === 0} onClick={() => guardar(mover(pasos, indice, -1))}>
                    <ArrowUpIcon className="w-4 h-4" />
                  </BotonIcono>
                  <BotonIcono etiqueta={`Bajar «${tituloPaso(paso)}»`} disabled={indice === pasos.length - 1} onClick={() => guardar(mover(pasos, indice, 1))}>
                    <ArrowDownIcon className="w-4 h-4" />
                  </BotonIcono>
                  <BotonIcono etiqueta={`Quitar «${tituloPaso(paso)}»`} peligro onClick={() => guardar(quitar(pasos, paso.id))}>
                    <TrashIcon className="w-4 h-4" />
                  </BotonIcono>
                </span>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="text-center text-app-muted py-4">Agrega el primer paso del culto.</p>
      )}

      {/* AGREGAR */}
      <section className="rounded-lg border border-app-border bg-app-light p-3 flex flex-col gap-3">
        <h2 className="text-sm font-bold text-app-main">Agregar un paso</h2>

        <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Tipo de paso">
          {Object.entries(TIPOS_PASO).map(([valor, nombre]) => {
            const Icono = ICONOS[valor];
            return (
              <button
                key={valor}
                type="button"
                role="radio"
                aria-checked={tipo === valor}
                onClick={() => setTipo(valor)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded border text-xs font-semibold transition ${
                  tipo === valor
                    ? "bg-app-main text-app-dark border-app-main"
                    : "text-app-muted border-app-border hover:border-app-main"
                }`}
              >
                <Icono className="w-4 h-4" />
                {nombre}
              </button>
            );
          })}
        </div>

        {["mensaje", "titulo", "ticker"].includes(tipo) && (
          <>
            <label htmlFor="orden-texto" className="sr-only">
              Texto del paso
            </label>
            <textarea
              id="orden-texto"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={tipo === "mensaje" ? 3 : 2}
              placeholder={
                tipo === "titulo"
                  ? "Título de la prédica"
                  : tipo === "ticker"
                    ? "Anuncio que se desliza abajo"
                    : "Texto que se verá en la pantalla"
              }
              className="w-full rounded-lg border border-app-border bg-app-dark p-2 text-sm text-app-texto placeholder:text-app-muted"
            />
            <BotonAgregar onClick={agregarTexto} disabled={!texto.trim()} />
          </>
        )}

        {tipo === "versiculo" && (
          <>
            <div className="flex gap-2">
              <label htmlFor="orden-cita" className="sr-only">
                Cita bíblica
              </label>
              <input
                id="orden-cita"
                value={cita}
                onChange={(e) => {
                  setCita(e.target.value);
                  setEncontrado(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && buscarCita()}
                placeholder="Juan 3:16"
                className="flex-1 min-w-0 rounded-lg border border-app-border bg-app-dark p-2 text-sm text-app-texto placeholder:text-app-muted"
              />
              <button
                type="button"
                onClick={buscarCita}
                disabled={!cita.trim()}
                className="shrink-0 px-3 py-1.5 text-sm font-bold text-app-main rounded inset-shadow-sm inset-shadow-app-main disabled:opacity-40"
              >
                Buscar
              </button>
            </div>
            {encontrado && (
              <>
                <p className="text-sm text-app-texto">
                  {encontrado.texto} <span className="text-app-main">— {encontrado.cita}</span>
                </p>
                <BotonAgregar onClick={agregarVersiculo} />
              </>
            )}
          </>
        )}

        {tipo === "cancion" &&
          (canciones === null ? (
            <p className="text-sm text-app-muted">Cargando las canciones de hoy…</p>
          ) : canciones.length === 0 ? (
            <p className="text-sm text-app-muted">
              No hay canciones de hoy. Arma la lista en la sección <b>Canciones</b> y vuelve aquí.
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {canciones.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2 rounded-lg border border-app-border p-2">
                  <span className="min-w-0 truncate text-sm text-app-texto">
                    {c.titulo} <span className="text-xs text-app-muted">· {c.laminas.length} láminas</span>
                  </span>
                  <BotonIcono
                    etiqueta={`Agregar «${c.titulo}»`}
                    onClick={() => agregar({ tipo: "cancion", cancionId: c.id, titulo: c.titulo, laminas: c.laminas })}
                  >
                    <PlusIcon className="w-4 h-4" />
                  </BotonIcono>
                </li>
              ))}
            </ul>
          ))}
      </section>

      {pasos.length > 0 && (
        <button type="button" onClick={onVaciar} className="self-start text-xs text-app-muted hover:text-app-error">
          Vaciar el orden del culto
        </button>
      )}
    </>
  );
}

function BotonAgregar({ onClick, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="self-start flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold text-sm bg-app-main text-app-dark disabled:opacity-40"
    >
      <PlusIcon className="w-4 h-4" />
      Agregar
    </button>
  );
}

function BotonIcono({ etiqueta, onClick, disabled = false, peligro = false, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={etiqueta}
      title={etiqueta}
      className={`w-8 h-8 grid place-items-center rounded border border-app-border text-app-muted transition disabled:opacity-30 ${
        peligro ? "hover:text-app-error hover:border-app-error" : "hover:text-app-main hover:border-app-main"
      }`}
    >
      {children}
    </button>
  );
}
