import { useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { database, db } from "../Firebase/Firebase";
import { ref, set } from "firebase/database";
import LibrosModal from "../LibrosModal/LibrosModal";
import CapituloModal from "../../Components/CapituloModal/CapituloModal";
import TodoCapituloModal from "../TodoCapituloModal/TodoCapituloModal";
import VersiculoModal from "../VersiculoModal/VersiculoModal";

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

export default function Predica() {
  const [libro, setLibro] = useState({
    sigla: null,
    nombre: null,
    capitulo: null,
    versiculo: null,
  });
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState("");
  const [tabValue, setTabValue] = useState(0);
  const [tipoLibros, setTipoLibros] = useState("antiguo");
  const [modalActivo, setModalActivo] = useState(null);

  const [predicaItems, setPredicaItems] = useState([]);
  const [tipo, setTipo] = useState("mensaje"); // 'mensaje' o 'versiculo'
  const [mensaje, setMensaje] = useState("");
  const [modalAbierto, setModalAbierto] = useState("");
  const [testamentoSeleccionado, setTestamentoSeleccionado] =
    useState("antiguo");
  const [libroSeleccionado, setLibroSeleccionado] = useState(null);
  const [capituloSeleccionado, setCapituloSeleccionado] = useState(null);
  const [versiculoTemp, setVersiculoTemp] = useState("");
  const [versiculoNuevo, setVersiculoNuevo] = useState("");
  const [versiculoAntiguo, setVersiculoAntiguo] = useState("");

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
      setResultado(data);
      setError("");
    } catch (err) {
      setResultado(null);
      setError(err.message);
    }
  };


  const agregarElemento = async (e) => {
    e.preventDefault();
    if (!mensaje && tipo === "mensaje") return;
    if (!versiculoAntiguo && tipo === "versiculo") return;
    if (!versiculoNuevo && tipo === "versiculo") return;

    const nuevoElemento = {
      tipo: tipo,
      contenido: tipo === "mensaje" ? mensaje : versiculoTemp,
      timestamp: Date.now(),
      libro: tipo === "versiculo" ? libroSeleccionado.nombre : null,
      capitulo: tipo === "versiculo" ? capituloSeleccionado : null,
      versiculo: tipo === "versiculo" ? versiculoTemp.split(":")[1] : null,
      texto:
        tipo === "versiculo"
          ? libroSeleccionado[`capitulo${capituloSeleccionado}`][
              parseInt(versiculoTemp.split(":")[1]) - 1
            ]
          : null,
    };

    setPredicaItems([...predicaItems, nuevoElemento]);
    setMensaje("");
    setVersiculoTemp("");
    setLibroSeleccionado(null);
    setCapituloSeleccionado(null);
  };

  const handleLibroSelect = (libro) => {
    setLibroSeleccionado(libro);
    setModalAbierto("capitulo");
  };

  const handleCapituloSelect = (capitulo) => {
    setCapituloSeleccionado(capitulo);
    setModalAbierto("versiculo");
  };

  const handleVersiculoSelect = (versiculo) => {
    if (libroSeleccionado && capituloSeleccionado) {
      const versiculoCompleto = `${libroSeleccionado.nombre} ${capituloSeleccionado}:${versiculo}`;
      setVersiculoTemp(versiculoCompleto);
      setModalAbierto("");
    }
    const versiculoCompleto = `${libroSeleccionado.nombre} ${capituloSeleccionado}:${versiculo}`;
    setVersiculoTemp(versiculoCompleto);
    setModalAbierto("");
  };

  const enviarAProyeccion = async (elemento) => {
    try {
      if (elemento.tipo === "mensaje") {
        await addDoc(collection(db, "mensaje"), {
          mensaje: elemento.contenido,
          timestamp: Date.now(),
        });
      } else if (elemento.tipo === "versiculo") {
        await addDoc(collection(db, "versiculo"), {
          libro: elemento.libro,
          capitulo: elemento.capitulo,
          versiculo: parseInt(elemento.versiculo),
          texto: elemento.texto,
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      console.error("Error al enviar a proyección:", error);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Asistente de Prédica</h2>

      {/* Formulario para agregar elementos */}
      <form onSubmit={agregarElemento} className="mb-4">
        <div className="flex gap-4 mb-4">
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="p-2 border rounded"
          >
            <option value="mensaje">Mensaje</option>
            <option value="versiculo">Versículo</option>
          </select>

          {tipo === "mensaje" ? (
            <>
              <input
                type="text"
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                placeholder="Escribe tu mensaje..."
                className="flex-1 p-2 border rounded"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-green-500 text-white rounded"
                disabled={tipo === "mensaje" && !mensaje}
              >
                Agregar
              </button>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold mb-4">Antiguo Testamento</h2>

              <button
                type="button"
                onClick={() => {
                  abrirModalConTipo("antiguo");
                }}
                className="p-2 bg-blue-500 text-white rounded flex-1 text-left px-4"
              >
                {versiculoAntiguo || "Seleccionar Versículo"}
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-green-500 text-white rounded"
                // disabled={
                //   (tipo === "mensaje" && !mensaje) ||
                //   (tipo === "versiculo" && !versiculoTemp)
                // }
              >
                Agregar
              </button>

              <h2 className="text-2xl font-bold mb-4">Nuevo Testamento</h2>

              <button
                type="button"
                onClick={() => {
                  abrirModalConTipo("nuevo");
                }}
                className="p-2 bg-blue-500 text-white rounded flex-1 text-left px-4"
              >
                {versiculoNuevo || "Seleccionar Versículo"}
              </button>

              <button
                type="submit"
                className="px-4 py-2 bg-green-500 text-white rounded"
                // disabled={
                //   (tipo === "mensaje" && !mensaje) ||
                //   (tipo === "versiculo" && !versiculoTemp)
                // }
              >
                Agregar
              </button>
            </>
          )}
        </div>
      </form>

      {/* Lista de elementos de la prédica */}
      <div className="space-y-2">
        {predicaItems.map((item, index) => (
          <div
            key={item.timestamp}
            onClick={() => enviarAProyeccion(item)}
            className="p-3 border rounded cursor-pointer hover:bg-gray-100"
          >
            <span className="font-bold">
              {index + 1}. {item.tipo === "mensaje" ? "Mensaje" : "Versículo"}:{" "}
            </span>
            <span>
              {item.tipo === "mensaje" ? (
                item.contenido
              ) : (
                <>
                  <span className="font-semibold">{item.contenido}</span>
                  <br />
                  <span className="text-gray-600">{item.texto}</span>
                </>
              )}
            </span>
          </div>
        ))}
      </div>

      {/* Modales para selección de versículos */}
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

      <TodoCapituloModal
        open={modalAbierto === "capitulo" ? "todoCapitulo" : ""}
        onClose={() => setModalAbierto("")}
        selecLibro={libroSeleccionado}
        onCapitulo={handleCapituloSelect}
      />

      <VersiculoModal
        open={modalAbierto === "versiculo" ? "versiculo" : ""}
        onClose={() => setModalAbierto("")}
        selecLibro={{ ...libroSeleccionado, capitulo: capituloSeleccionado }}
        onVersiculo={handleVersiculoSelect}
      />
    </div>
  );
}
