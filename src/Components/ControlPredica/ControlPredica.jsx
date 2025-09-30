import { useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { database, db } from "../Firebase/Firebase";
import { ref, set } from "firebase/database";
import { TrashIcon } from "@heroicons/react/24/outline";
import EmojiButton from "../EmojiButton/EmojiButton";
import LibrosModal from "../LibrosModal/LibrosModal";
import CapituloModal from "../../Components/CapituloModal/CapituloModal";
import VersiculoModal from "../VersiculoModal/VersiculoModal";
import Notificaciones from "../../Components/Notificaciones/Notificaciones";
import { usePredica } from "../../Components/PredicaContext/PredicaContext";

const obtenerVersiculo = async (sigla, capitulo, numeroVersiculo) => {
      if (!sigla || !capitulo || !numeroVersiculo) {
        throw new Error(
          "❌ Parámetros inválidos. Debes enviar sigla, capítulo y versículo."
        );
      }
    const docId = `${sigla.toUpperCase()}_${capitulo}`;
    const ref = doc(db, "biblia", docId);
    const snapshot = await getDoc(ref);

    if (!snapshot.exists()) {
      throw new Error("❌ Documento no encontrado");
    }

    const data = snapshot.data();
    const texto = data.versiculos?.[numeroVersiculo.toString()];

    if (!texto) {
      throw new Error("🔎 Versículo no encontrado");
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
  const [visible, setVisible] = useState(true);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState("");
  const [tipoLibros, setTipoLibros] = useState("antiguo");
  const [modalActivo, setModalActivo] = useState(null);
  const [mensaje, setMensaje] = useState("");
  const [versiculoTemp, setVersiculoTemp] = useState("");

  const {
    slots,
    editar,
    setEditar,
    numSlots,
    setNumSlots,
    predicaItems,
    setPredicaItems,
    notif,
    setNotif,
    showNotif,
    handleSlotClick,
  } = usePredica();

  const abrirModalConTipo = (tipo) => {
    setTipoLibros(tipo);
    setModalActivo("libro");
  };

  const LibroSeleccionado = (libro) => {
    setLibro(libro);
    setModalActivo("capitulo");
  };

  const CapituloSeleccionado = (capitulo) => {
    setLibro((prev) => ({ ...prev, capitulo }));
    setModalActivo("versiculo");
  };

  const VersiculoSeleccionado = (versiculo) => {
    setLibro((prev) => ({ ...prev, versiculo }));
    consultaVersiculo(libro.sigla, libro.capitulo, versiculo);
    setModalActivo("false");
  };

  const consultaVersiculo = async (sigla, capitulo, versiculo) => {
    try {
      const data = await obtenerVersiculo(sigla, capitulo, versiculo);
      setResultado(data);
      setVersiculoTemp({
        cita: `${data.libro} ${data.capitulo}:${data.numero}`,
        texto: data.texto,
      });
      setError(null);
    } catch (error) {
      console.error("Error en consultaVersiculo:", error.message);
      setResultado(null);
      setError(error.message);
      showNotif("warning", error.message);
    }
  };

  const agregarElemento = (tipo) => {
    if (tipo === "mensaje" && !mensaje) return;
    if (tipo === "versiculo" && !versiculoTemp) return;

    const nuevoElemento = {
      tipo,
      contenido: tipo === "mensaje" ? mensaje : versiculoTemp,
      timestamp: Date.now(),
    };

    setPredicaItems((prev) => [...prev, nuevoElemento]);

    if (tipo === "mensaje") setMensaje("");
    if (tipo === "versiculo") setVersiculoTemp("");
  };

  const enviarAProyeccion = (elemento) => {
    if (elemento.tipo === "mensaje") {
      set(ref(database, "displayMessage"), {
        text: elemento.contenido,
        display: "mensaje",
        timestamp: Date.now(),
      });
    } else if (elemento.tipo === "versiculo") {
      set(ref(database, "displayVersiculo"), {
        text: elemento.contenido.texto,
        cita: elemento.contenido.cita,
        display: "versiculo",
        timestamp: Date.now(),
      });
    }
  };

  return (
    <div className="px-2 pt-1 mx-auto">
      <div>
        <button
          onClick={() => setVisible(!visible)}
          className={`"text-2xl font-bold text-center  border-b-2 ${
            visible
              ? "text-app-main border-app-main"
              : "text-app-border border-app-border"
          }`}
        >
          Asistente de Prédica
        </button>
      </div>

      {visible && (
        <>
          {/* agregar elementos */}
          <div className="sticky top-0 shadow-app-main shadow-md p-2 z-10 bg-app-light ">
            {/* Input de mensaje */}
            <div className="flex flex-col sm:flex-row gap-4 mb-2 ">
              <textarea
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                placeholder="Escribe tu mensaje..."
                className="w-full border text-app-muted border-app-border rounded p-2  resize-none focus:outline-none focus:ring-2 focus:ring-app-main scrollbar-custom"
                maxLength={600}
              />

              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
                <EmojiButton
                  onSelect={(emoji) => setMensaje((prev) => prev + emoji)}
                />

                <button
                  type="button"
                  onClick={() => agregarElemento("mensaje")}
                  className="px-4 py-2 bg-green-500 text-white rounded w-full sm:w-auto"
                  disabled={!mensaje}
                >
                  Agregar
                </button>
              </div>
            </div>

            {/* Selección de testamento, versículo y slots */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center ">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center ">
                <h2 className="flex items-center justify-center text-center font-bold text-app-muted">
                  Predica {numSlots}
                </h2>

                <div className="flex gap-2">
                  {slots.map((ocupado, i) => (
                    <button
                      key={i}
                      onClick={() => handleSlotClick(i)}
                      className={`px-4 py-2 rounded text-white ${
                        ocupado ? "bg-green-500" : "bg-red-500"
                      }`}
                    >
                      Slot {i + 1}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => setEditar(true)}
                    disabled={!numSlots}
                    className={`px-3.5 py-1.5 rounded border-2 bg-transparent
                ${
                  numSlots
                    ? "border-app- main text-app-main"
                    : "border-app-border text-app-border"
                }`}
                  >
                    {editar ? `Slots ${numSlots}` : "Editar"}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setPredicaItems([]);
                    setNumSlots("");
                  }}
                  className="p-1  text-app-border  hover:text-red-600"
                >
                  <TrashIcon className="h-6 w-6" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => abrirModalConTipo("antiguo")}
                className="p-2 bg-blue-500 text-white rounded flex-1  px-4"
              >
                Antiguo
              </button>

              <button
                type="button"
                onClick={() => abrirModalConTipo("nuevo")}
                className="p-2 bg-blue-500 text-white rounded flex-1  px-4"
              >
                Nuevo
              </button>

              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 flex-1">
                <h2 className="w-64 h-12 flex items-center justify-center text-center font-bold text-app-muted">
                  {versiculoTemp.cita || "Versículo Seleccionado"}
                </h2>

                <button
                  type="button"
                  onClick={() => agregarElemento("versiculo")}
                  className="px-4 py-2 bg-green-500 text-white rounded w-full sm:w-auto"
                  disabled={!versiculoTemp}
                >
                  Agregar
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Lista de elementos */}
      <div className="space-y-2 mt-2">
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
                  <span className="font-semibold">{item.contenido.cita}</span>
                  <br />
                  <span className="text-gray-600">{item.contenido.texto}</span>
                </>
              )}
            </span>
          </div>
        ))}
      </div>

      {/* Modales */}
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

      {/* Notificaciones */}
      <Notificaciones
        open={notif.open}
        type={notif.type}
        message={notif.message}
        onClose={() => setNotif({ ...notif, open: false })}
      />
    </div>
  );
}
