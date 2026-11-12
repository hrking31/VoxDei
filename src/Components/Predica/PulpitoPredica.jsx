import { useCallback, useEffect, useState } from "react";
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon, ClockIcon, ListBulletIcon, PlayIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { useAuth } from "../Context/AuthContext";
import { useAppContext } from "../Context/AppContext";
import { useTurno } from "../Hooks/useTurno.js";
import { obtenerVersiculo } from "../FuncionesControlPredica/FuncionesControlPredica";
import { parsearCita } from "../OrdenCulto/utilesOrden.js";
import { librosDe, versionValida } from "../Biblia/versionesBiblia";
import PantallaPrevia from "./PantallaPrevia.jsx";
import { apagarImagen, cambiarVisible, proyectarPieza } from "./accionesPredica.js";
import { numerosDePuntos, relojDesde, textoDePieza } from "./utilesPredica.js";

const callado = () => {};
const esCampo = (el) => el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);

// Predicar: lo que está en el templo, lo que sigue y un botón grande
// «Siguiente» (también con las flechas, la barra espaciadora o un control de
// presentaciones). Tocar cualquier pieza la proyecta. Trae el reloj del tiempo
// predicando, los interruptores de lo que se ve, «en negro» (apaga título,
// texto y anuncio) y el versículo al vuelo, que se proyecta sin cambiar el
// bosquejo. Cada envío pasa por exigirTurno, como en toda la app.
export default function PulpitoPredica({ predica, compacto = false, onSalir, onTerminar }) {
  const { userData } = useAuth();
  const { exigirTurno } = useTurno();
  const {
    showNotif,
    versionBiblia,
    visibleTitulo,
    setVisibleTitulo,
    visibleTexto,
    setVisibleTexto,
    visibleTicker,
    setVisibleTicker,
    visibleImagen,
    setVisibleImagen,
  } = useAppContext();
  const groupId = userData?.groupId;
  const { piezas } = predica;
  const numeros = numerosDePuntos(piezas);

  const [actual, setActual] = useState(-1);
  const [alVuelo, setAlVuelo] = useState(null);
  const [cita, setCita] = useState("");
  const [inicio] = useState(() => Date.now());
  const [ahora, setAhora] = useState(() => Date.now());
  const [verTodo, setVerTodo] = useState(false);

  useEffect(() => {
    const reloj = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(reloj);
  }, []);

  // Envía una pieza; una imagen se enciende y, si estaba encendida, cualquier
  // otra pieza la apaga (si no, taparía el texto en el templo).
  const enviar = useCallback(
    (pieza) => {
      const esImagen = pieza.tipo === "imagen";
      proyectarPieza(groupId, pieza, { imagenEncendida: Boolean(visibleImagen) }).catch((error) => {
        console.error("No se pudo proyectar:", error);
        showNotif("error", "No se pudo enviar a la pantalla. Revisa la conexión.");
      });
      if (esImagen || visibleImagen) setVisibleImagen?.(esImagen);
    },
    [groupId, visibleImagen, setVisibleImagen, showNotif]
  );

  const proyectar = useCallback(
    (indice) => {
      const pieza = piezas[indice];
      if (!pieza || !exigirTurno()) return;
      setActual(indice);
      setAlVuelo(null);
      enviar(pieza);
    },
    [piezas, exigirTurno, enviar]
  );

  const siguiente = useCallback(() => proyectar(actual + 1), [proyectar, actual]);
  const anterior = useCallback(() => proyectar(actual - 1), [proyectar, actual]);

  useEffect(() => {
    const alPulsar = (e) => {
      if (esCampo(e.target) || e.altKey || e.ctrlKey || e.metaKey) return;
      if (["ArrowRight", "ArrowDown", "PageDown", " "].includes(e.key)) {
        e.preventDefault();
        siguiente();
      } else if (["ArrowLeft", "ArrowUp", "PageUp"].includes(e.key)) {
        e.preventDefault();
        anterior();
      }
    };
    window.addEventListener("keydown", alPulsar);
    return () => window.removeEventListener("keydown", alPulsar);
  }, [siguiente, anterior]);

  const visibles = [
    { clave: "titulo", nombre: "Título", valor: visibleTitulo, poner: setVisibleTitulo },
    { clave: "texto", nombre: "Texto", valor: visibleTexto, poner: setVisibleTexto },
    { clave: "ticker", nombre: "Anuncio", valor: visibleTicker, poner: setVisibleTicker },
  ];
  const enNegro = visibles.every((v) => !v.valor) && !visibleImagen;

  const cambiar = (v) => {
    if (!exigirTurno()) return;
    v.poner(!v.valor);
    cambiarVisible(groupId, v.clave, !v.valor);
  };

  const ponerEnNegro = () => {
    if (!exigirTurno()) return;
    for (const v of visibles) {
      v.poner(false);
      cambiarVisible(groupId, v.clave, false);
    }
    // «En negro» también apaga la imagen (11-11-2026).
    if (visibleImagen) {
      setVisibleImagen?.(false);
      apagarImagen(groupId);
    }
  };

  const proyectarAlVuelo = async (e) => {
    e.preventDefault();
    // TEMPORAL DHH: con la Biblia elegida (RVR1960 o DHH).
    const version = versionValida(versionBiblia);
    const datos = parsearCita(cita, librosDe(version));
    if (!datos) {
      showNotif("warning", "No reconozco esa cita. Escríbela así: Isaías 41:10");
      return;
    }
    if (!exigirTurno()) return;
    const encontrado = await obtenerVersiculo(datos.sigla, datos.capitulo, datos.versiculo, "versiculo", callado, version);
    if (!encontrado?.texto) {
      showNotif("error", `No encontré ${datos.cita}.`);
      return;
    }
    const pieza = { id: "al-vuelo", tipo: "versiculo", contenido: { cita: datos.cita, texto: encontrado.texto, version } };
    setAlVuelo(pieza);
    setCita("");
    setVerTodo(false);
    enviar(pieza);
  };

  const enPantalla = alVuelo || piezas[actual] || null;
  const luego = piezas[actual + 1];
  const reloj = relojDesde(ahora - inicio);
  const posicion = actual >= 0 ? `${actual + 1} de ${piezas.length}` : `${piezas.length} piezas`;

  const lista = (
    <ol className="m-0 flex list-none flex-col gap-0.5 p-0">
      {piezas.map((pieza, i) => (
        <li key={pieza.id}>
          <button
            type="button"
            onClick={() => {
              proyectar(i);
              setVerTodo(false);
            }}
            aria-current={i === actual && !alVuelo ? "true" : undefined}
            className={`flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition ${
              i === actual && !alVuelo ? "border-app-main bg-app-border/60 text-app-texto" : "border-transparent hover:bg-app-border/40"
            } ${i < actual ? "text-app-border" : "text-app-muted"}`}
          >
            <span className="w-5 shrink-0 pt-0.5 text-xs font-semibold">{i + 1}</span>
            <span className="min-w-0 flex-1">
              {numeros[pieza.id] && <b className="mr-1 text-app-main">{numeros[pieza.id]} ·</b>}
              <span className={pieza.tipo === "titulo" ? "font-semibold text-app-texto" : ""}>{textoDePieza(pieza)}</span>
            </span>
            {i < actual && <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-app-success" aria-hidden="true" />}
          </button>
        </li>
      ))}
    </ol>
  );

  const alVueloForm = (
    <form onSubmit={proyectarAlVuelo} className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold tracking-widest text-app-muted uppercase">Versículo al vuelo</h3>
      <div className="flex items-center gap-2 rounded-xl border border-app-border bg-app-aviso pr-1.5 pl-3 focus-within:border-app-main">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Cita para proyectar</span>
          <input value={cita} onChange={(e) => setCita(e.target.value)} placeholder="Ej: Isaías 41:10" className="h-11 w-full bg-transparent text-sm text-app-texto outline-none" />
        </label>
        <button type="submit" aria-label="Proyectar cita" disabled={!cita.trim()} className="grid h-8 w-8 place-items-center rounded-lg bg-app-cita text-app-dark disabled:opacity-40">
          <PlayIcon className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <p className="m-0 text-xs text-app-muted">Se proyecta sin cambiar el bosquejo.</p>
    </form>
  );

  const interruptores = (
    <div role="group" aria-label="Qué se ve en el templo" className="flex gap-1.5">
      {visibles.map((v) => (
        <button
          key={v.clave}
          type="button"
          aria-pressed={Boolean(v.valor)}
          onClick={() => cambiar(v)}
          className={`h-10 flex-1 rounded-full border px-3 text-xs font-semibold transition sm:flex-none ${
            v.valor ? "border-app-main text-app-main" : "border-app-border text-app-muted"
          }`}
        >
          {v.nombre}
        </button>
      ))}
      <button
        type="button"
        aria-pressed={enNegro}
        onClick={ponerEnNegro}
        className={`h-10 flex-1 rounded-full border px-3 text-xs font-semibold sm:flex-none ${enNegro ? "border-app-texto bg-app-texto text-app-dark" : "border-app-border bg-app-aviso text-app-texto"}`}
      >
        En negro
      </button>
    </div>
  );

  const botones = (
    <div className={`flex gap-3 ${compacto ? "flex-col" : ""}`}>
      {!compacto && (
        <button type="button" onClick={anterior} disabled={actual <= 0} className="flex h-18 w-44 items-center justify-center gap-2 rounded-2xl border border-app-border bg-app-light font-semibold text-app-texto disabled:opacity-40">
          <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
          Anterior
        </button>
      )}
      <button
        type="button"
        onClick={siguiente}
        disabled={actual >= piezas.length - 1}
        className={`flex flex-1 items-center justify-center gap-3 rounded-2xl bg-app-main font-bold text-app-dark shadow-lg disabled:opacity-40 ${compacto ? "h-20 text-2xl" : "h-18 text-xl"}`}
      >
        {actual < 0 ? "Empezar" : "Siguiente"}
        <ChevronRightIcon className="h-6 w-6" aria-hidden="true" />
      </button>
      {compacto && (
        <div className="flex gap-2">
          <button type="button" onClick={anterior} disabled={actual <= 0} className="flex h-12 flex-1 items-center justify-center gap-1.5 rounded-xl border border-app-border text-sm font-semibold text-app-texto disabled:opacity-40">
            <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
            Anterior
          </button>
          <button type="button" onClick={() => setVerTodo(true)} className="flex h-12 flex-1 items-center justify-center gap-1.5 rounded-xl border border-app-border text-sm font-semibold text-app-texto">
            <ListBulletIcon className="h-4 w-4" aria-hidden="true" />
            Todo el bosquejo
          </button>
        </div>
      )}
    </div>
  );

  const escenario = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-xs font-semibold tracking-widest text-app-success uppercase">
          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-app-success" />
          {alVuelo ? "Al vuelo" : "En el templo ahora"} · {posicion}
        </span>
        {!compacto && interruptores}
      </div>
      <PantallaPrevia pieza={enPantalla} grande={!compacto} etiqueta="En el templo ahora" />
      {compacto && interruptores}
      {luego && (
        <p className="m-0 flex items-center gap-3 rounded-xl border border-app-border bg-app-light px-4 py-3">
          <span className="text-diminuto font-semibold tracking-widest text-app-muted uppercase">Luego</span>
          {numeros[luego.id] && <b className="text-app-main">{numeros[luego.id]}</b>}
          <span className="min-w-0 flex-1 truncate font-semibold text-app-texto">{textoDePieza(luego)}</span>
        </p>
      )}
    </>
  );

  if (compacto) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex h-14 shrink-0 items-center gap-2 px-2">
          <button type="button" onClick={onSalir} aria-label="Salir del modo predicar" className="grid h-11 w-11 place-items-center rounded-xl text-app-texto">
            <XMarkIcon className="h-5 w-5" aria-hidden="true" />
          </button>
          <b className="min-w-0 flex-1 truncate text-app-texto">{predica.titulo}</b>
          <span className="pr-2 font-semibold text-app-muted tabular-nums">{reloj}</span>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3.5">{escenario}</div>
        <div className="shrink-0 px-3.5 pt-2 pb-3">{botones}</div>

        {verTodo && (
          <div role="dialog" aria-modal="true" aria-label="Todo el bosquejo" className="fixed inset-0 z-40 flex flex-col bg-app-velo" onClick={() => setVerTodo(false)}>
            <div className="mt-auto flex max-h-4/5 flex-col gap-3 rounded-t-3xl bg-app-dark p-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <b className="text-app-texto">Todo el bosquejo</b>
                <button type="button" onClick={() => setVerTodo(false)} aria-label="Cerrar" className="grid h-10 w-10 place-items-center rounded-xl text-app-muted">
                  <XMarkIcon className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
              <div className="scrollbar-custom min-h-0 flex-1 overflow-y-auto">{lista}</div>
              {alVueloForm}
              <button type="button" onClick={onTerminar} className="h-12 rounded-xl border border-app-border text-sm font-semibold text-app-texto">
                Terminar y marcar como predicada
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1">
      <aside aria-label="Bosquejo" className="flex w-80 shrink-0 flex-col gap-3 border-r border-app-border bg-app-light p-4">
        <div className="flex justify-between text-xs text-app-muted">
          <span>Pieza {posicion}</span>
          <span>Toca una para proyectarla</span>
        </div>
        <div aria-hidden="true" className="h-1 overflow-hidden rounded-full bg-app-border">
          <div className="h-full bg-app-main transition-all" style={{ width: `${piezas.length ? ((actual + 1) / piezas.length) * 100 : 0}%` }} />
        </div>
        <div className="scrollbar-custom min-h-0 flex-1 overflow-y-auto">{lista}</div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto px-8 py-6">
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4">
          {escenario}
          <div className="flex-1" />
          {botones}
          <p className="m-0 text-center text-xs text-app-muted">También con las flechas del teclado o la barra espaciadora (sirve un control de presentaciones).</p>
        </div>
      </main>

      <aside className="flex w-80 shrink-0 flex-col gap-5 border-l border-app-border bg-app-light p-5">
        <p className="m-0 flex items-center gap-2 text-2xl font-bold text-app-texto tabular-nums">
          <ClockIcon className="h-6 w-6 text-app-muted" aria-hidden="true" />
          {reloj}
          <span className="text-xs font-normal text-app-muted">predicando</span>
        </p>
        {alVueloForm}
        <div className="flex-1" />
        <button type="button" onClick={onTerminar} className="flex h-12 items-center justify-center gap-2 rounded-xl border border-app-border text-sm font-semibold text-app-texto hover:border-app-main">
          <CheckIcon className="h-4 w-4" aria-hidden="true" />
          Terminar y marcar como predicada
        </button>
        <button type="button" onClick={onSalir} className="h-11 rounded-xl text-sm text-app-muted hover:text-app-texto">
          Volver a preparar
        </button>
      </aside>
    </div>
  );
}
