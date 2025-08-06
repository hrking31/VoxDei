import { useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { database, db } from "../Firebase/Firebase";
import { ref, set } from "firebase/database";

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

const VersiculoViewer = () => {
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState("");
  const [sigla, setSigla] = useState("GEN");
  const [capitulo, setCapitulo] = useState(1);
  const [versiculo, setVersiculo] = useState(1);

  const manejarConsulta = async () => {
    try {
      const data = await obtenerVersiculo(sigla, capitulo, versiculo);
      setResultado(data);
      console.log(data);
      setError("");
    } catch (err) {
      setResultado(null);
      setError(err.message);
    }
  };

  const handleProject = () => {
    set(ref(database, "displayMessage"), {
      text: resultado.texto,
      timestamp: Date.now(),
    });
  };

  return (
    <div className="max-w-xl mx-auto p-8 font-sans">
      <h2 className="text-xl font-bold mb-4">🔎 Consultar versículo</h2>

      <div className="flex flex-wrap gap-2 mb-4">
        <input
          type="text"
          placeholder="Sigla (ej. GEN)"
          value={sigla}
          onChange={(e) => setSigla(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1 w-24"
        />
        <input
          type="number"
          placeholder="Capítulo"
          value={capitulo}
          onChange={(e) => setCapitulo(Number(e.target.value))}
          className="border border-gray-300 rounded px-2 py-1 w-20"
        />
        <input
          type="number"
          placeholder="Versículo"
          value={versiculo}
          onChange={(e) => setVersiculo(Number(e.target.value))}
          className="border border-gray-300 rounded px-2 py-1 w-20"
        />
      </div>

      <div className="flex flex-col gap-2">
        <button
          onClick={manejarConsulta}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded shadow"
        >
          📖 Obtener Versículo
        </button>

      {resultado && (
        <div className="mt-6 p-4 border border-gray-300 rounded-lg bg-white text-black shadow">
          <strong className="block mb-2">
            {resultado.libro} {resultado.capitulo}:{resultado.numero}
          </strong>
          <p>{resultado.texto}</p>
        </div>
      )}
      
              <button
                onClick={handleProject}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded shadow"
              >
                Proyectar
              </button>
            </div>

      {error && <p className="text-red-600 mt-4 font-medium">{error}</p>}
    </div>
  );
};

export default VersiculoViewer;
