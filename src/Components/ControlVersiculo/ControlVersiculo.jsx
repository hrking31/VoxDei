import { useState, useRef, useLayoutEffect } from "react";
import { useNavigate } from "react-router-dom";
import { database, auth } from "../Firebase/Firebase";
import { ref, set, update } from "firebase/database";
import parse from "html-react-parser";
import LibrosModal from "../ModalLibros/ModalLibros";
import CapituloModal from "../ModalCapitulo/ModalCapitulo";
import VersiculoModal from "../ModalVersiculo/ModalVersiculo";
import { obtenerVersiculo } from "../FuncionesControlPredica/FuncionesControlPredica";
import BuscadorLibros from "../BuscadorLibros/BuscadorLibros";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { useAppContext } from "../Context/AppContext";
import { useAuth } from "../../Components/Context/AuthContext.jsx";

export default function ControlVersiculos() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [libro, setLibro] = useState({
    sigla: null,
    nombre: null,
    capitulo: null,
    capitulos: null,
    versiculo: null,
  });
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState("");
  const [modalActivo, setModalActivo] = useState(null);
  const [tipoLibros, setTipoLibros] = useState("antiguo");
  const [versiculoNumero, setVersiculoNumero] = useState(null);
  const [versiculoTexto, setVersiculoTexto] = useState(null);
  const {
    visibleTitulo,
    setVisibleTitulo,
    visibleTexto,
    setVisibleTexto,
    showNotif,
  } = useAppContext();
  const [open, setOpen] = useState(false);
  const capitulosRef = useRef({});
  const versiculosRef = useRef({});

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

  const VersiculoSeleccionado = (versiculo) => {
    setLibro((prevLibro) => ({
      ...prevLibro,
      versiculo: versiculo,
    }));
    consultaVersiculo(libro.sigla, libro.capitulo, versiculo);
    setModalActivo("false");
  };

  const consultaVersiculo = async (sigla, capitulo, versiculo) => {
    try {
      const data = await obtenerVersiculo(
        sigla,
        capitulo,
        versiculo,
        "capitulo",
        showNotif
      );
      setResultado(data);
      setError("");
    } catch (err) {
      setResultado(null);
      setError(err.message);
    }
  };

  const handleProjectarVersiculo = (versiculo, numero, titulo) => {
    const citaCompleta = `${resultado.libro} ${resultado.capitulo}:${numero}`;
    set(ref(database, `displayVersiculo/${user.uid}`), {
      titulo: titulo,
      text: versiculo,
      cita: citaCompleta,
      display: "versiculo",
      timestamp: Date.now(),
    });
  };

  useLayoutEffect(() => {
    if (!resultado?.numero) return;

    const numero = Number(resultado.numero);

    if (numero === 1) {
      // Esto asegura que siempre inicie desde arriba
      window.scrollTo({ top: 0, behavior: "auto" });
      return;
    }

    const elemento = versiculosRef.current[numero];
    if (!elemento) return;

    const stickyOffset = window.innerWidth >= 1280 ? 150 : 120;
    const marginSuperior = 5;

    const elementPosition =
      elemento.getBoundingClientRect().top + window.scrollY;
    const offsetPosition = elementPosition - stickyOffset - marginSuperior;

    window.scrollTo({
      top: offsetPosition,
      behavior: "auto",
    });
  }, [resultado?.numero, resultado?.texto, resultado?.libro]);

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

  let currentTitulo = "";

  const toggleVisibleTitulo = () => {
    const nuevoEstado = !visibleTitulo;
    setVisibleTitulo(nuevoEstado);

    update(ref(database, `displayVisibleTitulo/${user.uid}`), {
      visibleTitulo: nuevoEstado,
      timestamp: Date.now(),
    });
  };

  const toggleVisibleTexto = () => {
    const nuevoEstado = !visibleTexto;
    setVisibleTexto(nuevoEstado);

    update(ref(database, `displayVisibleTexto/${user.uid}`), {
      visibleTexto: nuevoEstado,
      timestamp: Date.now(),
    });
  };

  return (
    <div className="flex flex-col justify-center">
      {/* BLOQUE STICKY */}
      <div className="grid grid-cols-12 w-full sticky bg-app-dark top-0 z-10 pt-3 pb-4">
        {/* Fila de capítulos */}
        <div className="col-span-12 xl:col-span-10 overflow-x-auto scrollbar-custom [&::-webkit-scrollbar]:hidden xl:[&::-webkit-scrollbar]:block pb-2">
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

                    // 👇 Centra el capítulo seleccionado en el contenedor
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

        {/* Botones */}
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
          />
        </div>

        <div
          className={`flex justify-center gap-2 p-2 ${
            open
              ? "col-span-8 sm:col-span-4 xl:col-span-6"
              : "col-span-6 sm:col-span-9 xl:col-span-11"
          }`}
        >
          <button
            type="button"
            onClick={() => abrirModalConTipo("antiguo")}
            className="w-full py-2 flex items-center justify-center text-center text-xs sm:text-sm md:text-base break-words font-bold text-app-muted rounded inset-shadow-sm inset-shadow-app-muted hover:text-app-main hover:inset-shadow-app-main cursor-pointer"
          >
            Antiguo
          </button>

          <button
            type="button"
            onClick={() => abrirModalConTipo("nuevo")}
            className="w-full py-2 flex items-center justify-center text-center text-xs sm:text-sm md:text-base break-words font-bold text-app-muted rounded inset-shadow-sm inset-shadow-app-muted hover:text-app-main hover:inset-shadow-app-main cursor-pointer"
          >
            Nuevo
          </button>

          <button
            type="button"
            onClick={() => navigate("/ViewGestion")}
            className="w-full py-2 boton-salida"
          >
            Salida
          </button>
        </div>

        {/* botones visisbilidad */}
        <div className="col-span-4 sm:col-span-2 xl:col-span-2 xl:col-start-11 xl:row-start-1 row-start-auto flex items-center justify-center xl:px-2.5 gap-4 p-2 xl:p-0">
          <button
            onClick={toggleVisibleTitulo}
            className="w-full py-1.5 xl:py-3 flex items-center justify-center border-2 rounded font-semibold text-app-accent transition-all duration-200"
          >
            {visibleTitulo ? (
              <EyeIcon className="w-6 h-6" />
            ) : (
              <EyeSlashIcon className="w-6 h-6" />
            )}
          </button>

          <button
            onClick={toggleVisibleTexto}
            className="w-full py-1.5 xl:py-3 flex items-center justify-center border-2 rounded font-semibold text-app-main transition-all duration-200"
          >
            {visibleTexto ? (
              <EyeIcon className="w-6 h-6" />
            ) : (
              <EyeSlashIcon className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>
      {/* FIN BLOQUE STICKY */}

      {/* RESULTADOS */}
      <div className="w-full max-w-xl mx-auto p-2">
        <div className="flex flex-colborder">
          <div className="sm:mt-6 flex justify-center">
            <div className="max-w-xl w-full px-4">
              {resultado ? (
                <>
                  <strong className="block mb-4 text-lg sm:text-xl text-center text-app-main">
                    {resultado.libro} {resultado.capitulo}
                  </strong>

                  <div className="text-base sm:text-lg leading-relaxed text-justify space-y-2">
                    {parse(resultado.texto, {
                      replace: (domNode) => {
                        if (domNode.name === "h2") {
                          currentTitulo = domNode.children[0]?.data || "";
                          return (
                            <h2 className="font-bold sm:text-3xl text-app-muted mb-2 md:mb-4 text-left">
                              {currentTitulo}
                            </h2>
                          );
                        }
                        if (domNode.name === "p") {
                          const numero =
                            domNode.children[0]?.children?.[0]?.data || null;
                          const texto = domNode.children
                            .slice(1)
                            .map((c) => c.data || c.children?.[0]?.data || "")
                            .join(" ")
                            .trim();

                          const titulo = currentTitulo;
                          currentTitulo = "";

                          return (
                            <div
                              key={`${numero}-${texto}`}
                              ref={(el) => {
                                if (numero) versiculosRef.current[numero] = el;
                              }}
                              onClick={() => {
                                setVersiculoNumero(numero);
                                setVersiculoTexto(texto);
                                handleProjectarVersiculo(texto, numero, titulo);
                              }}
                              className={`versiculo-scroll cursor-pointer rounded-lg px-2 py-2 transition-colors flex ${
                                versiculoNumero === numero &&
                                versiculoTexto === texto
                                  ? "bg-yellow-100 shadow-md"
                                  : "hover:bg-app-border active:bg-app-light"
                              }`}
                            >
                              <div className="flex">
                                <span className="text-right pr-3 font-bold text-app-main flex-shrink-0 flex items-center justify-end">
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
                    })}
                  </div>
                </>
              ) : (
                <p className="text-app-muted font-bold text-center mt-10">
                  ✨ Escudriñad las Escrituras…
                </p>
              )}
            </div>
          </div>
        </div>
        {error && <p className="text-red-600 mt-4 font-medium">{error}</p>}
      </div>

      <LibrosModal
        open={modalActivo}
        onClose={() => setModalActivo(false)}
        tipo={tipoLibros}
        onLibro={LibroSeleccionado}
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
