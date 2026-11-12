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
  XMarkIcon,
} from "@heroicons/react/24/solid";
import CampoPieza from "./CampoPieza.jsx";
import ElegirImagen from "./ElegirImagen.jsx";
import {
  ESTADOS,
  NOMBRE_TIPO,
  TIPOS_PIEZA,
  insertarDespues,
  mover,
  nuevaPieza,
  numerosDePuntos,
  piezaCompleta,
  quitar,
  resumenPiezas,
  siguienteEstado,
} from "./utilesPredica.js";
import { tonoDe } from "./tonosPredica.js";
import { tonoPieza } from "./tonosPieza.js";
import { siglaBiblia } from "../LibrosBiblia/avisosBiblia.js";

// El ícono de cada botón de agregar (computador).
const ICONO_TIPO = { titulo: NumberedListIcon, mensaje: ChatBubbleLeftRightIcon, imagen: PhotoIcon };

const TEXTO_GUARDADO = {
  guardado: "Guardado",
  pendiente: "Guardando…",
  guardando: "Guardando…",
  error: "No se pudo guardar",
  nueva: "Se guarda al escribir", // la vacía del computador, aún sin documento
};

// Preparar: el bosquejo de una prédica. Los datos (título, fecha, serie), las
// piezas en orden (subir, bajar, corregir, quitar) y el campo único para
// agregar. Todo cambio se guarda solo (lo hace ControlPredica). Tocar una
// pieza la elige: se ve en la vista previa y muestra sus botones.
export default function EditorPredica({
  predica,
  onCambiar,
  estadoGuardado,
  seleccionada,
  onSeleccionar,
  compacto = false,
  onVolver,
  onPredicar,
  showNotif,
  enfocarTitulo = false,
  onTituloEnfocado,
  acciones = null, // computador: WhatsApp, Duplicar y Borrar, abajo a la derecha
}) {
  const [editando, setEditando] = useState(null); // { id, texto }
  const campoTitulo = useRef(null);

  // Recién creada: el cursor va al título con «Nueva prédica» seleccionado,
  // para escribir el nombre de una vez (pedido del usuario, 11-11-2026).
  useEffect(() => {
    if (!enfocarTitulo || !campoTitulo.current) return;
    campoTitulo.current.focus();
    campoTitulo.current.select();
    onTituloEnfocado?.();
  }, [enfocarTitulo, onTituloEnfocado]);
  const { piezas } = predica;
  const numeros = numerosDePuntos(piezas);
  const resumen = resumenPiezas(piezas);

  const cambiarPiezas = (nuevas) => onCambiar({ piezas: nuevas });

  // Celular (CampoPieza): lo escrito llega hecho y va debajo del elegido.
  const agregar = (pieza) => {
    cambiarPiezas(insertarDespues(piezas, seleccionada, pieza));
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
  // el recuadro enseguida, debajo del elegido, listo para escribir; la imagen,
  // con «Subir imagen | Mis imágenes» adentro. Antes se guarda lo que se
  // estaba escribiendo y se va una imagen que quedó sin foto.
  const crearVacia = (tipo) => {
    let base = editando ? aplicarEdicion(piezas, editando) : piezas;
    base = base.filter((p) => p.tipo !== "imagen" || piezaCompleta(p));
    const nueva = nuevaPieza(tipo, tipo === "imagen" ? null : "");
    const ancla = base.some((p) => p.id === seleccionada) ? seleccionada : null;
    cambiarPiezas(insertarDespues(base, ancla, nueva));
    onSeleccionar(nueva.id);
    setEditando(tipo === "imagen" ? null : { id: nueva.id, texto: "" });
  };

  // La foto llega cuando termina de subir: se pone sobre lo que haya entonces.
  const ponerImagen = (id, imagen) =>
    onCambiar((actual) => ({ piezas: actual.piezas.map((p) => (p.id === id ? { ...p, contenido: imagen } : p)) }));

  const guardado = (
    <span
      role="status"
      className={`flex items-center gap-1 text-xs ${estadoGuardado === "error" ? "text-app-error" : estadoGuardado === "guardado" ? "text-app-success" : "text-app-muted"}`}
    >
      {estadoGuardado === "guardado" && <CheckIcon className="h-3.5 w-3.5" aria-hidden="true" />}
      {TEXTO_GUARDADO[estadoGuardado]}
    </span>
  );

  const datos = (
    <div className={`flex flex-col gap-2 ${compacto ? "px-1 pb-2" : ""}`}>
      <div className="flex flex-wrap items-center gap-2 text-xs text-app-muted">
        {/* Estado: nace «Borrador» y, al terminar de prepararla, se toca y
            pasa a «Terminada» (y vuelve). «Predicada» la pone el púlpito.
            Pedido del usuario, 11-11-2026. */}
        <button
          type="button"
          onClick={() => onCambiar({ estado: siguienteEstado(predica.estado) })}
          aria-label={`Estado: ${ESTADOS[predica.estado]}. ${predica.estado === "terminada" ? "Tocar para volverla a borrador" : "Tocar para marcarla terminada"}`}
          title={predica.estado === "terminada" ? "Tocar para volverla a borrador" : "Tocar para marcarla terminada"}
          data-estado-predica={predica.estado}
          className={`flex h-7 shrink-0 items-center gap-1 rounded-full border px-3 text-chip font-semibold transition ${tonoDe(predica.estado).chip}`}
        >
          {predica.estado !== "borrador" && <CheckIcon className="h-3.5 w-3.5" aria-hidden="true" />}
          {ESTADOS[predica.estado]}
        </button>
        <label className="flex items-center gap-1.5">
          <span className="sr-only">Fecha</span>
          <input
            type="date"
            value={predica.fecha}
            onChange={(e) => onCambiar({ fecha: e.target.value })}
            className="form-dark rounded-lg border border-app-border bg-app-aviso px-2 py-1 text-xs text-app-texto"
          />
        </label>
        <label className="flex min-w-0 flex-1 items-center gap-1.5">
          <span className="shrink-0">Serie</span>
          <input
            value={predica.serie}
            onChange={(e) => onCambiar({ serie: e.target.value })}
            placeholder="Opcional"
            maxLength={60}
            className="min-w-0 flex-1 rounded-lg border border-app-border bg-app-aviso px-2 py-1 text-xs text-app-azul outline-none focus:border-app-main"
          />
        </label>
        {!compacto && guardado}
        {/* Computador: la única entrada al púlpito, arriba a la derecha
            (11-11-2026; antes, «Empezar a predicar» en la columna derecha). */}
        {!compacto && (
          <button
            type="button"
            onClick={onPredicar}
            className="ml-auto flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-app-main px-4 text-sm font-bold text-app-dark"
          >
            <PlayIcon className="h-4 w-4" aria-hidden="true" />
            Predicar
          </button>
        )}
      </div>
      {/* El título se ve como campo: línea punteada y lápiz; al escribir, la
          línea se pone dorada (pedido del usuario, 11-11-2026: no se notaba
          que se podía cambiar). */}
      <label className="group flex items-center gap-2 border-b border-dashed border-app-muted pb-1 focus-within:border-solid focus-within:border-app-main">
        <span className="sr-only">Título de la prédica</span>
        <input
          ref={campoTitulo}
          value={predica.titulo}
          onChange={(e) => onCambiar({ titulo: e.target.value })}
          placeholder="Escribe el título de la prédica"
          maxLength={120}
          className={`min-w-0 flex-1 bg-transparent font-bold tracking-tight text-app-texto outline-none placeholder:text-app-muted ${compacto ? "text-xl" : "text-3xl"}`}
        />
        <PencilIcon className="h-4 w-4 shrink-0 text-app-muted group-focus-within:text-app-main" aria-hidden="true" />
      </label>
      <div className="flex flex-wrap gap-1.5">
        <Resumen n={resumen.puntos} uno="punto" varios="puntos" />
        <Resumen n={resumen.versiculos} uno="versículo" varios="versículos" />
        <Resumen n={resumen.mensajes} uno="mensaje" varios="mensajes" />
        {resumen.imagenes > 0 && <Resumen n={resumen.imagenes} uno="imagen" varios="imágenes" />}
      </div>
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
            {guardado}
          </span>
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
                  <li key={pieza.id} data-pieza="imagen" data-sin-foto className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${tonoPieza("imagen").elegida}`}>
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
                      <XMarkIcon className="h-4 w-4" aria-hidden="true" />
                    </Accion>
                  </li>
                );
              }
              return (
                <li
                  key={pieza.id}
                  data-pieza={pieza.tipo}
                  className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 transition ${
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
                        <XMarkIcon className="h-4 w-4" aria-hidden="true" />
                      </Accion>
                    </span>
                  )}
                </li>
              );
            })}
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
          // ControlPredica: WhatsApp, Duplicar y Borrar.
          <div className="flex items-stretch gap-3">
            <div role="group" aria-label="Agregar al bosquejo" className="flex flex-1 gap-2">
              {TIPOS_PIEZA.map(({ tipo, nombre }) => {
                const Icono = ICONO_TIPO[tipo];
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

function Marca({ pieza, numero }) {
  if (pieza.tipo === "titulo") return <span className={`w-8 shrink-0 text-xl leading-snug font-bold ${tonoPieza("titulo").acento}`}>{numero}</span>;
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
