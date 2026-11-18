import { useState, useRef, useLayoutEffect, useEffect, useMemo } from "react";
import { database } from "../Firebase/Firebase";
import { ref, set, update } from "firebase/database";
import parse from "html-react-parser";
import LibrosModal from "../ModalLibros/ModalLibros";
import CapituloModal from "../ModalCapitulo/ModalCapitulo";
import VersiculoModal from "../ModalVersiculo/ModalVersiculo";
import { obtenerVersiculo } from "../FuncionesControlPredica/FuncionesControlPredica";
import BuscadorLibros from "../BuscadorLibros/BuscadorLibros";
import {
  BookOpenIcon,
  BookmarkIcon,
  ChatBubbleLeftRightIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  EyeSlashIcon,
  MagnifyingGlassIcon,
  TagIcon,
  TvIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";
import { useAppContext } from "../Context/AppContext";
import { useAuth } from "../../Components/Context/AuthContext";
import ModalVisibilidad from "../ModalVisibilidad/ModalVisibilidad.jsx";
import FranjaTurno from "../Cronograma/FranjaTurno.jsx";
import EnLaGuia from "../PantallaGuia/EnLaGuia.jsx";
import MiniPantalla from "../PantallaGuia/MiniPantalla.jsx";
import InterruptoresDeVista from "../PantallaGuia/InterruptoresDeVista.jsx";
import { useFormato } from "../Hooks/formatoPantalla.js";
import { usePreferenciaLocal } from "../Hooks/usePreferenciaLocal.js";
import { versiculosDeCapitulo } from "../Biblia/versiculosCapitulo.js";
import { useRanuraGuia } from "../PantallaGuia/AccionesGuia.js";
import { useTurno } from "../Hooks/useTurno.js";
import SelectorBiblia from "../Biblia/SelectorBiblia.jsx";
import SelectorLibros from "../Biblia/SelectorLibros.jsx";
import { apagarImagen, cambiarVisible, encenderImagen } from "../Predica/accionesPredica.js";
import { librosDe, libroEnVersion } from "../Biblia/versionesBiblia";

const SIN_LIBRO = { sigla: null, nombre: null, capitulo: null, capitulos: null, versiculo: null };

// «14-15» → [14, 15]; «7» → [7]. La DHH junta algunos versículos en uno.
const numerosDe = (rotulo) => {
  const [desde, hasta = desde] = String(rotulo).split("-").map(Number);
  return Array.from({ length: Math.max(hasta - desde + 1, 1) }, (_, i) => desde + i);
};

export default function ControlVersiculos() {
  const { userData } = useAuth();
  // Solo quien tiene el turno del cronograma (o un pastor) envía a la pantalla.
  // Buscar y leer versículos sí se puede siempre.
  const { exigirTurno } = useTurno();
  const [libro, setLibro] = useState(SIN_LIBRO);
  const [resultado, setResultado] = useState(null);
  const [modalActivo, setModalActivo] = useState(null);
  const [tipoLibros, setTipoLibros] = useState("antiguo");
  const [versiculoNumero, setVersiculoNumero] = useState(null);
  const [versiculoTexto, setVersiculoTexto] = useState(null);
  const {
    visibleTicker,
    setVisibleTicker,
    visibleTitulo,
    setVisibleTitulo,
    visibleTexto,
    setVisibleTexto,
    visibleImagen,
    setVisibleImagen,
    isDesktop,
    showNotif,
    versionBiblia,
  } = useAppContext();
  const [open, setOpen] = useState(false);
  // En el celular la vista es como la de Predicar (18-11-2026, pedido del usuario):
  // la mini pantalla y los cuatro botones arriba, el capítulo en su propio recuadro
  // con scroll, y abajo un muelle fijo con la barra de capítulos, «Libros» y
  // «Anterior» / «Siguiente» (de versículo en versículo). La tableta y el
  // computador siguen como antes.
  const { formato } = useFormato();
  const celular = formato === "celular";
  const [librosAbiertos, setLibrosAbiertos] = useState(false);
  // A PRUEBA (18-11-2026, pedido del usuario): dos interruptores para ganar
  // espacio. Quien está frente al proyector no necesita ver la mini pantalla; y
  // quien solo proyecta versículos no necesita los cuatro botones. Se acuerdan
  // en este dispositivo. Si gustan, se aplican a las demás vistas.
  const [sinPantalla, setSinPantalla] = usePreferenciaLocal("voxdei.biblia.sinPantalla");
  const [sinBotones, setSinBotones] = usePreferenciaLocal("voxdei.biblia.sinBotones");
  // En el computador los botones van en la columna de la derecha (la ranura de la
  // guía del templo); sin ranura, en el encabezado de siempre.
  const ranuraGuia = useRanuraGuia();
  const enGuia = isDesktop && Boolean(ranuraGuia);
  const capitulosRef = useRef({});
  const versiculosRef = useRef({});
  // El contenedor con scroll de los versículos (solo con guía, en el computador).
  const zonaTexto = useRef(null);
  // Catálogo de la Biblia elegida (TEMPORAL DHH: con la Dios Habla Hoy, 75 libros).
  const libros = librosDe(versionBiblia);

  const abrirModalConTipo = (tipo) => {
    setTipoLibros(tipo);
    setModalActivo("libro");
  };

  const LibroSeleccionado = (libro) => {
    setLibro(libro);
    setModalActivo("capitulo");
  };

  const CapituloSeleccionado = (capitulo) => {
    setLibro((prevLibro) => ({
      ...prevLibro,
      capitulo: capitulo,
    }));
    setModalActivo("versiculo");
  };

  // Elecciones de la cuadrícula de la columna derecha (sin ventanas): un capítulo
  // se lee entero desde el versículo 1, y uno de la cuadrícula de versículos
  // lleva a ese versículo.
  const capituloDeLaCuadricula = (libroElegido, capitulo) => {
    setLibro({ ...libroElegido, capitulo, versiculo: 1 });
    versiculosRef.current = {};
    consultaVersiculo(libroElegido.sigla, capitulo, 1);
  };

  const versiculoDeLaCuadricula = (libroElegido, capitulo, versiculo) => {
    setLibro((previo) => ({ ...previo, versiculo }));
    consultaVersiculo(libroElegido.sigla, capitulo, versiculo);
  };

  const VersiculoSeleccionado = (versiculo) => {
    setLibro((prevLibro) => ({
      ...prevLibro,
      versiculo: versiculo,
    }));
    consultaVersiculo(libro.sigla, libro.capitulo, versiculo);
    setModalActivo(false);
  };

  const consultaVersiculo = async (sigla, capitulo, versiculo) => {
    try {
      const data = await obtenerVersiculo(
        sigla,
        capitulo,
        versiculo,
        "capitulo",
        showNotif,
        versionBiblia
      );
      setResultado(data);
    } catch (err) {
      setResultado(null);
      showNotif("error", err.message);
    }
  };

  // TEMPORAL DHH: al cambiar de Biblia (aquí o desde otro equipo de la
  // iglesia) se vuelve a leer el capítulo abierto en la nueva versión, con el
  // libro tomado de su catálogo. Si esa versión no tiene el libro (un
  // deuterocanónico al volver a la RVR1960), se vuelve al inicio.
  const versionMostrada = useRef(versionBiblia);
  useEffect(() => {
    if (versionMostrada.current === versionBiblia) return;
    versionMostrada.current = versionBiblia;
    if (!libro.sigla) return;
    const mismo = libroEnVersion(libro.sigla, versionBiblia);
    if (!mismo) {
      setLibro(SIN_LIBRO);
      setResultado(null);
      return;
    }
    const capitulo = Math.min(libro.capitulo || 1, mismo.capitulos);
    setLibro({ ...mismo, capitulo, versiculo: libro.versiculo || 1 });
    versiculosRef.current = {};
    consultaVersiculo(mismo.sigla, capitulo, libro.versiculo || 1);
    // Solo debe correr cuando cambia la versión, no con cada libro o capítulo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versionBiblia]);

  const handleProjectarVersiculo = (versiculo, numero, titulo) => {
    if (!exigirTurno()) return;
    const citaCompleta = `${resultado.libro} ${resultado.capitulo}:${numero}`;
    set(ref(database, `displayVersiculo/${userData.groupId}`), {
      titulo: titulo,
      text: versiculo,
      cita: citaCompleta,
      display: "versiculo",
      // La pantalla del templo muestra, abajo, el aviso de derechos de esta
      // Biblia (11-11-2026). TEMPORAL DHH: al quitarla, siempre "RVR1960".
      version: versionBiblia || "RVR1960",
      timestamp: Date.now(),
    });
  };

  useLayoutEffect(() => {
    if (!resultado?.numero) return;

    const numero = Number(resultado.numero);

    // En el computador (con guía) se desplaza solo el contenedor de los
    // versículos, no la página.
    const zona = enGuia || celular ? zonaTexto.current : null;

    if (numero === 1) {
      // Esto asegura que siempre inicie desde arriba
      if (zona) zona.scrollTo?.({ top: 0, behavior: "auto" });
      else window.scrollTo({ top: 0, behavior: "auto" });
      return;
    }

    const elemento = versiculosRef.current[numero];
    if (!elemento) return;

    if (zona) {
      const arriba = elemento.getBoundingClientRect().top - zona.getBoundingClientRect().top + zona.scrollTop - 8;
      zona.scrollTo?.({ top: arriba, behavior: "auto" });
      return;
    }

    const stickyOffset = window.innerWidth >= 1280 ? 150 : 120;
    const marginSuperior = 5;

    const elementPosition =
      elemento.getBoundingClientRect().top + window.scrollY;
    const offsetPosition = elementPosition - stickyOffset - marginSuperior;

    window.scrollTo({
      top: offsetPosition,
      behavior: "auto",
    });
  }, [resultado?.numero, resultado?.texto, resultado?.libro, enGuia, celular]);

  useLayoutEffect(() => {
    if (!libro.capitulo) return;
    const el = capitulosRef.current[libro.capitulo];
    if (el) {
      el.scrollIntoView({
        behavior: "auto",
        inline: "center",
        block: "nearest",
      });
    }
  }, [libro.capitulo]);

  // Convierte el HTML del capítulo en versículos que se pueden tocar.
  //
  // El título pendiente vive DENTRO de esta función a propósito: antes era una
  // variable del componente que se modificaba mientras React dibujaba, algo
  // que con StrictMode (que está activo) produce fallos intermitentes.
  const renderCapitulo = (html) => {
    let tituloPendiente = "";

    return parse(html, {
      replace: (domNode) => {
        if (domNode.name === "h2") {
          tituloPendiente = domNode.children[0]?.data || "";
          return (
            <h2 className="font-bold sm:text-3xl text-app-muted mb-2 md:mb-4 text-left">
              {tituloPendiente}
            </h2>
          );
        }

        if (domNode.name === "p") {
          const numero = domNode.children[0]?.children?.[0]?.data || null;
          const texto = domNode.children
            .slice(1)
            .map((c) => c.data || c.children?.[0]?.data || "")
            .join(" ")
            .trim();

          const titulo = tituloPendiente;
          tituloPendiente = "";

          return (
            <div
              key={`${numero}-${texto}`}
              ref={(el) => {
                if (!numero) return;
                for (const n of numerosDe(numero)) versiculosRef.current[n] = el;
              }}
              onClick={() => {
                setVersiculoNumero(numero);
                setVersiculoTexto(texto);
                handleProjectarVersiculo(texto, numero, titulo);
              }}
              className={`versiculo-scroll cursor-pointer rounded-lg px-2 py-2 transition-colors flex ${
                versiculoNumero === numero && versiculoTexto === texto
                  ? "bg-yellow-100 shadow-md"
                  : "hover:bg-app-border active:bg-app-light"
              }`}
            >
              <div className="flex">
                <span className="text-right pr-3 font-bold text-app-main shrink-0 flex items-center justify-end">
                  {numero}
                </span>

                <span className="flex-1 leading-relaxed text-app-muted overflow-hidden">
                  {texto}
                </span>
              </div>
            </div>
          );
        }
      },
    });
  };

  // Visibilidad del titulo
  const toggleVisibleTitulo = () => {
    if (!exigirTurno()) return;
    const nuevoEstado = !visibleTitulo;
    setVisibleTitulo(nuevoEstado);

    update(ref(database, `displayVisibleTitulo/${userData.groupId}`), {
      visibleTitulo: nuevoEstado,
      timestamp: Date.now(),
    });
  };

  // Visibilidad del texto
  const toggleVisibleTexto = () => {
    if (!exigirTurno()) return;
    const nuevoEstado = !visibleTexto;
    setVisibleTexto(nuevoEstado);

    update(ref(database, `displayVisibleTexto/${userData.groupId}`), {
      visibleTexto: nuevoEstado,
      timestamp: Date.now(),
    });
  };

  // Visibilidad del ticker
  const toggleVisibleTicker = () => {
    if (!exigirTurno()) return;
    const nuevoEstado = !visibleTicker;
    setVisibleTicker(nuevoEstado);

    set(ref(database, `displayVisibleTicker/${userData.groupId}`), {
      visibleTicker: nuevoEstado,
      timestamp: Date.now(),
    });
  };

  // Visibilidad solo texto
  const setAllVisible = () => {
    if (!exigirTurno()) return;
    setVisibleTexto(true);
    setVisibleTitulo(false);
    setVisibleTicker(false);
    const timestamp = Date.now();

    update(ref(database, `displayVisibleTexto/${userData.groupId}`), {
      visibleTexto: true,
      timestamp,
    });

    update(ref(database, `displayVisibleTitulo/${userData.groupId}`), {
      visibleTitulo: false,
      timestamp,
    });

    set(ref(database, `displayVisibleTicker/${userData.groupId}`), {
      visibleTicker: false,
      timestamp,
    });
  };

  // Los mismos botones se pintan en el encabezado (celular y tableta) o en la
  // columna de la derecha (computador).
  const botonesLibros = (
    <>
          <button
            type="button"
            onClick={() => abrirModalConTipo("antiguo")}
            className="w-full py-2 flex items-center justify-center text-center text-xs sm:text-sm md:text-base font-bold text-app-muted rounded inset-shadow-sm inset-shadow-app-muted hover:text-app-main hover:inset-shadow-app-main cursor-pointer"
          >
            Antiguo
          </button>

          <button
            type="button"
            onClick={() => abrirModalConTipo("nuevo")}
            className="w-full py-2 flex items-center justify-center text-center text-xs sm:text-sm md:text-base font-bold text-app-muted rounded inset-shadow-sm inset-shadow-app-muted hover:text-app-main hover:inset-shadow-app-main cursor-pointer"
          >
            Nuevo
          </button>
    </>
  );
  // La fila de capítulos del libro abierto («Génesis 1, Génesis 2…»), que se
  // desplaza hacia los lados. Va en el encabezado (celular y tableta) o, en el
  // computador, en la parte de abajo de la columna de la derecha.
  const filaCapitulos = (
        <div className="col-span-12  overflow-x-auto scrollbar-custom [&::-webkit-scrollbar]:hidden xl:[&::-webkit-scrollbar]:block">
          <div className="flex gap-2 whitespace-nowrap">
            {Array.from({ length: libro.capitulos }, (_, i) => {
              const capitulo = i + 1;
              const isSelected = libro.capitulo === capitulo;

              return (
                <span
                  key={capitulo}
                  ref={(el) => (capitulosRef.current[capitulo] = el)}
                  onClick={() => {
                    setLibro((prevLibro) => ({
                      ...prevLibro,
                      capitulo,
                      versiculo: 1,
                    }));

                    versiculosRef.current = {};
                    consultaVersiculo(libro.sigla, capitulo, 1);

                    // Centra el capítulo seleccionado en el contenedor
                    setTimeout(() => {
                      capitulosRef.current[capitulo]?.scrollIntoView({
                        behavior: "smooth",
                        inline: "center",
                        block: "nearest",
                      });
                    }, 50);
                  }}
                  className={`xl:mb-1 inline-block px-2 py-1 rounded cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? "bg-app-border text-app-main font-semibold"
                      : "text-app-muted bg-app-border hover:text-app-main"
                  }`}
                >
                  {libro.nombre} {capitulo}
                </span>
              );
            })}
          </div>
        </div>

  );

  // «Ocultar» / «Mostrar», igual que en el púlpito de Prédica: Ocultar apaga
  // título, texto, ticker e imagen y recuerda qué estaba encendido; Mostrar lo
  // vuelve a encender. Sin nada que recordar, enciende el texto.
  const enNegro = !visibleTitulo && !visibleTexto && !visibleTicker && !visibleImagen;
  const antesDeOcultar = useRef(null);
  const alternarOculto = () => {
    if (!exigirTurno()) return;
    const groupId = userData.groupId;
    if (!enNegro) {
      antesDeOcultar.current = { titulo: visibleTitulo, texto: visibleTexto, ticker: visibleTicker, imagen: visibleImagen };
      setVisibleTitulo(false);
      setVisibleTexto(false);
      setVisibleTicker(false);
      cambiarVisible(groupId, "titulo", false);
      cambiarVisible(groupId, "texto", false);
      cambiarVisible(groupId, "ticker", false);
      if (visibleImagen) {
        setVisibleImagen?.(false);
        apagarImagen(groupId);
      }
      return;
    }
    const antes = antesDeOcultar.current || { texto: true };
    antesDeOcultar.current = null;
    if (antes.titulo) {
      setVisibleTitulo(true);
      cambiarVisible(groupId, "titulo", true);
    }
    if (antes.texto) {
      setVisibleTexto(true);
      cambiarVisible(groupId, "texto", true);
    }
    if (antes.ticker) {
      setVisibleTicker(true);
      cambiarVisible(groupId, "ticker", true);
    }
    if (antes.imagen) {
      setVisibleImagen?.(true);
      encenderImagen(groupId);
    }
  };

  // En la columna de la derecha (computador) los de visibilidad van como en
  // Predicar (pedido del usuario, 18-11-2026): el ícono pequeño y el nombre, en
  // cuatro columnas iguales que caben en la columna (sin desplazamiento
  // horizontal), en los mismos colores. El cuarto es Ocultar / Mostrar.
  const interruptoresGuia = (
    <div role="group" aria-label="Qué se ve en el templo" className="grid grid-cols-4 gap-1.5">
      {[
        { clave: "titulo", nombre: "Título", valor: visibleTitulo, alternar: toggleVisibleTitulo, Icono: BookmarkIcon, encendido: "border-app-accent bg-app-accent/10 text-app-accent" },
        { clave: "texto", nombre: "Texto", valor: visibleTexto, alternar: toggleVisibleTexto, Icono: ChatBubbleLeftRightIcon, encendido: "border-app-main bg-app-main/10 text-app-main" },
        { clave: "ticker", nombre: "Ticker", valor: visibleTicker, alternar: toggleVisibleTicker, Icono: TagIcon, encendido: "border-app-success bg-app-success/10 text-app-success" },
      ].map(({ clave, nombre, valor, alternar, Icono, encendido }) => (
        <button
          key={clave}
          type="button"
          aria-pressed={Boolean(valor)}
          data-visible={clave}
          onClick={alternar}
          className={`flex h-10 min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl border px-1 text-xs font-semibold transition ${valor ? encendido : "border-app-border text-app-muted"}`}
        >
          <Icono className="h-4 w-4 shrink-0" aria-hidden="true" />
          {nombre}
        </button>
      ))}
      <button
        type="button"
        onClick={alternarOculto}
        data-ocultar={enNegro ? "mostrar" : "ocultar"}
        className={`flex h-10 min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl border px-1 text-xs font-semibold transition ${
          enNegro
            ? "border-app-error bg-app-error/15 font-bold text-app-error motion-safe:animate-palpita"
            : "border-app-border bg-app-aviso text-app-texto"
        }`}
      >
        {/* El ojo tachado para ocultar; abierto para mostrar (en rojo y palpitando:
            la pantalla no se ve), como en Prédica. */}
        {enNegro ? <EyeIcon className="h-4 w-4 shrink-0" aria-hidden="true" /> : <EyeSlashIcon className="h-4 w-4 shrink-0" aria-hidden="true" />}
        {enNegro ? "Mostrar" : "Ocultar"}
      </button>
    </div>
  );
  const botonesVisibilidad = (
            <div className="flex items-center gap-4">
              {/* Boton visibilidad ticker */}
              <button
                onClick={toggleVisibleTicker}
                className="h-full font-semibold text-app-muted px-2 flex items-center justify-center transition-all
              duration-200"
              >
                {visibleTicker ? (
                  <TagIcon className="w-8 h-8 text-app-success" />
                ) : (
                  <TagIcon className="w-8 h-8" />
                )}
              </button>
              {/* Boton visibilidad titulo */}
              <button
                onClick={toggleVisibleTitulo}
                className="h-full font-semibold text-app-muted px-2 flex items-center justify-center transition-all
              duration-200"
              >
                {visibleTitulo ? (
                  <BookmarkIcon className="w-8 h-8 text-app-accent" />
                ) : (
                  <BookmarkIcon className="w-8 h-8" />
                )}
              </button>
              {/* Boton visibilidad texto */}
              <button
                onClick={toggleVisibleTexto}
                className="h-full font-semibold text-app-muted px-2 flex items-center justify-center transition-all duration-200"
              >
                {visibleTexto ? (
                  <ChatBubbleLeftRightIcon className="w-8 h-8 text-app-main" />
                ) : (
                  <ChatBubbleLeftRightIcon className="w-8 h-8" />
                )}
              </button>
              {/* Boton visibilidad solo texto */}
              <button
                onClick={setAllVisible}
                className="h-full font-semibold px-2 flex items-center justify-center transition-all duration-200"
              >
                <TvIcon className="w-8 h-8 text-app-main" />
              </button>
            </div>
  );

  // ---------- Celular: como Predicar ----------
  // Los versículos del capítulo abierto, para pasar de uno a otro.
  const versiculos = useMemo(() => (resultado?.texto ? versiculosDeCapitulo(resultado.texto) : []), [resultado?.texto]);
  const indiceActual = versiculos.findIndex((v) => v.numero === versiculoNumero);

  // Al cambiar de capítulo, el versículo marcado de antes ya no vale.
  useEffect(() => {
    setVersiculoNumero(null);
    setVersiculoTexto(null);
  }, [resultado?.libro, resultado?.capitulo]);

  const proyectarDeLaLista = (v) => {
    setVersiculoNumero(v.numero);
    setVersiculoTexto(v.texto);
    handleProjectarVersiculo(v.texto, v.numero, v.titulo);
  };
  const versiculoSiguiente = () => {
    const i = indiceActual + 1;
    if (i < versiculos.length) proyectarDeLaLista(versiculos[i]);
  };
  const versiculoAnterior = () => {
    if (indiceActual > 0) proyectarDeLaLista(versiculos[indiceActual - 1]);
  };

  // El versículo que está al aire se centra en el recuadro del texto.
  useEffect(() => {
    if (!celular || !versiculoNumero) return;
    const elemento = versiculosRef.current[numerosDe(versiculoNumero)[0]];
    const zona = zonaTexto.current;
    if (!elemento || !zona) return;
    const arriba = elemento.getBoundingClientRect().top - zona.getBoundingClientRect().top + zona.scrollTop - (zona.clientHeight - elemento.offsetHeight) / 2;
    zona.scrollTo?.({ top: Math.max(0, arriba), behavior: "smooth" });
  }, [versiculoNumero, celular]);

  // La ventana de libros se cierra con Escape.
  useEffect(() => {
    if (!librosAbiertos) return undefined;
    const alTeclear = (e) => {
      if (e.key === "Escape") setLibrosAbiertos(false);
    };
    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, [librosAbiertos]);

  if (celular) {
    // Sin capítulo abierto dice «Libro» (pedido del usuario; antes «Biblia»): es el botón que busca.
    const titulo = resultado ? `${resultado.libro} ${resultado.capitulo}` : "Libro";
    const contador = indiceActual >= 0 ? `${indiceActual + 1} de ${versiculos.length}` : versiculos.length ? `${versiculos.length} versículos` : "";

    return (
      <div className="flex h-pantalla flex-col overflow-hidden bg-linear-to-b from-app-dark/50 to-app-light/50">
        <div className="flex h-11 shrink-0 items-center gap-2 px-3.5">
          <span className="flex min-w-0 flex-1 items-baseline gap-2">
            {/* El nombre abre los libros (opción 1, 18-11-2026, pedido del usuario): el libro
                que se ve es el que se cambia. */}
            <button
              type="button"
              data-abrir-libros
              onClick={() => setLibrosAbiertos(true)}
              aria-label={resultado ? `Abrir los libros (ahora: ${titulo})` : "Abrir los libros"}
              title="Elegir otro libro"
              className="flex min-w-0 items-center gap-1 text-left"
            >
              {/* La lupa dice que ahí se busca (pedido del usuario) */}
              <MagnifyingGlassIcon data-icono-buscar className="h-4 w-4 shrink-0 text-app-agua" aria-hidden="true" />
              <b data-titulo-biblia className="truncate text-app-texto">{titulo}</b>
              <ChevronDownIcon className="h-4 w-4 shrink-0 text-app-agua" aria-hidden="true" />
            </button>
            {contador && (
              <span data-contador-items className="shrink-0 text-pie font-normal text-app-muted">
                {contador}
              </span>
            )}
          </span>
          <InterruptoresDeVista
            sinPantalla={sinPantalla}
            alCambiarPantalla={setSinPantalla}
            sinBotones={sinBotones}
            alCambiarBotones={setSinBotones}
          />
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-2 px-3.5 pb-2">
          {!sinPantalla && <MiniPantalla />}
          {!sinBotones && interruptoresGuia}
          {/* El capítulo, sin recuadro (sin borde, fondo ni relleno: más espacio para el
              texto; pedido del usuario): lo único que se desplaza. Tocar un versículo
              lo proyecta. */}
          <section
            ref={zonaTexto}
            aria-label="Texto del capítulo"
            data-texto-biblia
            className={`scrollbar-oculta min-h-0 flex-1 overflow-y-auto ${resultado ? "" : "flex flex-col"}`}
          >
            {resultado ? (
              <div className="text-base leading-relaxed text-justify space-y-2">{renderCapitulo(resultado.texto)}</div>
            ) : (
              <div data-sin-capitulo className="m-auto flex flex-col items-center gap-4 px-4 text-center">
                <p className="m-0 font-bold text-app-muted">✨ Escudriñad las Escrituras…</p>
                <button
                  type="button"
                  data-elegir-libro
                  onClick={() => setLibrosAbiertos(true)}
                  className="flex h-12 items-center gap-2 rounded-2xl bg-app-main px-6 text-base font-bold text-app-dark shadow-lg"
                >
                  <BookOpenIcon className="h-5 w-5" aria-hidden="true" />
                  Elegir libro
                </button>
              </div>
            )}
          </section>
        </div>

        <div data-muelle className="flex shrink-0 flex-col gap-1.5 border-t border-app-border bg-app-light px-3.5 pt-1.5 pb-2.5">
          {libro.capitulos && (
            <div data-barra-capitulos className="-mx-1 [&>div]:[scrollbar-width:none] [&>div::-webkit-scrollbar]:hidden">
              {filaCapitulos}
            </div>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={versiculoAnterior}
              disabled={indiceActual <= 0}
              className="flex h-16 w-24 shrink-0 items-center justify-center gap-2 rounded-2xl border border-app-border bg-app-light text-base font-semibold text-app-texto disabled:opacity-40"
            >
              <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
              Anterior
            </button>
            <button
              type="button"
              onClick={versiculoSiguiente}
              disabled={!versiculos.length || indiceActual >= versiculos.length - 1}
              className="flex h-16 flex-1 items-center justify-center gap-3 rounded-2xl bg-app-main text-2xl font-bold text-app-dark shadow-lg disabled:opacity-40"
            >
              Siguiente
              <ChevronRightIcon className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Los libros, a pantalla completa (como la ventana de versículos de Predicar):
            la Biblia, el buscador, Antiguo | Nuevo y la cuadrícula. Al elegir un
            capítulo o un versículo se cierra y el texto queda a la vista. */}
        {librosAbiertos && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Libros"
            data-dialogo-libros
            className="fixed inset-x-0 bottom-0 top-barra-superior z-40 flex flex-col bg-app-dark"
          >
            <div className="flex h-12 shrink-0 items-center justify-between border-b border-app-border px-3.5">
              <b className="text-app-texto">Libros</b>
              <button
                type="button"
                onClick={() => setLibrosAbiertos(false)}
                aria-label="Cerrar"
                className="rounded-full p-1.5 text-app-muted transition hover:bg-app-border hover:text-app-texto"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="scrollbar-oculta flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3.5">
              {/* TEMPORAL DHH: elegir la Biblia de toda la iglesia */}
              <SelectorBiblia />
              <SelectorLibros
                grande
                libros={libros}
                version={versionBiblia}
                alElegirCapitulo={(l, c) => {
                  capituloDeLaCuadricula(l, c);
                  setLibrosAbiertos(false);
                }}
                alElegirVersiculo={(l, c, v) => {
                  versiculoDeLaCuadricula(l, c, v);
                  setLibrosAbiertos(false);
                }}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-col bg-linear-to-b from-app-dark/50 to-app-light/50 ${enGuia ? "h-svh overflow-hidden" : "min-h-dvh"}`}>
      {/* BLOQUE STICKY */}
      {/* En el computador (con guía) no hay encabezado arriba: la barra de capítulos
          y los botones van a la columna de la derecha (SelectorLibros). */}
      {!enGuia && (
      <div className="grid grid-cols-12 w-full sticky border-b border-app-main bg-app-dark top-0 z-10 pt-3 pb-4">
        <div className="col-span-12 -mt-3 mb-2 empty:hidden">
          <FranjaTurno />
        </div>
        {/* Fila de capítulos */}
        {filaCapitulos}

        {/* Botones (celular y tableta) */}
            <div
              className={`flex p-2 ${
                open
                  ? "col-span-12 row-start-3 sm:row-start-auto sm:col-span-6"
                  : "col-span-2 sm:col-span-1"
              }`}
            >
              <BuscadorLibros
                open={open}
                setOpen={setOpen}
                onLibroSeleccionado={LibroSeleccionado}
                libros={libros}
              />
            </div>

            <div
              className={`flex justify-center gap-2 p-2 ${
                open
                  ? "col-span-12 sm:col-span-6 xl:col-span-6"
                  : "col-span-10 sm:col-span-11 xl:col-span-11"
              }`}
            >
              {botonesLibros}
              {isDesktop ? (
                botonesVisibilidad
              ) : (
                <ModalVisibilidad
                  toggleVisibleTicker={toggleVisibleTicker}
                  toggleVisibleTitulo={toggleVisibleTitulo}
                  toggleVisibleTexto={toggleVisibleTexto}
                  setAllVisible={setAllVisible}
                  colorClass={"text-app-main"}
                />
              )}
            </div>
      </div>
      )}
      {/* FIN BLOQUE STICKY */}
      {/* RESULTADOS */}
      {/* En el computador (con guía) la página no se desplaza: solo este contenedor,
          el de los versículos del centro. En el celular y la tableta es transparente. */}
      <div ref={zonaTexto} className={enGuia ? "scrollbar-custom min-h-0 flex-1 overflow-y-auto" : "contents"}>
      <div className={`w-full max-w-xl mx-auto p-2 ${resultado ? "" : enGuia ? "flex h-full flex-col" : "flex flex-1 flex-col"}`}>
        {/* TEMPORAL DHH: elegir la Biblia de toda la iglesia */}
        {!enGuia && (
          <div className="mt-2 mb-3">
            <SelectorBiblia />
          </div>
        )}
        {resultado ? (
          <div className="flex flex-colborder">
            <div className="sm:mt-6 flex justify-center">
              <div className="max-w-xl w-full px-4">
                <strong className="block mb-4 text-lg sm:text-xl text-center text-app-main">
                  {resultado.libro} {resultado.capitulo}
                </strong>

                <div className="text-base sm:text-lg leading-relaxed text-justify space-y-2">
                  {renderCapitulo(resultado.texto)}
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Sin capítulo abierto, el mensaje va centrado en el espacio que queda
          // debajo del encabezado, a lo ancho y a lo alto.
          <p data-sin-capitulo className="m-auto px-4 text-center font-bold text-app-muted">
            ✨ Escudriñad las Escrituras…
          </p>
        )}
      </div>
      </div>
      {enGuia && (
        <EnLaGuia>
          <div data-botones-biblia className="flex min-h-full flex-1 flex-col gap-4">
            {/* Debajo de la pantalla del templo: Título, Texto, Ticker y Ocultar / Mostrar */}
            <div data-botones-visibilidad>{interruptoresGuia}</div>
            {/* TEMPORAL DHH: elegir la Biblia de toda la iglesia */}
            <SelectorBiblia />
            {/* Los libros listos para escoger, como en Prédica */}
            <SelectorLibros
              libros={libros}
              version={versionBiblia}
              alElegirCapitulo={capituloDeLaCuadricula}
              alElegirVersiculo={versiculoDeLaCuadricula}
            />
            {/* La barra de capítulos, en la parte de abajo de la columna y fija ahí
                aunque la columna se desplace; solo con un capítulo abierto. La
                columna pierde su relleno de abajo mientras exista (PantallaGuia,
                has-[…]:pb-0), así que llega justo al borde. */}
            {libro.capitulos && (
              <div data-barra-capitulos className="sticky bottom-0 mt-auto -mx-5 border-t border-app-border bg-app-light px-5 pb-1.5 pt-3">
                {filaCapitulos}
              </div>
            )}
          </div>
        </EnLaGuia>
      )}
      <LibrosModal
        open={modalActivo}
        onClose={() => setModalActivo(false)}
        tipo={tipoLibros}
        onLibro={LibroSeleccionado}
        libros={libros}
      />
      <CapituloModal
        open={modalActivo}
        onClose={() => setModalActivo(false)}
        selecLibro={libro}
        onCapitulo={CapituloSeleccionado}
      />
      <VersiculoModal
        open={modalActivo}
        onClose={() => setModalActivo(false)}
        selecLibro={libro}
        onVersiculo={VersiculoSeleccionado}
      />
    </div>
  );
}
