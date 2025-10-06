import { useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { database, db } from "../Firebase/Firebase";
import { ref, set } from "firebase/database";
import { TrashIcon } from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";
import { usePredica } from "../../Components/PredicaContext/PredicaContext";
import EmojiButton from "../EmojiButton/EmojiButton";
import LibrosModal from "../LibrosModal/LibrosModal";
import CapituloModal from "../../Components/CapituloModal/CapituloModal";
import VersiculoModal from "../VersiculoModal/VersiculoModal";
import Notificaciones from "../../Components/Notificaciones/Notificaciones";

const obtenerVersiculo = async (sigla, capitulo, numeroVersiculo) => {
  if (!sigla || !capitulo || !numeroVersiculo) {
    throw new Error(
      "❌ Parámetros inválidos. Debes enviar libro, capítulo y versículo."
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
  const navigate = useNavigate();
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
  const [itemSeleccionado, setItemSeleccionado] = useState(null);

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
          className={`"text-2xl font-bold text-center border-b-2 ${
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
            {/* Input de titulo */}
            <div className="grid grid-cols-6 md:grid-cols-12 gap-1 mb-2 ">
              <div className="col-span-4 flex">
                <textarea
                  value={mensaje}
                  onChange={(e) => setMensaje(e.target.value)}
                  placeholder="Escribe un titulo..."
                  className="w-full border text-app-muted border-app-border rounded p-2  resize-none focus:outline-none focus:ring-2 focus:ring-app-main scrollbar-custom text-xs sm:text-sm md:text-base break-words"
                  maxLength={600}
                />
              </div>

              {/* <div className="col-span-1 flex items-center justify-center ">
                <EmojiButton
                  onSelect={(emoji) => setMensaje((prev) => prev + emoji)}
                />
              </div>

              <div className="col-span1 flex items-center justify-center ">
                <button
                  type="button"
                  onClick={() => agregarElemento("mensaje")}
                  className="w-full px-4 py-2 flex items-center justify-center text-center bg-green-500 text-white rounded text-sm sm:text-base break-words"
                  disabled={!mensaje}
                >
                  Agregar
                </button>
              </div> */}

              {/* Input de mensaje */}
              {/* <div className="col-span-4 flex"> */}
              <div className="col-span-6 flex">
                <textarea
                  value={mensaje}
                  onChange={(e) => setMensaje(e.target.value)}
                  placeholder="Escribe tu mensaje..."
                  className="w-full border text-app-muted border-app-border rounded p-2  resize-none focus:outline-none focus:ring-2 focus:ring-app-main scrollbar-custom text-xs sm:text-sm md:text-base break-words"
                  maxLength={600}
                />
              </div>

              <div className="col-span1 col-start-5 row-end-1 md:col-start-auto md:row-end-auto flex items-center justify-center">
                <EmojiButton
                  onSelect={(emoji) => setMensaje((prev) => prev + emoji)}
                />
              </div>

              <div className="col-span1 col-start-6 row-end-1 md:col-start-auto md:row-end-auto flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => agregarElemento("mensaje")}
                  className="w-full px-4 py-2 flex items-center justify-center text-center bg-green-500 text-white rounded text-xs sm:text-sm md:text-base break-words"
                  disabled={!mensaje}
                >
                  Agregar
                </button>
              </div>
            </div>

            {/* Selección de testamento, versículo y slots */}
            <div className="grid grid-cols-6 md:grid-cols-6 lg:grid-cols-6 gap-1 ">
              {/* slots y edicion*/}
              <div className="col-span-4 sm:col-span-6 gap-2 grid grid-cols-3 sm:grid-cols-6 p-0.5">
                {slots.map((ocupado, i) => (
                  <button
                    key={i}
                    onClick={() => handleSlotClick(i)}
                    className={`w-full px-3 py-2 rounded text-white text-xs sm:text-sm md:text-base break-words ${
                      ocupado ? "bg-green-500" : "bg-red-500"
                    }`}
                  >
                    Slot {i + 1}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setEditar(!editar)}
                  disabled={!numSlots}
                  className={`w-full px-3.5 py-1.5 flex items-center justify-center text-center text-xs sm:text-sm md:text-base break-words font-bold rounded border-2 bg-transparent"
             ${
               editar
                 ? "border-app-error text-app-error"
                 : numSlots
                 ? "border-app-main text-app-main"
                 : "border-app-border text-app-border"
             }`}
                >
                  {editar ? `Slots ${numSlots}` : "Editar"}
                </button>
              </div>

              {/* limpiar y salida */}
              <div className="col-span-2 gap-2 grid grid-cols-1 sm:grid-cols-2 p-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setPredicaItems([]);
                    setNumSlots("");
                    setItemSeleccionado(null);
                  }}
                  className="w-full px-3.5 py-1.5 flex items-center justify-center text-center text-xs sm:text-sm md:text-base break-words font-bold text-app-border rounded border-2 bg-transparent hover:text-app-error hover:border-app-error"
                >
                  Limpiar
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/")}
                  className="w-full px-3.5 py-1.5 flex items-center justify-center text-center text-xs sm:text-sm md:text-base break-words font-bold text-app-border rounded border-2 bg-transparent hover:text-app-error hover:border-app-error"
                >
                  Salida
                </button>
              </div>

              {/* Selección de testamento*/}
              <div className="col-span-3 sm:col-span-2 gap-2 grid grid-cols-2 sm:grid-cols-2 p-0.5">
                <button
                  type="button"
                  onClick={() => abrirModalConTipo("antiguo")}
                  className="w-full px-4 py-2 flex items-center justify-center text-center bg-blue-500 text-white rounded flex-1 text-xs sm:text-sm md:text-base break-words"
                >
                  Antiguo
                </button>

                <button
                  type="button"
                  onClick={() => abrirModalConTipo("nuevo")}
                  className="w-full px-4 py-2 flex items-center justify-center text-center bg-blue-500 text-white rounded flex-1 text-xs sm:text-sm md:text-base break-words"
                >
                  Nuevo
                </button>
              </div>

              {/* versiculo y agregar */}
              <div className="col-span-3 sm:col-span-2  gap-2 grid grid-cols-2 sm:grid-cols-2 p-0.5">
                <h2 className="flex items-center justify-center text-center font-bold text-app-muted text-xs sm:text-sm md:text-base break-words">
                  {versiculoTemp.cita || "Versículo Seleccionado"}
                </h2>

                <button
                  type="button"
                  onClick={() => agregarElemento("versiculo")}
                  className="w-full px-4 py-2 flex items-center justify-center text-center bg-green-500 text-white rounded text-xs sm:text-sm md:text-base break-words"
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
            onClick={() => {
              enviarAProyeccion(item);
              setItemSeleccionado(item.timestamp);
            }}
            className={`relative p-3 border-app-border rounded-lg cursor-pointer transition-colors ${
              itemSeleccionado === item.timestamp
                ? "bg-yellow-100 shadow-md"
                : "hover:bg-app-border active:bg-app-light"
            }`}
          >
            <span className="font-bold text-app-main ">
              {index + 1}. {item.tipo === "mensaje" ? "Mensaje" : "Versículo"}:{" "}
            </span>
            <span className="text-app-muted ">
              {item.tipo === "mensaje" ? (
                item.contenido
              ) : (
                <>
                  <span className="font-semibold text-app-muted border-b-2 ">
                    {item.contenido.cita}
                  </span>
                  <br />
                  <span className="text-app-muted">{item.contenido.texto}</span>
                </>
              )}
            </span>

            <button
              type="button"
              onClick={() => {
                setPredicaItems((prev) => prev.filter((_, i) => i !== index));
                // setNumSlots("");
              }}
              className="absolute top-2 right-2  p-1  text-app-border  hover:text-red-600"
            >
              <TrashIcon className="h-6 w-6" />
            </button>
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
