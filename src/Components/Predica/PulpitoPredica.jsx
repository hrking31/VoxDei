import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AdjustmentsHorizontalIcon, ArrowLeftIcon, BookOpenIcon, BookmarkIcon, ChatBubbleLeftRightIcon, CheckIcon, ChevronLeftIcon, BeakerIcon, ChevronRightIcon, EyeIcon, EyeSlashIcon, LinkIcon, NumberedListIcon, ScissorsIcon, TagIcon, TvIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { useAuth } from "../Context/AuthContext";
import { useAppContext } from "../Context/AppContext";
import { useTurno } from "../Hooks/useTurno.js";
import { usePonerAvisoEnBarra } from "../Navegacion/avisoBarraSuperior.js";
import PantallaPrevia from "./PantallaPrevia.jsx";
import RelojSegmentos from "./RelojSegmentos.jsx";
import { usePreferenciaLocal } from "../Hooks/usePreferenciaLocal.js";
import BuscadorVersiculos from "./BuscadorVersiculos.jsx";
import PanelHoja from "./PanelHoja.jsx";
import MedidorPuntos from "./MedidorPuntos.jsx";
import { useLoQueSeVe } from "./useLoQueSeVe.js";
import { useMedidasTemplo } from "../PantallaGuia/useEspejoTemplo.js";
import { useAnchoReducido, useAnchoSoloIconos, useApaisado } from "../Hooks/formatoPantalla.js";
import { ESTILOS_POR_DEFECTO } from "../Estilos/EstilosProyeccion.js";
import FranjaTurno from "../Cronograma/FranjaTurno.jsx";
// TEMPORAL DHH (12-11-2026): el botón RVR1960 / DHH también al predicar.
import SelectorBiblia from "../Biblia/SelectorBiblia.jsx";
import { apagarImagen, cambiarVisible, encenderImagen, proyectarPieza } from "./accionesPredica.js";
import { ALINEACION_RESUMEN, cuantosItems, nivelDe, numerosDePuntos, puntosDelBosquejo, relojDesde, textoDePieza, textoDePunto } from "./utilesPredica.js";
import { cortesValidos, gruposPorCantidad, lineasConNumeracion, rotuloDeRango, tonoDeLlenado } from "./utilesPuntos.js";

// El color de la barra de llenado de cada pantalla de puntos (20-11-2026).
const COLOR_LLENADO = { bien: "bg-app-success", justo: "bg-app-main", error: "bg-app-error", "sin-medir": "bg-app-muted" };

