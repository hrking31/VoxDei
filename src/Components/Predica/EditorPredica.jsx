import { useEffect, useRef, useState } from "react";
import {
  ArrowLeftIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  EyeIcon,
  XMarkIcon,
  BookOpenIcon,
  ChatBubbleLeftRightIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  DocumentDuplicateIcon,
  NumberedListIcon,
  PencilIcon,
  PhotoIcon,
  PlayIcon,
  TrashIcon,
} from "@heroicons/react/24/solid";
import ElegirImagen from "./ElegirImagen.jsx";
import BotonesHistorial from "./BotonesHistorial.jsx";
import BuscadorVersiculos from "./BuscadorVersiculos.jsx";
import PantallaPrevia from "./PantallaPrevia.jsx";
// TEMPORAL DHH (12-11-2026): la Biblia elegida, para reconocer el versículo base.
import { useAppContext } from "../Context/AppContext";
// TEMPORAL DHH (12-11-2026): el versículo base se reconoce en la Biblia elegida.
import { librosDe, versionValida } from "../Biblia/versionesBiblia";
import {
  ESTADOS,
  NOMBRE_TIPO,
  TIPOS_PIEZA,
  fechaLarga,
  hojaDeFecha,
  mover,
  moverA,
  posicionEscrita,
  nuevaPieza,
  numerosDePuntos,
  cambiarNivel,
  esSubpunto,
  nivelDe,
  nivelPermitido,
  NUMERACIONES,
  estilosDeNiveles,
  COMBINACIONES,
  combinacionDe,
  datosDeCombinacion,
  etiquetaPunto,
  textoDePunto,
  piezaCompleta,
  quitar,
  resumenPiezas,
  citaBase,
} from "./utilesPredica.js";
import { tonoDe } from "./tonosPredica.js";
import { tonoPieza } from "./tonosPieza.js";
import { siglaBiblia } from "../LibrosBiblia/avisosBiblia.js";

// El ícono de cada botón de agregar (computador).
const ICONO_TIPO = { titulo: NumberedListIcon, mensaje: ChatBubbleLeftRightIcon, imagen: PhotoIcon };

const TEXTO_SERIE = "Escribe la serie (opcional)";

// Sangría de cada nivel de punto en el bosquejo (12-11-2026).
const SANGRIA_NIVEL = { normal: ["", "ml-10", "ml-20"], compacto: ["", "ml-6", "ml-12"] };
// Nombre de los botones de nivel, según a qué nivel llevan el punto.
const NOMBRE_NIVEL = {
  meter: { 1: "Hacer subpunto", 2: "Hacer sub-subpunto" },
  sacar: { 0: "Volver a punto", 1: "Volver a subpunto" },
};

