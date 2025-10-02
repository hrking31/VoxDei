import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { database, db } from "../Firebase/Firebase";
import { ref, set } from "firebase/database";
import parse from "html-react-parser";
import LibrosModal from "../../Components/LibrosModal/LibrosModal";
import CapituloModal from "../../Components/CapituloModal/CapituloModal";

const obtenerCapitulo = async (sigla, capitulo) => {
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
  };
};

export default function ControlVersiculos() {
  const navigate = useNavigate();
  const [libro, setLibro] = useState({
    sigla: null,
    nombre: null,
    capitulo: null,
  });
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState("");
  const [modalActivo, setModalActivo] = useState(null);
  const [tipoLibros, setTipoLibros] = useState("antiguo");
  const [versiculoNumero, setVersiculoNumero] = useState(null);
  const [versiculoTexto, setVersiculoTexto] = useState(null);
  const [versiculoTitulo, setVersiculoTitulo] = useState(null);

  const abrirModalConTipo = (tipo) => {
    setTipoLibros(tipo);
    setModalActivo("libro");
  };

  const LibroSeleccionado = (libro) => {
    setLibro(libro);
    setModalActivo("capitulo");
  };

  const CapituloSeleccionado = (capitulo) => {
    setLibro((prevLibro) => {
      consultaCapitulo(prevLibro.sigla, capitulo);
      return {
        ...prevLibro,
        capitulo: capitulo,
      };
    });

    setModalActivo("false");
  };

  const consultaCapitulo = async (sigla, capitulo) => {
    try {
      const data = await obtenerCapitulo(sigla, capitulo);
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

  let currentTitulo = "";
  return (
    <div className="flex flex-col justify-center  gap-4 ">
      <div className="w-full max-w-xl mx-auto p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-row justify-center gap-2">
            <button
              type="button"
              onClick={() => {
                abrirModalConTipo("antiguo");
              }}
              className="w-28 sm:w-36 md:w-44 lg:w-52 
    py-2 md:py-3 font-bold text-app-muted rounded border-2 bg-app-border hover:text-app-error hover:border-app-error"
            >
              Antiguo
            </button>

            <button
              type="button"
              onClick={() => {
                abrirModalConTipo("nuevo");
              }}
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

          <div className="mt-6 flex justify-center">
            <div className="max-w-xl w-full text-black px-4">
              {resultado ? (
                <>
                  <strong className="block mb-2 text-lg sm:text-xl text-center text-app-main">
                    {resultado.libro} {resultado.capitulo}
                  </strong>

                  <div className="text-base sm:text-lg leading-relaxed text-justify space-y-2">
                    {parse(resultado.texto, {
                      replace: (domNode) => {
                        if (domNode.name === "h2") {
                          currentTitulo = domNode.children[0]?.data || "";
                          return null;
                        }
                        if (domNode.name === "p") {
                          const numero =
                            domNode.children[0]?.children?.[0]?.data || null;
                          const texto = domNode.children
                            .slice(1)
                            .map((c) => c.data || c.children?.[0]?.data || "")
                            .join(" ")
                            .trim();

                          const tituloParaMostrar = currentTitulo;
                          currentTitulo = "";

                          return (
                            <div className="p-4">
                              {/* Encabezado del capítulo solo una vez */}
                              {tituloParaMostrar && (
                                <h2 className="font-bold sm:text-3xl text-app-muted mb-4 text-left">
                                  {tituloParaMostrar}
                                </h2>
                              )}
                              <div
                                key={`${numero}-${texto}`}
                                onClick={() => {
                                  setVersiculoNumero(numero);
                                  setVersiculoTexto(texto);
                                  setVersiculoTitulo(tituloParaMostrar);
                                  handleProjectarVersiculo(
                                    texto,
                                    numero,
                                    tituloParaMostrar
                                  );
                                }}
                                className={`cursor-pointer rounded-lg px-2 py-2 transition-colors flex ${
                                  versiculoNumero === numero &&
                                  versiculoTexto === texto
                                    ? "bg-yellow-100 shadow-md"
                                    : "hover:bg-app-border active:bg-app-light"
                                }`}
                              >
                                <div className="flex">
                                  <span className=" text-right pr-3 font-bold text-app-main flex-shrink-0 flex items-center justify-end">
                                    {numero}
                                  </span>

                                  <span className="flex-1 leading-relaxed text-app-muted">
                                    {texto}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        }
                      },
                    })}
                  </div>
                </>
              ) : (
                <p className="text-app-muted font-bold text-center">
                  ✨ "Escudriñad las Escrituras…"
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
    </div>
  );
}
