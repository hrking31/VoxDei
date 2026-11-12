import { useEffect, useRef, useState } from "react";
import { DocumentDuplicateIcon, TrashIcon } from "@heroicons/react/24/solid";
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
import { insertarDespues, nuevoId, piezaCompleta, proximoDomingo } from "../Predica/utilesPredica.js";
import BuscadorVersiculos from "../Predica/BuscadorVersiculos.jsx";

// Espera tras el último cambio antes de guardar solo.
const ESPERA_GUARDADO = 800;

// La prédica vacía del computador: lo que se ve antes de escribir nada.
const predicaVacia = () => ({ id: null, titulo: "", fecha: proximoDomingo(), serie: "", estado: "borrador", piezas: [] });

// ¿La vacía ya tiene algo que valga guardar? (un recuadro nuevo sin escribir, no)
const tieneAlgo = (p) =>
  Boolean(p.titulo.trim() || p.serie.trim()) || p.estado !== "borrador" || p.fecha !== proximoDomingo() || p.piezas.some(piezaCompleta);

// Prédica (10 de noviembre de 2026; diseño aprobado por el usuario, «versión 1»
// más el calendario). Tres partes:
//   Mis prédicas: todas las que se quieran (antes, 5 «slots» fijos).
//   Preparar: el bosquejo, que se guarda solo.
//   Predicar: «Siguiente», lo que está en el templo y lo que sigue.
// En el computador, Mis prédicas, el bosquejo y la vista previa van lado a
// lado; en el celular y el iPad vertical, una pantalla a la vez.
export default function ControlPredica() {
  const { userData } = useAuth();
  const { isDesktop, showNotif, confirmAction } = useAppContext();
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

  const cambiar = (cambios) => {
    setBorrador((actual) => aplicar(actual, cambios));
    setEstadoGuardado("pendiente");
  };

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
  const [creandoVacia, setCreandoVacia] = useState(false);

  const cambiarVacia = async (cambios) => {
    vaciaActual.current = aplicar(vaciaActual.current, cambios);
    setVacia(vaciaActual.current);
    // Tocar «Punto» solo abre un recuadro vacío: aún no hay nada que guardar.
    if (!tieneAlgo(vaciaActual.current)) return;
    if (creando.current) return;
    creando.current = true;
    setCreandoVacia(true);
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
      setCreandoVacia(false);
    }
  };

  const duplicar = () =>
    crear({
      titulo: `${borrador.titulo} (copia)`,
      fecha: "",
      serie: borrador.serie,
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

  const terminar = () => {
    cambiar({ estado: "predicada" });
    setModo("preparar");
    showNotif("success", "Prédica marcada como predicada");
  };

  // La biblioteca muestra los cambios aún sin guardar de la abierta.
  const listado = (predicas || []).map((p) => (borrador && p.id === borrador.id ? borrador : p));

  // En el computador, sin prédica abierta (ni una cargándose), la vacía.
  const conVacia = isDesktop && !abiertaId && !borrador;
  const enEditor = borrador || (conVacia ? vacia : null);
  const piezaElegida = enEditor?.piezas.find((p) => p.id === seleccionada) || null;

  const editor = enEditor && (
    <EditorPredica
      predica={enEditor}
      onCambiar={borrador ? cambiar : cambiarVacia}
      estadoGuardado={borrador ? estadoGuardado : creandoVacia ? "guardando" : "nueva"}
      seleccionada={seleccionada}
      onSeleccionar={setSeleccionada}
      compacto={!isDesktop}
      onVolver={cerrar}
      onPredicar={predicar}
      showNotif={showNotif}
      enfocarTitulo={Boolean(borrador) && recienCreada === borrador.id}
      onTituloEnfocado={() => setRecienCreada(null)}
      acciones={
        // Con ícono y nombre, del mismo ancho que los de agregar (11-11-2026).
        <div className="flex flex-1 gap-2">
          <WhatsAppButton
            message={enEditor.piezas}
            title="Compartir por WhatsApp"
            className="flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl border border-app-border text-sm font-semibold text-app-texto transition hover:border-app-success"
          >
            WhatsApp
          </WhatsAppButton>
          <BotonSecundario onClick={duplicar} etiqueta="Duplicar" disabled={!borrador}>
            <DocumentDuplicateIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
          </BotonSecundario>
          <BotonSecundario onClick={borrar} etiqueta="Borrar" peligro disabled={!borrador}>
            <TrashIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
          </BotonSecundario>
        </div>
      }
    />
  );

  // En el púlpito no entran recuadros a medio llenar (vacíos o sin foto).
  const pulpito = borrador && (
    <PulpitoPredica
      predica={{ ...borrador, piezas: borrador.piezas.filter(piezaCompleta) }}
      compacto={!isDesktop}
      onSalir={() => setModo("preparar")}
      onTerminar={terminar}
    />
  );

  // El buscador de versículos de la columna derecha (computador, 11-11-2026):
  // agrega el versículo debajo del ítem elegido, o al final.
  const agregarVersiculo = (pieza) => {
    const cambio = (actual) => ({ piezas: insertarDespues(actual.piezas, seleccionada, pieza) });
    (borrador ? cambiar : cambiarVacia)(cambio);
    setSeleccionada(pieza.id);
  };

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

  // ---------- Celular y iPad vertical: una pantalla a la vez ----------
  if (!isDesktop) {
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

  // ---------- Computador: lado a lado ----------
  return (
    <div className="h-pantalla flex flex-col bg-app-dark">
      {/* Sin la barra «Prédica · Preparar / Predicar» (pedido del usuario,
          11-11-2026): el bosquejo tiene «Predicar» arriba y el púlpito,
          «Volver a preparar». */}
      {predicando && <FranjaTurno />}

      {predicando ? (
        pulpito
      ) : (
        <div className="flex min-h-0 flex-1">
          <aside aria-label="Mis prédicas" className="flex w-80 shrink-0 flex-col border-r border-app-border bg-app-light p-4">
            <BibliotecaPredicas predicas={listado} abiertaId={abiertaId} onAbrir={abrir} onNueva={nueva} />
          </aside>

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
              {/* «Empezar a predicar» ya no va aquí: es «Predicar», arriba del
                  bosquejo (11-11-2026). */}
              <BuscadorVersiculos onAgregar={agregarVersiculo} showNotif={showNotif} />
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
