import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { database, db } from "../Firebase/Firebase";
import { ref, set } from "firebase/database";
import parse from "html-react-parser";
import LibrosModal from "../../Components/LibrosModal/LibrosModal";
import CapituloModal from "../../Components/CapituloModal/CapituloModal";
import VersiculoModal from "../../Components/VersiculoModal/VersiculoModal";

const obtenerVersiculo = async (sigla, capitulo, versiculo) => {
  const docId = `${sigla.toUpperCase()}_${capitulo}`;
  const ref = doc(db, "biblia", docId);
  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) {
    throw new Error("❌ Documento no encontrado");
  }

  const data = snapshot.data();
  const texto = data.chapter_html || null;

  if (!texto) {
    throw new Error("⚠️ Capitulo no encontrado");
  }

  return {
    texto,
    libro: data.libro,
    capitulo: data.capitulo,
    versiculo: versiculo,
  };
};

export default function ControlVersiculos() {
  const navigate = useNavigate();
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
  const [versiculoTitulo, setVersiculoTitulo] = useState(null);

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
      const data = await obtenerVersiculo(sigla, capitulo, versiculo);
      console.log("data", data);
      setResultado(data);
      setError("");
    } catch (err) {
      setResultado(null);
      setError(err.message);
    }
  };

  const handleProjectarVersiculo = (versiculo, numero, titulo) => {
    const citaCompleta = `${resultado.libro} ${resultado.capitulo}:${numero}`;
    set(ref(database, "displayVersiculo"), {
      titulo: titulo,
      text: versiculo,
      cita: citaCompleta,
      display: "versiculo",
      timestamp: Date.now(),
    });
  };

  console.log("ver", libro.versiculo);

  useEffect(() => {
    // if (libro.versiculo) {
    if (!libro.versiculo || libro.versiculo === 1) return;
    const elemento = versiculosRef.current[libro.versiculo];
    console.log("versiculo", libro.versiculo);
    if (elemento) {
      const stickyOffset = window.innerWidth >= 1280 ? 150 : 120;
      const elementPosition =
        elemento.getBoundingClientRect().top + window.scrollY;
      const offsetPosition = elementPosition - stickyOffset;

      window.scrollTo({
        top: offsetPosition,
      });
    }
  }, [libro.versiculo, resultado?.texto]);

  let currentTitulo = "";

  return (
    <div className="flex flex-col justify-center gap-3">
      {/* BLOQUE STICKY */}
      <div className="sticky top-0 z-10 bg-app-dark pt-3 pb-3">
        {/* Fila de capítulos */}
        <div
          className="flex gap-2 overflow-x-auto whitespace-nowrap [&::-webkit-scrollbar]:hidden   
        xl:[&::-webkit-scrollbar]:block scrollbar-custom mb-4"
        >
          {Array.from({ length: libro.capitulos }, (_, i) => (
            <span
              key={i + 1}
              onClick={() => {
                setLibro((prevLibro) => ({
                  ...prevLibro,
                  versiculo: 1,
                }));
                consultaVersiculo(libro.sigla, i + 1, 1);
              }}
              className="xl:mb-1 inline-block px-2 py-1 text-app-muted bg-app-border rounded cursor-pointer hover:text-app-main"
            >
              {libro.nombre} {i + 1}
            </span>
          ))}
        </div>

        {/* Botones */}
        <div className="flex flex-row justify-center gap-2 pb-2">
          <button
            type="button"
            onClick={() => abrirModalConTipo("antiguo")}
            className="w-28 sm:w-36 md:w-44 lg:w-52 
          py-2 font-bold text-app-muted rounded border-2 bg-app-border hover:text-app-error hover:border-app-error"
          >
            Antiguo
          </button>

          <button
            type="button"
            onClick={() => abrirModalConTipo("nuevo")}
            className="w-28 sm:w-36 md:w-44 lg:w-52 
          py-2 md:py-3 font-bold text-app-muted rounded border-2 bg-app-border hover:text-app-error hover:border-app-error"
          >
            Nuevo
          </button>

          <button
            type="button"
            onClick={() => navigate("/")}
            className="w-28 sm:w-36 md:w-44 lg:w-52 
          py-2 md:py-3 font-bold text-app-border rounded border-2 bg-transparent hover:text-app-error hover:border-app-error"
          >
            Salida
          </button>
        </div>
      </div>
      {/* FIN BLOQUE STICKY */}

      {/* RESULTADOS */}
      <div className="w-full max-w-xl mx-auto p-2">
        <div className="flex flex-col">
          <div className="mt-6 flex justify-center">
            <div className="max-w-xl w-full text-black px-4">
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
                            <h2 className="font-bold sm:text-3xl text-app-muted mb-4 text-left">
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
                                setVersiculoTitulo(titulo);
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
