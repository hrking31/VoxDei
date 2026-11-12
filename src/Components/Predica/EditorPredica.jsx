import { useEffect, useRef, useState } from "react";
import {
  ArrowLeftIcon,
  BookOpenIcon,
  ChatBubbleLeftRightIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  NumberedListIcon,
  PencilIcon,
  PhotoIcon,
  PlayIcon,
  TrashIcon,
} from "@heroicons/react/24/solid";
import CampoPieza from "./CampoPieza.jsx";
import ElegirImagen from "./ElegirImagen.jsx";
import BotonesHistorial from "./BotonesHistorial.jsx";
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
  historial = null, // { deshacer, rehacer, puedeDeshacer, puedeRehacer } (celular: arriba)
}) {
  const [editando, setEditando] = useState(null); // { id, texto }
  const campoTitulo = useRef(null);

  // ¿Fecha, título, serie y versículo base en modo editar (línea punteada)?
  // Una prédica sin título arranca editando; al abrir otra se decide de nuevo.
  // La vacía que se acaba de crear al escribir (su id pasa de null a uno
  // real) sigue como estaba, para no cortarle la escritura.
  const [editandoDatos, setEditandoDatos] = useState(() => !predica.titulo.trim());
  const idAnterior = useRef(predica.id);
  useEffect(() => {
    const antes = idAnterior.current;
    idAnterior.current = predica.id;
    if (antes === predica.id || antes === null) return;
    setEditandoDatos(!predica.titulo.trim());
  }, [predica.id, predica.titulo]);

  // Recién creada: modo editar y el cursor en el título con «Nueva prédica»
  // seleccionado, para escribir el nombre de una vez (11-11-2026).
  useEffect(() => {
    if (!enfocarTitulo || !campoTitulo.current) return;
    setEditandoDatos(true);
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

  // Celular (CampoPieza): lo escrito llega hecho y va al final.
  const agregar = (pieza) => {
    cambiarPiezas([...piezas, pieza]);
    onSeleccionar(pieza.id);
  };

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
  const crearVacia = (tipo) => {
    let base = editando ? aplicarEdicion(piezas, editando) : piezas;
    base = base.filter((p) => p.tipo !== "imagen" || piezaCompleta(p));
    const nueva = nuevaPieza(tipo, tipo === "imagen" ? null : "");
    cambiarPiezas([...base, nueva]);
    onSeleccionar(nueva.id);
    setEditando(tipo === "imagen" ? null : { id: nueva.id, texto: "" });
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
  const puedeFecha = editandoDatos || !hoja;
  const conPunteado = "border-b border-dashed border-app-main";
  const tamanoSerie = Math.max(4, (predica.serie || TEXTO_SERIE).length);

  // El chip solo muestra el estado, con su tamaño de siempre, centrado en el
  // alto del recuadro; el lápiz (cuadrado, como los de los ítems) va abajo a
  // la derecha y es siempre un lápiz: editando se pinta dorado (12-11-2026,
  // pedidos del usuario). Se deja de editar con el mismo lápiz o con Enter.
  const columnaDerecha = (
    <div className={`flex shrink-0 gap-2 ${compacto ? "w-full items-center justify-between" : "flex-col items-end self-stretch"}`}>
      <span className={compacto ? "contents" : "flex flex-1 items-center"}>
        <span
          data-estado-predica={predica.estado}
          className={`flex h-7 shrink-0 items-center gap-1 rounded-full border px-3 text-chip font-semibold ${tonoDe(predica.estado).chip}`}
        >
          {predica.estado !== "borrador" && <CheckIcon className="h-3.5 w-3.5" aria-hidden="true" />}
          {ESTADOS[predica.estado]}
        </span>
      </span>
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
    </div>
  );

  const datos = (
    <div className={`flex gap-4 ${compacto ? "flex-wrap px-1 pb-2" : "items-stretch gap-5"}`}>
      {/* La fecha: una hoja de almanaque. Se cambia al editar, o en cualquier
          momento si no tiene (una copia sale sin fecha). */}
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

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <input
          ref={campoTitulo}
          aria-label="Título de la prédica"
          readOnly={!editandoDatos}
          value={predica.titulo}
          onChange={(e) => onCambiar({ titulo: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter" && editandoDatos) {
              e.preventDefault();
              setEditandoDatos(false);
              e.currentTarget.blur();
            }
          }}
          placeholder="Escribe el título de la prédica"
          maxLength={120}
          className={`w-full min-w-0 bg-transparent pb-1 font-bold tracking-tight text-app-texto outline-none placeholder:text-app-main/80 ${compacto ? "text-xl" : "text-3xl"} ${
            editandoDatos ? conPunteado : "border-b border-transparent"
          }`}
        />

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

        <div className="flex flex-wrap gap-1.5">
          <Resumen n={resumen.puntos} uno="punto" varios="puntos" />
          <Resumen n={resumen.versiculos} uno="versículo" varios="versículos" />
          <Resumen n={resumen.mensajes} uno="mensaje" varios="mensajes" />
          {resumen.imagenes > 0 && <Resumen n={resumen.imagenes} uno="imagen" varios="imágenes" />}
        </div>
      </div>

      {columnaDerecha}
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {compacto && (
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-app-main bg-app-light px-2">
          <button type="button" onClick={onVolver} aria-label="Volver a mis prédicas" className="grid h-11 w-11 place-items-center rounded-xl text-app-texto">
            <ArrowLeftIcon className="h-5 w-5" aria-hidden="true" />
          </button>
          <span className="flex min-w-0 flex-1 flex-col">
            <b className="truncate text-base text-app-texto">{predica.titulo || "Sin título"}</b>
          </span>
          {/* Celular: Deshacer y Rehacer arriba (abajo está el campo). */}
          {historial && <BotonesHistorial historial={historial} className="h-10 w-10 rounded-xl" />}
          <button
            type="button"
            onClick={onPredicar}
            disabled={!piezas.length}
            className="flex h-10 items-center gap-1.5 rounded-xl bg-app-main px-3.5 text-sm font-bold text-app-dark disabled:opacity-40"
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
        <ReglaTapete />
        <div className="flex min-h-0 flex-1">
          <ReglaTapete vertical />
          <ol
            data-tapete
            className={`tapete scrollbar-custom m-0 flex min-h-0 min-w-0 flex-1 list-none flex-col gap-2 overflow-y-auto ${compacto ? "px-3 py-3" : "px-6 py-5"}`}
          >
            {piezas.length === 0 && (
              <li className="rounded-xl bg-app-tapete-pieza px-2 py-8 text-center text-sm text-app-muted">
                {compacto
                  ? "Escribe abajo el primer punto, un mensaje o una cita como «Juan 3:16»."
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
                    <Marca pieza={pieza} />
                    <span className="flex min-w-0 flex-1 gap-2">
                      <ElegirImagen showNotif={showNotif} onElegida={(imagen) => ponerImagen(pieza.id, imagen)} />
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
                  className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 transition ${SANGRIA_NIVEL[compacto ? "compacto" : "normal"][nivelDe(pieza)]} ${
                    elegida ? tonoPieza(pieza.tipo).elegida : tonoPieza(pieza.tipo).caja
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSeleccionar(elegida ? null : pieza.id)}
                    aria-pressed={elegida}
                    className={`flex items-start gap-3 text-left ${enEdicion ? "shrink-0" : "min-w-0 flex-1"}`}
                  >
                    <Marca pieza={pieza} numero={numeros[pieza.id]} />
                    {enEdicion ? null : <Contenido pieza={pieza} />}
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
                          if (e.key === "Enter" && !e.shiftKey) {
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
                          pieza.tipo === "titulo" ? "text-lg leading-snug font-bold" : "text-sm leading-relaxed"
                        }`}
                      />
                      {/* onMouseDown evita que el campo pierda el foco antes del clic. */}
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={guardarEdicion}
                        className={`flex h-9 shrink-0 items-center gap-1 rounded-lg px-3 text-sm font-bold ${tonoPieza(pieza.tipo).boton}`}
                      >
                        <CheckIcon className="h-4 w-4" aria-hidden="true" />
                        Guardar
                      </button>
                    </>
                  )}
    
                  {elegida && !enEdicion && (
                    <span className="flex shrink-0 gap-1">
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
                  {cajita(pieza, i)}
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

      <div className={`shrink-0 border-t border-app-border bg-app-light ${compacto ? "px-2.5 py-2" : "px-8 py-4"}`}>
        {compacto ? (
          <CampoPieza onAgregar={agregar} showNotif={showNotif} />
        ) : (
          // Computador: sin campo de texto; cada botón crea su recuadro. El
          // versículo se agrega desde la columna derecha. Seis botones del
          // mismo tamaño que ocupan todo el ancho (pedidos del usuario,
          // 11-11-2026): a la izquierda Punto, Mensaje e Imagen, cuadrados como
          // Duplicar y Borrar, con borde y texto en su neón que se rellenan al
          // pasar el mouse; una línea; a la derecha las `acciones` que pasa
          // ControlPredica (12-11-2026): «↶ ↷ Borrar Duplicar», otra línea
          // y WhatsApp.
          <div className="flex items-stretch gap-3">
            <div role="group" aria-label="Agregar al bosquejo" className="flex flex-3 gap-2">
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
function ReglaTapete({ vertical = false }) {
  const numeros = Array.from({ length: vertical ? 12 : 16 }, (_, i) => i);
  const numero = "shrink-0 text-diminuto font-semibold text-app-main/70";
  if (vertical) {
    return (
      <div aria-hidden="true" data-regla="izquierda" className="flex w-6 shrink-0 flex-col overflow-hidden border-r border-app-main/35 bg-app-tapete-regla">
        {numeros.map((n) => (
          <span key={n} className={`h-25 pt-1 pl-2 ${numero}`}>
            {n}
          </span>
        ))}
      </div>
    );
  }
  return (
    <div aria-hidden="true" data-regla="arriba" className="flex h-5 shrink-0 overflow-hidden border-b border-app-main/35 bg-app-tapete-regla">
      <span className="w-6 shrink-0 border-r border-app-main/35" />
      {numeros.map((n) => (
        <span key={n} className={`w-25 pt-1 pl-1 ${numero}`}>
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
            {COMBINACIONES.map((c) => {
              const elegida = actual?.clave === c.clave;
              return (
                <button
                  key={c.clave}
                  type="button"
                  role="menuitemradio"
                  aria-checked={elegida}
                  aria-label={`${c.nombre}: ${c.estilos.map((s) => etiquetaPunto(1, s)).join(" → ")}`}
                  data-combinacion={c.clave}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onElegir(c);
                    setAbierto(false);
                  }}
                  className={`flex flex-col gap-0.5 rounded-lg border p-2 text-left text-xs transition ${
                    elegida ? "border-app-violeta bg-app-violeta/15 text-app-texto" : "border-app-border text-app-muted hover:border-app-violeta hover:text-app-texto"
                  }`}
                >
                  {/* Vista previa: un renglón por nivel, cada uno más adentro. */}
                  {c.estilos.map((s, n) => (
                    <span key={n} className={`flex items-center gap-1 ${["", "pl-3", "pl-6"][n]}`}>
                      <b className={elegida ? "text-app-violeta" : ""}>{etiquetaPunto(1, s)}</b>
                      <span aria-hidden="true" className="h-0.5 flex-1 rounded-full bg-current opacity-40" />
                    </span>
                  ))}
                  <span className="pt-1 text-diminuto">{c.nombre}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Marca({ pieza, numero }) {
  // min-w y no w fijo: la etiqueta lleva su signo («VIII.», «iv.»).
  if (pieza.tipo === "titulo") return <span className={`min-w-8 shrink-0 pr-1 text-xl leading-snug font-bold ${tonoPieza("titulo").acento}`}>{numero}</span>;
  if (pieza.tipo === "mensaje" || pieza.tipo === "imagen" || pieza.tipo === "versiculo") {
    // El versículo lleva la Biblia abierta (pedido del usuario, 11-11-2026).
    const Icono = { imagen: PhotoIcon, versiculo: BookOpenIcon }[pieza.tipo] || ChatBubbleLeftRightIcon;
    return (
      <span className={`grid w-8 shrink-0 place-items-start pt-0.5 ${tonoPieza(pieza.tipo).acento}`}>
        <Icono className="h-4 w-4" aria-hidden="true" />
      </span>
    );
  }
  return <span className="w-8 shrink-0" aria-hidden="true" />;
}

function Contenido({ pieza }) {
  if (pieza.tipo === "titulo") return <b className="min-w-0 flex-1 text-lg leading-snug text-app-texto">{pieza.contenido}</b>;
  // El texto del contenido va igual en todos los ítems (pedido del usuario).
  if (pieza.tipo === "mensaje") return <span className="min-w-0 flex-1 text-sm leading-relaxed whitespace-pre-line text-app-texto">{pieza.contenido}</span>;
  if (pieza.tipo === "imagen")
    return (
      <span className="flex min-w-0 flex-1 items-center gap-3">
        <img src={pieza.contenido?.url} alt="" className="h-20 w-32 shrink-0 rounded-lg bg-app-aviso object-cover" />
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
function CampoBase({ base, onCambiar, showNotif, subrayado }) {
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
      value={texto}
      onChange={(e) => setTexto(e.target.value)}
      onBlur={aplicar}
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
