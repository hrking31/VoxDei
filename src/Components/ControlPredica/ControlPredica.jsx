import { useEffect, useRef, useState } from "react";
import { Bars3Icon, BookOpenIcon, DocumentDuplicateIcon, PlayIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { useFormato } from "../Hooks/formatoPantalla";
import { useAuth } from "../Context/AuthContext";
import { useAppContext } from "../Context/AppContext";
import FranjaTurno from "../Cronograma/FranjaTurno.jsx";
import WhatsAppButton from "../WhatsAppButton/WhatsAppButton";
import BibliotecaPredicas from "../Predica/BibliotecaPredicas.jsx";
import EditorPredica from "../Predica/EditorPredica.jsx";
import PulpitoPredica from "../Predica/PulpitoPredica.jsx";
import PantallaPrevia from "../Predica/PantallaPrevia.jsx";
// TEMPORAL DHH (11-11-2026): el botón RVR1960 / DHH también en Prédica.
import SelectorBiblia from "../Biblia/SelectorBiblia.jsx";
import { usePredicas } from "../Predica/usePredicas.js";
import { borrarPredica, crearPredica, guardarPredica } from "../Predica/accionesPredica.js";
import { nuevoId, piezaCompleta, proximoDomingo } from "../Predica/utilesPredica.js";
import BuscadorVersiculos from "../Predica/BuscadorVersiculos.jsx";
import BotonesHistorial from "../Predica/BotonesHistorial.jsx";

// Espera tras el último cambio antes de guardar solo.
const ESPERA_GUARDADO = 800;
// Deshacer: teclas en el título o la serie con menos de esta pausa son un paso.
const JUNTAR_TECLEO = 1000;
// Pasos que recuerda el historial de la prédica abierta.
const PASOS_HISTORIAL = 50;

// La prédica vacía del computador: lo que se ve antes de escribir nada.
const predicaVacia = () => ({ id: null, titulo: "", fecha: proximoDomingo(), serie: "", base: "", numeracion: "romanos", numeracionNiveles: [null, null], estado: "borrador", piezas: [] });

// ¿La vacía ya tiene algo que valga guardar? (un recuadro nuevo sin escribir,
// no; la fecha sola tampoco: el calendario la cambia con un toque, y mirar no
// debe crear borradores. 12-11-2026, pedido del usuario.)
const tieneAlgo = (p) =>
  Boolean(p.titulo.trim() || p.serie.trim() || p.base?.trim()) || p.estado !== "borrador" || p.piezas.some(piezaCompleta);

// Prédica (10 de noviembre de 2026; diseño aprobado por el usuario, «versión 1»
// más el calendario). Tres partes:
//   Mis prédicas: todas las que se quieran (antes, 5 «slots» fijos).
//   Preparar: el bosquejo, que se guarda solo.
//   Predicar: «Siguiente», lo que está en el templo y lo que sigue.
// En el computador, Mis prédicas, el bosquejo y la vista previa van lado a
// lado; en el celular y el iPad vertical, una pantalla a la vez.
export default function ControlPredica() {
  const { userData } = useAuth();
  const { showNotif, confirmAction } = useAppContext();
  // celular | tableta | escritorio, y si el escritorio es bajo (12-11-2026,
  // propuesta por pantallas: https://claude.ai/artifact/TbjJUe59Na4bgcTAMn1hd2).
  const { formato, baja } = useFormato();
  const celular = formato === "celular";
  const tableta = formato === "tableta";
  // Tableta: el cajón de Mis prédicas y el panel de versículos.
  const [cajonAbierto, setCajonAbierto] = useState(false);
  const [versiculosAbierto, setVersiculosAbierto] = useState(false);
  // Escritorio: Mis prédicas plegada a una franja (arranca plegada si la pantalla es baja).
  const [misPlegada, setMisPlegada] = useState(baja);
  const groupId = userData?.groupId;
  const predicas = usePredicas(groupId);

  const [abiertaId, setAbiertaId] = useState(null);
  const [modo, setModo] = useState("preparar");
  const [borrador, setBorrador] = useState(null);
  const [estadoGuardado, setEstadoGuardado] = useState("guardado");
  const [seleccionada, setSeleccionada] = useState(null);
  // La recién creada: su título recibe el cursor al abrirse.
  const [recienCreada, setRecienCreada] = useState(null);

  // Lo último sin guardar, para guardarlo al cambiar de prédica o salir.
  const sinGuardar = useRef(null);
  sinGuardar.current = estadoGuardado === "pendiente" ? borrador : null;

  const guardar = async (predica) => {
    setEstadoGuardado("guardando");
    try {
      await guardarPredica(groupId, predica);
      setEstadoGuardado((estado) => (estado === "guardando" ? "guardado" : estado));
    } catch (error) {
      console.error("No se pudo guardar la prédica:", error);
      setEstadoGuardado("error");
      showNotif("error", "No se pudo guardar la prédica. Revisa la conexión.");
    }
  };

  // Guardado automático, un momento después del último cambio.
  useEffect(() => {
    if (estadoGuardado !== "pendiente" || !borrador) return undefined;
    const espera = setTimeout(() => guardar(borrador), ESPERA_GUARDADO);
    return () => clearTimeout(espera);
    // guardar cambia en cada render; lo que manda es el borrador.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [borrador, estadoGuardado]);

  // Al salir de la sección, lo pendiente no se pierde.
  useEffect(
    () => () => {
      if (sinGuardar.current) guardarPredica(groupId, sinGuardar.current).catch(() => {});
    },
    [groupId]
  );

  // Abre en el editor la prédica elegida en cuanto llega de Firestore; si la
  // borran desde otro equipo, se cierra.
  useEffect(() => {
    if (!predicas || !abiertaId) return;
    const encontrada = predicas.find((p) => p.id === abiertaId);
    if (!encontrada) {
      setAbiertaId(null);
      setBorrador(null);
    } else if (borrador?.id !== abiertaId) {
      setBorrador(encontrada);
      setEstadoGuardado("guardado");
    }
  }, [predicas, abiertaId, borrador?.id]);

  const soltarPendiente = () => {
    if (sinGuardar.current) guardar(sinGuardar.current);
  };

  const abrir = (id, enModo = "preparar") => {
    if (id !== abiertaId) {
      soltarPendiente();
      setBorrador(null);
      setSeleccionada(null);
    }
    setAbiertaId(id);
    setModo(enModo);
  };

  const cerrar = () => {
    soltarPendiente();
    setAbiertaId(null);
    setBorrador(null);
    setModo("preparar");
  };

  // `cambios`: un objeto o una función de la prédica actual (para lo que llega
  // tarde, como una foto que termina de subir).
  const aplicar = (actual, cambios) => ({ ...actual, ...(typeof cambios === "function" ? cambios(actual) : cambios) });

  // ---------- Deshacer y Rehacer (12-11-2026, pedido del usuario) ----------
  // El historial es de la prédica abierta y vive en memoria: al cambiar de
  // prédica o recargar se pierde. Lo tecleado seguido en el título o la serie
  // cuenta como un solo paso; lo demás (fecha, estado, cada ítem agregado,
  // corregido, movido o quitado), un paso cada cosa.
  const [historial, setHistorial] = useState({ pasado: [], futuro: [] });
  const actual = useRef(borrador);
  actual.current = borrador;
  const ultimoPaso = useRef({ clave: null, hora: 0 });

  useEffect(() => {
    setHistorial({ pasado: [], futuro: [] });
    ultimoPaso.current = { clave: null, hora: 0 };
  }, [abiertaId]);

  const anotarPaso = (cambios) => {
    const antes = actual.current;
    if (!antes) return;
    const clave = typeof cambios === "function" ? null : Object.keys(cambios).sort().join(",");
    const ahora = Date.now();
    const seguido = (clave === "titulo" || clave === "serie") && clave === ultimoPaso.current.clave && ahora - ultimoPaso.current.hora < JUNTAR_TECLEO;
    ultimoPaso.current = { clave, hora: ahora };
    if (seguido) return;
    setHistorial(({ pasado }) => ({ pasado: [...pasado, antes].slice(-PASOS_HISTORIAL), futuro: [] }));
  };

  const cambiar = (cambios) => {
    anotarPaso(cambios);
    setBorrador((previa) => aplicar(previa, cambios));
    setEstadoGuardado("pendiente");
  };

  const irA = (desde, hacia) => {
    const ahora = actual.current;
    if (!ahora || !historial[desde].length) return;
    const destino = historial[desde].at(-1);
    setHistorial({ [desde]: historial[desde].slice(0, -1), [hacia]: [...historial[hacia], ahora] });
    ultimoPaso.current = { clave: null, hora: 0 };
    setBorrador({ ...destino, id: ahora.id });
    setSeleccionada((elegida) => (destino.piezas.some((p) => p.id === elegida) ? elegida : null));
    setEstadoGuardado("pendiente");
  };
  const deshacer = () => irA("pasado", "futuro");
  const rehacer = () => irA("futuro", "pasado");
  const controlHistorial = {
    deshacer,
    rehacer,
    puedeDeshacer: Boolean(borrador) && historial.pasado.length > 0,
    puedeRehacer: Boolean(borrador) && historial.futuro.length > 0,
  };

  // Atajos en el computador: Ctrl+Z deshace; Ctrl+Y o Ctrl+Shift+Z rehacen.
  // Dentro de un campo de texto manda el del navegador (deshace en el campo).
  const atajos = useRef(null);
  atajos.current = { deshacer, rehacer };
  const conAtajos = !celular && Boolean(borrador) && modo === "preparar";
  useEffect(() => {
    if (!conAtajos) return undefined;
    const alTeclear = (e) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const destino = e.target;
      if (destino?.closest?.("input, textarea, select, [contenteditable='true']")) return;
      const tecla = e.key.toLowerCase();
      if (tecla === "z" && !e.shiftKey) {
        e.preventDefault();
        atajos.current.deshacer();
      } else if (tecla === "y" || (tecla === "z" && e.shiftKey)) {
        e.preventDefault();
        atajos.current.rehacer();
      }
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [conAtajos]);

  const crear = async (datos) => {
    soltarPendiente();
    try {
      const id = await crearPredica(groupId, datos);
      abrir(id);
      setRecienCreada(id);
    } catch (error) {
      console.error("No se pudo crear la prédica:", error);
      showNotif("error", "No se pudo crear la prédica. Revisa la conexión.");
    }
  };

  const nueva = (fecha) => crear(fecha ? { fecha } : {});

  // Computador sin prédica abierta: el bosquejo vacío, como una nueva, en vez
  // de un aviso sobre gris (pedido del usuario, 11-11-2026). No hay documento
  // hasta que se escribe: el primer cambio la crea y lo que se siga
  // escribiendo mientras tanto no se pierde (va en `vaciaActual`).
  const [vacia, setVacia] = useState(predicaVacia);
  const vaciaActual = useRef(vacia);
  const creando = useRef(false); // guardia: dos teclas seguidas no crean dos

  const cambiarVacia = async (cambios) => {
    vaciaActual.current = aplicar(vaciaActual.current, cambios);
    setVacia(vaciaActual.current);
    // Tocar «Punto» solo abre un recuadro vacío: aún no hay nada que guardar.
    if (!tieneAlgo(vaciaActual.current)) return;
    if (creando.current) return;
    creando.current = true;
    try {
      const id = await crearPredica(groupId, vaciaActual.current);
      const ultimo = vaciaActual.current;
      setAbiertaId(id);
      setBorrador({ ...ultimo, id, titulo: ultimo.titulo || "Nueva prédica" });
      setEstadoGuardado("pendiente"); // guarda lo escrito mientras se creaba
      vaciaActual.current = predicaVacia();
      setVacia(vaciaActual.current);
    } catch (error) {
      console.error("No se pudo crear la prédica:", error);
      showNotif("error", "No se pudo crear la prédica. Revisa la conexión.");
    } finally {
      creando.current = false;
    }
  };

  // Computador: un día libre del calendario abre la vacía con esa fecha, aunque
  // hubiera otra abierta. No crea nada hasta que se escribe (12-11-2026).
  const [enfocarVacia, setEnfocarVacia] = useState(false);
  const elegirFecha = (fecha) => {
    const base = !abiertaId && !borrador ? vaciaActual.current : predicaVacia();
    if (abiertaId || borrador) cerrar();
    vaciaActual.current = { ...base, fecha };
    setVacia(vaciaActual.current);
    setSeleccionada(null);
    setEnfocarVacia(true);
  };

  const duplicar = () =>
    crear({
      titulo: `${borrador.titulo} (copia)`,
      fecha: "",
      serie: borrador.serie,
      base: borrador.base,
      numeracion: borrador.numeracion,
      numeracionNiveles: borrador.numeracionNiveles,
      piezas: borrador.piezas.map((p) => ({ ...p, id: nuevoId() })),
    });

  const borrar = async () => {
    if (!(await confirmAction(`¿Borrar «${borrador.titulo}»? No se puede deshacer.`))) return;
    try {
      await borrarPredica(groupId, borrador.id);
      setAbiertaId(null);
      setBorrador(null);
      setEstadoGuardado("guardado");
      showNotif("success", "Prédica borrada");
    } catch (error) {
      console.error("No se pudo borrar la prédica:", error);
      showNotif("error", "No se pudo borrar la prédica.");
    }
  };

  const predicar = () => {
    if (!borrador?.piezas.some(piezaCompleta)) {
      showNotif("warning", "Agrega al menos una pieza para predicar.");
      return;
    }
    setModo("predicar");
  };

  // «Marcar terminada» (12-11-2026, pedido del usuario): se guarda como
  // terminada, se cierra y el bosquejo queda vacío, listo para una nueva; el
  // aviso dice adónde fue (sigue en la lista, con su punto azul). `extra`
  // trae la fecha cuando se pidió terminar una que no tenía.
  const marcarTerminada = (extra = {}) => {
    if (!borrador) {
      showNotif("warning", "Escribe algo antes de marcarla terminada.");
      return;
    }
    const lista = { ...borrador, ...extra, estado: "terminada" };
    guardar(lista);
    setAbiertaId(null);
    setBorrador(null);
    setSeleccionada(null);
    setModo("preparar");
    vaciaActual.current = predicaVacia();
    setVacia(vaciaActual.current);
    showNotif("success", `«${lista.titulo}» quedó terminada`);
  };

  const terminar = () => {
    cambiar({ estado: "predicada" });
    setModo("preparar");
    showNotif("success", "Prédica marcada como predicada");
  };

  // La biblioteca muestra los cambios aún sin guardar de la abierta.
  const listado = (predicas || []).map((p) => (borrador && p.id === borrador.id ? borrador : p));

  // En el computador, sin prédica abierta (ni una cargándose), la vacía.
  const conVacia = !celular && !abiertaId && !borrador;
  const enEditor = borrador || (conVacia ? vacia : null);
  const piezaElegida = enEditor?.piezas.find((p) => p.id === seleccionada) || null;

  // El buscador de versículos de la columna derecha (computador, 11-11-2026; también la hoja del celular y el panel de la tableta):
  // agrega el versículo al final (12-11-2026: antes, debajo del elegido).
  const agregarVersiculo = (pieza) => {
    const cambio = (actual) => ({ piezas: [...actual.piezas, pieza] });
    (borrador ? cambiar : cambiarVacia)(cambio);
    setSeleccionada(pieza.id);
  };

  const editor = enEditor && (
    <EditorPredica
      predica={enEditor}
      onCambiar={borrador ? cambiar : cambiarVacia}
      seleccionada={seleccionada}
      onSeleccionar={setSeleccionada}
      compacto={celular}
      onVolver={cerrar}
      onPredicar={predicar}
      onTerminar={marcarTerminada}
      showNotif={showNotif}
      enfocarTitulo={borrador ? recienCreada === borrador.id : enfocarVacia}
      onTituloEnfocado={() => {
        setRecienCreada(null);
        setEnfocarVacia(false);
      }}
      historial={controlHistorial}
      onAgregarVersiculo={celular ? agregarVersiculo : null}
      menuMas={
        // Celular: lo que en las otras pantallas va en la barra de abajo.
        celular && (
          <>
            <button type="button" data-cierra-menu onClick={duplicar} disabled={!borrador} className="flex h-11 items-center gap-2 rounded-xl border border-app-border px-3 text-sm font-semibold text-app-texto disabled:opacity-30">
              <DocumentDuplicateIcon className="h-5 w-5" aria-hidden="true" />
              Duplicar
            </button>
            <WhatsAppButton
              message={enEditor.piezas}
              title="Compartir por WhatsApp"
              className="flex h-11 items-center gap-2 rounded-xl border border-app-border px-3 text-sm font-semibold text-app-texto"
            >
              WhatsApp
            </WhatsAppButton>
            <button type="button" data-cierra-menu onClick={borrar} disabled={!borrador} className="flex h-11 items-center gap-2 rounded-xl border border-app-border px-3 text-sm font-semibold text-app-error disabled:opacity-30">
              <TrashIcon className="h-5 w-5" aria-hidden="true" />
              Borrar
            </button>
            <span className="h-px bg-app-border" />
            <SelectorBiblia />
          </>
        )
      }
      acciones={
        // Tres tramos en la barra de abajo (12-11-2026, pedido del usuario):
        // [Punto Mensaje Imagen] │ [↶ ↷ Borrar Duplicar] │ [WhatsApp].
        // El primero lo pinta EditorPredica; estos son el segundo y el tercero.
        <>
          <div role="group" aria-label="Cambios" className="flex flex-3 gap-2">
            <BotonesHistorial historial={controlHistorial} />
            <BotonSecundario onClick={borrar} etiqueta="Borrar" peligro disabled={!borrador}>
              <TrashIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
            </BotonSecundario>
            <BotonSecundario onClick={duplicar} etiqueta="Duplicar" disabled={!borrador}>
              <DocumentDuplicateIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
            </BotonSecundario>
          </div>
          <span aria-hidden="true" className="w-px bg-app-border" />
          <div className="flex flex-1">
            <WhatsAppButton
              message={enEditor.piezas}
              title="Compartir por WhatsApp"
              className="flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl border border-app-border text-sm font-semibold text-app-texto transition hover:border-app-success"
            >
              WhatsApp
            </WhatsAppButton>
          </div>
        </>
      }
    />
  );

  // En el púlpito no entran recuadros a medio llenar (vacíos o sin foto).
  const pulpito = borrador && (
    <PulpitoPredica
      predica={{ ...borrador, piezas: borrador.piezas.filter(piezaCompleta) }}
      formato={formato}
      baja={baja}
      onSalir={() => setModo("preparar")}
      onTerminar={terminar}
    />
  );

  // La franja del turno solo al predicar, que es cuando se envía a la pantalla;
  // en Mis prédicas y Preparar no hace falta (pedido del usuario, 11-11-2026).
  const predicando = Boolean(borrador) && modo === "predicar";

  if (predicas === null) {
    return (
      <div className="h-pantalla flex flex-col">
        <p className="m-auto text-app-muted">Cargando tus prédicas…</p>
      </div>
    );
  }

  // ---------- Celular: una pantalla a la vez ----------
  if (celular) {
    return (
      <div className="h-pantalla flex flex-col bg-app-dark">
        {predicando && <FranjaTurno />}
        {!borrador ? (
          <div className="flex min-h-0 flex-1 flex-col gap-3 p-4 pb-20">
            <SelectorBiblia />
            <BibliotecaPredicas predicas={listado} abiertaId={abiertaId} onAbrir={abrir} onNueva={nueva} compacta />
          </div>
        ) : modo === "predicar" ? (
          pulpito
        ) : (
          editor
        )}
      </div>
    );
  }

  // ---------- Tableta (iPad mini de pie): el bosquejo a todo el ancho ----------
  // Mis prédicas en un cajón desde la izquierda y los versículos en un panel
  // que se desliza desde la derecha, encima del bosquejo.
  if (tableta) {
    const abrirDesdeCajon = (id, enModo) => {
      setCajonAbierto(false);
      abrir(id, enModo);
    };
    return (
      <div className="h-pantalla flex flex-col bg-app-dark">
        {predicando && <FranjaTurno />}
        {predicando ? (
          pulpito
        ) : (
          <div className="relative flex min-h-0 flex-1 flex-col">
            <div className="flex h-16 shrink-0 items-center gap-2 border-b border-app-main bg-app-light px-3.5">
              <button type="button" data-abrir-cajon onClick={() => setCajonAbierto(true)} className="flex h-11 items-center gap-2 rounded-xl border border-app-border px-3.5 text-sm font-semibold text-app-texto">
                <Bars3Icon className="h-5 w-5" aria-hidden="true" />
                Mis prédicas
              </button>
              <span className="flex-1" />
              {enEditor && (
                <button
                  type="button"
                  data-abrir-versiculos
                  aria-pressed={versiculosAbierto}
                  onClick={() => setVersiculosAbierto((si) => !si)}
                  className={`flex h-11 items-center gap-2 rounded-xl border px-3.5 text-sm font-semibold transition ${
                    versiculosAbierto ? "border-app-agua bg-app-agua/15 text-app-agua" : "border-app-border text-app-texto"
                  }`}
                >
                  <BookOpenIcon className="h-5 w-5" aria-hidden="true" />
                  Versículos
                </button>
              )}
              <button type="button" onClick={predicar} className="flex h-11 items-center gap-2 rounded-xl bg-app-main px-4.5 text-sm font-extrabold text-app-dark">
                <PlayIcon className="h-4 w-4" aria-hidden="true" />
                Predicar
              </button>
            </div>
            <main className="flex min-h-0 flex-1 flex-col">{editor}</main>

            {cajonAbierto && (
              <div className="absolute inset-0 z-30 flex bg-app-velo" onClick={() => setCajonAbierto(false)}>
                <aside aria-label="Mis prédicas" className="flex w-80 flex-col border-r border-app-border bg-app-light p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                  <BibliotecaPredicas
                    predicas={listado}
                    abiertaId={abiertaId}
                    onAbrir={abrirDesdeCajon}
                    onPredicar={predicar}
                    fechaVacia={conVacia ? vacia.fecha : null}
                    onElegirFecha={(fecha) => {
                      setCajonAbierto(false);
                      elegirFecha(fecha);
                    }}
                  />
                </aside>
              </div>
            )}
            {versiculosAbierto && enEditor && (
              <aside aria-label="Versículos" className="absolute top-16 right-0 bottom-0 z-20 flex w-96 flex-col gap-3 border-l border-app-border bg-app-light p-4 shadow-2xl">
                <div className="flex items-center justify-between">
                  <b className="text-app-texto">Versículos</b>
                  <button type="button" onClick={() => setVersiculosAbierto(false)} aria-label="Cerrar" className="grid h-9 w-9 place-items-center rounded-xl text-app-muted">
                    <XMarkIcon className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>
                <PantallaPrevia pieza={piezaElegida} />
                <SelectorBiblia />
                <BuscadorVersiculos onAgregar={agregarVersiculo} showNotif={showNotif} />
              </aside>
            )}
          </div>
        )}
      </div>
    );
  }

  // ---------- Computador: lado a lado ----------
  return (
    <div className="h-pantalla flex flex-col bg-app-dark">
      {/* Sin la barra «Prédica · Preparar / Predicar» (pedido del usuario,
          11-11-2026): «Predicar» va arriba de Mis prédicas y el púlpito
          tiene «Volver a preparar». */}
      {/* En el computador, la franja del turno va en la columna derecha del
          púlpito, no arriba (12-11-2026, pedido del usuario). */}
      {predicando ? (
        pulpito
      ) : (
        <div className="flex min-h-0 flex-1">
          {misPlegada ? (
            // Plegada: una franja con lo esencial (12-11-2026, para pantallas bajas).
            <aside aria-label="Mis prédicas" data-mis-plegada className="flex w-16 shrink-0 flex-col items-center gap-2.5 border-r border-app-border bg-app-light py-3">
              <button type="button" onClick={() => setMisPlegada(false)} aria-label="Abrir Mis prédicas" title="Abrir Mis prédicas" className="grid h-10 w-10 place-items-center rounded-xl border border-app-border text-app-texto">
                <Bars3Icon className="h-5 w-5" aria-hidden="true" />
              </button>
              <button type="button" onClick={predicar} aria-label="Predicar" title="Predicar" className="grid h-10 w-10 place-items-center rounded-xl bg-app-main text-app-dark">
                <PlayIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </aside>
          ) : (
            <aside aria-label="Mis prédicas" className="flex w-80 shrink-0 flex-col border-r border-app-border bg-app-light p-4">
              {/* «Predicar» va arriba de esta lista; no hay botón «Nueva»: la
                  nueva es la vacía, y un día libre del calendario le pone fecha. */}
              <BibliotecaPredicas
                predicas={listado}
                abiertaId={abiertaId}
                onAbrir={abrir}
                onPredicar={predicar}
                fechaVacia={conVacia ? vacia.fecha : null}
                onElegirFecha={elegirFecha}
                onPlegar={() => setMisPlegada(true)}
              />
            </aside>
          )}

          <main className="flex min-w-0 flex-1 flex-col">{editor}</main>

          {enEditor && (
            <aside aria-label="Así se verá en el templo" className="flex min-h-0 w-90 shrink-0 flex-col gap-4 border-l border-app-border bg-app-light p-5">
              {/* Sin el texto «Así se verá en el templo» encima (pedido del
                  usuario, 11-11-2026): lo dice la etiqueta de la columna. */}
              <PantallaPrevia pieza={piezaElegida} />
              <SelectorBiblia />
              {/* El buscador de versículos vive aquí desde el 11-11-2026 (antes,
                  en el campo de abajo del bosquejo), con la cuadrícula de
                  libros; ocupa el alto que queda. */}
              <BuscadorVersiculos onAgregar={agregarVersiculo} showNotif={showNotif} plegable={baja} />
            </aside>
          )}
        </div>
      )}
    </div>
  );
}

function BotonSecundario({ onClick, etiqueta, peligro = false, disabled = false, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={etiqueta}
      disabled={disabled}
      className={`flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl border border-app-border text-sm font-semibold transition disabled:pointer-events-none disabled:opacity-30 ${
        peligro ? "text-app-error hover:border-app-error" : "text-app-texto hover:border-app-texto"
      }`}
    >
      {children}
      {etiqueta}
    </button>
  );
}
