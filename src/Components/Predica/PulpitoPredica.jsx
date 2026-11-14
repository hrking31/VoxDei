import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowLeftIcon, BookOpenIcon, BookmarkIcon, ChatBubbleLeftRightIcon, CheckIcon, ChevronLeftIcon, ChevronRightIcon, ClockIcon, EyeIcon, EyeSlashIcon, PlayIcon, TagIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { useAuth } from "../Context/AuthContext";
import { useAppContext } from "../Context/AppContext";
import { useTurno } from "../Hooks/useTurno.js";
import PantallaPrevia from "./PantallaPrevia.jsx";
import BuscadorVersiculos from "./BuscadorVersiculos.jsx";
import { useLoQueSeVe } from "./useLoQueSeVe.js";
import FranjaTurno from "../Cronograma/FranjaTurno.jsx";
// TEMPORAL DHH (12-11-2026): el botón RVR1960 / DHH también al predicar.
import SelectorBiblia from "../Biblia/SelectorBiblia.jsx";
import { apagarImagen, cambiarVisible, encenderImagen, proyectarPieza } from "./accionesPredica.js";
import { ALINEACION_RESUMEN, cuantosItems, lineasDelResumen, nivelDe, numerosDePuntos, paginaDelResumen, puntosDelBosquejo, RENGLONES_RESUMEN, relojDesde, textoDePieza, textoDePunto } from "./utilesPredica.js";

const esCampo = (el) => el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);

