import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { database, db } from "../Firebase/Firebase";
import { ref, set } from "firebase/database";
import LibrosModal from "../../Components/LibrosModal/LibrosModal";
import CapituloModal from "../../Components/CapituloModal/CapituloModal";
import VersiculoModal from "../../Components/VersiculoModal/VersiculoModal";
import VersiculoFinalModal from "../../Components/VersiculoFinalModal/VersiculoFinalModal";

const obtenerVersiculo = async (sigla, capitulo, numeroVersiculo) => {
  const docId = `${sigla.toUpperCase()}_${capitulo}`;
  const ref = doc(db, "biblia", docId);
  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) {
    throw new Error("❌ Documento no encontrado");
  }

  const data = snapshot.data();
  const texto = data.versiculos?.[numeroVersiculo.toString()];

  if (!texto) {
    throw new Error("⚠️ Versículo no encontrado");
  }

  return {
    texto,
    libro: data.libro,
    capitulo: data.capitulo,
    numero: numeroVersiculo,
  };
};

const obtenerVersiculos = async (
  sigla,
  capitulo,
  versiculoInicial,
  versiculoFinal
) => {
  const docId = `${sigla.toUpperCase()}_${capitulo}`;
  const refDoc = doc(db, "biblia", docId);
  const snapshot = await getDoc(refDoc);

  if (!snapshot.exists()) {
    throw new Error("❌ Documento no encontrado");
  }

  const data = snapshot.data();
  const versiculos = [];

  for (let i = versiculoInicial; i <= versiculoFinal; i++) {
    const texto = data.versiculos?.[i.toString()];
    if (!texto) {
      throw new Error(`⚠️ Versículo ${i} no encontrado`);
    }
    versiculos.push(`${i}. ${texto}`);
  }

  const textoCompleto = versiculos.join(" ");

  return {
    texto: textoCompleto,
    libro: data.libro,
    capitulo: data.capitulo,
    rango: `${versiculoInicial}-${versiculoFinal}`,
  };
};

export default function ControlVersiculo() {
  const [libro, setLibro] = useState({
    sigla: null,
    nombre: null,
    capitulos: null,
    capitulo: null,
    versiculo: null,
    versiculoFinal: null,
  });
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState("");
  const [modalActivo, setModalActivo] = useState(null);
  const [tipoLibros, setTipoLibros] = useState("antiguo");
  const [tipoConsulta, setTipoConsulta] = useState(null);
  const [velocidad, setVelocidad] = useState(10);

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
    {
      tipoConsulta ? setModalActivo("versiculoFinal") : setModalActivo("false");
    }
  };

  const VersiculoFinalSeleccionado = (versiculo) => {
    setLibro((prevLibro) => ({
      ...prevLibro,
      versiculoFinal: versiculo,
    }));
    consultaVersiculos(libro.sigla, libro.capitulo, libro.versiculo, versiculo);
    setModalActivo("false");
  };

  const consultaVersiculo = async (sigla, capitulo, versiculo) => {
    try {
      const data = await obtenerVersiculo(sigla, capitulo, versiculo);
      setResultado(data);
      setError("");
    } catch (err) {
      setResultado(null);
      setError(err.message);
    }
  };

  const consultaVersiculos = async (
    sigla,
    capitulo,
    versiculo,
    versiculoFinal
  ) => {
    try {
      const data = await obtenerVersiculos(
        sigla,
        capitulo,
        versiculo,
        versiculoFinal
      );
      setResultado(data);
      setError("");
    } catch (err) {
      setResultado(null);
      setError(err.message);
    }
  };

  const handleProjectar = () => {
    const citaCompleta = `${resultado.libro} ${resultado.capitulo}:${
      resultado.numero || resultado.rango
    }`;
    set(ref(database, "displayVersiculo"), {
      text: resultado.texto,
      cita: citaCompleta,
      display: "versiculo",
      timestamp: Date.now(),
    });
  };

  const configSpeed = (nuevoValor) => {
    setVelocidad(nuevoValor);
    set(ref(database, "speedVersiculo"), {
      velocidad: nuevoValor,
    });
  };

  return (
    <div className="flex flex-col justify-center  gap-4 p-4">
      <div className="max-w-xl mx-auto p-8 font-sans">
        <h2 className="text-xl font-bold mb-4">🔎 Consultar un versículo</h2>

        <div className="flex flex-row gap-2">
          <button
            onClick={() => {
              abrirModalConTipo("antiguo");
              setTipoConsulta(false);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Antiguo Testamento
          </button>

          <button
            onClick={() => {
              abrirModalConTipo("nuevo");
              setTipoConsulta(false);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Nuevo Testamento
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div className="mt-6 p-4 border border-gray-300 rounded-lg bg-white text-black shadow min-h-[6rem]">
            {resultado && !tipoConsulta ? (
              <>
                <strong className="block mb-2">
                  {resultado.libro} {resultado.capitulo}:{resultado.numero}
                </strong>
                <p>{resultado.texto}</p>
              </>
            ) : (
              <p className="text-gray-500">Selecciona un versículo.</p>
            )}
          </div>

          <button
            onClick={handleProjectar}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded shadow"
          >
            Proyectar
          </button>
        </div>

        {error && <p className="text-red-600 mt-4 font-medium">{error}</p>}
      </div>

      <div className="max-w-xl mx-auto p-8 font-sans">
        <h2 className="text-xl font-bold mb-4">
          🔎 Consultar varios versículo
        </h2>

        <div className="flex flex-row gap-2">
          <button
            onClick={() => {
              abrirModalConTipo("antiguo");
              setTipoConsulta(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Antiguo Testamento
          </button>

          <button
            onClick={() => {
              abrirModalConTipo("nuevo");
              setTipoConsulta(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Nuevo Testamento
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div className="mt-6 p-4 border border-gray-300 rounded-lg bg-white text-black shadow min-h-[6rem]">
            {resultado && tipoConsulta ? (
              <>
                <strong className="block mb-2">
                  {resultado.libro} {resultado.capitulo}:{resultado.rango}
                </strong>
                <p>{resultado.texto}</p>
              </>
            ) : (
              <p className="text-gray-500">
                Selecciona versículo inicial y final.
              </p>
            )}
          </div>

          <button
            onClick={handleProjectar}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded shadow"
          >
            Proyectar
          </button>

          <div className="flex items-center space-x-2">
            <label className="text-black">Velocidad lectura</label>
            <input
              type="range"
              min="10"
              max="50"
              value={velocidad}
              onChange={(e) => configSpeed(Number(e.target.value))}
              className="w-48 accent-blue-500"
            />
            <span className="text-black">{velocidad}s</span>
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

      <VersiculoFinalModal
        open={modalActivo}
        onClose={() => setModalActivo(false)}
        selecLibro={libro}
        onVersiculo={VersiculoFinalSeleccionado}
      />
    </div>
  );
}
