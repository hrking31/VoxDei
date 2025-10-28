import { useState } from "react";
import { database } from "../Firebase/Firebase";
import { ref, set, update } from "firebase/database";
import { TrashIcon } from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";
import {
  handleSlotClick,
  obtenerVersiculo,
} from "../FuncionesControlPredica/FuncionesControlPredica";
import { useAppContext } from "../Context/AppContext";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import EmojiButton from "../EmojiButton/EmojiButton";
import LibrosModal from "../LibrosModal/LibrosModal";
import CapituloModal from "../../Components/CapituloModal/CapituloModal";
import VersiculoModal from "../VersiculoModal/VersiculoModal";
import WhatsAppButton from "../WhatsAppButton/WhatsAppButton";

export default function Predica() {
  const navigate = useNavigate();
  const [libro, setLibro] = useState({
    sigla: null,
    nombre: null,
    capitulo: null,
    versiculo: null,
  });
  const [visible, setVisible] = useState(false);
  const { visibleTitulo, setVisibleTitulo } = useAppContext();
  const { visiblePredica, setVisiblePredica } = useAppContext();
  const [resultado, setResultado] = useState(null);
  const [tipoLibros, setTipoLibros] = useState("antiguo");
  const [modalActivo, setModalActivo] = useState(null);
  const [versiculoTemp, setVersiculoTemp] = useState("");
  const [itemSeleccionado, setItemSeleccionado] = useState(null);
  const [texts, setTexts] = useState({ titulo: "", mensaje: "" });
  const [activeInput, setActiveInput] = useState("1");
  const [cursorPos, setCursorPos] = useState(0);
  const { slots, setSlots } = useAppContext();
  const [editar, setEditar] = useState(false);
  const [numSlots, setNumSlots] = useState("");
  const [predicaItems, setPredicaItems] = useState([]);
  const { showNotif } = useAppContext();

  console.log("mensaje", predicaItems);
    console.log("boleano", !predicaItems?.length);

  const handleChange = (id, value) => {
    setTexts((prev) => ({ ...prev, [id]: value }));
  };

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
    const data = await obtenerVersiculo(
      sigla,
      capitulo,
      versiculo,
      "versiculo",
      showNotif
    );
    if (!data) return;

    setResultado(data);
    setVersiculoTemp({
      cita: `${data.libro} ${data.capitulo}:${data.numero}`,
      texto: data.texto,
    });
  };

  const agregarElemento = (tipo) => {
    // Validar campos
    const hayTitulo = texts.titulo.trim() !== "";
    const hayMensaje = texts.mensaje.trim() !== "";

    // Si el tipo es "versiculo"
    if (tipo === "versiculo") {
      if (!versiculoTemp) return;

      const nuevoVersiculo = {
        tipo: "versiculo",
        contenido: versiculoTemp,
        timestamp: Date.now(),
      };

      setPredicaItems((prev) => [...prev, nuevoVersiculo]);
      setVersiculoTemp("");
      return;
    }
    // Si el tipo es "mensaje", verificar título/mensaje
    if (tipo === "mensaje") {
      if (!hayTitulo && !hayMensaje) return;

      const nuevos = [];
      // Si hay título, lo agrega
      if (hayTitulo) {
        nuevos.push({
          tipo: "titulo",
          contenido: texts.titulo.trim(),
          timestamp: Date.now() + Math.random(),
        });
      }
      // Si hay mensaje, lo agrega
      if (hayMensaje) {
        nuevos.push({
          tipo: "mensaje",
          contenido: texts.mensaje.trim(),
          timestamp: Date.now() + Math.random(),
        });
      }
      // Agregar todo a predicaItems
      setPredicaItems((prev) => [...prev, ...nuevos]);

      // Limpiar ambos campos
      setTexts((prev) => ({ ...prev, titulo: "", mensaje: "" }));
      if (tipo === "versiculo") setVersiculoTemp("");
    }
  };

  const enviarAProyeccion = (elemento) => {
    if (elemento.tipo === "mensaje") {
      set(ref(database, "displayPredica"), {
        text: elemento.contenido,
        display: "predica",
        timestamp: Date.now(),
      });
    } else if (elemento.tipo === "versiculo") {
      set(ref(database, "displayVersiculo"), {
        text: elemento.contenido.texto,
        cita: elemento.contenido.cita,
        display: "versiculo",
        timestamp: Date.now(),
      });
    } else {
      set(ref(database, "displayTitulo"), {
        text: elemento.contenido,
        display: "titulo",
        timestamp: Date.now(),
      });
    }
  };

  const toggleVisibleTitulo = (e) => {
    e.stopPropagation();

    const nuevoEstado = !visibleTitulo;
    setVisibleTitulo(nuevoEstado);

    // Actualiza solo el campo "visible" en Firebase
    update(ref(database, "displayTitulo"), {
      visible: nuevoEstado,
      timestamp: Date.now(),
    });
  };

  const toggleVisible = () => {
    const newValue = !visiblePredica;
    setVisiblePredica(newValue);
    set(ref(database, "displayVisible"), {
      visible: newValue,
      timestamp: Date.now(),
    });
  };

  return (
    <div className="pt-1 mx-auto">
      <div>
        <button
          onClick={() => setVisible(!visible)}
          className={`font-bold text-center ml-2 border-b-2 ${
            visible
              ? "text-app-main border-app-main"
              : "text-app-muted border-app-muted"
          }`}
        >
          Asistente de Prédica
        </button>

        {!visible && (
          <div className="flex justify-center float-right mr-4 gap-6">
            {predicaItems?.length > 0 && (
              <WhatsAppButton message={predicaItems} />
            )}

            <button
              onClick={(e) => toggleVisibleTitulo(e)}
              className="font-semibold text-app-accent transition-all duration-200  "
            >
              {visibleTitulo ? (
                <EyeIcon className="w-8 h-8" />
              ) : (
                <EyeSlashIcon className="w-8 h-8" />
              )}
            </button>

            <button
              onClick={toggleVisible}
              className="font-semibold text-app-main transition-all duration-200  "
            >
              {visiblePredica ? (
                <EyeIcon className="w-8 h-8" />
              ) : (
                <EyeSlashIcon className="w-8 h-8" />
              )}
            </button>
          </div>
        )}
      </div>

      {visible && (
        <>
          {/* agregar elementos */}
          <div className="sticky top-0 shadow-[inset_0_-2px_0_rgba(250,204,21,0.9)] bg-app-light p-2 z-10  ">
            {/* Input de titulo */}
            <div className="grid grid-cols-6 md:grid-cols-12 gap-1 mb-2 ">
              <div className="col-span-4 flex">
                <textarea
                  value={texts.titulo}
                  onFocus={() => setActiveInput("titulo")}
                  onSelect={(e) => setCursorPos(e.target.selectionStart)}
                  onChange={(e) => {
                    setCursorPos(e.target.selectionStart);
                    handleChange("titulo", e.target.value);
                  }}
                  placeholder="Escribe un titulo..."
                  className={`w-full font-bold rounded p-2 resize-none focus:outline-none scrollbar-custom text-xs sm:text-sm md:text-base break-words ${
                    !editar && numSlots
                      ? "bg-transparent border-2 border-app-border text-app-border cursor-not-allowed"
                      : "text-app-muted border-2 border-app-muted focus:outline-none focus:border-transparent focus:ring-2 focus:ring-app-main cursor-pointer"
                  }`}
                  disabled={!editar && numSlots}
                  maxLength={600}
                />
              </div>

              <div className="col-span-6 flex">
                <textarea
                  value={texts.mensaje}
                  onFocus={() => setActiveInput("mensaje")}
                  onSelect={(e) => setCursorPos(e.target.selectionStart)}
                  onChange={(e) => {
                    setCursorPos(e.target.selectionStart);
                    handleChange("mensaje", e.target.value);
                  }}
                  placeholder="Escribe tu mensaje..."
                  className={`w-full font-bold rounded p-2 resize-none focus:outline-none scrollbar-custom text-xs sm:text-sm md:text-base break-words ${
                    !editar && numSlots
                      ? "bg-transparent border-2 border-app-border text-app-border cursor-not-allowed"
                      : "text-app-muted border-2 border-app-muted focus:outline-none focus:border-transparent focus:ring-2 focus:ring-app-main cursor-pointer"
                  }`}
                  disabled={!editar && numSlots}
                  maxLength={600}
                />
              </div>

              <div className="col-start-5 row-end-1 md:col-start-auto md:row-end-auto flex items-center justify-center">
                <EmojiButton
                  onSelect={(emoji) => {
                    // Toma el texto actual del input activo
                    const currentText = texts[activeInput] || "";

                    // Inserta el emoji en la posición del cursor
                    const newText =
                      currentText.slice(0, cursorPos) +
                      emoji +
                      currentText.slice(cursorPos);

                    // Actualiza el texto
                    handleChange(activeInput, newText);

                    // Actualiza la posición del cursor
                    setCursorPos(cursorPos + emoji.length);
                  }}
                  disabled={!editar && numSlots}
                />
              </div>

              <div className="col-start-6 row-end-1 md:col-start-auto md:row-end-auto flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => agregarElemento("mensaje")}
                  className={`w-full px-3.5 py-1.5 flex items-center justify-center text-center rounded text-xs sm:text-sm md:text-xs lg:text-base break-words
    ${
      !texts.titulo && !texts.mensaje
        ? "bg-transparent border-2 border-app-border font-bold text-app-border cursor-not-allowed"
        : "bg-green-500 text-white cursor-pointer"
    }`}
                  disabled={!texts.titulo && !texts.mensaje}
                >
                  Agregar
                </button>
              </div>
            </div>

            {/* Selección de testamento, versículo y slots */}
            <div className="grid grid-cols-6 md:grid-cols-6 lg:grid-cols-6 gap-1 ">
              {/* slots y edicion*/}
              <div className="col-span-4 sm:col-span-6 gap-2 grid grid-cols-3 sm:grid-cols-6 p-0.5">
                {slots.map((ocupado, index) => {
                  const haySlotOcupadoSeleccionado =
                    numSlots !== null && slots[numSlots - 1] === true;

                  const deshabilitado =
                    haySlotOcupadoSeleccionado &&
                    !ocupado &&
                    index + 1 !== numSlots;

                  return (
                    <button
                      key={index}
                      onClick={() => {
                        handleSlotClick({
                          index,
                          slots,
                          editar,
                          predicaItems,
                          setPredicaItems,
                          setSlots,
                          setEditar,
                          setNumSlots,
                          showNotif,
                        });
                        setPredicaItems([]);
                        setVersiculoTemp("");
                        setTexts((prev) => ({
                          ...prev,
                          titulo: "",
                          mensaje: "",
                        }));
                      }}
                      disabled={deshabilitado}
                      className={`w-full px-3 py-2 rounded text-xs sm:text-sm md:text-base break-words ${
                        ocupado
                          ? editar && numSlots === index + 1
                            ? "bg-amber-500"
                            : "bg-blue-500"
                          : "bg-red-500"
                      } ${
                        deshabilitado
                          ? "bg-transparent border-2 border-app-border font-bold text-app-border cursor-not-allowed"
                          : ""
                      }`}
                    >
                      Slot {index + 1}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setEditar(!editar)}
                  disabled={!numSlots || editar}
                  className={`w-full px-3.5 py-1.5 flex items-center justify-center text-center text-xs sm:text-sm md:text-base break-words font-bold rounded border-2 bg-transparent ${
                    numSlots
                      ? editar
                        ? "border-transparent text-amber-500"
                        : "border-app-error text-app-error hover:text-amber-500 hover:border-amber-500 cursor-pointer"
                      : "border-app-border text-app-border cursor-not-allowed"
                  }`}
                >
                  {editar ? "Editando" : "Editar"}
                </button>
              </div>

              {/* limpiar y salida */}
              <div className="col-span-2 gap-2 grid grid-cols-1 sm:grid-cols-2 p-0.5">
                <button
                  type="button"
                  onClick={() => navigate("/")}
                  className="w-full px-3.5 py-1.5 flex items-center justify-center text-center text-xs sm:text-sm md:text-base break-words font-bold text-app-muted rounded inset-shadow-sm inset-shadow-app-muted hover:text-app-error hover:inset-shadow-app-error cursor-pointer"
                >
                  Salida
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    setPredicaItems([]);
                    setNumSlots("");
                    setItemSeleccionado(null);
                    setEditar(false);
                    setVersiculoTemp("");
                    setTexts((prev) => ({
                      ...prev,
                      titulo: "",
                      mensaje: "",
                    }));
                  }}
                  className={`w-full px-3.5 py-1.5 flex items-center justify-center text-center text-xs sm:text-sm md:text-base break-words font-bold rounded border-2 ${
                    !numSlots &&
                    predicaItems.length === 0 &&
                    !texts.titulo &&
                    !texts.mensaje &&
                    !versiculoTemp
                      ? "bg-transparent font-bold text-app-border border-app-border cursor-not-allowed"
                      : "font-bold text-app-error border-app-error"
                  }`}
                  disabled={
                    !numSlots &&
                    predicaItems.length === 0 &&
                    !texts.titulo &&
                    !texts.mensaje &&
                    !versiculoTemp
                  }
                >
                  {editar ? "Cancelar" : numSlots ? "Atras" : "Limpiar"}
                </button>
              </div>

              {/* Selección de testamento*/}
              <div className="col-span-3 sm:col-span-2 gap-2 grid grid-cols-2 sm:grid-cols-2 p-0.5">
                <button
                  type="button"
                  onClick={() => abrirModalConTipo("antiguo")}
                  className={`w-full px-3.5 py-1.5 flex items-center justify-center text-center bg-transparent font-bold rounded border-2 flex-1 text-xs sm:text-sm md:text-base break-words ${
                    !editar && numSlots
                      ? "bg-transparent border-2 border-app-border font-bold text-app-border cursor-not-allowed"
                      : "text-app-muted hover:text-app-main hover:border-app-main cursor-pointer"
                  }`}
                  disabled={!editar && numSlots}
                >
                  Antiguo
                </button>

                <button
                  type="button"
                  onClick={() => abrirModalConTipo("nuevo")}
                  className={`w-full px-3.5 py-1.5 flex items-center justify-center text-center bg-transparent font-bold rounded border-2 flex-1 text-xs sm:text-sm md:text-base break-words ${
                    !editar && numSlots
                      ? "bg-transparent border-2 border-app-border font-bold text-app-border cursor-not-allowed"
                      : "text-app-muted hover:text-app-main hover:border-app-main cursor-pointer"
                  }`}
                  disabled={!editar && numSlots}
                >
                  Nuevo
                </button>
              </div>

              {/* versiculo y agregar */}
              <div className="col-span-3 sm:col-span-2  gap-2 grid grid-cols-2 sm:grid-cols-2 p-0.5">
                <h2
                  className={`flex items-center justify-center text-center font-bold text-xs sm:text-sm md:text-base break-words ${
                    !editar && numSlots ? "text-app-border " : "text-app-muted "
                  }`}
                >
                  {versiculoTemp.cita || "Versículo Seleccionado"}
                </h2>

                <button
                  type="button"
                  onClick={() => agregarElemento("versiculo")}
                  className={`w-full px-3.5 py-1.5 flex items-center justify-center text-center rounded text-xs sm:text-sm md:text-base break-words ${
                    !versiculoTemp
                      ? "bg-transparent border-2 border-app-border font-bold text-app-border cursor-not-allowed"
                      : "bg-green-500 text-white cursor-pointer"
                  }`}
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
        {visible && numSlots && (
          <div className="text-center">
            <h1 className="font-bold text-sm sm:text-lg text-app-main">
              Predica {numSlots}
            </h1>
            <div className="mx-auto mt-1 w-18 sm:w-24 border-b-2 border-app-main"></div>
          </div>
        )}

        {predicaItems.map((item, index) => (
          <div
            key={item.timestamp}
            onClick={() => {
              if (!visible) {
                enviarAProyeccion(item);
                setItemSeleccionado(item.timestamp);
              }
            }}
            className={`group relative p-3 border-app-border rounded-lg cursor-pointer transition-colors ${
              itemSeleccionado === item.timestamp
                ? "bg-yellow-100 shadow-md"
                : "hover:bg-app-border active:bg-app-light"
            }`}
          >
            <span
              className={`font-bold  ${
                item.tipo === "titulo" ? "text-app-accent" : "text-app-main"
              }`}
            >
              {index + 1}.{" "}
              {item.tipo === "mensaje"
                ? "Mensaje"
                : item.tipo === "versiculo"
                ? "Versículo"
                : "Titulo"}
              :{" "}
            </span>
            <span className="text-app-muted ">
              {item.tipo === "mensaje" ? (
                item.contenido
              ) : item.tipo === "versiculo" ? (
                <>
                  <span className="font-semibold text-app-muted border-b-2 ">
                    {item.contenido.cita}
                  </span>
                  <br />
                  <span className="text-app-muted">{item.contenido.texto}</span>
                </>
              ) : (
                <>
                  <span className="font-semibold border-app-accent text-app-muted border-b-2">
                    {item.contenido}
                  </span>
                </>
              )}
            </span>

            {((!editar && !numSlots) || (editar && !!numSlots)) && (
              <button
                type="button"
                onClick={(e) => {
                  setPredicaItems((prev) => prev.filter((_, i) => i !== index));
                  e.stopPropagation();
                  setItemSeleccionado(null);
                }}
                className="absolute top-2 right-2 p-1 text-app-border group-hover:text-red-600"
              >
                <TrashIcon className="h-6 w-6" />
              </button>
            )}
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
    </div>
  );
}