// Lo que el púlpito escribe en el templo. En el modo de prueba (18-11-2026, pedido
// del usuario) no se escribe nada: lo que se ve vive solo en este púlpito.
const ACCIONES = { apagarImagen, cambiarVisible, encenderImagen, proyectarPieza };
const nada = () => Promise.resolve();
const ACCIONES_DE_PRUEBA = { apagarImagen: nada, cambiarVisible: nada, encenderImagen: nada, proyectarPieza: nada };
const SIN_TURNO = () => true;

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
export default function PulpitoPredica({ predica, compacto = false, formato: formatoDado = compacto ? "celular" : "escritorio", baja: bajaDada = false, prueba = false, alCambiarCortes = null, onSalir, onTerminar }) {
  // Todas las tabletas (el iPad mini y los demás) usan el diseño del celular, en Pruebas y al predicar
  // (20-11-2026, pedido del usuario). Solo los puntos salen en un panel al costado (`lateral`).
  // Tabletas (20-11-2026, pedido del usuario): de pie, el diseño del celular; acostadas, el del computador. En el
  // iPad mini acostado el computador va «bajo» (como un PC de 1280×720). En todas las tabletas acostadas, en Pruebas y
  // al predicar, NO hay columna derecha ni de puntos: «Puntos» y «Versículos» abren un diálogo al costado, encima,
  // sin achicar la pantalla (20-11-2026, pedido del usuario: «quiero ver cómo se ve sin ella»).
  const apaisado = useApaisado();
  // Los mismos puntos de quiebre en el computador (20-11-2026, pedido del usuario): de menos de 1600 px de ancho se trata
  // como una tableta acostada (sin columnas laterales, paneles encima); de menos de 1180 px, como el iPad mini (además,
  // botones solo con íconos).
  const anchoCompacto = useAnchoSoloIconos(); // por debajo de 1200 px: solo íconos
  const anchoReducido = useAnchoReducido();
  const horizontal = formatoDado === "tableta" && apaisado;
  const escritorioReducido = formatoDado === "escritorio" && anchoReducido;
  const puntosEnDialogo = horizontal || escritorioReducido;
  const miniAcostada = puntosEnDialogo && anchoCompacto;
  const formato = horizontal ? "escritorio" : formatoDado === "tableta" ? "celular" : formatoDado;
  const baja = bajaDada || miniAcostada;
  const { userData } = useAuth();
  const { exigirTurno: exigirTurnoReal } = useTurno();
  const contexto = useAppContext();
  const { showNotif, confirmAction } = contexto;
  const groupId = userData?.groupId;
  // MODO DE PRUEBA (18-11-2026, pedido del usuario): el mismo púlpito, pero no pide turno, no
  // escribe nada en el templo y lo que se ve (título, texto, anuncio, imagen) vive
  // solo aquí, no en el contexto que comparte la app con la pantalla real.
  const acc = prueba ? ACCIONES_DE_PRUEBA : ACCIONES;
  const exigirTurno = prueba ? SIN_TURNO : exigirTurnoReal;
  const [visiblesDePrueba, setVisiblesDePrueba] = useState({ titulo: false, texto: true, ticker: false, imagen: false });
  const [tituloDePrueba, setTituloDePrueba] = useState("");
  const ponerDePrueba = useMemo(
    () => Object.fromEntries(["titulo", "texto", "ticker", "imagen"].map((clave) => [clave, (valor) => setVisiblesDePrueba((previo) => ({ ...previo, [clave]: Boolean(valor) }))])),
    []
  );
  const visibleTitulo = prueba ? visiblesDePrueba.titulo : contexto.visibleTitulo;
  const setVisibleTitulo = prueba ? ponerDePrueba.titulo : contexto.setVisibleTitulo;
  const visibleTexto = prueba ? visiblesDePrueba.texto : contexto.visibleTexto;
  const setVisibleTexto = prueba ? ponerDePrueba.texto : contexto.setVisibleTexto;
  const visibleTicker = prueba ? visiblesDePrueba.ticker : contexto.visibleTicker;
  const setVisibleTicker = prueba ? ponerDePrueba.ticker : contexto.setVisibleTicker;
  const visibleImagen = prueba ? visiblesDePrueba.imagen : contexto.visibleImagen;
  const setVisibleImagen = prueba ? ponerDePrueba.imagen : contexto.setVisibleImagen;
  const { piezas } = predica;
  // A PRUEBA (18-11-2026, pedido del usuario; igual que en Biblia): en el celular,
  // dos interruptores para ocultar la mini pantalla (quien está frente al
  // proyector no la necesita) y los cuatro botones (quien solo avanza el
  // bosquejo tampoco). Se acuerdan en este dispositivo.
  const [sinPantalla, setSinPantalla] = usePreferenciaLocal("voxdei.predica.sinPantalla");
  const [sinBotones, setSinBotones] = usePreferenciaLocal("voxdei.predica.sinBotones");
  // La franja de título y el anuncio, tal como están en el templo.
  const loQueSeVeReal = useLoQueSeVe(prueba ? null : groupId);
  const loQueSeVe = prueba ? { titulo: tituloDePrueba, ticker: "" } : loQueSeVeReal;
  // Las medidas reales de la pantalla del templo y los estilos de la iglesia: la mini pantalla
  // dibuja el texto a tamaño real con ellos (20-11-2026, pedido del usuario), también en
  // Pruebas. Solo se lee la presencia de la ventana; no se escribe nada.
  const medidasTemplo = useMedidasTemplo(groupId);
  const estilosTemplo = contexto.estilos || ESTILOS_POR_DEFECTO;
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
  // Celular: la ventana de versículos abierta ("versiculo"); el resumen tiene su propio estado.
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
      if (prueba && tituloArriba !== null) setTituloDePrueba(tituloArriba);
      acc.proyectarPieza(groupId, pieza, { imagenEncendida: Boolean(visibleImagen), tituloArriba }).catch((error) => {
        console.error("No se pudo proyectar:", error);
        showNotif("error", "No se pudo enviar a la pantalla. Revisa la conexión.");
      });
      if (esImagen || visibleImagen) setVisibleImagen?.(esImagen);
    },
    [acc, prueba, groupId, visibleImagen, setVisibleImagen, showNotif]
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
          acc.cambiarVisible(groupId, "titulo", true);
        }
      }
      enviar(comoSeEnvia(pieza), { tituloArriba: subir ? predica.titulo : null });
    },
    [acc, piezas, exigirTurno, enviar, comoSeEnvia, predica.titulo, visibleTitulo, setVisibleTitulo, groupId]
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
      acc.cambiarVisible(groupId, "titulo", false);
    }
    enviar({ id: "portada", tipo: "mensaje", contenido: predica.titulo });
  }, [acc, exigirTurno, enviar, predica.titulo, visibleTitulo, setVisibleTitulo, groupId]);

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
    acc.cambiarVisible(groupId, v.clave, !v.valor);
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
        acc.cambiarVisible(groupId, v.clave, false);
      }
      if (visibleImagen) {
        setVisibleImagen?.(false);
        acc.apagarImagen(groupId);
      }
      return;
    }
    const antes = antesDeOcultar.current || { texto: true };
    antesDeOcultar.current = null;
    for (const v of visibles) {
      if (!antes[v.clave]) continue;
      v.poner(true);
      acc.cambiarVisible(groupId, v.clave, true);
    }
    if (antes.imagen) {
      setVisibleImagen?.(true);
      acc.encenderImagen(groupId);
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
  const [tocados, setTocados] = useState([]); // ids de todos los que se han tocado, para su check
  // Lo que hay en la pantalla del templo ahora (ids, en el orden tocado): los tocados de UNA pantalla.
  const [idsEnPantalla, setIdsEnPantalla] = useState([]);
  // El último punto tocado (aunque ya estuviera en la pantalla), para el contador «Punto N de M».
  const [ultimoPunto, setUltimoPunto] = useState(null);

  // PANTALLAS DE PUNTOS (20-11-2026, pedido del usuario): los puntos se reparten según lo que CABE en
  // la pantalla real del templo, no de 6 en 6. MedidorPuntos lo mide con la escena real; mientras no
  // termina (o si cambia algo) se usa el reparto de a 6. Los cortes manuales (los ajusta el predicador
  // en Pruebas y se guardan en la prédica) cierran una pantalla antes del punto cortado.
  const cortes = cortesValidos(predica.cortesPuntos, puntos);
  const tituloMedido = visibleTitulo ? loQueSeVe.titulo : "";
  const firmaPuntos = JSON.stringify([puntos.map((p) => [p.id, p.contenido, nivelDe(p)]), cortes, numerosPuntos, estilosTemplo, medidasTemplo, tituloMedido]);
  const [medidos, setMedidos] = useState(null); // { firma, grupos }
  const grupos = medidos?.firma === firmaPuntos ? medidos.grupos : gruposPorCantidad(puntos, cortes);
  // Celular: el resumen es el diálogo «Puntos», debajo de la mini pantalla y
  // hasta el borde de abajo; se abre con su botón y se cierra con la X.
  const [resumenAbierto, setResumenAbierto] = useState(false);
  // Computador (20-11-2026, pedido del usuario): el resumen ya no ocupa una columna bajo la
  // pantalla; un botón «Puntos» lo abre en un panel en el lado derecho, que se cierra con su X o con Escape.
  const [panelPuntos, setPanelPuntos] = useState(false);
  useEffect(() => {
    if (!panelPuntos) return undefined;
    const alTeclear = (e) => e.key === "Escape" && setPanelPuntos(false);
    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, [panelPuntos]);
  // Tableta (20-11-2026, pedido del usuario): los puntos salen en un panel al costado derecho, como los versículos
  // de Preparar; se ocultan al tocar fuera de él (no al tocar un punto, para poder ir tocando varios).
  const lateral = formatoDado === "tableta" && !horizontal;
  // Los versículos (espontáneo) también salen al costado y se comportan igual (20-11-2026, pedido del usuario).
  const panelLateral = useRef(null);
  const panelVersiculoLateral = useRef(null);
  useEffect(() => {
    const abierto = lateral ? panelPuntos || resumenAbierto || hoja === "versiculo" : puntosEnDialogo && (panelPuntos || hoja === "versiculo");
    if (!(lateral || puntosEnDialogo) || !abierto) return undefined;
    const fuera = (e) => {
      if (panelLateral.current?.contains(e.target) || panelVersiculoLateral.current?.contains(e.target)) return;
      if (e.target.closest?.("[data-abrir-puntos], [data-pestana='resumen'], [data-pestana='versiculo']")) return;
      setPanelPuntos(false);
      setResumenAbierto(false);
      setHoja(null);
    };
    document.addEventListener("pointerdown", fuera);
    return () => document.removeEventListener("pointerdown", fuera);
  }, [lateral, puntosEnDialogo, panelPuntos, resumenAbierto, hoja]);
  const tocarPunto = (punto) => {
    if (!exigirTurno()) return;
    setUltimoPunto(punto.id);
    // Uno que ya está en la pantalla actual solo vuelve a enviarla tal cual (por
    // si se había ocultado); uno que ya salió antes empieza una ronda nueva con
    // él como el primero.
    // Los puntos se van SUMANDO en la pantalla mientras sean de la misma pantalla de puntos (los
    // que caben juntos); al tocar uno de otra, salta a ella y empieza con él, con un aviso. La
    // numeración sigue la del bosquejo (IV., V.…): no vuelve a empezar.
    const indiceGrupo = grupos.findIndex((g) => g.ids.includes(punto.id));
    const mismaPantalla = idsEnPantalla.length > 0 && grupos[indiceGrupo]?.ids.includes(idsEnPantalla[0]);
    const yaEnPantalla = idsEnPantalla.includes(punto.id);
    const siguientes = yaEnPantalla ? idsEnPantalla : mismaPantalla ? [...idsEnPantalla, punto.id] : [punto.id];
    const pagina = siguientes.map((id) => puntos.find((p) => p.id === id)).filter(Boolean);
    const pieza = { id: "resumen", tipo: "mensaje", contenido: lineasConNumeracion(pagina, numerosPuntos).join("\n"), alineacion: ALINEACION_RESUMEN };
    setTocados((previos) => (previos.includes(punto.id) ? previos : [...previos, punto.id]));
    setIdsEnPantalla(siguientes);
    setAlVuelo(pieza);
    enviar(pieza);
  };
  const reloj = relojDesde(ahora - inicio);
  const posicion = actual >= 0 ? `${actual + 1} de ${piezas.length}` : cuantosItems(piezas.length);

  // Colores de cada fila de la lista. En el celular (14-11-2026, pedido del
  // usuario) todas las filas se ven por igual (los puntos sin negrita ni
  // número dorado): lo ya pasado se oscurece, el que está al aire va sin
  // resaltar (ya se sabe que está en pantalla) y el que sigue lleva el recuadro
  // en amarillo, como por encima de los demás (la sección lleva margen y relleno a los lados
  // para que el recuadro no se corte).
  // 20-11-2026 (pedido del usuario): el computador usa las mismas filas, en Predicar y en Pruebas:
  // lo ya proyectado, oscuro; lo que viene, un poco más claro; y el que se está PROYECTANDO
  // (`actual`), AUMENTADO como si el recuadro fuera una lupa (escala del 105 %, texto más grande,
  // borde dorado, por encima de los demás; SIN sombra: el usuario veía una sombra debajo del ítem
  // y pidió quitarla). El que sigue lleva un recuadro VERDE (solo el borde, SIN fondo: el
  // usuario pidió quitar el fondo suave), sin ampliar: el verde es el «adelante» de la app y se
  // distingue mejor del dorado de la lupa. Se eligió así porque la lupa dice «este es el que está en foco»: en la lista
  // es donde se ubica qué se está mostrando ahora, y ampliar el siguiente se leía como si fuera el
  // proyectado (el usuario eligió ampliar el proyectado). No hay animación en bucle: la pulsación
  // (la animación «siguiente») se quitó a pedido del usuario; el aumento entra con la transición
  // de la fila. Solo la tableta conserva sus filas.
  const celularLista = formato === "celular" || formato === "escritorio";
  const colorFila = (estado) => {
    if (!celularLista) return null;
    return {
      actual: "relative z-10 scale-105 border-app-main bg-app-light bg-linear-to-r from-app-main/15 to-app-main/15 text-base font-semibold text-app-texto ring-1 ring-app-main/40",
      pasado: "border-transparent text-sm text-app-border hover:bg-app-border/40",
      proximo: "border-app-success/70 text-sm text-app-texto hover:bg-app-border/40",
      futuro: "border-transparent text-sm text-app-muted hover:bg-app-border/40",
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
          className={`flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
            celularLista
              ? colorFila(estadoPortada)
              : `text-sm ${enPortada && !alVuelo ? "border-app-main bg-app-border/60 text-app-texto" : "border-transparent hover:bg-app-border/40"} ${actual >= 0 ? "text-app-border" : "text-app-muted"}`
          }`}
        >
          <BookmarkIcon className="mt-0.5 h-4 w-4 shrink-0 text-app-accent" aria-hidden="true" />
          <span className="min-w-0 flex-1 wrap-anywhere">
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
            className={`flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
              celularLista
                ? colorFila(estadoItem(i))
                : `text-sm ${i === actual && !alVuelo ? "border-app-main bg-app-border/60 text-app-texto" : "border-transparent hover:bg-app-border/40"} ${i < actual ? "text-app-border" : "text-app-muted"}`
            }`}
          >
            <span className="w-5 shrink-0 pt-0.5 text-xs font-semibold">{i + 1}</span>
            <span className="flex min-w-0 flex-1 items-start gap-2">
              <Miniatura pieza={pieza} />
              {/* wrap-anywhere: una palabra muy larga se parte en vez de ensanchar la lista y sacar una barra horizontal */}
              <span className="min-w-0 flex-1 wrap-anywhere">
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
  // El área que se desplaza (bajo el encabezado): de ahí arranca el diálogo si la mini pantalla está oculta.
  const areaRef = useRef(null);
  const [topResumen, setTopResumen] = useState(0);
  useLayoutEffect(() => {
    if (!resumenAbierto) return undefined;
    const medir = () =>
      setTopResumen(Math.round((pantallaRef.current ? pantallaRef.current.getBoundingClientRect().bottom : (areaRef.current?.getBoundingClientRect().top ?? 0)) + 8));
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, [resumenAbierto]);
  useEffect(() => {
    const recuadro = recuadroBosquejo.current;
    const fila = recuadro?.querySelector('[aria-current="true"]');
    if (!recuadro || !fila) return;
    // En el computador, al llegar al último ítem la lista baja hasta el final, donde está «Terminar y
    // marcar como predicada» (20-11-2026, pedido del usuario), en vez de solo centrar el ítem.
    if (formato === "escritorio" && !prueba && !alVuelo && actual >= 0 && actual === piezas.length - 1) {
      recuadro.scrollTo?.({ top: recuadro.scrollHeight, behavior: "smooth" });
      return;
    }
    const arriba = fila.offsetTop - (recuadro.clientHeight - fila.offsetHeight) / 2;
    recuadro.scrollTo?.({ top: Math.max(0, arriba), behavior: "smooth" });
    // `prueba` y `piezas.length` no cambian mientras se predica; el resto es lo que mueve la lista.
    // Ocultar o mostrar la mini pantalla y los botones cambia el alto de la lista: se vuelve a centrar
    // el ítem al aire (20-11-2026, pedido del usuario: perdía el foco).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actual, enPortada, alVuelo, formato, sinPantalla, sinBotones]);

  // ---------- Las piezas del púlpito, que cada pantalla ordena a su modo ----------

  // Título, Texto, Anuncio y Ocultar/Mostrar. En el celular, una fila de 4
  // botones con el ícono encima (más fáciles de tocar); en las demás, en línea.
  // `soloIcono` (iPad mini acostado, 20-11-2026, pedido del usuario: «si no caben, solo íconos»): sin el nombre, en
  // botones cuadrados; el nombre queda en aria-label y title.
  const interruptoresDe = (cuadricula, soloIcono = false) => (
    <div role="group" aria-label="Qué se ve en el templo" className={cuadricula ? "grid grid-cols-4 gap-1.5" : "flex gap-1.5"}>
      {visibles.map((v) => (
        <button
          key={v.clave}
          type="button"
          aria-pressed={Boolean(v.valor)}
          aria-label={soloIcono ? v.nombre : undefined}
          title={soloIcono ? v.nombre : undefined}
          data-visible={v.clave}
          onClick={() => cambiar(v)}
          className={`flex items-center justify-center rounded-full border text-xs font-semibold transition ${
            cuadricula ? "h-11 flex-col gap-0 rounded-xl" : soloIcono ? "h-10 w-10 shrink-0" : "h-10 flex-1 gap-1.5 px-3 sm:flex-none"
          } ${v.valor ? v.encendido : "border-app-border text-app-muted"}`}
        >
          <v.icono className="h-4 w-4 shrink-0" aria-hidden="true" />
          {!soloIcono && v.nombre}
        </button>
      ))}
      <button
        type="button"
        onClick={alternarOculto}
        aria-label={soloIcono ? (enNegro ? "Mostrar" : "Ocultar") : undefined}
        title={soloIcono ? (enNegro ? "Mostrar" : "Ocultar") : undefined}
        data-ocultar={enNegro ? "mostrar" : "ocultar"}
        className={`flex items-center justify-center rounded-full border text-xs font-semibold ${
          cuadricula ? "h-11 flex-col gap-0 rounded-xl" : soloIcono ? "h-10 w-10 shrink-0" : "h-10 flex-1 gap-1.5 px-3 sm:flex-none"
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
        {!soloIcono && (enNegro ? "Mostrar" : "Ocultar")}
      </button>
    </div>
  );

  // La guía del predicador (12-11-2026, pedido del usuario): si no se ve en el
  // templo, la mini pantalla lo dice; y copia el título y el anuncio.
  const pantalla = (
    <PantallaPrevia
      estilos={estilosTemplo}
      medidas={medidasTemplo}
      ajustarAlto={formato === "escritorio"}
      pieza={enPantalla}
      grande={formato !== "celular"}
      etiqueta="En el templo ahora"
      oculta={noSeVe}
      estadoPantalla={prueba ? "encendida" : contexto.pantallaTemplo}
      titulo={visibleTitulo ? loQueSeVe.titulo : ""}
      ticker={visibleTicker ? loQueSeVe.ticker : ""}
    />
  );

  // Todos los puntos, cada uno un botón: el tocado lleva el check y los que
  // están ahora en la pantalla, el recuadro dorado.
  const enPantallaResumen = alVuelo?.id === "resumen" ? idsEnPantalla : [];
  // Computador en Pruebas (20-11-2026, pedido del usuario): el recuadro es fijo, llena el alto de
  // su columna y NO crece; si hay muchos puntos, se desplaza la lista de adentro.
  // El celular, igual que el computador (20-11-2026, pedido del usuario): sin recuadro.
  const recuadroFijo = formato !== "tableta";
  // En el computador (panel de la derecha, 20-11-2026, pedido del usuario) los puntos van sueltos, SIN
  // recuadro alrededor, y el único título («Resumen de puntos» con su contador) está en la cabecera
  // del panel; en el celular y la tableta, el recuadro con su rótulo de siempre.
  const resumenNodo = puntos.length > 0 && (
    <section
      aria-label="Resumen de puntos"
      className={`relative isolate flex flex-col gap-1.5 overflow-hidden ${recuadroFijo ? "h-full" : "rounded-xl border border-app-border bg-app-light px-3 py-3"}`}
    >
      {!recuadroFijo && (
        <span className="text-diminuto font-semibold tracking-widest text-app-muted uppercase">
          Resumen de puntos · {grupos.length} {grupos.length === 1 ? "pantalla" : "pantallas"}
        </span>
      )}
      {puntos.length > 0 && (
        <MedidorPuntos
          firma={firmaPuntos}
          puntos={puntos}
          cortes={cortes}
          numeros={numerosPuntos}
          medidas={medidasTemplo}
          estilos={estilosTemplo}
          titulo={tituloMedido}
          alTerminar={(resultado) => setMedidos({ firma: firmaPuntos, grupos: resultado })}
        />
      )}
      <ul className={`m-0 flex list-none flex-col gap-1 p-0 ${recuadroFijo ? "scrollbar-custom min-h-0 flex-1 overflow-y-auto" : ""}`}>
        {grupos.flatMap((grupo, indiceGrupo) => {
          // Con varias pantallas (o al ajustarlas en Pruebas) cada una lleva su título y su medidor de llenado.
          const conTitulo = grupos.length > 1 || Boolean(alCambiarCortes);
          const tono = tonoDeLlenado(grupo);
          const filas = grupo.ids.map((id, i) => {
            const punto = puntos.find((p) => p.id === id);
            if (!punto) return null;
            const tocado = tocados.includes(punto.id);
            const alAire = enPantallaResumen.includes(punto.id);
            const cortado = cortes.includes(punto.id);
            return (
              <li key={punto.id} className={`flex items-start gap-1 ${nivelDe(punto) === 2 ? "ml-8" : nivelDe(punto) === 1 ? "ml-4" : ""}`}>
                <button
                  type="button"
                  data-punto-resumen={punto.id}
                  aria-pressed={tocado}
                  aria-current={alAire ? "true" : undefined}
                  onClick={() => tocarPunto(punto)}
                  className={`flex min-w-0 flex-1 items-start gap-2 rounded-lg border px-2.5 py-2 text-left text-sm transition ${
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
                {/* Solo en Pruebas: partir la pantalla aquí (un punto que no abre pantalla) o unirla con
                    la anterior (solo si el corte lo puso el predicador; los automáticos son porque ya no cabe). */}
                {alCambiarCortes && i > 0 && (
                  <button
                    type="button"
                    data-partir={punto.id}
                    aria-label="Partir aquí: pantalla nueva desde este punto"
                    title="Partir aquí"
                    onClick={() => alCambiarCortes([...cortes, punto.id])}
                    className="mt-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-app-muted hover:bg-app-border/40 hover:text-app-texto"
                  >
                    <ScissorsIcon className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
                {alCambiarCortes && i === 0 && cortado && (
                  <button
                    type="button"
                    data-unir={punto.id}
                    aria-label="Unir con la pantalla anterior"
                    title="Unir con la anterior"
                    onClick={() => alCambiarCortes(cortes.filter((c) => c !== punto.id))}
                    className="mt-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-app-main hover:bg-app-border/40"
                  >
                    <LinkIcon className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
                {/* El primer punto de una pantalla no se parte ni se une: deja el hueco del botón para que todas las filas midan lo mismo */}
                {alCambiarCortes && i === 0 && !cortado && <span data-hueco-corte aria-hidden="true" className="w-8 shrink-0" />}
              </li>
            );
          });
          if (!conTitulo) return filas;
          // El rango se dice con los puntos de primer nivel (I – III); una pantalla que solo trae subpuntos se rotula con el primero
          const idsRaiz = grupo.ids.filter((id) => nivelDe(puntos.find((p) => p.id === id)) === 0);
          const rango = rotuloDeRango(idsRaiz.length ? idsRaiz : grupo.ids.slice(0, 1), numerosPuntos);
          return [
            <li key={`pantalla-${indiceGrupo}`} data-pantalla-puntos={indiceGrupo + 1} data-tono={tono} className="mt-1 flex flex-col gap-1 first:mt-0">
              <span className="flex items-baseline justify-between gap-2 text-diminuto font-semibold tracking-widest text-app-muted uppercase">
                <span>
                  Pantalla {indiceGrupo + 1}
                  {rango ? ` · ${rango}` : ""}
                </span>
                {grupo.estado === "no-cabe" && <span className="text-app-error normal-case">No cabe</span>}
              </span>
              <span aria-hidden="true" className="h-1 overflow-hidden rounded-full bg-app-border">
                <span data-llenado className={`block h-full rounded-full ${COLOR_LLENADO[tono]}`} style={{ width: `${Math.round(Math.min(grupo.llenado ?? 0, 1) * 100)}%` }} />
              </span>
            </li>,
            ...filas,
          ];
        })}
      </ul>
    </section>
  );

  // La cabecera del resumen en el computador: el ÚNICO título, «Resumen de puntos», con su contador
  // (cuántos van en la pantalla del templo). La usan el panel de Predicar (con su X, `alCerrar`) y la
  // columna fija de Pruebas (sin X: `alCerrar` en null).
  // El contador de puntos, copiado del de los ítems de la prédica (20-11-2026, pedido del usuario): al
  // empezar dice cuántos hay («6 puntos») y, al tocar uno, cuál es («Punto 4 de 6»). Antes decía
  // «en pantalla N de 6».
  const indiceUltimoPunto = puntos.findIndex((p) => p.id === ultimoPunto);
  const contadorPuntos =
    indiceUltimoPunto >= 0 ? `Punto ${indiceUltimoPunto + 1} de ${puntos.length}` : `${puntos.length} ${puntos.length === 1 ? "punto" : "puntos"}`;

  // Con color y estilo propios (20-11-2026, pedido del usuario): el violeta de los puntos, con su
  // ícono, y el contador con el diseño del de los ítems (texto pequeño y apagado).
  const encabezadoPuntos = (alCerrar) => (
    <div data-titulo-puntos className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-app-violeta/40 bg-app-violeta/10 px-4">
      <span className="flex min-w-0 items-center gap-2">
        <NumberedListIcon className="h-5 w-5 shrink-0 text-app-violeta" aria-hidden="true" />
        <b className="truncate text-app-violeta">Resumen de puntos</b>
        <span data-contador-puntos className="shrink-0 text-xs font-normal text-app-muted">
          {contadorPuntos}
        </span>
      </span>
      {alCerrar && (
        <button type="button" onClick={alCerrar} aria-label="Cerrar los puntos" className="grid h-8 w-8 place-items-center rounded-lg text-app-violeta/70 transition hover:text-app-violeta">
          <XMarkIcon className="h-5 w-5" aria-hidden="true" />
        </button>
      )}
    </div>
  );

  // En Pruebas no hay versículo espontáneo ni selector de Biblia (20-11-2026, pedido del
  // usuario: no hacen falta para ensayar; en todos los dispositivos).
  const versiculoNodo = prueba ? null : (
    <section aria-label="Versículo espontáneo" className={`flex min-h-0 flex-1 flex-col gap-2 ${formato === "escritorio" ? "-mt-4" : ""}`}>
      {/* Con color y estilo propios (20-11-2026, pedido del usuario): el aguamarina de los versículos, con
          su ícono. En el computador, una franja de borde a borde de la columna, del mismo peso que la de
          los puntos y pegada al reloj (`-mt-4` en la sección cierra el hueco de la columna); en la
          tableta, una franja tonal redondeada. */}
      <h3
        data-titulo-versiculo
        className={`m-0 flex items-center gap-2 border-app-agua/40 bg-app-agua/10 text-sm font-bold text-app-agua ${
          formato === "escritorio" ? "-mx-5 h-12 border-b px-5" : "rounded-lg border px-3 py-2"
        }`}
      >
        <BookOpenIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
        Versículo espontáneo
      </h3>
      {/* Como en Preparar: el botón de las Biblias encima del buscador. En el
          celular se quitó (13-11-2026): pendiente de ubicar. */}
      {formato !== "celular" && <SelectorBiblia />}
      <BuscadorVersiculos accion="proyectar" onAgregar={proyectarVersiculo} showNotif={showNotif} plegable={baja} cajaFija={formato === "tableta"} />
    </section>
  );

  // Que se vean como botones, no como texto (12-11-2026, pedido del usuario):
  // el de terminar, con el verde de «predicada».
  const terminarBoton = prueba ? null : (
    <button
      type="button"
      data-terminar-predicada
      onClick={onTerminar}
      className="flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl border border-app-success bg-app-success/10 px-3 py-2 text-center text-sm leading-tight font-bold text-app-success shadow-sm transition hover:bg-app-success/20"
    >
      <CheckIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
      Terminar y marcar como predicada
    </button>
  );
  // «Volver a preparar» del computador: el de siempre (de ancho completo, con texto), al final de la
  // columna lateral derecha, como estaba antes del 20-11-2026 (pedido del usuario). Se probó en la
  // fila de los botones de control y en la columna izquierda de debajo de la pantalla, y se descartó.
  // En Predicar va al final de la columna de turno, reloj y versículo; en Pruebas, al final de la
  // columna fija de puntos.
  // `corto` (en la fila de controles de la tableta acostada, 20-11-2026, pedido del usuario): solo «Volver», del alto y la
  // letra de los demás botones de la fila; el nombre completo queda en aria-label y title.
  // `soloIcono` (iPad mini acostado): ni el texto corto, solo la flecha.
  const volverDe = (corto = false, soloIcono = false) => (
    <button
      type="button"
      data-volver-preparar
      onClick={onSalir}
      aria-label={corto ? "Volver a preparar" : undefined}
      title={corto ? "Volver a preparar" : undefined}
      className={`flex shrink-0 items-center justify-center border border-app-border bg-app-aviso font-semibold text-app-texto shadow-sm transition hover:border-app-texto ${
        corto ? `rounded-full ${soloIcono ? "h-10 w-10" : "h-10 gap-1.5 px-3 text-xs"}` : "h-12 gap-2 rounded-xl text-sm"
      }`}
    >
      <ArrowLeftIcon className={corto ? "h-4 w-4" : "h-5 w-5"} aria-hidden="true" />
      {!soloIcono && (corto ? "Volver" : "Volver a preparar")}
    </button>
  );
  const volverBoton = volverDe();

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

  // En el celular, en Pruebas, la barra superior de la app dice «Modo de prueba» en lugar del
  // estado del servicio y de la pantalla (20-11-2026, pedido del usuario).
  usePonerAvisoEnBarra(prueba && formato === "celular" ? "Modo de prueba" : null);

  // La fila de ítems («Ítem N de M · Toca uno para proyectarlo») y la barra de avance: las mismas
  // en la columna del bosquejo del computador y en el encabezado del celular en Pruebas.
  const textoItems = (
    <div className="flex justify-between text-xs text-app-muted">
      <span data-contador-items>{actual >= 0 ? `Ítem ${posicion}` : posicion}</span>
      <span>Toca uno para proyectarlo</span>
    </div>
  );
  const barraAvance = (
    <div aria-hidden="true" data-barra-avance className="h-1 overflow-hidden rounded-full bg-app-border">
      <div className="h-full bg-app-main transition-all" style={{ width: `${piezas.length ? ((actual + 1) / piezas.length) * 100 : 0}%` }} />
    </div>
  );

  // El aviso de que se está ensayando: no se manda nada al templo.
  const bannerPrueba = prueba && (
    <p data-modo-prueba className="m-0 flex items-center justify-center gap-2 bg-app-main/15 px-3 py-1.5 text-center text-xs font-semibold text-app-main">
      <BeakerIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
      Modo de prueba
    </p>
  );

  // Versículos: el mismo diálogo de pantalla completa de Preparar, pero la tarjeta proyecta (y se cierra al hacerlo).
  // En la tableta (de pie o acostada), un panel al costado derecho con exactamente el contenido del de Preparar: el
  // selector de Biblia arriba y el recuadro del versículo elegido fijo abajo (20-11-2026, pedido del usuario). Lo
  // usan el diseño del celular y el del computador de las tabletas acostadas.
  const enTableta = formatoDado === "tableta" || puntosEnDialogo;
  // El computador (con barra lateral) no tiene la barra superior que sí tienen el celular y la tableta: sus paneles llegan hasta arriba.
  const arribaDelPanel = contexto.isDesktop ? "top-0" : "top-barra-superior";
  const panelVersiculos = hoja === "versiculo" && (
    <PanelHoja
      panelRef={panelVersiculoLateral}
      role="dialog"
      aria-modal={enTableta ? undefined : "true"}
      aria-label="Versículos"
      data-hoja="versiculo"
      alCerrar={() => setHoja(null)}
      className={`fixed z-40 ${enTableta ? `${arribaDelPanel} right-0 bottom-0 w-96 border-l border-app-border shadow-2xl` : "inset-0"}`}
    >
      {enTableta && <SelectorBiblia />}
      <BuscadorVersiculos accion="proyectar" cambiarBiblia={!enTableta} cajaFija={enTableta} onAgregar={proyectarVersiculo} showNotif={showNotif} />
    </PanelHoja>
  );

  // ---------- Celular ----------
  if (formato === "celular") {
    // «Terminar» pregunta antes (14-11-2026, pedido del usuario): un toque
    // suelto no debe cerrar la prédica.
    const terminarConPregunta = async () => {
      if (await confirmAction("¿Terminar y marcar como predicada?")) onTerminar();
    };
    // Lo poco usado, lejos de Siguiente: al final del bosquejo; pregunta antes. En las pruebas no hay nada que terminar.
    const terminarLista = !prueba && (
      <button
        type="button"
        data-terminar-predicada
        onClick={terminarConPregunta}
        className="flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl border border-app-success bg-app-success/10 text-sm font-bold text-app-success shadow-sm transition hover:bg-app-success/20"
      >
        <CheckIcon className="h-5 w-5" aria-hidden="true" />
        Terminar y marcar como predicada
      </button>
    );
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
      // En Pruebas no hay botón de versículos (20-11-2026, pedido del usuario).
    ].filter((h) => !(prueba && h.clave === "versiculo"));
    // Los interruptores de vista van en la barra de abajo, entre «Volver a preparar» y «Versículos»
    // (20-11-2026, pedido del usuario; antes, en el encabezado): ocultar los botones de Título, Texto,
    // Anuncio y Ocultar, y —solo al predicar— ocultar la mini pantalla. En Pruebas la mini pantalla
    // va siempre fija, así que solo está el de los botones. Dorados si algo está oculto, grises si no.
    const interruptores = [
      !prueba && {
        clave: "pantalla",
        nombre: sinPantalla ? "Mostrar la pantalla" : "Ocultar la pantalla",
        icono: TvIcon,
        tono: sinPantalla ? "text-app-main" : "text-app-muted",
        alPulsar: () => setSinPantalla(!sinPantalla),
        atributo: { "data-alternar-pantalla": true, "aria-pressed": sinPantalla, title: sinPantalla ? "Mostrar la pantalla del templo" : "Ocultar la pantalla del templo" },
      },
      {
        clave: "botones",
        nombre: sinBotones ? "Mostrar los botones" : "Ocultar los botones",
        icono: AdjustmentsHorizontalIcon,
        tono: sinBotones ? "text-app-main" : "text-app-muted",
        alPulsar: () => setSinBotones(!sinBotones),
        atributo: { "data-alternar-botones": true, "aria-pressed": sinBotones, title: sinBotones ? "Mostrar los botones de Título, Texto, Anuncio y Ocultar" : "Ocultar los botones de Título, Texto, Anuncio y Ocultar" },
      },
    ].filter(Boolean);
    herramientas.splice(1, 0, ...interruptores);
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        {prueba ? (
          // En Pruebas (20-11-2026, pedidos del usuario) el encabezado es el mismo del computador, no el
          // nombre de la prédica: la fila «Ítem N de M · Toca uno para proyectarlo» y, debajo, la
          // barra de avance; con más espacio hasta la mini pantalla. El estado del servicio y de la
          // pantalla de la barra superior de la app se sustituyen por «Modo de prueba» (ver
          // usePonerAvisoEnBarra), así que aquí no hay franja de aviso. Ni interruptores: el de
          // los botones está en la barra de abajo y el de la pantalla no existe.
          <div data-encabezado-prueba className="flex shrink-0 flex-col gap-2 px-3.5 pt-3 pb-4">
            {textoItems}
            {barraAvance}
          </div>
        ) : (
          <div className="flex h-11 shrink-0 items-center gap-2 px-3.5">
            <span className="flex min-w-0 flex-1 items-baseline gap-2">
              <b className="truncate text-app-texto">{predica.titulo}</b>
              {/* El contador de ítems, pequeño, junto al nombre (18-11-2026, pedido del usuario;
                  reemplazó a la etiqueta con el estado de la pantalla) */}
              <span data-contador-items className="shrink-0 text-pie font-normal text-app-muted">{posicion}</span>
            </span>
            {/* El mismo tamaño de antes (cifras de la altura del texto), pero digital (20-11-2026, pedido del usuario) */}
            <RelojSegmentos tiempo={reloj} className="h-5!" />
          </div>
        )}

        {/* En Pruebas la mini pantalla va fija arriba, de borde a borde (más grande), fuera del
            área que se desplaza, y sin botón para ocultarla (20-11-2026, pedido del usuario):
            lo que se ensaya es cómo se ve. */}
        {prueba && (
          <div ref={pantallaRef} data-pantalla-fija className="shrink-0 pb-2">
            {pantalla}
          </div>
        )}
        <div className="relative flex min-h-0 flex-1 flex-col">
          <div ref={areaRef} className="scrollbar-oculta flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3.5 pb-2">
            {!prueba && !sinPantalla && <div ref={pantallaRef}>{pantalla}</div>}
            <div className="relative flex min-h-0 flex-1 flex-col gap-2">
              {!sinBotones && interruptoresDe(true)}
              <section
                ref={recuadroBosquejo}
                aria-label="Bosquejo"
                data-bosquejo-vivo
                className="scrollbar-oculta relative -mx-2.5 flex min-h-32 flex-1 flex-col gap-2 overflow-y-auto px-2.5 py-2"
              >
                {lista}
                {terminarLista}
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
            ref={panelLateral}
            // Con la mini pantalla oculta (20-11-2026, pedido del usuario) ocupa toda la pantalla, como el diálogo de Versículos.
            // En la tableta, un panel al costado derecho.
            style={lateral ? undefined : { top: sinPantalla ? 0 : topResumen }}
            className={`fixed z-40 flex flex-col overflow-hidden border-app-border bg-app-dark shadow-2xl ${
              lateral ? "top-barra-superior right-0 bottom-0 w-96 border-l" : `inset-x-0 bottom-0 ${sinPantalla ? "" : "rounded-t-2xl border border-b-0"}`
            }`}
          >
            {/* Lo mismo que el panel del computador: la franja violeta con su título y contador, y los
                puntos sueltos, sin recuadro (20-11-2026, pedido del usuario). */}
            {encabezadoPuntos(() => setResumenAbierto(false))}
            <div className="min-h-0 flex-1 p-3">{resumenNodo}</div>
          </div>
        )}

        {panelVersiculos}

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

  // ---------- Escritorio: tres columnas (en Pruebas, dos) ----------
  // En Pruebas (20-11-2026, pedidos del usuario) no hay columna derecha, «Luego» ni desplazamiento:
  // todo cabe en la pantalla y la mini pantalla toma el alto que queda libre. La columna del
  // bosquejo lleva arriba la barra verde «Modo de prueba» y, debajo, los ítems como siempre. Debajo de la
  // pantalla van dos columnas: a la izquierda los botones de lo que se ve, «Anterior» /
  // «Siguiente» y «Volver a preparar»; a la derecha, los puntos.
  return (
    <div className="flex min-h-0 flex-1">
      <aside aria-label="Bosquejo" className={`flex shrink-0 flex-col gap-3 border-r border-app-border bg-app-light ${baja ? "w-60 p-3" : "w-80 p-4"}`}>
        {/* En Pruebas, la barra verde arriba de todo y, debajo, los ítems como siempre (pedido del usuario). */}
        {/* Una franja de borde a borde de la columna (pegada arriba), no un chip: se quita el
            relleno de la columna con márgenes negativos. */}
        {prueba && <div data-aviso-prueba className={baja ? "-mx-3 -mt-3" : "-mx-4 -mt-4"}>{bannerPrueba}</div>}
        {textoItems}
        {barraAvance}
        {/* La lista, con las filas del estilo del celular (lo proyectado, oscuro; lo que viene, más
            claro; el que sigue, palpitando). Lleva `relative` para centrar la fila al aire con
            `scrollTo` y un poco de margen y relleno a los lados para que el recuadro del que sigue
            no se corte al flotar. Es lo único que se desplaza de esta columna. */}
        <div ref={recuadroBosquejo} className="scrollbar-custom relative -mx-2 min-h-0 flex-1 overflow-y-auto px-2 py-2">
          {lista}
          {/* «Terminar y marcar como predicada» va aquí, al final de los ítems (20-11-2026, pedido del
              usuario): al llegar al último, el botón está justo debajo y la lista baja hasta él. En
              Pruebas no hay nada que terminar (`terminarBoton` es null). */}
          {terminarBoton && <div className="mt-3">{terminarBoton}</div>}
        </div>
      </aside>

      {/* Sin desplazamiento (20-11-2026, pedido del usuario): todo cabe en la pantalla, en Predicar
          y en Pruebas. */}
      <main className={`flex min-w-0 flex-1 flex-col overflow-hidden ${baja ? "gap-3 px-5 py-3.5" : "gap-4 px-8 py-6"}`}>
        <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-4">
          {/* La mini pantalla toma todo el alto libre (y el ancho que le corresponda): sin
              desplazamiento. El contenedor es de tamaño propio (`containerType: size`) para
              que la pantalla se mida contra él (ver `ajustarAlto` en PantallaPrevia). */}
          <div data-pantalla-prueba className="flex min-h-0 flex-1 items-center justify-center" style={{ containerType: "size" }}>
            {pantalla}
          </div>
          {/* Debajo de la pantalla, los botones organizados igual en Predicar y en Pruebas (20-11-2026,
              pedido del usuario): una fila de control (atrás, Título, Texto, Anuncio, Ocultar y, a la
              derecha, «Puntos», que abre el resumen en el panel de la derecha) y, debajo, Anterior y
              Siguiente a todo el ancho. */}
          <div data-bajo-pantalla className={`flex shrink-0 flex-col ${baja ? "gap-3" : "gap-5"}`}>
            {/* Tres columnas: atrás a la izquierda, los botones de control CENTRADOS y «Puntos» a la
                derecha (20-11-2026, pedido del usuario), los tres con el mismo alto, forma y tamaño de letra. */}
            {/* En las tabletas acostadas, UNA sola fila con los botones repartidos por todo el ancho (justificados), nunca
                en dos filas (20-11-2026, pedido del usuario). En el iPad mini, donde no caben con texto, solo con íconos;
                en las tabletas más grandes, con su texto. */}
            <div data-fila-controles className={puntosEnDialogo ? "flex flex-nowrap items-center justify-between gap-3" : "grid grid-cols-[1fr_auto_1fr] items-center gap-3"}>
              {/* Columna izquierda vacía: «Volver a preparar» está en la columna lateral derecha. Se queda
                  para que los botones de control sigan centrados. */}
              {/* En las tabletas acostadas, en Pruebas, «Volver a preparar» va aquí: no hay columna de puntos. */}
              <div className="flex min-w-0 items-center justify-start gap-3">
                {puntosEnDialogo ? volverDe(true, miniAcostada) : null}
                {/* El reloj, junto a los botones, cuando no hay columna derecha (tableta acostada, al predicar) */}
                {!prueba && puntosEnDialogo && (
                  // En un recuadro negro y con las cifras doradas, para que resalten
                  <span data-reloj className="flex items-center rounded-lg border border-app-border bg-app-negro px-3 py-1.5">
                    <RelojSegmentos tiempo={reloj} className="h-6! text-app-main!" />
                  </span>
                )}
              </div>
              {interruptoresDe(false, miniAcostada)}
              {/* «Puntos» solo en Predicar: en Pruebas el resumen está siempre a la vista en la
                  columna de la derecha (20-11-2026, pedido del usuario), así que aquí queda el hueco,
                  para que los botones de control sigan centrados. */}
              <div className="flex min-w-0 justify-end gap-2">
                {/* Al predicar en una tableta acostada no está la columna de la derecha con el versículo espontáneo:
                    su botón va aquí y abre el panel del costado. */}
                {!prueba && puntosEnDialogo && (
                  <button
                    type="button"
                    data-pestana="versiculo"
                    aria-label={miniAcostada ? "Versículos" : undefined}
                    title="Versículo espontáneo"
                    onClick={() => setHoja("versiculo")}
                    className={`flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-full border border-app-border bg-app-aviso text-xs font-semibold text-app-agua transition hover:border-app-agua ${miniAcostada ? "w-10" : "min-w-0 px-4"}`}
                  >
                    <BookOpenIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {!miniAcostada && <span className="truncate">Versículos</span>}
                  </button>
                )}
                {(!prueba || puntosEnDialogo) && (
                  <button
                    type="button"
                    data-abrir-puntos
                    aria-expanded={panelPuntos}
                    aria-label={miniAcostada ? "Puntos" : undefined}
                    title="Abrir el resumen de puntos en el panel de la derecha"
                    onClick={() => {
                      if (!resumenNodo) return showNotif("info", "Esta prédica aún no tiene puntos.");
                      setPanelPuntos((abierto) => !abierto);
                      return undefined;
                    }}
                    className={`flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-full border text-xs font-semibold transition ${miniAcostada ? "w-10" : "min-w-0 px-4"} ${
                      panelPuntos ? "border-app-main bg-app-main/15 text-app-main" : "border-app-border bg-app-aviso text-app-texto hover:border-app-main hover:text-app-main"
                    }`}
                  >
                    <NumberedListIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {!miniAcostada && <span className="truncate">Puntos</span>}
                  </button>
                )}
              </div>
            </div>
            {avanzar(baja ? { anterior: "h-16 w-44 text-base", siguiente: "h-16 text-xl" } : { anterior: "h-18 w-44 text-base", siguiente: "h-18 text-xl" })}
          </div>
          <p className="m-0 shrink-0 text-center text-xs text-app-muted">También con las flechas del teclado o la barra espaciadora (sirve un control de presentaciones).</p>
        </div>
      </main>

      {!prueba && !puntosEnDialogo && (
        // Sin barra de desplazamiento visible (20-11-2026, pedido del usuario: nada de scroll en esta
        // vista); el desplazamiento queda solo como último recurso en pantallas muy bajas.
        <aside className="scrollbar-oculta flex min-h-0 w-90 shrink-0 flex-col gap-4 overflow-y-auto border-l border-app-border bg-app-light p-5">
          {/* El turno y la pantalla del templo, solo sobre esta columna en el
              computador (antes, de todo el ancho; 12-11-2026, pedido del
              usuario), con su diseño de siempre: pegada arriba, de borde a borde. */}
          <div className="-mx-5 -mt-5"><FranjaTurno /></div>
          {/* El reloj, centrado y más grande (12-11-2026, pedido del usuario), con su propio espacio
              (20-11-2026, opción 2 elegida por el usuario): una franja de borde a borde, con fondo propio
              y una línea fina debajo, pegada a la barra verde del turno (`-mt-4` cierra el hueco de la
              columna) para que no parezca uno más de los elementos de abajo. */}
          <div data-franja-reloj className="-mx-5 -mt-4 border-b border-app-border bg-app-aviso px-5 py-3">
            {/* Como un despertador digital (20-11-2026, el usuario mandó una foto de referencia): cuerpo claro,
                pantalla oscura y números de siete segmentos (ver RelojSegmentos). */}
            <p data-reloj className="m-0 flex items-center justify-center gap-3">
              <RelojSegmentos tiempo={reloj} />
              <span className="self-end pb-1 text-xs font-normal text-app-muted">predicando</span>
            </p>
          </div>
          {/* El resumen de puntos se abre AQUÍ, dentro de la columna, en lugar del versículo espontáneo
              (20-11-2026, pedido del usuario): así siguen a la vista el turno (la barra verde de
              arriba), el reloj y «Volver a preparar», que antes tapaba una capa fija. («Terminar y
              marcar como predicada» ya no está en esta columna: está al final de la lista de ítems.)
              El versículo espontáneo no se desmonta (solo se oculta) para no perder lo que se estaba
              buscando. Se abre con «Puntos»; se cierra con su X, con Escape o con el mismo botón. Tocar
              un punto lo proyecta y se queda abierto, para ir tocando varios. */}
          <div className={panelPuntos && resumenNodo ? "hidden" : "contents"}>{versiculoNodo}</div>
          {panelPuntos && resumenNodo && (
            <div data-panel-puntos className="-mt-4 flex min-h-0 flex-1 flex-col">
              <div className="-mx-5">{encabezadoPuntos(() => setPanelPuntos(false))}</div>
              <div className="min-h-0 flex-1 pt-3">{resumenNodo}</div>
            </div>
          )}
          {volverBoton}
        </aside>
      )}

      {/* PRUEBAS: la columna de la derecha vuelve, solo con el resumen de puntos y FIJA (siempre a la
          vista, sin botón ni X; 20-11-2026, pedido del usuario). Mismo título único y mismo contador
          que el panel de Predicar, y los puntos sueltos, sin recuadro. */}
      {prueba && !puntosEnDialogo && (
        <aside aria-label="Resumen de puntos" data-puntos-fijo className="flex min-h-0 w-90 shrink-0 flex-col border-l border-app-border bg-app-light">
          {encabezadoPuntos(null)}
          <div className="min-h-0 flex-1 p-4">
            {resumenNodo || <p data-sin-puntos className="m-0 text-sm text-app-muted">Esta prédica aún no tiene puntos.</p>}
          </div>
          {/* «Volver a preparar», al final de la columna, como antes. */}
          <div className="flex shrink-0 flex-col p-4 pt-0">{volverBoton}</div>
        </aside>
      )}

      {/* PRUEBAS en una tableta acostada (20-11-2026, pedido del usuario): los puntos salen en un diálogo al costado,
          ENCIMA de lo demás, y no achican la pantalla. Se cierra con su X, con Escape o tocando fuera. */}
      {puntosEnDialogo && panelVersiculos}
      {puntosEnDialogo && panelPuntos && resumenNodo && (
        <div
          ref={panelLateral}
          role="dialog"
          aria-label="Puntos"
          data-puntos-dialogo
          className={`fixed ${arribaDelPanel} right-0 bottom-0 z-40 flex w-96 flex-col border-l border-app-border bg-app-dark shadow-2xl`}
        >
          {encabezadoPuntos(() => setPanelPuntos(false))}
          <div className="min-h-0 flex-1 p-4">{resumenNodo}</div>
        </div>
      )}
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