// Predicar: lo que está en el templo, lo que sigue y un botón grande
// «Siguiente» (también con las flechas, la barra espaciadora o un control de
// presentaciones). Tocar cualquier pieza la proyecta. Trae el reloj del tiempo
// predicando, los interruptores de lo que se ve, «Ocultar» / «Mostrar» (antes «en negro»: apaga título,
// texto y anuncio) y el versículo espontáneo (antes «al vuelo»), que se proyecta sin cambiar el
// bosquejo. Cada envío pasa por exigirTurno, como en toda la app.
//
// Cómo se ordena según la pantalla (12-11-2026, propuesta aprobada por el
// usuario: https://claude.ai/artifact/TbjJUe59Na4bgcTAMn1hd2):
//   celular     arriba la mini pantalla, sus 4 botones y «Luego»; abajo un
//               muelle fijo al alcance del pulgar (Bosquejo, Versículo,
//               Resumen, Anterior, Siguiente). Las tres primeras abren una hoja
//               que nunca tapa el muelle.
//   tableta     la mini pantalla grande; debajo el bosquejo y, al lado, Luego,
//               el resumen, el versículo espontáneo y Terminar; el muelle abajo.
//   escritorio  tres columnas. En una pantalla baja (`baja`), Luego y el resumen
//               van al lado de la mini pantalla y la cuadrícula se pliega.
export default function PulpitoPredica({ predica, compacto = false, formato = compacto ? "celular" : "escritorio", baja = false, onSalir, onTerminar }) {
  const { userData } = useAuth();
  const { exigirTurno } = useTurno();
  const {
    showNotif,
    confirmAction,
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
  // La franja de título y el anuncio, tal como están en el templo.
  const loQueSeVe = useLoQueSeVe(groupId);
  const numeros = numerosDePuntos(piezas, predica.numeracion, predica.numeracionNiveles);

  // Orden al predicar (12-11-2026, pedido del usuario): primero el nombre de
  // la prédica, en el centro como mensaje («portada»); con el primer ítem sube
  // a la franja de título y se queda ahí. Los puntos son mensajes con su número.
  const portada = { id: "portada", tipo: "mensaje", contenido: predica.titulo };
  const comoSeEnvia = useCallback(
    (pieza) => (pieza.tipo === "titulo" ? { ...pieza, tipo: "mensaje", contenido: textoDePunto(numeros[pieza.id], pieza.contenido) } : pieza),
    [numeros]
  );

  const [actual, setActual] = useState(-1);
  const [enPortada, setEnPortada] = useState(false);
  // El nombre que ya subió a la franja de título (para subirlo una sola vez y
  // encender el Título solo esa vez: si después lo apagan, se respeta).
  const tituloSubido = useRef(null);
  const [alVuelo, setAlVuelo] = useState(null);
  const [inicio] = useState(() => Date.now());
  const [ahora, setAhora] = useState(() => Date.now());
  // Celular: la hoja abierta sobre el escenario ("bosquejo" | "versiculo" | "resumen").
  const [hoja, setHoja] = useState(null);

  useEffect(() => {
    const reloj = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(reloj);
  }, []);

  // Envía una pieza; una imagen se enciende y, si estaba encendida, cualquier
  // otra pieza la apaga (si no, taparía el texto en el templo).
  const enviar = useCallback(
    (pieza, { tituloArriba = null } = {}) => {
      const esImagen = pieza.tipo === "imagen";
      proyectarPieza(groupId, pieza, { imagenEncendida: Boolean(visibleImagen), tituloArriba }).catch((error) => {
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
      setEnPortada(false);
      setAlVuelo(null);
      const subir = tituloSubido.current !== predica.titulo;
      if (subir) {
        tituloSubido.current = predica.titulo;
        if (!visibleTitulo) {
          setVisibleTitulo(true);
          cambiarVisible(groupId, "titulo", true);
        }
      }
      enviar(comoSeEnvia(pieza), { tituloArriba: subir ? predica.titulo : null });
    },
    [piezas, exigirTurno, enviar, comoSeEnvia, predica.titulo, visibleTitulo, setVisibleTitulo, groupId]
  );

  // El nombre se muestra solo como mensaje: si el Título estaba encendido se
  // apaga, para que no se vea dos veces, y se vuelve a subir (y encender) con
  // el siguiente ítem (12-11-2026, pedido del usuario).
  const mostrarPortada = useCallback(() => {
    if (!exigirTurno()) return;
    setEnPortada(true);
    setActual(-1);
    setAlVuelo(null);
    tituloSubido.current = null;
    if (visibleTitulo) {
      setVisibleTitulo(false);
      cambiarVisible(groupId, "titulo", false);
    }
    enviar({ id: "portada", tipo: "mensaje", contenido: predica.titulo });
  }, [exigirTurno, enviar, predica.titulo, visibleTitulo, setVisibleTitulo, groupId]);

  const siguiente = useCallback(
    () => (actual === -1 && !enPortada ? mostrarPortada() : proyectar(actual + 1)),
    [actual, enPortada, mostrarPortada, proyectar]
  );
  const anterior = useCallback(() => (actual === 0 ? mostrarPortada() : proyectar(actual - 1)), [actual, mostrarPortada, proyectar]);

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

  // Cada interruptor con el ícono y el color que tiene en las demás vistas
  // (ControlVersiculo, ModalVisibilidad): 12-11-2026, pedido del usuario.
  const visibles = [
    { clave: "titulo", nombre: "Título", valor: visibleTitulo, poner: setVisibleTitulo, icono: BookmarkIcon, encendido: "border-app-accent bg-app-accent/10 text-app-accent" },
    { clave: "texto", nombre: "Texto", valor: visibleTexto, poner: setVisibleTexto, icono: ChatBubbleLeftRightIcon, encendido: "border-app-main bg-app-main/10 text-app-main" },
    { clave: "ticker", nombre: "Anuncio", valor: visibleTicker, poner: setVisibleTicker, icono: TagIcon, encendido: "border-app-success bg-app-success/10 text-app-success" },
  ];
  const enNegro = visibles.every((v) => !v.valor) && !visibleImagen;

  const cambiar = (v) => {
    if (!exigirTurno()) return;
    v.poner(!v.valor);
    cambiarVisible(groupId, v.clave, !v.valor);
  };

  // «Ocultar» / «Mostrar» (12-11-2026, pedido del usuario; antes, «En
  // negro», que solo apagaba). Ocultar apaga título, texto, anuncio e imagen y
  // recuerda qué estaba encendido; Mostrar lo vuelve a encender. Sin nada que
  // recordar (ya estaba todo apagado al entrar), enciende el texto.
  const antesDeOcultar = useRef(null);
  const alternarOculto = () => {
    if (!exigirTurno()) return;
    if (!enNegro) {
      antesDeOcultar.current = { titulo: visibleTitulo, texto: visibleTexto, ticker: visibleTicker, imagen: visibleImagen };
      for (const v of visibles) {
        v.poner(false);
        cambiarVisible(groupId, v.clave, false);
      }
      if (visibleImagen) {
        setVisibleImagen?.(false);
        apagarImagen(groupId);
      }
      return;
    }
    const antes = antesDeOcultar.current || { texto: true };
    antesDeOcultar.current = null;
    for (const v of visibles) {
      if (!antes[v.clave]) continue;
      v.poner(true);
      cambiarVisible(groupId, v.clave, true);
    }
    if (antes.imagen) {
      setVisibleImagen?.(true);
      encenderImagen(groupId);
    }
  };

  // El mismo buscador de Preparar (campo, cuadrícula y tarjeta) en todas las
  // pantallas; la tarjeta proyecta el versículo sin tocar el bosquejo.
  const proyectarVersiculo = (pieza) => {
    if (!exigirTurno()) return false;
    const alAire = { ...pieza, id: "al-vuelo" };
    setAlVuelo(alAire);
    setHoja(null);
    enviar(alAire);
    return true;
  };

  const enPantalla = alVuelo || (enPortada ? portada : piezas[actual] ? comoSeEnvia(piezas[actual]) : null);
  // ¿Se ve en el templo lo que se envió? La imagen depende de la imagen; todo
  // lo demás (el nombre, los puntos, los mensajes, los versículos) va al
  // centro y depende del texto.
  const seVe = !enPantalla ? true : enPantalla.tipo === "imagen" ? Boolean(visibleImagen) : Boolean(visibleTexto);
  const noSeVe = enNegro || !seVe;
  const luego = actual === -1 && !enPortada ? portada : piezas[actual + 1];

  // Resumen de puntos (14-11-2026, pedido del usuario; antes, «puntos vistos»
  // por partes): se muestran TODOS los puntos y cada uno es un botón que el
  // predicador toca al ir recordándolo; los tocados se proyectan juntos, en el
  // orden tocado. La pantalla muestra 6 como máximo: el séptimo la limpia y
  // sale como el primero de una nueva. Los tocados duran mientras el púlpito
  // esté abierto. Nada se bloquea (pedido del usuario): se puede empezar por
  // el punto que se quiera, y tocar uno que ya salió, aunque ya hayan salido
  // todos, empieza una pantalla nueva con él como el primero.
  const puntos = puntosDelBosquejo(piezas);
  const numerosPuntos = numerosDePuntos(piezas, predica.numeracion, predica.numeracionNiveles);
  const [tocados, setTocados] = useState([]); // ids, en el orden tocado
  const piezasTocadas = tocados.map((id) => piezas.find((p) => p.id === id)).filter(Boolean);
  const paginaResumen = paginaDelResumen(piezasTocadas);
  // Celular: el resumen es el diálogo «Puntos», debajo de la mini pantalla y
  // hasta el borde de abajo; se abre con su botón y se cierra con la X.
  const [resumenAbierto, setResumenAbierto] = useState(false);
  const tocarPunto = (punto) => {
    if (!exigirTurno()) return;
    // Uno que ya está en la pantalla actual solo vuelve a enviarla tal cual (por
    // si se había ocultado); uno que ya salió antes empieza una ronda nueva con
    // él como el primero.
    const yaEnPantalla = paginaResumen.some((p) => p.id === punto.id);
    const siguientes = tocados.includes(punto.id) && !yaEnPantalla ? [punto.id] : yaEnPantalla ? tocados : [...tocados, punto.id];
    const pagina = paginaDelResumen(siguientes.map((id) => piezas.find((p) => p.id === id)).filter(Boolean));
    const pieza = { id: "resumen", tipo: "mensaje", contenido: lineasDelResumen(pagina, predica.numeracion, predica.numeracionNiveles).join("\n"), alineacion: ALINEACION_RESUMEN };
    setTocados(siguientes);
    setAlVuelo(pieza);
    enviar(pieza);
  };
  const etiquetaAire = alVuelo?.id === "resumen" ? "Resumen" : alVuelo ? "Espontáneo" : enPortada ? "Título de la prédica" : formato === "celular" ? (noSeVe ? "Oculto" : "En vivo") : "En el templo ahora";
  const reloj = relojDesde(ahora - inicio);
  const posicion = actual >= 0 ? `${actual + 1} de ${piezas.length}` : cuantosItems(piezas.length);

  // Colores de cada fila de la lista. En el celular (14-11-2026, pedido del
  // usuario) todas las filas se ven por igual (los puntos sin negrita ni
  // número dorado): lo ya pasado se oscurece, el que está al aire va sin
  // resaltar (ya se sabe que está en pantalla) y el que sigue lleva el recuadro
  // en amarillo, flotando y brillando, como por encima de los demás (la sección
  // lleva margen y relleno a los lados para que el recuadro no se corte).
  const celularLista = formato === "celular";
  const colorFila = (estado) => {
    if (!celularLista) return null;
    return {
      actual: "border-transparent text-app-texto hover:bg-app-border/40",
      pasado: "border-transparent text-app-border hover:bg-app-border/40",
      proximo: "relative z-10 border-app-main bg-app-main/10 text-app-texto shadow-lg shadow-black/50 motion-safe:animate-siguiente",
      futuro: "border-transparent text-app-muted hover:bg-app-border/40",
    }[estado];
  };
  const estadoPortada = enPortada && !alVuelo ? "actual" : actual >= 0 ? "pasado" : "proximo";
  const estadoItem = (i) => (i === actual && !alVuelo ? "actual" : i < actual ? "pasado" : i === actual + 1 ? "proximo" : "futuro");

  const lista = (
    <ol className="m-0 flex list-none flex-col gap-0.5 p-0">
      <li>
        <button
          type="button"
          data-portada
          onClick={() => {
            mostrarPortada();
            setHoja(null);
          }}
          aria-current={enPortada && !alVuelo ? "true" : undefined}
          className={`flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition ${
            celularLista
              ? colorFila(estadoPortada)
              : `${enPortada && !alVuelo ? "border-app-main bg-app-border/60 text-app-texto" : "border-transparent hover:bg-app-border/40"} ${actual >= 0 ? "text-app-border" : "text-app-muted"}`
          }`}
        >
          <BookmarkIcon className="mt-0.5 h-4 w-4 shrink-0 text-app-accent" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="block text-diminuto font-semibold tracking-widest uppercase">Título de la prédica</span>
            <b className={celularLista ? "" : "text-app-texto"}>{predica.titulo}</b>
          </span>
          {actual >= 0 && <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-app-success" aria-hidden="true" />}
        </button>
      </li>
      {piezas.map((pieza, i) => (
        <li key={pieza.id}>
          <button
            type="button"
            onClick={() => {
              proyectar(i);
              setHoja(null);
            }}
            aria-current={i === actual && !alVuelo ? "true" : undefined}
            className={`flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition ${
              celularLista
                ? colorFila(estadoItem(i))
                : `${i === actual && !alVuelo ? "border-app-main bg-app-border/60 text-app-texto" : "border-transparent hover:bg-app-border/40"} ${i < actual ? "text-app-border" : "text-app-muted"}`
            }`}
          >
            <span className="w-5 shrink-0 pt-0.5 text-xs font-semibold">{i + 1}</span>
            <span className="flex min-w-0 flex-1 items-start gap-2">
              <Miniatura pieza={pieza} />
              <span className="min-w-0 flex-1">
                {nivelDe(pieza) > 0 && <span className={`inline-block ${nivelDe(pieza) === 2 ? "w-8" : "w-4"}`} aria-hidden="true" />}
                {numeros[pieza.id] && <b className={`mr-1 ${celularLista ? "" : "text-app-main"}`}>{numeros[pieza.id]}</b>}
                <span className={pieza.tipo === "titulo" && !celularLista ? "font-semibold text-app-texto" : ""}>{textoDePieza(pieza)}</span>
              </span>
            </span>
            {i < actual && <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-app-success" aria-hidden="true" />}
          </button>
        </li>
      ))}
    </ol>
  );

  // El bosquejo del celular (14-11-2026, pedido del usuario; en lugar de
  // «Luego» y de la pestaña «Bosquejo»): toda la lista a la vista, en su propio
  // recuadro con desplazamiento, y a medida que se avanza se mueve sola para
  // dejar el ítem al aire en el centro. «Terminar» va al final de la lista.
  const recuadroBosquejo = useRef(null);
  // Dónde termina la mini pantalla: de ahí hacia abajo se abre el diálogo «Puntos».
  const pantallaRef = useRef(null);
  const [topResumen, setTopResumen] = useState(0);
  useLayoutEffect(() => {
    if (!resumenAbierto) return undefined;
    const medir = () => setTopResumen(Math.round((pantallaRef.current?.getBoundingClientRect().bottom ?? 0) + 8));
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, [resumenAbierto]);
  useEffect(() => {
    const recuadro = recuadroBosquejo.current;
    const fila = recuadro?.querySelector('[aria-current="true"]');
    if (!recuadro || !fila) return;
    const arriba = fila.offsetTop - (recuadro.clientHeight - fila.offsetHeight) / 2;
    recuadro.scrollTo?.({ top: Math.max(0, arriba), behavior: "smooth" });
  }, [actual, enPortada, alVuelo, formato]);

  // ---------- Las piezas del púlpito, que cada pantalla ordena a su modo ----------

  // Título, Texto, Anuncio y Ocultar/Mostrar. En el celular, una fila de 4
  // botones con el ícono encima (más fáciles de tocar); en las demás, en línea.
  const interruptoresDe = (cuadricula) => (
    <div role="group" aria-label="Qué se ve en el templo" className={cuadricula ? "grid grid-cols-4 gap-1.5" : "flex gap-1.5"}>
      {visibles.map((v) => (
        <button
          key={v.clave}
          type="button"
          aria-pressed={Boolean(v.valor)}
          data-visible={v.clave}
          onClick={() => cambiar(v)}
          className={`flex items-center justify-center rounded-full border text-xs font-semibold transition ${
            cuadricula ? "h-11 flex-col gap-0 rounded-xl" : "h-10 flex-1 gap-1.5 px-3 sm:flex-none"
          } ${v.valor ? v.encendido : "border-app-border text-app-muted"}`}
        >
          <v.icono className="h-4 w-4 shrink-0" aria-hidden="true" />
          {v.nombre}
        </button>
      ))}
      <button
        type="button"
        onClick={alternarOculto}
        data-ocultar={enNegro ? "mostrar" : "ocultar"}
        className={`flex items-center justify-center rounded-full border text-xs font-semibold ${
          cuadricula ? "h-11 flex-col gap-0 rounded-xl" : "h-10 flex-1 gap-1.5 px-3 sm:flex-none"
        } ${
          enNegro
            ? "border-app-error bg-app-error/15 font-bold text-app-error motion-safe:animate-palpita"
            : "border-app-border bg-app-aviso text-app-texto"
        }`}
      >
        {/* El ojo cambia con el estado: tachado para ocultar (el de «pantalla
            oculta» de EstadoPantalla), abierto para mostrar. «Mostrar» va en
            rojo, el color de «OCULTA», y palpita: la pantalla no se ve. */}
        {enNegro ? <EyeIcon className="h-4 w-4 shrink-0" aria-hidden="true" /> : <EyeSlashIcon className="h-4 w-4 shrink-0" aria-hidden="true" />}
        {enNegro ? "Mostrar" : "Ocultar"}
      </button>
    </div>
  );

  const etiqueta = (
    <span
      data-etiqueta-aire={formato === "celular" ? (noSeVe ? "oculto" : "vivo") : undefined}
      className={`flex items-center gap-2 text-xs font-semibold tracking-widest uppercase ${formato === "celular" && noSeVe ? "text-app-error" : "text-app-success"}`}
    >
      {/* En el celular (14-11-2026, pedido del usuario): «En vivo» y el punto
          pulsante; si no se ve en el templo, «Oculto» con el punto rojo y quieto. */}
      <span
        aria-hidden="true"
        data-punto-vivo={formato === "celular" || undefined}
        className={`h-2 w-2 rounded-full ${formato === "celular" && noSeVe ? "bg-app-error" : "bg-app-success"} ${formato === "celular" && !noSeVe ? "motion-safe:animate-pulse" : ""}`}
      />
      {etiquetaAire} · {posicion}
    </span>
  );

  // La guía del predicador (12-11-2026, pedido del usuario): si no se ve en el
  // templo, la mini pantalla lo dice; y copia el título y el anuncio.
  const pantalla = (
    <PantallaPrevia
      pieza={enPantalla}
      grande={formato !== "celular"}
      etiqueta="En el templo ahora"
      oculta={noSeVe}
      titulo={visibleTitulo ? loQueSeVe.titulo : ""}
      ticker={visibleTicker ? loQueSeVe.ticker : ""}
    />
  );

  const luegoNodo = luego && (
    <p className="m-0 flex items-center gap-3 rounded-xl border border-app-border bg-app-light px-4 py-2">
      <span className="text-diminuto font-semibold tracking-widest text-app-muted uppercase">Luego</span>
      <Miniatura pieza={luego} />
      {numeros[luego.id] && <b className="text-app-main">{numeros[luego.id]}</b>}
      <span className="min-w-0 flex-1 truncate font-semibold text-app-texto">{textoDePieza(luego)}</span>
    </p>
  );

  // Todos los puntos, cada uno un botón: el tocado lleva el check y los que
  // están ahora en la pantalla, el recuadro dorado.
  const enPantallaResumen = alVuelo?.id === "resumen" ? paginaResumen.map((p) => p.id) : [];
  const resumenNodo = puntos.length > 0 && (
    <section aria-label="Resumen de puntos" className="relative isolate flex flex-col gap-1.5 overflow-hidden rounded-xl border border-app-border bg-app-light px-3 py-3">
      {/* Marca de agua ▶ en el centro, como la tarjeta del versículo. */}
      <PlayIcon data-marca-agua="proyectar" aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 m-auto h-20 w-20 text-app-main/15" />
      <span className="text-diminuto font-semibold tracking-widest text-app-muted uppercase">
        Resumen de puntos · en pantalla {paginaResumen.length} de {RENGLONES_RESUMEN}
      </span>
      <ul className="m-0 flex list-none flex-col gap-1 p-0">
        {puntos.map((punto) => {
          const tocado = tocados.includes(punto.id);
          const alAire = enPantallaResumen.includes(punto.id);
          return (
            <li key={punto.id} className={nivelDe(punto) === 2 ? "ml-8" : nivelDe(punto) === 1 ? "ml-4" : ""}>
              <button
                type="button"
                data-punto-resumen={punto.id}
                aria-pressed={tocado}
                aria-current={alAire ? "true" : undefined}
                onClick={() => tocarPunto(punto)}
                className={`flex w-full items-start gap-2 rounded-lg border px-2.5 py-2 text-left text-sm transition ${
                  alAire ? "border-app-main bg-app-main/10 text-app-texto" : tocado ? "border-transparent text-app-muted" : "border-app-border text-app-texto hover:border-app-main"
                }`}
              >
                <span className="min-w-0 flex-1">
                  {numerosPuntos[punto.id] && (
                    <>
                      <b>{numerosPuntos[punto.id]}</b>{" "}
                    </>
                  )}
                  {punto.contenido}
                </span>
                {tocado && <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-app-success" aria-hidden="true" />}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );

  const versiculoNodo = (
    <section aria-label="Versículo espontáneo" className="flex min-h-0 flex-1 flex-col gap-2">
      <h3 className="m-0 text-xs font-semibold tracking-widest text-app-muted uppercase">Versículo espontáneo</h3>
      {/* Como en Preparar: el botón de las Biblias encima del buscador. En el
          celular se quitó (13-11-2026): pendiente de ubicar. */}
      {formato !== "celular" && <SelectorBiblia />}
      <BuscadorVersiculos accion="proyectar" onAgregar={proyectarVersiculo} showNotif={showNotif} plegable={baja} />
    </section>
  );

  // Que se vean como botones, no como texto (12-11-2026, pedido del usuario):
  // el de terminar, con el verde de «predicada».
  const terminarBoton = (
    <button
      type="button"
      data-terminar-predicada
      onClick={onTerminar}
      className="flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl border border-app-success bg-app-success/10 text-sm font-bold text-app-success shadow-sm transition hover:bg-app-success/20"
    >
      <CheckIcon className="h-5 w-5" aria-hidden="true" />
      Terminar y marcar como predicada
    </button>
  );
  const volverBoton = (
    <button
      type="button"
      data-volver-preparar
      onClick={onSalir}
      className="flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl border border-app-border bg-app-aviso text-sm font-semibold text-app-texto shadow-sm transition hover:border-app-texto"
    >
      <ArrowLeftIcon className="h-5 w-5" aria-hidden="true" />
      Volver a preparar
    </button>
  );

  // Anterior y Siguiente: el tamaño cambia con la pantalla.
  const avanzar = (alto) => (
    <div className="flex gap-3">
      <button
        type="button"
        onClick={anterior}
        disabled={actual < 0}
        className={`flex shrink-0 items-center justify-center gap-2 rounded-2xl border border-app-border bg-app-light font-semibold text-app-texto disabled:opacity-40 ${alto.anterior}`}
      >
        <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
        Anterior
      </button>
      <button
        type="button"
        onClick={siguiente}
        disabled={actual >= piezas.length - 1}
        className={`flex flex-1 items-center justify-center gap-3 rounded-2xl bg-app-main font-bold text-app-dark shadow-lg disabled:opacity-40 ${alto.siguiente}`}
      >
        {actual < 0 && !enPortada ? "Empezar" : "Siguiente"}
        <ChevronRightIcon className="h-6 w-6" aria-hidden="true" />
      </button>
    </div>
  );

  const reloj_ = (
    <span className="font-semibold text-app-muted tabular-nums">{reloj}</span>
  );

  // ---------- Celular ----------
  if (formato === "celular") {
    // «Terminar» pregunta antes (14-11-2026, pedido del usuario): un toque
    // suelto no debe cerrar la prédica.
    const terminarConPregunta = async () => {
      if (await confirmAction("¿Terminar y marcar como predicada?")) onTerminar();
    };
    // Puntos: abre el diálogo (o avisa si la prédica aún no tiene puntos).
    const abrirResumen = () => {
      if (!resumenNodo) return showNotif("info", "Esta prédica aún no tiene puntos.");
      setResumenAbierto(true);
      return undefined;
    };
    // Fila de cuatro botones solo con ícono, como la barra de Preparar.
    const herramientas = [
      { clave: "volver", nombre: "Volver a preparar", icono: ArrowLeftIcon, tono: "text-app-texto", alPulsar: onSalir, atributo: { "data-volver-preparar": true } },
      { clave: "versiculo", nombre: "Versículos", icono: BookOpenIcon, tono: "text-app-agua", alPulsar: () => setHoja("versiculo"), atributo: { "data-pestana": "versiculo" } },
      // En lugar del triángulo, la palabra «Puntos» (14-11-2026, pedido del usuario).
      { clave: "resumen", nombre: "Puntos", icono: null, tono: "text-app-main text-sm font-semibold", alPulsar: abrirResumen, atributo: { "data-pestana": "resumen", title: "Resumen de puntos" } },
    ];
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex h-11 shrink-0 items-center gap-2 px-3.5">
          <b className="min-w-0 flex-1 truncate text-app-texto">{predica.titulo}</b>
          <span className="text-lg">{reloj_}</span>
        </div>

        <div className="relative flex min-h-0 flex-1 flex-col">
          <div className="scrollbar-custom flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3.5 pb-2">
            {etiqueta}
            <div ref={pantallaRef}>{pantalla}</div>
            <div className="relative flex min-h-0 flex-1 flex-col gap-2">
              {interruptoresDe(true)}
              <section
                ref={recuadroBosquejo}
                aria-label="Bosquejo"
                data-bosquejo-vivo
                className="scrollbar-custom relative -mx-2.5 flex min-h-32 flex-1 flex-col gap-2 overflow-y-auto px-2.5 py-2"
              >
                {lista}
                {/* Lo poco usado, lejos de Siguiente: al final del bosquejo; pregunta antes. */}
                <button
                  type="button"
                  data-terminar-predicada
                  onClick={terminarConPregunta}
                  className="flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl border border-app-success bg-app-success/10 text-sm font-bold text-app-success shadow-sm transition hover:bg-app-success/20"
                >
                  <CheckIcon className="h-5 w-5" aria-hidden="true" />
                  Terminar y marcar como predicada
                </button>
              </section>
            </div>
          </div>
        </div>

        {/* Puntos: el diálogo ocupa todo desde debajo de la mini pantalla (que sigue
            a la vista para ver lo que se proyecta) hasta el borde de abajo de la
            pantalla, tapando también el muelle; se cierra con la X. */}
        {resumenNodo && resumenAbierto && (
          <div
            role="dialog"
            aria-label="Puntos"
            data-resumen-vivo
            style={{ top: topResumen }}
            className="fixed inset-x-0 bottom-0 z-40 flex flex-col gap-2 rounded-t-2xl border border-b-0 border-app-border bg-app-dark p-3 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <b className="text-sm text-app-texto">Puntos</b>
              <button type="button" onClick={() => setResumenAbierto(false)} aria-label="Cerrar" className="grid h-8 w-8 place-items-center rounded-lg text-app-muted">
                <XMarkIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className="scrollbar-custom min-h-0 flex-1 overflow-y-auto">{resumenNodo}</div>
          </div>
        )}

        {/* Versículos: el mismo diálogo de pantalla completa de Preparar, pero
            la tarjeta proyecta (y se cierra al hacerlo). */}
        {hoja === "versiculo" && (
          <div className="fixed inset-0 z-40 flex flex-col bg-app-dark">
            <div role="dialog" aria-modal="true" aria-label="Versículos" data-hoja="versiculo" className="flex h-full min-h-0 flex-col gap-3 bg-app-dark p-4">
              <div className="flex items-center justify-between">
                <b className="text-app-texto">Versículos</b>
                <button type="button" onClick={() => setHoja(null)} aria-label="Cerrar" className="grid h-10 w-10 place-items-center rounded-xl text-app-muted">
                  <XMarkIcon className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
              <div className="scrollbar-custom flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
                <BuscadorVersiculos accion="proyectar" cambiarBiblia onAgregar={proyectarVersiculo} showNotif={showNotif} />
              </div>
            </div>
          </div>
        )}

        {/* El muelle: todo lo de predicar, al alcance del pulgar. */}
        <div data-muelle className="flex shrink-0 flex-col gap-1.5 border-t border-app-border bg-app-light px-3.5 pt-1.5 pb-2.5">
          <div role="group" aria-label="Herramientas" className="flex gap-1.5">
            {herramientas.map(({ clave, nombre, icono: Icono, tono, alPulsar, atributo }) => (
              <button
                key={clave}
                type="button"
                aria-label={Icono ? nombre : undefined}
                title={nombre}
                onClick={alPulsar}
                {...atributo}
                className={`flex h-7 flex-1 items-center justify-center rounded-lg transition active:bg-app-border/40 ${tono}`}
              >
                {Icono ? <Icono className="h-5 w-5" aria-hidden="true" /> : nombre}
              </button>
            ))}
          </div>
          {avanzar({ anterior: "h-16 w-24 text-base", siguiente: "h-16 text-2xl" })}
        </div>
      </div>
    );
  }

  // ---------- Tableta (iPad mini de pie) ----------
  if (formato === "tableta") {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex h-15 shrink-0 items-center gap-2.5 px-3.5">
          <button type="button" onClick={onSalir} aria-label="Salir del modo predicar" className="grid h-11 w-11 place-items-center rounded-xl border border-app-border text-app-texto">
            <XMarkIcon className="h-5 w-5" aria-hidden="true" />
          </button>
          <b className="min-w-0 flex-1 truncate text-lg text-app-texto">{predica.titulo}</b>
          <span data-reloj className="text-2xl">{reloj_}</span>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-3 px-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {etiqueta}
            {interruptoresDe(false)}
          </div>
          {pantalla}
          <div className="flex min-h-0 flex-1 gap-3.5 pb-3">
            <aside aria-label="Bosquejo" className="flex min-w-0 flex-1 flex-col gap-1.5 rounded-2xl border border-app-border bg-app-light p-2.5">
              <span className="px-1.5 text-diminuto font-semibold tracking-widest text-app-muted uppercase">Bosquejo · toca uno para proyectarlo</span>
              <div className="scrollbar-custom min-h-0 flex-1 overflow-y-auto">{lista}</div>
            </aside>
            <div className="scrollbar-custom flex w-75 shrink-0 flex-col gap-2.5 overflow-y-auto">
              {luegoNodo}
              {resumenNodo}
              {versiculoNodo}
              {terminarBoton}
            </div>
          </div>
        </div>
        <div data-muelle className="shrink-0 border-t border-app-border bg-app-light px-5 pt-3 pb-5">
          {avanzar({ anterior: "h-20 w-50 text-lg", siguiente: "h-20 text-3xl" })}
        </div>
      </div>
    );
  }

  // ---------- Escritorio: tres columnas ----------
  return (
    <div className="flex min-h-0 flex-1">
      <aside aria-label="Bosquejo" className={`flex shrink-0 flex-col gap-3 border-r border-app-border bg-app-light ${baja ? "w-60 p-3" : "w-80 p-4"}`}>
        <div className="flex justify-between text-xs text-app-muted">
          <span>{actual >= 0 ? `Ítem ${posicion}` : posicion}</span>
          <span>Toca uno para proyectarlo</span>
        </div>
        <div aria-hidden="true" className="h-1 overflow-hidden rounded-full bg-app-border">
          <div className="h-full bg-app-main transition-all" style={{ width: `${piezas.length ? ((actual + 1) / piezas.length) * 100 : 0}%` }} />
        </div>
        <div className="scrollbar-custom min-h-0 flex-1 overflow-y-auto">{lista}</div>
      </aside>

      <main className={`flex min-w-0 flex-1 flex-col overflow-y-auto ${baja ? "gap-3 px-5 py-3.5" : "gap-4 px-8 py-6"}`}>
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {etiqueta}
            {interruptoresDe(false)}
          </div>
          {baja ? (
            // Pantalla baja: Luego y el resumen al lado, para que todo quepa.
            <div data-escenario-bajo className="flex min-h-0 gap-3">
              <div className="min-w-0 flex-1">{pantalla}</div>
              <div className="flex w-56 shrink-0 flex-col gap-2.5">
                {luegoNodo}
                {resumenNodo}
              </div>
            </div>
          ) : (
            <>
              {pantalla}
              {luegoNodo}
              {resumenNodo}
            </>
          )}
          <div className="flex-1" />
          {avanzar(baja ? { anterior: "h-16 w-44", siguiente: "h-16 text-xl" } : { anterior: "h-18 w-44", siguiente: "h-18 text-xl" })}
          <p className="m-0 text-center text-xs text-app-muted">También con las flechas del teclado o la barra espaciadora (sirve un control de presentaciones).</p>
        </div>
      </main>

      <aside className="scrollbar-custom flex min-h-0 w-90 shrink-0 flex-col gap-4 overflow-y-auto border-l border-app-border bg-app-light p-5">
        {/* El turno y la pantalla del templo, solo sobre esta columna en el
            computador (antes, de todo el ancho; 12-11-2026, pedido del
            usuario), con su diseño de siempre: pegada arriba, de borde a borde. */}
        <div className="-mx-5 -mt-5">
          <FranjaTurno />
        </div>
        {/* El reloj, centrado y más grande (12-11-2026, pedido del usuario). */}
        <p data-reloj className="m-0 flex items-center justify-center gap-2.5 text-4xl font-bold text-app-texto tabular-nums">
          <ClockIcon className="h-8 w-8 text-app-muted" aria-hidden="true" />
          {reloj}
          <span className="self-end pb-1 text-xs font-normal text-app-muted">predicando</span>
        </p>
        {versiculoNodo}
        {terminarBoton}
        {volverBoton}
      </aside>
    </div>
  );
}

// La foto en pequeño, para reconocer la imagen en la lista y en «Luego»
// (12-11-2026, pedido del usuario). Las demás piezas no llevan nada.
function Miniatura({ pieza }) {
  if (pieza?.tipo !== "imagen" || !pieza.contenido?.url) return null;
  return (
    <img
      data-miniatura
      src={pieza.contenido.url}
      alt=""
      loading="lazy"
      className="h-9 w-14 shrink-0 rounded-md border border-app-border bg-app-aviso object-cover"
    />
  );
}