// Preparar: el bosquejo de una prédica. Los datos (título, fecha, serie), las
// piezas en orden (subir, bajar, corregir, quitar) y el campo único para
// agregar. Todo cambio se guarda solo (lo hace ControlPredica). Tocar una
// pieza la elige: se ve en la vista previa y muestra sus botones.
export default function EditorPredica({
  predica,
  onCambiar,
  seleccionada,
  onSeleccionar,
  compacto = false,
  onVolver,
  onPredicar,
  onTerminar, // «Marcar terminada»: guarda, cierra y deja el bosquejo vacío
  showNotif,
  enfocarTitulo = false,
  onTituloEnfocado,
  acciones = null, // computador: ↶ ↷ Borrar Duplicar │ WhatsApp, abajo a la derecha
  historial = null, // { deshacer, rehacer, puedeDeshacer, puedeRehacer } (celular: barra de abajo)
  botonWhatsApp = null, // celular: el botón de WhatsApp de la barra de arriba
  onAgregarVersiculo = null, // celular: el versículo elegido en la hoja de versículos
  onDuplicar = null, // celular: Duplicar de la barra de arriba
  onBorrar = null, // celular: Eliminar de la barra de arriba
}) {
  const [editando, setEditando] = useState(null); // { id, texto }
  // Celular (14-11-2026, pedido del usuario): «Punto» pregunta el tipo de
  // numeración la primera vez (hoja `hojaNumeracion`) y, ya elegido, crea sin
  // preguntar. Si la prédica ya tiene puntos, se da por elegido.
  const [puntoElegido, setPuntoElegido] = useState(() => predica.piezas.some((p) => p.tipo === "titulo"));
  const [hojaNumeracion, setHojaNumeracion] = useState(false);
  const piezasActuales = useRef(predica.piezas);
  piezasActuales.current = predica.piezas;
  // Celular (12-11-2026, propuesta por pantallas): el menú ⋯, la hoja de
  // versículos y la vista previa del ítem («Ver»), que en el celular no tienen
  // columna propia.
  const [hojaVersiculos, setHojaVersiculos] = useState(false);
  const [previa, setPrevia] = useState(null); // id del ítem que se ve
  const campoTitulo = useRef(null);

  // ¿Fecha, título, serie y versículo base en modo editar (línea punteada)?
  // Una prédica sin título arranca editando; al abrir otra se decide de nuevo.
  // La vacía que se acaba de crear al escribir (su id pasa de null a uno
  // real) sigue como estaba, para no cortarle la escritura.
  const [editandoDatos, setEditandoDatos] = useState(() => !predica.titulo.trim());
  // Celular (14-11-2026, pedido del usuario): no hay un botón de editar general;
  // cada texto (nombre, serie y versículo base) lleva su propio lápiz y `campo`
  // dice cuál se está editando: null | "titulo" | "serie" | "base".
  const [campo, setCampo] = useState(() => (!predica.titulo.trim() ? "titulo" : null));
  const idAnterior = useRef(predica.id);
  useEffect(() => {
    const antes = idAnterior.current;
    idAnterior.current = predica.id;
    if (antes === predica.id || antes === null) return;
    setEditandoDatos(!predica.titulo.trim());
    setCampo(!predica.titulo.trim() ? "titulo" : null);
    setPuntoElegido(piezasActuales.current.some((p) => p.tipo === "titulo"));
  }, [predica.id, predica.titulo]);

  // Recién creada: modo editar y el cursor en el título con «Nueva prédica»
  // seleccionado, para escribir el nombre de una vez (11-11-2026).
  useEffect(() => {
    if (!enfocarTitulo || !campoTitulo.current) return;
    setEditandoDatos(true);
    setCampo("titulo");
    campoTitulo.current.focus();
    campoTitulo.current.select();
    onTituloEnfocado?.();
  }, [enfocarTitulo, onTituloEnfocado]);
  // Terminada exige fecha (12-11-2026, pedido del usuario: una copia de
  // «Duplicar» sale sin fecha y se podía marcar terminada así). Se avisa, se
  // abre el selector y, al elegir el día, pasa sola a Terminada. Volver a
  // Borrador no la pide.
  const campoFecha = useRef(null);
  const [esperaFecha, setEsperaFecha] = useState(false);
  const abrirFecha = () => {
    const campo = campoFecha.current;
    campo?.focus();
    try {
      campo?.showPicker?.();
    } catch {
      // Algunos navegadores no abren el selector desde código: queda el cursor.
    }
  };
  const marcarTerminada = () => {
    if (predica.estado !== "borrador") return;
    if (!predica.fecha) {
      showNotif?.("warning", "Ponle fecha antes de marcarla terminada.");
      setEsperaFecha(true);
      abrirFecha();
      return;
    }
    onTerminar();
  };

  const { piezas } = predica;
  const base = predica.base || ""; // dato propio: no es un ítem del bosquejo
  const numeros = numerosDePuntos(piezas, predica.numeracion, predica.numeracionNiveles);
  const resumen = resumenPiezas(piezas);

  const cambiarPiezas = (nuevas) => onCambiar({ piezas: nuevas });

  // La vista previa del celular: el punto como se proyecta, con su número.
  const elegidaVista = previa ? piezas.find((p) => p.id === previa) : null;
  const piezaVista = elegidaVista
    ? elegidaVista.tipo === "titulo"
      ? { ...elegidaVista, tipo: "mensaje", contenido: textoDePunto(numeros[elegidaVista.id], elegidaVista.contenido) }
      : elegidaVista
    : null;

  // La cajita del número, dentro de cada ítem, al final, después de sus
  // botones, siempre a la vista (12-11-2026, pedidos del usuario): muestra
  // su lugar y, si se escribe otro, lo lleva ahí y los demás se corren.
  // Enter o salir de la cajita lo aplican; Escape lo deja como estaba.
  const cajita = (pieza, i) => (
    <NumeroPieza
      key={`${pieza.id}-${i}`}
      numero={i + 1}
      total={piezas.length}
      onMover={(hasta) => {
        cambiarPiezas(moverA(piezas, i, hasta));
        onSeleccionar(pieza.id);
      }}
    />
  );

  // Lo nuevo va al final: el elegido se trae a la vista (el tapete se desplaza).
  useEffect(() => {
    if (!seleccionada) return;
    document.querySelector(`[data-id="${seleccionada}"]`)?.scrollIntoView?.({ block: "nearest" });
  }, [seleccionada]);

  // Lo escrito en el recuadro: se guarda; si quedó vacío y el recuadro era
  // nuevo (sin contenido), el recuadro se va.
  const aplicarEdicion = (lista, edicion) => {
    const texto = edicion.texto.trim();
    if (texto) return lista.map((p) => (p.id === edicion.id ? { ...p, contenido: texto } : p));
    return lista.filter((p) => p.id !== edicion.id || piezaCompleta(p));
  };

  // Guardia: al crear otro recuadro, el campo anterior se desmonta y puede
  // avisar que perdió el foco con su edición vieja; esa ya se guardó.
  const edicionActual = useRef(null);
  edicionActual.current = editando;

  const guardarEdicion = () => {
    if (!editando || edicionActual.current?.id !== editando.id) return;
    const nuevas = aplicarEdicion(piezas, editando);
    cambiarPiezas(nuevas);
    if (!nuevas.some((p) => p.id === editando.id) && seleccionada === editando.id) onSeleccionar(null);
    setEditando(null);
  };

  const cancelarEdicion = () => {
    if (!editando) return;
    const pieza = piezas.find((p) => p.id === editando.id);
    if (pieza && !piezaCompleta(pieza)) {
      cambiarPiezas(quitar(piezas, pieza.id));
      onSeleccionar(null);
    }
    setEditando(null);
  };

  // Computador (11-11-2026, pedido del usuario): Punto, Mensaje o Imagen crean
  // el recuadro enseguida, al final (12-11-2026: antes, debajo del elegido),
  // listo para escribir; la imagen,
  // con «Subir imagen | Mis imágenes» adentro. Antes se guarda lo que se
  // estaba escribiendo y se va una imagen que quedó sin foto.
  // `extra`: otros datos que van en el mismo cambio (la numeración elegida).
  const crearVacia = (tipo, extra = {}) => {
    let base = editando ? aplicarEdicion(piezas, editando) : piezas;
    base = base.filter((p) => p.tipo !== "imagen" || piezaCompleta(p));
    const nueva = nuevaPieza(tipo, tipo === "imagen" ? null : "");
    onCambiar({ ...extra, piezas: [...base, nueva] });
    onSeleccionar(nueva.id);
    setEditando(tipo === "imagen" ? null : { id: nueva.id, texto: "" });
  };

  // Celular: la primera vez, «Punto» abre la hoja para elegir la numeración y
  // crea el punto al escoger; después crea directo.
  const tocarPunto = () => (puntoElegido ? crearVacia("titulo") : setHojaNumeracion(true));
  const elegirNumeracion = (combinacion) => {
    setPuntoElegido(true);
    setHojaNumeracion(false);
    crearVacia("titulo", datosDeCombinacion(combinacion));
  };

  // La foto llega cuando termina de subir: se pone sobre lo que haya entonces.
  const ponerImagen = (id, imagen) =>
    onCambiar((actual) => ({ piezas: actual.piezas.map((p) => (p.id === id ? { ...p, contenido: imagen } : p)) }));

  // ---------- Recuadro de arriba (12-11-2026, opción D del lienzo) ----------
  // A la izquierda, la fecha como hoja de almanaque; al centro, título, serie
  // y versículo base; a la derecha, el chip del estado y el lápiz. Ya escrita,
  // la prédica se ve limpia; el lápiz pone todo en línea punteada y ✓ lo deja
  // limpio otra vez. Una nueva (sin título) arranca editando. Sin textos de
  // guardado (se guarda solo; si falla, avisa ControlPredica) ni botón de
  // estado: «Marcar terminada» va al final del tapete.
  const hoja = hojaDeFecha(predica.fecha);
  // En el celular la fecha siempre se puede tocar (ya no hay botón de editar).
  const puedeFecha = compacto || editandoDatos || !hoja;
  // ¿Se edita el nombre? En el celular, solo con su lápiz; en el computador, con el general.
  const enTitulo = compacto ? campo === "titulo" : editandoDatos;
  const conPunteado = "border-b border-dashed border-app-main";
  const tamanoSerie = Math.max(4, (predica.serie || TEXTO_SERIE).length);

  // El chip solo muestra el estado, con su tamaño de siempre, centrado en el
  // alto del recuadro; el lápiz (cuadrado, como los de los ítems) va abajo a
  // la derecha y es siempre un lápiz: editando se pinta dorado (12-11-2026,
  // pedidos del usuario). Se deja de editar con el mismo lápiz o con Enter.
  //
  // Celular (14-11-2026, pedidos del usuario): el recuadro va en filas. Arriba,
  // a la derecha, el chip, un poco más pequeño (h-6, 11 px) pero con sitio para
  // cualquier estado («Terminada», «Predicada»); debajo, el nombre de la
  // prédica de lado a lado; después, la fecha, a su derecha la serie y el
  // versículo base uno encima del otro y, al final, el lápiz; por último, el
  // resumen. En el computador, la columna de siempre a la derecha.
  const chip = (
    <span
      data-estado-predica={predica.estado}
      className={`flex shrink-0 items-center gap-1 rounded-full border font-semibold ${compacto ? "h-6 px-2 text-pie" : "h-7 px-3 text-chip"} ${tonoDe(predica.estado).chip}`}
    >
      {/* Sin el ✓ en el celular (14-11-2026, pedido del usuario). */}
      {!compacto && predica.estado !== "borrador" && <CheckIcon className="h-3.5 w-3.5" aria-hidden="true" />}
      {ESTADOS[predica.estado]}
    </span>
  );

  const lapiz = (
    <button
      type="button"
      data-editar-datos
      aria-label="Editar"
      title={editandoDatos ? "Terminar de editar" : "Editar fecha, título, serie y versículo base"}
      aria-pressed={editandoDatos}
      onClick={() => setEditandoDatos((si) => !si)}
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border transition ${
        editandoDatos ? "border-app-main bg-app-main text-app-dark" : "border-app-border text-app-muted hover:border-app-main hover:text-app-main"
      }`}
    >
      <PencilIcon className="h-4 w-4" aria-hidden="true" />
    </button>
  );

  // Computador: el chip centrado en el alto del recuadro y el lápiz abajo.
  const columnaDerecha = (
    <div className="flex shrink-0 flex-col items-end gap-2 self-stretch">
      <span className="flex flex-1 items-center">{chip}</span>
      {lapiz}
    </div>
  );

  // El título: en el computador va dentro del bloque del centro; en el celular
  // (14-11-2026, pedido del usuario) tiene su propia fila, de lado a lado, y
  // con el tamaño de letra de los ítems (text-sm).
  const inputTitulo = (
    <input
      ref={campoTitulo}
      aria-label="Título de la prédica"
      readOnly={!enTitulo}
      value={predica.titulo}
      onChange={(e) => onCambiar({ titulo: e.target.value })}
      onBlur={() => compacto && setCampo((actual) => (actual === "titulo" ? null : actual))}
      onKeyDown={(e) => {
        if (e.key === "Enter" && enTitulo) {
          e.preventDefault();
          setEditandoDatos(false);
          setCampo(null);
          e.currentTarget.blur();
        }
      }}
      placeholder="Escribe el título de la prédica"
      maxLength={120}
      // Celular: sin `size` el campo trae ~20 caracteres de ancho propio y
      // estira el contenedor, alejando el lápiz del texto (14-11-2026).
      size={compacto ? 1 : undefined}
      className={`w-full min-w-0 bg-transparent font-bold tracking-tight text-app-texto outline-none placeholder:text-app-main/80 ${
        // Celular: 22 px de alto, 2 px menos que el chip de al lado (h-6).
        compacto ? "col-start-1 row-start-1 h-5.5 text-sm leading-5" : "pb-1 text-3xl"
      } ${
        enTitulo ? conPunteado : "border-b border-transparent"
      }`}
    />
  );

  // Celular: el campo mide lo que mide su texto (un `span` invisible con el
  // mismo texto da el ancho), para que el lápiz quede justo después del nombre
  // (14-11-2026, pedido del usuario: «un espacio después del texto»).
  const tituloMovil = (
    <div className="inline-grid max-w-full min-w-0">
      <span aria-hidden="true" className="invisible col-start-1 row-start-1 h-5.5 truncate pr-0.5 text-sm leading-5 font-bold tracking-tight">
        {predica.titulo || "Escribe el título de la prédica"}
      </span>
      {inputTitulo}
    </div>
  );

  // La fecha: una hoja de almanaque. Se cambia al editar, o en cualquier
  // momento si no tiene (una copia sale sin fecha).
  const hojaFecha = (
      <div className="relative shrink-0">
        <button
          type="button"
          data-hoja-fecha
          onClick={puedeFecha ? abrirFecha : undefined}
          aria-label={hoja ? `Fecha: ${fechaLarga(predica.fecha)}${puedeFecha ? ". Tocar para cambiarla" : ""}` : "Sin fecha. Tocar para elegir el día"}
          title={puedeFecha ? undefined : "Para cambiar la fecha, pulsa «Editar»"}
          className={`flex flex-col overflow-hidden rounded-xl border bg-app-aviso text-center ${compacto ? "w-16" : "w-20"} ${
            puedeFecha ? "cursor-pointer border-dashed border-app-main" : "cursor-default border-app-border"
          }`}
        >
          <span className={`py-0.5 font-extrabold tracking-widest ${hoja ? "bg-app-main text-xs text-app-dark" : "bg-app-border text-diminuto text-app-texto"}`}>
            {hoja ? hoja.mes : "SIN FECHA"}
          </span>
          <span className={`pt-1 leading-none font-extrabold tabular-nums ${compacto ? "text-2xl" : "text-3xl"} ${hoja ? "text-app-texto" : "text-app-main"}`}>
            {hoja ? hoja.dia : "?"}
          </span>
          <span className={`pt-0.5 pb-1.5 text-diminuto ${hoja ? "text-app-muted" : "text-app-main"}`}>{hoja ? hoja.semana : "elige el día"}</span>
        </button>
        <input
          ref={campoFecha}
          type="date"
          aria-label="Fecha"
          tabIndex={-1}
          value={predica.fecha}
          onChange={(e) => {
            const fecha = e.target.value;
            // Si se pidió «Terminada» sin fecha, al elegirla se termina sola.
            if (esperaFecha && fecha) onTerminar({ fecha });
            else onCambiar({ fecha });
            if (fecha) setEsperaFecha(false);
          }}
          onBlur={() => setEsperaFecha(false)}
          className="sr-only"
        />
      </div>
  );

  // Serie y versículo base en una línea (computador). En el celular van uno
  // encima del otro, cada uno con su lápiz: ver `bloqueSerieBaseMovil`.
  const bloqueSerieBase = (
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
          {editandoDatos ? (
            <label className="flex items-baseline gap-1 text-app-azul">
              <span aria-hidden="true">Serie ·</span>
              <input
                aria-label="Serie"
                value={predica.serie}
                onChange={(e) => onCambiar({ serie: e.target.value })}
                placeholder={TEXTO_SERIE}
                maxLength={60}
                size={tamanoSerie}
                className={`min-w-0 bg-transparent text-app-azul outline-none placeholder:text-app-main/80 ${conPunteado}`}
              />
            </label>
          ) : (
            predica.serie && <span className="text-app-azul">Serie · {predica.serie}</span>
          )}
          {(editandoDatos || (predica.serie && base)) && <span className="text-app-muted" aria-hidden="true">·</span>}
          {editandoDatos ? (
            <CampoBase key={base} base={base} onCambiar={(nueva) => onCambiar({ base: nueva })} showNotif={showNotif} subrayado={conPunteado} />
          ) : (
            base && (
              <span data-texto-base className="flex min-w-0 items-center gap-1 text-app-agua" title={base}>
                <span className="truncate">{base}</span>
              </span>
            )
          )}
        </div>
  );

  // Celular: la serie y el versículo base, uno encima del otro, cada uno con su
  // lápiz al final. Vacíos muestran «Sin serie» / «Sin versículo base» para que
  // el lápiz tenga dónde estar. Enter o salir del campo terminan de editarlo.
  const terminarCampo = (cual) => setCampo((actual) => (actual === cual ? null : actual));
  const bloqueSerieBaseMovil = (
    <div className="flex min-w-0 flex-col gap-1 text-sm">
      <div className="flex items-center gap-1">
        <div className={`min-w-0 ${campo === "serie" ? "flex-1" : ""}`}>
          {campo === "serie" ? (
            <label className="flex w-full min-w-0 items-baseline gap-1 text-app-azul">
              <span aria-hidden="true">Serie ·</span>
              <input
                autoFocus
                aria-label="Serie"
                value={predica.serie}
                onChange={(e) => onCambiar({ serie: e.target.value })}
                onBlur={() => terminarCampo("serie")}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    e.currentTarget.blur();
                  }
                }}
                placeholder={TEXTO_SERIE}
                maxLength={60}
                className={`min-w-0 flex-1 bg-transparent text-app-azul outline-none placeholder:text-app-main/80 ${conPunteado}`}
              />
            </label>
          ) : predica.serie ? (
            <span className="block truncate text-app-azul">Serie · {predica.serie}</span>
          ) : (
            <span className="block truncate text-app-muted">Sin serie</span>
          )}
        </div>
        <LapizCampo campo="serie" nombre="la serie" activo={campo === "serie"} onClick={() => setCampo((actual) => (actual === "serie" ? null : "serie"))} />
      </div>
      <div className="flex items-center gap-1">
        <div className={`min-w-0 ${campo === "base" ? "flex-1" : ""}`}>
          {campo === "base" ? (
            <CampoBase key={base} enfocar base={base} onCambiar={(nueva) => onCambiar({ base: nueva })} showNotif={showNotif} subrayado={`${conPunteado} w-full`} onTerminar={() => terminarCampo("base")} />
          ) : base ? (
            <span data-texto-base className="block truncate text-app-agua" title={base}>
              {base}
            </span>
          ) : (
            <span className="block truncate text-app-muted">Sin versículo base</span>
          )}
        </div>
        <LapizCampo campo="base" nombre="el versículo base" activo={campo === "base"} onClick={() => setCampo((actual) => (actual === "base" ? null : "base"))} />
      </div>
    </div>
  );

  const bloqueResumen = (
    <div className="flex flex-wrap gap-1.5">
      <Resumen n={resumen.puntos} uno="punto" varios="puntos" />
      <Resumen n={resumen.versiculos} uno="versículo" varios="versículos" />
      <Resumen n={resumen.mensajes} uno="mensaje" varios="mensajes" />
      {resumen.imagenes > 0 && <Resumen n={resumen.imagenes} uno="imagen" varios="imágenes" />}
    </div>
  );

  // Computador: fecha │ título, serie, versículo base y resumen │ columna derecha.
  const fila = (
    <div className="flex items-stretch gap-5">
      {hojaFecha}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {inputTitulo}
        {bloqueSerieBase}
        {bloqueResumen}
      </div>
      {columnaDerecha}
    </div>
  );

  const datos = compacto ? (
    <div className="flex flex-col gap-1.5 px-1 pb-2">
      <div data-fila-titulo className="flex items-center gap-0.5">
        {tituloMovil}
        <LapizCampo
          campo="titulo"
          nombre="el nombre"
          activo={campo === "titulo"}
          onClick={() => {
            if (campo === "titulo") return campoTitulo.current?.blur();
            setCampo("titulo");
            setTimeout(() => campoTitulo.current?.focus(), 0);
          }}
        />
        <span aria-hidden="true" className="flex-1" />
        {chip}
      </div>
      <div data-fila-fecha className="flex items-center gap-2.5">
        {hojaFecha}
        <div className="min-w-0 flex-1">{bloqueSerieBaseMovil}</div>
      </div>
      {bloqueResumen}
    </div>
  ) : (
    fila
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {compacto && (
        // Celular (14-11-2026, pedido del usuario): una barra baja, del alto de
        // la de abajo, solo con íconos y sin el nombre de la prédica, repartidos
        // en todo el ancho (justificados): ← atrás, Duplicar, Eliminar, WhatsApp
        // y ▶ Predicar, en ese orden.
        <div className="flex h-11 shrink-0 items-center justify-between gap-1.5 border-b border-app-main bg-app-light px-2.5 py-1">
          <BotonIcono etiqueta="Volver a mis prédicas" Icono={ArrowLeftIcon} clase="text-app-texto" onClick={onVolver} fijo />
          <BotonIcono etiqueta="Duplicar" Icono={DocumentDuplicateIcon} clase="text-app-texto" onClick={onDuplicar} disabled={!predica.id} fijo />
          <BotonIcono etiqueta="Eliminar" Icono={TrashIcon} clase="text-app-error" onClick={onBorrar} disabled={!predica.id} fijo />
          {botonWhatsApp}
          <button
            type="button"
            onClick={onPredicar}
            disabled={!piezas.length}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-app-main px-3 text-sm font-bold text-app-dark disabled:opacity-40"
          >
            <PlayIcon className="h-3.5 w-3.5" aria-hidden="true" />
            Predicar
          </button>
        </div>
      )}

      <div className={`shrink-0 border-b border-app-border ${compacto ? "px-3 pt-2" : "px-8 pt-5 pb-3"}`}>{datos}</div>

      {/* Las piezas van sobre el tapete de corte, la mesa de trabajo (pedido
          del usuario, 11-11-2026): de la línea del título a la del campo de
          abajo, con su regla arriba y a la izquierda. El tapete queda quieto
          y las piezas se desplazan encima, así la regla coincide siempre. */}
      <div className="flex min-h-0 flex-1 flex-col">
        <ReglaTapete compacto={compacto} />
        <div className="flex min-h-0 flex-1">
          <ReglaTapete vertical compacto={compacto} />
          <ol
            data-tapete
            className={`tapete scrollbar-custom m-0 flex min-h-0 min-w-0 flex-1 list-none flex-col gap-2 overflow-y-auto ${compacto ? "px-3 py-3" : "px-6 py-5"}`}
          >
            {piezas.length === 0 && (
              <li className="rounded-xl bg-app-tapete-pieza px-2 py-8 text-center text-sm text-app-muted">
                {compacto
                  ? "Toca Punto, Mensaje o Imagen abajo, o el libro para agregar un versículo."
                  : "Toca Punto, Mensaje o Imagen abajo, o agrega un versículo a la derecha."}
              </li>
            )}
            {piezas.map((pieza, i) => {
              const elegida = pieza.id === seleccionada;
              const enEdicion = editando?.id === pieza.id;
              // Imagen recién creada, aún sin foto: los dos botones adentro.
              if (pieza.tipo === "imagen" && !piezaCompleta(pieza)) {
                return (
                  <li key={pieza.id} data-id={pieza.id} data-pieza="imagen" data-sin-foto className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${tonoPieza("imagen").elegida}`}>
                    <Marca pieza={pieza} compacto={compacto} />
                    <span className="flex min-w-0 flex-1 gap-2">
                      <ElegirImagen showNotif={showNotif} compacto={compacto} onElegida={(imagen) => ponerImagen(pieza.id, imagen)} />
                    </span>
                    <Accion
                      etiqueta="Quitar"
                      peligro
                      onClick={() => {
                        cambiarPiezas(quitar(piezas, pieza.id));
                        onSeleccionar(null);
                      }}
                    >
                      <TrashIcon className="h-4 w-4" aria-hidden="true" />
                    </Accion>
                    {cajita(pieza, i)}
                  </li>
                );
              }
              return (
                <li
                  key={pieza.id}
                  data-id={pieza.id}
                  data-pieza={pieza.tipo}
                  data-subpunto={esSubpunto(pieza) || undefined}
                  data-nivel={nivelDe(pieza) || undefined}
                  className={`flex items-start rounded-xl border px-3 py-2.5 transition ${compacto ? "gap-2" : "gap-3"} ${SANGRIA_NIVEL[compacto ? "compacto" : "normal"][nivelDe(pieza)]} ${
                    elegida ? tonoPieza(pieza.tipo).elegida : tonoPieza(pieza.tipo).caja
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSeleccionar(elegida ? null : pieza.id)}
                    aria-pressed={elegida}
                    className={`flex items-start text-left ${compacto ? "gap-2" : "gap-3"} ${enEdicion ? "shrink-0" : "min-w-0 flex-1"}`}
                  >
                    <Marca pieza={pieza} numero={numeros[pieza.id]} compacto={compacto} />
                    {enEdicion ? null : <Contenido pieza={pieza} compacto={compacto} />}
                  </button>
    
                  {/* Se escribe en el sitio: Enter o tocar fuera guarda (en el
                      mensaje, Shift+Enter es salto de línea), y también el
                      botón «Guardar» (pedido del usuario). Escape cancela; un
                      recuadro nuevo que queda vacío se va. */}
                  {enEdicion && (
                    <>
                      <textarea
                        autoFocus
                        value={editando.texto}
                        onChange={(e) => setEditando({ ...editando, texto: e.target.value })}
                        onBlur={guardarEdicion}
                        onKeyDown={(e) => {
                          // En el celular no hay Shift+Enter: en un mensaje,
                          // Enter es salto de línea y se guarda con ✓.
                          if (e.key === "Enter" && !e.shiftKey && !(compacto && pieza.tipo !== "titulo")) {
                            e.preventDefault();
                            guardarEdicion();
                          }
                          if (e.key === "Escape") cancelarEdicion();
                          // En un punto, Tab lo hace subpunto y Shift+Tab lo
                          // devuelve (la sangría de Word).
                          if (e.key === "Tab" && pieza.tipo === "titulo") {
                            e.preventDefault();
                            cambiarPiezas(cambiarNivel(piezas, pieza.id, nivelDe(pieza) + (e.shiftKey ? -1 : 1)));
                          }
                        }}
                        maxLength={600}
                        rows={pieza.tipo === "titulo" ? 1 : 3}
                        placeholder={pieza.tipo === "titulo" ? "Escribe el punto…" : "Escribe el mensaje…"}
                        aria-label={piezaCompleta(pieza) ? "Corregir la pieza" : `Escribe el ${NOMBRE_TIPO[pieza.tipo].toLowerCase()}`}
                        // Ocupa todo el recuadro y no se pinta distinto: sin
                        // fondo ni borde, con la letra que tendrá al guardarse.
                        className={`min-w-0 flex-1 resize-none border-0 bg-transparent p-0 text-app-texto outline-none placeholder:text-app-muted ${
                          pieza.tipo === "titulo" ? `${compacto ? "text-sm" : "text-lg"} leading-snug font-bold` : "text-sm leading-relaxed"
                        }`}
                      />
                      {/* onMouseDown evita que el campo pierda el foco antes del clic. */}
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={guardarEdicion}
                        aria-label="Guardar"
                        className={`flex h-9 shrink-0 items-center justify-center gap-1 rounded-lg text-sm font-bold ${compacto ? "w-9" : "px-3"} ${tonoPieza(pieza.tipo).boton}`}
                      >
                        <CheckIcon className="h-4 w-4" aria-hidden="true" />
                        {!compacto && "Guardar"}
                      </button>
                    </>
                  )}
    
                  {elegida && !enEdicion && (
                    // Celular: los botones del ítem, apilados en vertical (14-11-2026).
                    <span className={`flex shrink-0 gap-1 ${compacto ? "flex-col" : ""}`}>
                      {/* Celular: el número del ítem va arriba de la columna. */}
                      {compacto && cajita(pieza, i)}
                      <Accion etiqueta="Subir" onClick={() => cambiarPiezas(mover(piezas, i, -1))} disabled={i === 0}>
                        <ChevronUpIcon className="h-4 w-4" aria-hidden="true" />
                      </Accion>
                      <Accion etiqueta="Bajar" onClick={() => cambiarPiezas(mover(piezas, i, 1))} disabled={i === piezas.length - 1}>
                        <ChevronDownIcon className="h-4 w-4" aria-hidden="true" />
                      </Accion>
                      {/* Niveles: cada botón muestra el número que tendrá («a)»
                          para meterlo un nivel, «I.» para sacarlo); 12-11-2026,
                          elegido por el usuario (la flecha → / ← resultaba confusa). */}
                      {pieza.tipo === "titulo" &&
                        [
                          { cambio: -1, cuando: nivelDe(pieza) > 0 },
                          { cambio: 1, cuando: nivelDe(pieza) < nivelPermitido(piezas, pieza.id) },
                        ]
                          .filter((b) => b.cuando)
                          .map(({ cambio }) => {
                            const destino = nivelDe(pieza) + cambio;
                            const nombre = NOMBRE_NIVEL[cambio < 0 ? "sacar" : "meter"][destino];
                            return (
                              <button
                                key={cambio}
                                type="button"
                                data-cambiar-nivel={cambio < 0 ? "sacar" : "meter"}
                                aria-label={nombre}
                                title={nombre}
                                onClick={() => cambiarPiezas(cambiarNivel(piezas, pieza.id, destino))}
                                className={`grid h-9 min-w-9 place-items-center rounded-lg border border-app-border px-1.5 text-sm font-bold transition hover:border-app-main hover:text-app-main ${tonoPieza("titulo").acento}`}
                              >
                                {numerosDePuntos(cambiarNivel(piezas, pieza.id, destino), predica.numeracion, predica.numeracionNiveles)[pieza.id]}
                              </button>
                            );
                          })}
                      {compacto && (
                        <Accion etiqueta="Ver en la mini pantalla" onClick={() => setPrevia(pieza.id)}>
                          <EyeIcon className="h-4 w-4" aria-hidden="true" />
                        </Accion>
                      )}
                      {pieza.tipo !== "versiculo" && pieza.tipo !== "imagen" && (
                        <Accion etiqueta="Corregir" onClick={() => setEditando({ id: pieza.id, texto: pieza.contenido })}>
                          <PencilIcon className="h-4 w-4" aria-hidden="true" />
                        </Accion>
                      )}
                      <Accion
                        etiqueta="Quitar"
                        peligro
                        onClick={() => {
                          cambiarPiezas(quitar(piezas, pieza.id));
                          onSeleccionar(null);
                        }}
                      >
                        <TrashIcon className="h-4 w-4" aria-hidden="true" />
                      </Accion>
                    </span>
                  )}
                  {!(compacto && elegida && !enEdicion) && cajita(pieza, i)}
                </li>
              );
            })}
            {/* Siempre queda un espacio en blanco al final y, a su derecha,
                «Marcar terminada» mientras sea borrador: debajo del último
                ítem, nunca encima (12-11-2026, pedidos del usuario; flotando
                tapaba al ítem recién agregado). Para volver a borrador se
                duplica: la copia nace borrador. */}
            <li data-espacio-final className="flex min-h-24 shrink-0 items-start justify-end pt-1">
              {predica.estado === "borrador" && (
                <button
                  type="button"
                  data-marcar-terminada
                  onClick={marcarTerminada}
                  className="flex h-10 items-center gap-1.5 rounded-xl border border-app-azul bg-app-tapete-pieza px-4 text-sm font-semibold text-app-azul shadow-lg transition hover:bg-app-azul/10"
                >
                  <CheckIcon className="h-4 w-4" aria-hidden="true" />
                  Marcar terminada
                </button>
              )}
            </li>
          </ol>
        </div>
      </div>

      {/* Celular: la hoja de versículos (el mismo buscador de la columna
          derecha del computador) y la vista previa del ítem. */}
      {compacto && hojaVersiculos && (
        // A pantalla completa (14-11-2026, pedido del usuario), para ver entero
        // el versículo elegido; se cierra con la X.
        <div className="fixed inset-0 z-40 flex flex-col bg-app-dark">
          <div role="dialog" aria-modal="true" aria-label="Versículos" className="flex h-full min-h-0 flex-col gap-3 bg-app-dark p-4">
            <div className="flex items-center justify-between">
              <b className="text-app-texto">Versículos</b>
              <button type="button" onClick={() => setHojaVersiculos(false)} aria-label="Cerrar" className="grid h-10 w-10 place-items-center rounded-xl text-app-muted">
                <XMarkIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            {/* Sin SelectorBiblia en el celular (13-11-2026): pendiente de ubicar. */}
            <div className="scrollbar-custom flex min-h-0 flex-1 flex-col overflow-y-auto">
              <BuscadorVersiculos
                cambiarBiblia
                showNotif={showNotif}
                onAgregar={(pieza) => {
                  onAgregarVersiculo(pieza);
                  setHojaVersiculos(false);
                }}
              />
            </div>
          </div>
        </div>
      )}
      {compacto && piezaVista && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-app-velo p-4" onClick={() => setPrevia(null)}>
          <div role="dialog" aria-label="Así se verá en el templo" className="flex w-full flex-col gap-3 rounded-2xl bg-app-dark p-4" onClick={(e) => e.stopPropagation()}>
            <PantallaPrevia pieza={piezaVista} />
            <button type="button" onClick={() => setPrevia(null)} className="h-11 rounded-xl border border-app-border text-sm font-semibold text-app-texto">
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Celular: la hoja para elegir la numeración de los puntos, la primera
          vez que se toca «Punto». Al escoger una, se crea el punto. */}
      {compacto && hojaNumeracion && (
        <div className="fixed inset-0 z-40 flex flex-col bg-app-velo" onClick={() => setHojaNumeracion(false)}>
          <div role="dialog" aria-label="Numeración de los puntos" className="mt-auto flex flex-col gap-3 rounded-t-3xl bg-app-dark p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <b className="text-app-texto">¿Cómo numerar los puntos?</b>
              <button type="button" onClick={() => setHojaNumeracion(false)} aria-label="Cerrar" className="grid h-10 w-10 place-items-center rounded-xl text-app-muted">
                <XMarkIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {COMBINACIONES.map((c) => (
                <OpcionCombinacion key={c.clave} combinacion={c} elegida={combinacionDe(predica.numeracion, predica.numeracionNiveles)?.clave === c.clave} onElegir={elegirNumeracion} />
              ))}
            </div>
          </div>
        </div>
      )}

      <div className={`shrink-0 border-t border-app-border bg-app-light ${compacto ? "px-2.5 py-1" : "px-8 py-4"}`}>
        {compacto ? (
          // Celular (14-11-2026, pedido del usuario): seis botones solo con
          // ícono, sin recuadro ni línea divisoria, en una fila y de 40 px de alto:
          // Punto (la primera vez pregunta la numeración), Mensaje, Imagen,
          // Versículo (abre la hoja de siempre), Deshacer y Rehacer. Los
          // textos se escriben dentro de cada ítem, como en el computador.
          <div role="group" aria-label="Agregar al bosquejo" className="flex gap-1.5">
            <BotonIcono etiqueta="Punto" Icono={NumberedListIcon} clase={tonoPieza("titulo").acento} onClick={tocarPunto} data-punto />
            <BotonIcono etiqueta="Mensaje" Icono={ChatBubbleLeftRightIcon} clase={tonoPieza("mensaje").acento} onClick={() => crearVacia("mensaje")} />
            <BotonIcono etiqueta="Imagen" Icono={PhotoIcon} clase={tonoPieza("imagen").acento} onClick={() => crearVacia("imagen")} />
            {onAgregarVersiculo && (
              <BotonIcono etiqueta="Versículo" Icono={BookOpenIcon} clase="text-app-agua" onClick={() => setHojaVersiculos(true)} data-abrir-versiculos />
            )}
            {historial && (
              <>
                <BotonIcono etiqueta="Deshacer" Icono={ArrowUturnLeftIcon} clase="text-app-texto" onClick={historial.deshacer} disabled={!historial.puedeDeshacer} />
                <BotonIcono etiqueta="Rehacer" Icono={ArrowUturnRightIcon} clase="text-app-texto" onClick={historial.rehacer} disabled={!historial.puedeRehacer} />
              </>
            )}
          </div>
        ) : (
          // Computador: sin campo de texto; cada botón crea su recuadro. El
          // versículo se agrega desde la columna derecha. Seis botones del
          // mismo tamaño que ocupan todo el ancho (pedidos del usuario,
          // 11-11-2026): a la izquierda Punto, Mensaje e Imagen, cuadrados como
          // Duplicar y Borrar, con borde y texto en su neón que se rellenan al
          // pasar el mouse; una línea; a la derecha las `acciones` que pasa
          // ControlPredica (12-11-2026): «↶ ↷ Borrar Duplicar», otra línea
          // y WhatsApp.
          <div className="flex flex-wrap items-stretch gap-3">
            <div role="group" aria-label="Agregar al bosquejo" className="flex min-w-80 flex-3 gap-2">
              {TIPOS_PIEZA.map(({ tipo, nombre }) => {
                const Icono = ICONO_TIPO[tipo];
                // «Punto» lleva el desplegable de la numeración (12-11-2026).
                if (tipo === "titulo") {
                  return (
                    <BotonPunto
                      key={tipo}
                      nombre={nombre}
                      Icono={Icono}
                      clase={tonoPieza(tipo).contorno}
                      numeracion={predica.numeracion}
                      niveles={predica.numeracionNiveles}
                      onCrear={() => crearVacia(tipo)}
                      onElegir={(combinacion) => onCambiar(datosDeCombinacion(combinacion))}
                    />
                  );
                }
                return (
                  <button
                    key={tipo}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => crearVacia(tipo)}
                    className={`flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl border text-sm font-bold transition ${tonoPieza(tipo).contorno}`}
                  >
                    <Icono className="h-5 w-5 shrink-0" aria-hidden="true" />
                    {nombre}
                  </button>
                );
              })}
            </div>
            {acciones && <span aria-hidden="true" className="w-px bg-app-border" />}
            {acciones}
          </div>
        )}
      </div>
    </div>
  );
}

// La regla del tapete de corte: un número cada 5 cuadritos (cada línea dorada
// de la utilidad `tapete`, 6.25rem). Solo dibujo; lo que sobra se recorta.
//
// `compacto` (celular, 14-11-2026, pedido del usuario): las dos reglas, un poco
// más angostas (la de arriba h-4 y la lateral w-5, en vez de h-5 y w-6). La
// esquina de la regla de arriba mide lo mismo que la lateral.
function ReglaTapete({ vertical = false, compacto = false }) {
  const numeros = Array.from({ length: vertical ? 12 : 16 }, (_, i) => i);
  const numero = "shrink-0 text-diminuto font-semibold text-app-main/70";
  const ancho = compacto ? "w-5" : "w-6";
  if (vertical) {
    return (
      <div aria-hidden="true" data-regla="izquierda" className={`flex ${ancho} shrink-0 flex-col overflow-hidden border-r border-app-main/35 bg-app-tapete-regla`}>
        {numeros.map((n) => (
          <span key={n} className={`h-25 ${compacto ? "pt-0.5 pl-1" : "pt-1 pl-2"} ${numero}`}>
            {n}
          </span>
        ))}
      </div>
    );
  }
  return (
    <div aria-hidden="true" data-regla="arriba" className={`flex ${compacto ? "h-4" : "h-5"} shrink-0 overflow-hidden border-b border-app-main/35 bg-app-tapete-regla`}>
      <span className={`${ancho} shrink-0 border-r border-app-main/35`} />
      {numeros.map((n) => (
        <span key={n} className={`w-25 ${compacto ? "pt-0 pl-1" : "pt-1 pl-1"} ${numero}`}>
          {n}
        </span>
      ))}
    </div>
  );
}

function Resumen({ n, uno, varios }) {
  return (
    <span className="rounded-full bg-app-border px-2.5 py-0.5 text-diminuto font-semibold tracking-wide text-app-texto uppercase">
      {n} {n === 1 ? uno : varios}
    </span>
  );
}

// El botón «Punto» de la barra de abajo, partido en dos (12-11-2026, pedidos
// del usuario): a la izquierda crea un punto; a la derecha, la flecha abre las
// combinaciones de numeración ya hechas para los tres niveles (COMBINACIONES),
// cada una con su vista previa, como la biblioteca de listas multinivel de
// Word. Se abre hacia arriba (la barra está abajo) y se cierra al elegir, con
// Escape o tocando fuera.
function BotonPunto({ nombre, Icono, clase, numeracion, niveles, onCrear, onElegir }) {
  const [abierto, setAbierto] = useState(false);
  const caja = useRef(null);
  const actual = combinacionDe(numeracion, niveles);
  const estilos = estilosDeNiveles(numeracion, niveles);
  useEffect(() => {
    if (!abierto) return undefined;
    const fuera = (e) => {
      if (!caja.current?.contains(e.target)) setAbierto(false);
    };
    const tecla = (e) => {
      if (e.key === "Escape") setAbierto(false);
    };
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", tecla);
    };
  }, [abierto]);
  const ejemplo = NUMERACIONES.find((n) => n.clave === estilos[0]);
  return (
    <div ref={caja} className="relative flex min-w-0 flex-1">
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onCrear}
        className={`flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-l-xl border text-sm font-bold transition ${clase}`}
      >
        <Icono className="h-5 w-5 shrink-0" aria-hidden="true" />
        {nombre}
      </button>
      <button
        type="button"
        data-numeracion={estilos[0]}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setAbierto((si) => !si)}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-label={`Numeración de los puntos: ${ejemplo.nombre}`}
        title={`Numeración: ${estilos.map((s) => etiquetaPunto(1, s)).join(" → ")}`}
        className={`flex h-11 w-9 shrink-0 items-center justify-center rounded-r-xl border border-l-0 transition ${clase}`}
      >
        <ChevronUpIcon className="h-4 w-4" aria-hidden="true" />
      </button>
      {abierto && (
        <div
          role="menu"
          aria-label="Numeración de los puntos"
          className="absolute bottom-full left-0 z-30 mb-2 flex w-120 flex-col gap-2 rounded-xl border border-app-border bg-app-light p-3 shadow-xl"
        >
          <span className="text-diminuto font-semibold tracking-widest text-app-muted uppercase">Numeración de puntos, subpuntos y sub-subpuntos</span>
          <div className="grid grid-cols-3 gap-2">
            {COMBINACIONES.map((c) => (
              <OpcionCombinacion
                key={c.clave}
                combinacion={c}
                elegida={actual?.clave === c.clave}
                onElegir={(combinacion) => {
                  onElegir(combinacion);
                  setAbierto(false);
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Una combinación de numeración con su vista previa (un renglón por nivel, cada
// uno más adentro). La usan el desplegable de «Punto» (computador) y la hoja
// del celular.
function OpcionCombinacion({ combinacion: c, elegida, onElegir }) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={elegida}
      aria-label={`${c.nombre}: ${c.estilos.map((s) => etiquetaPunto(1, s)).join(" → ")}`}
      data-combinacion={c.clave}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => onElegir(c)}
      className={`flex flex-col gap-0.5 rounded-lg border p-2 text-left text-xs transition ${
        elegida ? "border-app-violeta bg-app-violeta/15 text-app-texto" : "border-app-border text-app-muted hover:border-app-violeta hover:text-app-texto"
      }`}
    >
      {c.estilos.map((s, n) => (
        <span key={n} className={`flex items-center gap-1 ${["", "pl-3", "pl-6"][n]}`}>
          <b className={elegida ? "text-app-violeta" : ""}>{etiquetaPunto(1, s)}</b>
          <span aria-hidden="true" className="h-0.5 flex-1 rounded-full bg-current opacity-40" />
        </span>
      ))}
      <span className="pt-1 text-diminuto">{c.nombre}</span>
    </button>
  );
}

// Botón de la barra de abajo del celular: solo el ícono, sin recuadro, 40 px de alto.
// El nombre va en `aria-label` y `title`. onMouseDown evita que el campo que se
// está escribiendo pierda el foco antes del clic.
function BotonIcono({ etiqueta, Icono, clase, onClick, disabled = false, fijo = false, ...datos }) {
  return (
    <button
      type="button"
      aria-label={etiqueta}
      title={etiqueta}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      className={`flex h-9 items-center justify-center rounded-xl transition active:bg-app-border/40 disabled:pointer-events-none disabled:opacity-30 ${fijo ? "w-10 shrink-0" : "min-w-0 flex-1"} ${clase}`}
      {...datos}
    >
      <Icono className="h-6 w-6" aria-hidden="true" />
    </button>
  );
}

// Los textos de los ítems van acordes a la pantalla (14-11-2026, pedido del
// usuario): en el celular, punto, mensaje y versículo comparten `text-sm` (el
// punto se distingue por la negrita) y las columnas de la marca son más
// angostas; en el computador, el punto es más grande (`text-lg`).
function Marca({ pieza, numero, compacto = false }) {
  const ancho = compacto ? "w-6" : "w-8";
  // min-w y no w fijo: la etiqueta lleva su signo («VIII.», «iv.»).
  if (pieza.tipo === "titulo") return <span className={`${compacto ? "min-w-6 text-sm" : "min-w-8 text-xl"} shrink-0 pr-1 leading-snug font-bold ${tonoPieza("titulo").acento}`}>{numero}</span>;
  if (pieza.tipo === "mensaje" || pieza.tipo === "imagen" || pieza.tipo === "versiculo") {
    // El versículo lleva la Biblia abierta (pedido del usuario, 11-11-2026).
    const Icono = { imagen: PhotoIcon, versiculo: BookOpenIcon }[pieza.tipo] || ChatBubbleLeftRightIcon;
    return (
      <span className={`grid ${ancho} shrink-0 place-items-start pt-0.5 ${tonoPieza(pieza.tipo).acento}`}>
        <Icono className="h-4 w-4" aria-hidden="true" />
      </span>
    );
  }
  return <span className={`${ancho} shrink-0`} aria-hidden="true" />;
}

function Contenido({ pieza, compacto = false }) {
  if (pieza.tipo === "titulo") return <b className={`min-w-0 flex-1 leading-snug text-app-texto ${compacto ? "text-sm" : "text-lg"}`}>{pieza.contenido}</b>;
  // El texto del contenido va igual en todos los ítems (pedido del usuario).
  if (pieza.tipo === "mensaje") return <span className="min-w-0 flex-1 text-sm leading-relaxed whitespace-pre-line text-app-texto">{pieza.contenido}</span>;
  if (pieza.tipo === "imagen")
    return (
      <span className="flex min-w-0 flex-1 items-center gap-3">
        <img src={pieza.contenido?.url} alt="" className={`shrink-0 rounded-lg bg-app-aviso object-cover ${compacto ? "h-16 w-24" : "h-20 w-32"}`} />
        <span className="min-w-0 truncate text-sm text-app-texto">{pieza.contenido?.nombre || "Imagen"}</span>
      </span>
    );
  return (
    // El recuadro ya lleva el celeste del versículo: aquí solo la cita y el texto.
    <span className="flex min-w-0 flex-1 flex-col gap-1">
      <span className={`text-diminuto font-semibold tracking-widest uppercase ${tonoPieza("versiculo").acento}`}>
        {pieza.contenido?.cita}
        {/* Las iniciales de su Biblia (11-11-2026); las de antes, RVR1960. */}
        <span data-sigla-biblia className="opacity-60"> · {siglaBiblia(pieza.contenido?.version)}</span>
      </span>
      <span className="text-sm leading-relaxed text-app-texto">{pieza.contenido?.texto}</span>
    </span>
  );
}

// El versículo base (12-11-2026, pedido del usuario): se escribe la cita y,
// al salir del campo o con Enter, se reconoce y queda bien escrita
// («juan 3 16» → «Juan 3:16»). Solo se muestra arriba, junto a la serie: no
// se agrega como ítem. Lo que no es una cita avisa y no se guarda; vacío, se quita.
function CampoBase({ base, onCambiar, showNotif, subrayado, enfocar = false, onTerminar }) {
  const { versionBiblia } = useAppContext();
  const [texto, setTexto] = useState(base);
  const aplicar = () => {
    const cita = citaBase(texto, librosDe(versionValida(versionBiblia)));
    if (cita === null) {
      showNotif?.("warning", "No reconozco esa cita. Escríbela así: Juan 3:16");
      return;
    }
    setTexto(cita);
    if (cita !== base) onCambiar(cita);
  };
  const ayuda = "Escribe el versículo base (ej. Juan 3:16)";
  return (
    <input
      data-texto-base
      aria-label="Versículo base"
      autoFocus={enfocar}
      value={texto}
      onChange={(e) => setTexto(e.target.value)}
      onBlur={() => {
        aplicar();
        onTerminar?.();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      placeholder={ayuda}
      maxLength={60}
      size={Math.max(6, (texto || ayuda).length)}
      className={`min-w-0 bg-transparent text-app-agua outline-none placeholder:text-app-main/80 ${subrayado}`}
    />
  );
}

// El lápiz pequeño al final de cada texto del recuadro de arriba (celular,
// 14-11-2026). Edita solo ese campo; con el campo activo se pinta dorado.
// onMouseDown evita que el campo pierda el foco antes del clic.
function LapizCampo({ campo, nombre, activo, onClick }) {
  return (
    <button
      type="button"
      data-editar-campo={campo}
      aria-label={`Editar ${nombre}`}
      title={`Editar ${nombre}`}
      aria-pressed={activo}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg transition ${activo ? "bg-app-main text-app-dark" : "text-app-muted"}`}
    >
      <PencilIcon className="h-3.5 w-3.5" aria-hidden="true" />
    </button>
  );
}

