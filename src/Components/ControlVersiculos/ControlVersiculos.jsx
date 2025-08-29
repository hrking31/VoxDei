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

  const handleProjectarVersiculo = (versiculo, numero) => {
    const citaCompleta = `${resultado.libro} ${resultado.capitulo}:${numero}`;
    set(ref(database, "displayVersiculo"), {
      text: versiculo,
      cita: citaCompleta,
      display: "versiculo",
      timestamp: Date.now(),
    });
  };

  return (
    <div className="flex flex-col justify-center  gap-4 ">
      <div className="max-w-xl mx-auto p-4 font-sans">
        <div className="flex flex-col gap-4">
          <div className="flex flex-row gap-2">
            <button
              onClick={() => {
                abrirModalConTipo("antiguo");
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Antiguo 
            </button>

            <button
              onClick={() => {
                abrirModalConTipo("nuevo");
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Nuevo
            </button>

            <button
              onClick={() => navigate("/")}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Volver
            </button>
          </div>

          <div className="mt-6 flex justify-center">
            <div className="max-w-xl w-full text-black px-4">
              {resultado ? (
                <>
                  <strong className="block mb-2 text-lg sm:text-xl text-center">
                    {resultado.libro} {resultado.capitulo}
                  </strong>

                  <div className="text-base sm:text-lg leading-relaxed text-justify space-y-2">
                    {parse(resultado.texto, {
                      replace: (domNode) => {
                        if (domNode.name === "p") {
                          const numero =
                            domNode.children[0]?.children?.[0]?.data || null;
                          const texto = domNode.children
                            .slice(1)
                            .map((c) => c.data || c.children?.[0]?.data || "")
                            .join(" ")
                            .trim();

                          return (
                            <div
                              key={`${numero}-${texto}`}
                              onClick={() => {
                                setVersiculoNumero(numero);
                                setVersiculoTexto(texto);
                                handleProjectarVersiculo(texto, numero);
                              }}
                              className={`cursor-pointer rounded-lg px-2 py-2 transition-colors flex ${
                                versiculoNumero === numero &&
                                versiculoTexto === texto
                                  ? "bg-yellow-200 shadow-md"
                                  : "hover:bg-gray-200 active:bg-gray-300"
                              }`}
                            >
                              <span className="w-8 text-right pr-3 font-bold text-gray-700 flex-shrink-0 flex items-center justify-end">
                                {numero}
                              </span>

                              <span className="flex-1 leading-relaxed">
                                {texto}
                              </span>
                            </div>
                          );
                        }
                      },
                    })}
                  </div>
                </>
              ) : (
                <p className="text-gray-500 text-center">
                  "proyección en tiempo real"
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
