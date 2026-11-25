import { useEffect, useMemo, useRef, useState } from "react";
import { Bars3Icon, BookOpenIcon, DocumentDuplicateIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { useAnchoCompacto, useAnchoReducido, useApaisado, useFormato, useTabletaGrande } from "../Hooks/formatoPantalla";
import { useAuth } from "../Context/AuthContext";
import { useAppContext } from "../Context/AppContext";
import WhatsAppButton from "../WhatsAppButton/WhatsAppButton";
import BibliotecaPredicas from "../Predica/BibliotecaPredicas.jsx";
import EditorPredica from "../Predica/EditorPredica.jsx";
import PulpitoPredica from "../Predica/PulpitoPredica.jsx";
import MedidorCabida from "../Predica/MedidorCabida.jsx";
import { BotonesPulpito } from "../Predica/BotonesPulpito.jsx";
import PanelHoja from "../Predica/PanelHoja.jsx";
import { elementosParaMedir } from "../Predica/utilesCabida.js";
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
const predicaVacia = () => ({ id: null, titulo: "", fecha: proximoDomingo(), serie: "", base: "", numeracion: "romanos", numeracionNiveles: [null, null], cortesPuntos: [], estado: "borrador", piezas: [] });

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
  // Tableta acostada (20-11-2026, pedido del usuario): la barra de arriba y la de abajo se unen en una sola, que
  // queda ABAJO (en vertical siguen siendo dos).
  const apaisado = useApaisado();
  // Tableta grande acostada (iPad Air y Pro): el diseño del computador, sin la lista de prédicas; un botón «Prédicas»
  // la reemplaza dentro de la única barra, y la columna de la derecha conserva su estilo (20-11-2026, pedido del usuario).
  const tabletaGrande = useTabletaGrande();
  // Los mismos puntos de quiebre en el computador (20-11-2026, pedido del usuario): un PC de menos de 1180 px usa el diseño del
  // iPad mini (Mis prédicas en un botón, una sola barra de íconos, paneles encima); de 1180 a 1599 px, el de las tabletas
  // grandes acostadas; de 1600 px en adelante, el completo.
  const anchoCompacto = useAnchoCompacto();
  const anchoReducido = useAnchoReducido();
  const pcReducido = formato === "escritorio" && anchoReducido;
  const grande = (tableta && tabletaGrande) || (pcReducido && !anchoCompacto);
  const comoTableta = tableta || pcReducido;
  // El iPad mini acostado (y los de su tamaño): las barras de arriba y de abajo en una sola.
  const unificada = comoTableta && apaisado && !grande;
  // Lo que lleva «Prédicas» con texto corto en la barra única
  const barraUnica = unificada || grande;
  // Toda tableta, de cualquier tamaño, es «tableta» (Hooks/formatoPantalla.js): la barra de abajo va solo con íconos.
  const soloIconos = comoTableta || grande;
  // Tableta: el cajón de Mis prédicas y el panel de versículos.
  const [cajonAbierto, setCajonAbierto] = useState(false);
  const [versiculosAbierto, setVersiculosAbierto] = useState(false);
  // Tableta (20-11-2026, pedido del usuario): el panel de Versículos se oculta al elegir un versículo y al
  // tocar fuera de él (como el cajón de Mis prédicas). El botón que lo abre queda fuera de la regla: él
  // mismo lo abre y lo cierra.
  const panelVersiculos = useRef(null);
  useEffect(() => {
    if (!versiculosAbierto) return undefined;
    const fuera = (e) => {
      if (panelVersiculos.current?.contains(e.target) || e.target.closest?.("[data-abrir-versiculos]")) return;
      setVersiculosAbierto(false);
    };
    document.addEventListener("pointerdown", fuera);
    return () => document.removeEventListener("pointerdown", fuera);
  }, [versiculosAbierto]);
  const groupId = userData?.groupId;
  const predicas = usePredicas(groupId);

  const [abiertaId, setAbiertaId] = useState(null);
  const [modo, setModo] = useState("preparar");
  const [borrador, setBorrador] = useState(null);
  const [estadoGuardado, setEstadoGuardado] = useState("guardado");
  const [seleccionada, setSeleccionada] = useState(null);
  // La recién creada: su título recibe el cursor al abrirse.
  const [recienCreada, setRecienCreada] = useState(null);
  // Celular: hay una prédica nueva abierta que aún no existe en Firestore
  // (14-11-2026, pedido del usuario: como en el computador, se crea al escribir).
  const [nuevaAbierta, setNuevaAbierta] = useState(false);

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
    // Si era una nueva sin escribir, se descarta sin dejar rastro.
    setNuevaAbierta(false);
    vaciaActual.current = predicaVacia();
    setVacia(vaciaActual.current);
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
      setNuevaAbierta(false);
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

  // Celular: «Nueva» y «Crear para este día» abren el bosquejo vacío, igual que
  // el computador: no hay documento (ni punto en la línea de tiempo) hasta que
  // se escribe algo (14-11-2026, pedido del usuario).
  const nueva = (fecha) => {
    soltarPendiente();
    setAbiertaId(null);
    setBorrador(null);
    setSeleccionada(null);
    setModo("preparar");
    vaciaActual.current = fecha ? { ...predicaVacia(), fecha } : predicaVacia();
    setVacia(vaciaActual.current);
    setEnfocarVacia(true);
    setNuevaAbierta(true);
  };

  const duplicar = () => {
    // La copia lleva ids nuevos; los cortes de las pantallas de puntos pasan al id nuevo de su punto.
    const nuevosIds = new Map();
    const piezas = borrador.piezas.map((p) => {
      const id = nuevoId();
      nuevosIds.set(p.id, id);
      return { ...p, id };
    });
    return crear({
      titulo: `${borrador.titulo} (copia)`,
      fecha: "",
      serie: borrador.serie,
      base: borrador.base,
      numeracion: borrador.numeracion,
      numeracionNiveles: borrador.numeracionNiveles,
      cortesPuntos: (borrador.cortesPuntos || []).map((id) => nuevosIds.get(id)).filter(Boolean),
      piezas,
    });
  };

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

  // «Pruebas» (18-11-2026, pedido del usuario): el mismo púlpito, pero en ensayo:
  // no se manda nada al templo. Pide lo mismo que Predicar: algo que pasar.
  const probar = () => {
    if (!borrador?.piezas.some(piezaCompleta)) {
      showNotif("warning", "Agrega al menos una pieza para probar.");
      return;
    }
    setModo("prueba");
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

  // En el computador, sin prédica abierta (ni una cargándose), la vacía; en el
  // celular, solo cuando se pidió una nueva.
  const conVacia = (celular ? nuevaAbierta : true) && !abiertaId && !borrador;
  const enEditor = borrador || (conVacia ? vacia : null);

  // El semáforo de cabida (18-11-2026, pedido del usuario): MedidorCabida mide cada
  // ítem en la pantalla del templo a tamaño real y el editor marca los que van
  // justos o no caben. Sustituyó a la pantalla de muestra de Preparar.
  const [cabida, setCabida] = useState({});
  const piezasMedidas = enEditor?.piezas;
  const numeracionMedida = enEditor?.numeracion;
  const nivelesMedidos = enEditor?.numeracionNiveles;
  const elementosMedidos = useMemo(
    () => (piezasMedidas ? elementosParaMedir(piezasMedidas, numeracionMedida, nivelesMedidos) : []),
    [piezasMedidas, numeracionMedida, nivelesMedidos]
  );

  // El buscador de versículos de la columna derecha (computador, 11-11-2026; también la hoja del celular y el panel de la tableta):
  // agrega el versículo al final (12-11-2026: antes, debajo del elegido).
  const agregarVersiculo = (pieza) => {
    const cambio = (actual) => ({ piezas: [...actual.piezas, pieza] });
    (borrador ? cambiar : cambiarVacia)(cambio);
    setSeleccionada(pieza.id);
  };

  // Los botones de la barra de arriba de la tableta: Mis prédicas, Versículos y Pruebas / Predicar. Van arriba en
  // vertical y, en horizontal, dentro de la barra de abajo del editor.
  const botonMisPredicas = (
    <button type="button" data-abrir-cajon onClick={() => setCajonAbierto(true)} className="flex h-11 items-center gap-2 rounded-xl border border-app-border px-3.5 text-sm font-semibold text-app-texto">
      <Bars3Icon className="h-5 w-5" aria-hidden="true" />
      {/* En la barra única (horizontal) solo dice «Prédicas»; los demás botones, solo con ícono */}
      {barraUnica ? "Prédicas" : "Mis prédicas"}
    </button>
  );
  const botonVersiculos = enEditor && (
    <button
      type="button"
      data-abrir-versiculos
      aria-pressed={versiculosAbierto}
      aria-label={unificada ? "Versículos" : undefined}
      title="Versículos"
      // Siempre en el aguamarina del botón de Versículos del celular (20-11-2026, pedido del usuario)
      onClick={() => setVersiculosAbierto((si) => !si)}
      className={`flex h-11 items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition ${unificada ? "w-14 shrink-0" : "px-3.5"} ${
        versiculosAbierto ? "border-app-agua bg-app-agua/15 text-app-agua" : "border-app-border text-app-agua"
      }`}
    >
      <BookOpenIcon className="h-5 w-5" aria-hidden="true" />
      {!unificada && "Versículos"}
    </button>
  );
  // Dos botones separados, no el menú «Púlpito» (20-11-2026, pedido del usuario)
  const botonesPulpito = (
    <BotonesPulpito
      onPruebas={probar}
      onPredicar={predicar}
      desactivado={!enEditor}
      soloIconos={unificada}
      compacto={unificada}
      barra={unificada}
      className={unificada ? "" : "w-72"}
    />
  );

  const editor = enEditor && (
    <EditorPredica
      predica={enEditor}
      onCambiar={borrador ? cambiar : cambiarVacia}
      seleccionada={seleccionada}
      onSeleccionar={setSeleccionada}
      compacto={celular}
      barraIzquierda={barraUnica ? botonMisPredicas : null}
      // En la barra única, Versículos va después de Imagen (20-11-2026, pedido del usuario)
      botonVersiculos={unificada ? botonVersiculos : null}
      barraDerecha={unificada ? botonesPulpito : null}
      // iPad mini (20-11-2026, pedido del usuario): la barra de abajo solo con íconos, como en el celular
      soloIconos={soloIconos}
      onVolver={cerrar}
      onPredicar={predicar}
      onPruebas={probar}
      cabida={cabida}
      onTerminar={marcarTerminada}
      showNotif={showNotif}
      enfocarTitulo={borrador ? recienCreada === borrador.id : enfocarVacia}
      onTituloEnfocado={() => {
        setRecienCreada(null);
        setEnfocarVacia(false);
      }}
      historial={controlHistorial}
      onAgregarVersiculo={celular ? agregarVersiculo : null}
      // Duplicar y Eliminar van en la barra de arriba del celular, junto a
      // WhatsApp (14-11-2026, pedido del usuario); abajo van Deshacer y Rehacer.
      onDuplicar={celular ? duplicar : null}
      onBorrar={celular ? borrar : null}
      botonWhatsApp={
        celular && (
          <WhatsAppButton
            message={enEditor.piezas}
            title="Compartir por WhatsApp"
            className="grid h-9 w-10 shrink-0 place-items-center rounded-xl active:bg-app-border/40"
          />
        )
      }
      acciones={
        // Tres tramos en la barra de abajo (12-11-2026, pedido del usuario):
        // [Punto Mensaje Imagen] │ [↶ ↷ Borrar Duplicar] │ [WhatsApp].
        // El primero lo pinta EditorPredica; estos son el segundo y el tercero.
        <>
          <div role="group" aria-label="Cambios" className={soloIconos ? "flex gap-2" : "flex flex-3 gap-2"}>
            <BotonesHistorial historial={controlHistorial} className={soloIconos ? "h-11 w-14 rounded-xl" : undefined} />
            <BotonSecundario onClick={borrar} etiqueta="Borrar" peligro disabled={!borrador} soloIcono={soloIconos}>
              <TrashIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
            </BotonSecundario>
            <BotonSecundario onClick={duplicar} etiqueta="Duplicar" disabled={!borrador} soloIcono={soloIconos}>
              <DocumentDuplicateIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
            </BotonSecundario>
          </div>
          <span aria-hidden="true" className="w-px bg-app-border" />
          <div className={soloIconos ? "flex" : "flex flex-1"}>
            <WhatsAppButton
              message={enEditor.piezas}
              title="Compartir por WhatsApp"
              className={`flex h-11 items-center justify-center gap-2 rounded-xl border border-app-border text-sm font-semibold text-app-texto transition hover:border-app-success ${soloIconos ? "w-14 shrink-0" : "min-w-0 flex-1"}`}
            >
              {!soloIconos && "WhatsApp"}
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
      prueba={modo === "prueba"}
      // Los cortes de las pantallas de puntos se ajustan solo en Pruebas (20-11-2026, pedido del usuario)
      alCambiarCortes={modo === "prueba" ? (cortes) => cambiar({ cortesPuntos: cortes }) : null}
      onSalir={() => setModo("preparar")}
      onTerminar={terminar}
    />
  );

  // En Pruebas se ve el mismo púlpito, pero sin turno ni envíos al templo.
  const enPulpito = Boolean(borrador) && (modo === "predicar" || modo === "prueba");
  // Se mide solo mientras se prepara.
  const medidor = enEditor && modo === "preparar" ? <MedidorCabida elementos={elementosMedidos} titulo={enEditor.titulo || ""} alMedir={setCabida} /> : null;

  if (predicas === null) {
    return (
      <div className="h-pantalla flex flex-col" data-sin-espacio-nieve>
        <p className="m-auto text-app-muted">Cargando tus prédicas…</p>
      </div>
    );
  }

  // El cajón de Mis prédicas, desde la izquierda: lo usan la tableta y la tableta grande (que no lleva la lista fija).
  const abrirDesdeCajon = (id, enModo) => {
    setCajonAbierto(false);
    abrir(id, enModo);
  };
  const cajon = cajonAbierto && (
    <div className="absolute inset-0 z-30 flex bg-app-velo" onClick={() => setCajonAbierto(false)}>
      <aside aria-label="Mis prédicas" className="flex w-80 flex-col border-r border-app-border bg-app-light p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <BibliotecaPredicas
          predicas={listado}
          abiertaId={abiertaId}
          onAbrir={abrirDesdeCajon}
          fechaVacia={conVacia ? vacia.fecha : null}
          onElegirFecha={(fecha) => {
            setCajonAbierto(false);
            elegirFecha(fecha);
          }}
        />
      </aside>
    </div>
  );

  // ---------- Celular: una pantalla a la vez ----------
  if (celular) {
    return (
      <div className="h-pantalla flex flex-col bg-app-dark" data-sin-espacio-nieve>
        {medidor}
        {/* Sin FranjaTurno en el celular (14-11-2026, pedido del usuario): el
            servicio y la pantalla ya van en la barra de arriba. */}
        {!enEditor ? (
          <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
            {/* Sin SelectorBiblia en el celular (13-11-2026): pendiente de ubicar. */}
            <BibliotecaPredicas predicas={listado} abiertaId={abiertaId} onAbrir={abrir} onNueva={nueva} compacta />
          </div>
        ) : enPulpito ? (
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
  if (comoTableta && !grande) {
    return (
      <div className="h-pantalla flex flex-col bg-app-dark" data-sin-espacio-nieve>
        {medidor}
        {/* Sin la franja del turno en la tableta (20-11-2026, pedido del usuario): el servicio y el estado de la
            pantalla ya van en la barra de arriba de la app, como en el celular. */}
        {enPulpito ? (
          pulpito
        ) : (
          <div className="relative flex min-h-0 flex-1 flex-col">
            {/* En horizontal esta barra se une a la de abajo del editor (`unificada`); sin editor abierto se queda,
                para poder abrir Mis prédicas. */}
            {!(unificada && enEditor) && (
              <div className="flex h-16 shrink-0 items-center gap-2 border-b border-app-main bg-app-light px-3.5">
                {botonMisPredicas}
                <span className="flex-1" />
                {botonVersiculos}
                {botonesPulpito}
              </div>
            )}
            <main className="flex min-h-0 flex-1 flex-col">{editor}</main>

            {cajon}
            {versiculosAbierto && enEditor && (
              <PanelHoja
                panelRef={panelVersiculos}
                role="complementary"
                aria-label="Versículos"
                alCerrar={() => setVersiculosAbierto(false)}
                className={`absolute right-0 bottom-0 z-20 w-96 border-l border-app-border shadow-2xl ${unificada && enEditor ? "top-0" : "top-16"}`}
              >
                <SelectorBiblia />
                <BuscadorVersiculos
                  cajaFija
                  onAgregar={(pieza) => {
                    const resultado = agregarVersiculo(pieza);
                    // Se oculta al elegir (si se agregó; con `false` lo escrito se queda)
                    if (resultado !== false) setVersiculosAbierto(false);
                    return resultado;
                  }}
                  showNotif={showNotif}
                />
              </PanelHoja>
            )}
          </div>
        )}
      </div>
    );
  }

  // ---------- Computador: lado a lado ----------
  return (
    <div className="h-pantalla flex flex-col bg-app-dark" data-sin-espacio-nieve>
      {medidor}
      {/* Sin la barra «Prédica · Preparar / Predicar» (pedido del usuario,
          11-11-2026): «Predicar» va arriba de Mis prédicas y el púlpito
          tiene «Volver a preparar». */}
      {/* En el computador, la franja del turno va en la columna derecha del
          púlpito, no arriba (12-11-2026, pedido del usuario). */}
      {enPulpito ? (
        pulpito
      ) : (
        <div className="relative flex min-h-0 flex-1">
          {/* Mis prédicas ya no se pliega a una franja (13-11-2026, el usuario
              no la quiso): siempre a la vista. En la tableta grande no hay lista fija: la reemplaza el botón «Prédicas»
              de la barra de abajo, que abre el cajón. */}
          {!grande && (
          <aside aria-label="Mis prédicas" className="flex w-80 shrink-0 flex-col border-r border-app-border bg-app-light p-4">
            {/* No hay botón «Nueva»: la nueva es la vacía, y un día libre del
                calendario le pone fecha. «Pruebas» y «Predicar» van en la columna derecha. */}
            <BibliotecaPredicas
              predicas={listado}
              abiertaId={abiertaId}
              onAbrir={abrir}
              fechaVacia={conVacia ? vacia.fecha : null}
              onElegirFecha={elegirFecha}
            />
          </aside>
          )}

          <main className="flex min-w-0 flex-1 flex-col">{editor}</main>

          {enEditor && (
            <aside aria-label="Púlpito y versículos" className="flex min-h-0 w-90 shrink-0 flex-col gap-4 border-l border-app-border bg-app-light p-5">
              {/* Pruebas y Predicar (18-11-2026, pedido del usuario): ocupan el
                  lugar de la antigua pantalla de muestra. */}
              <BotonesPulpito onPruebas={probar} onPredicar={predicar} />
              <SelectorBiblia />
              {/* El buscador de versículos vive aquí desde el 11-11-2026 (antes,
                  en el campo de abajo del bosquejo), con la cuadrícula de
                  libros; ocupa el alto que queda. */}
              <BuscadorVersiculos onAgregar={agregarVersiculo} showNotif={showNotif} plegable={baja} />
            </aside>
          )}
          {cajon}
        </div>
      )}
    </div>
  );
}

function BotonSecundario({ onClick, etiqueta, peligro = false, disabled = false, soloIcono = false, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={soloIcono ? etiqueta : undefined}
      title={etiqueta}
      disabled={disabled}
      className={`flex h-11 items-center justify-center gap-2 rounded-xl border border-app-border text-sm font-semibold transition disabled:pointer-events-none disabled:opacity-30 ${soloIcono ? "w-14 shrink-0" : "min-w-0 flex-1"} ${
        peligro ? "text-app-error hover:border-app-error" : "text-app-texto hover:border-app-texto"
      }`}
    >
      {children}
      {!soloIcono && etiqueta}
    </button>
  );
}
