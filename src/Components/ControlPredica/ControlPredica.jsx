import { useState } from "react";
import { addDoc, collection } from "firebase/firestore";
import { db } from "../Firebase/Firebase";
import VersiculoModal from "../VersiculoModal/VersiculoModal";
import LibrosModal from "../LibrosModal/LibrosModal";
import TodoCapituloModal from "../TodoCapituloModal/TodoCapituloModal";
import { librosAntiguo, librosNuevo } from "../LibrosBiblia/LibrosBiblia";

export default function Predica() {
  const [predicaItems, setPredicaItems] = useState([]);
  const [tipo, setTipo] = useState("mensaje"); // 'mensaje' o 'versiculo'
  const [mensaje, setMensaje] = useState("");
  const [modalAbierto, setModalAbierto] = useState("");
  const [testamentoSeleccionado, setTestamentoSeleccionado] =
    useState("antiguo");
  const [libroSeleccionado, setLibroSeleccionado] = useState(null);
  const [capituloSeleccionado, setCapituloSeleccionado] = useState(null);
  const [versiculoTemp, setVersiculoTemp] = useState("");

  const agregarElemento = async (e) => {
    e.preventDefault();
    if (!mensaje && tipo === "mensaje") return;
    if (!versiculoTemp && tipo === "versiculo") return;

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
    setTestamentoSeleccionado("antiguo");
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
            <input
              type="text"
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              placeholder="Escribe tu mensaje..."
              className="flex-1 p-2 border rounded"
            />
          ) : (
            <button
              type="button"
              onClick={() => setModalAbierto("libros")}
              className="p-2 bg-blue-500 text-white rounded flex-1 text-left px-4"
            >
              {versiculoTemp || "Seleccionar Versículo"}
            </button>
          )}

          {tipo === "versiculo" && (
            <select
              value={testamentoSeleccionado}
              onChange={(e) => setTestamentoSeleccionado(e.target.value)}
              className="p-2 border rounded"
            >
              <option value="antiguo">Antiguo Testamento</option>
              <option value="nuevo">Nuevo Testamento</option>
            </select>
          )}

          <button
            type="submit"
            className="px-4 py-2 bg-green-500 text-white rounded"
            disabled={
              (tipo === "mensaje" && !mensaje) ||
              (tipo === "versiculo" && !versiculoTemp)
            }
          >
            Agregar
          </button>
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
        open={modalAbierto === "libros" ? "libro" : ""}
        onClose={() => setModalAbierto("")}
        tipo={testamentoSeleccionado}
        onLibro={handleLibroSelect}
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