function NumeroPieza({ numero, total, onMover }) {
  const [texto, setTexto] = useState(String(numero));
  const aplicar = () => {
    const hasta = posicionEscrita(texto, total);
    if (hasta === null || hasta === numero - 1) setTexto(String(numero));
    else onMover(hasta);
  };
  return (
    <input
      data-numero
      value={texto}
      onChange={(e) => setTexto(e.target.value.replace(/\D/g, "").slice(0, 3))}
      onFocus={(e) => e.target.select()}
      onBlur={aplicar}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        }
        if (e.key === "Escape") {
          setTexto(String(numero));
          e.currentTarget.blur();
        }
      }}
      inputMode="numeric"
      aria-label={`Ítem ${numero} de ${total}. Escribe otro número para moverlo`}
      title="Escribe otro número para mover el ítem"
      className="h-9 w-9 shrink-0 rounded-lg border border-app-border bg-app-tapete-pieza text-center text-sm font-bold text-app-texto tabular-nums outline-none focus:border-app-main"
    />
  );
}

function Accion({ etiqueta, onClick, disabled = false, peligro = false, children }) {
  return (
    <button
      type="button"
      aria-label={etiqueta}
      title={etiqueta}
      onClick={onClick}
      disabled={disabled}
      className={`grid h-9 w-9 place-items-center rounded-lg border border-app-border transition disabled:opacity-30 ${
        peligro ? "text-app-error hover:border-app-error" : "text-app-muted hover:border-app-main hover:text-app-main"
      }`}
    >
      {children}
    </button>
  );
}
