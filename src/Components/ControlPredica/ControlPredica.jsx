import { useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { database, db } from "../Firebase/Firebase";
import { ref, set } from "firebase/database";
import EmojiButton from "../EmojiButton/EmojiButton";
import LibrosModal from "../LibrosModal/LibrosModal";
import CapituloModal from "../../Components/CapituloModal/CapituloModal";
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
  const [tipoLibros, setTipoLibros] = useState("antiguo");
  const [modalActivo, setModalActivo] = useState(null);
  const [mensaje, setMensaje] = useState("");
  const [versiculoTemp, setVersiculoTemp] = useState("");
  const [predicaItems, setPredicaItems] = useState([]);

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

      // const citaCompleta = `${data.libro} ${data.capitulo}:${data.numero}`;

      setVersiculoTemp({
        cita: `${data.libro} ${data.capitulo}:${data.numero}`,
        texto: data.texto,
      });
      setError("");
    } catch (err) {
      setResultado(null);
      setError(err.message);
    }
  };

  const agregarElemento = (tipo) => {
    // Validaciones
    if (tipo === "mensaje" && !mensaje) return;
    if (tipo === "versiculo" && !versiculoTemp) return;

    const nuevoElemento = {
      tipo,
      contenido: tipo === "mensaje" ? mensaje : versiculoTemp,
      timestamp: Date.now(),
    };

    // Agregarlo a la lista
    setPredicaItems((prev) => [...prev, nuevoElemento]);

    // Limpiar solo lo que tenga sentido
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
   <div className="p-2 max-w-6xl mx-auto">
     {/* agregar elementos */}
     <div className="sticky top-0 shadow-app-main shadow-md p-4 z-10 bg-app-light">
       <h2 className="text-2xl font-bold text-app-main mb-2 text-center sm:text-left">
         Asistente de Prédica
       </h2>

       {/* Input de mensaje */}
       <div className="flex flex-col sm:flex-row gap-4 mb-2">
         <input
           type="text"
           value={mensaje}
           onChange={(e) => setMensaje(e.target.value)}
           placeholder="Escribe tu mensaje..."
           className="flex-1 p-2 border rounded w-full"
         />

         <div className="flex gap-2 sm:gap-4">
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

       {/* Selección de testamento y versículo */}
       <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center mb-2">
         <button
           type="button"
           onClick={() => abrirModalConTipo("antiguo")}
           className="p-2 bg-blue-500 text-white rounded flex-1 text-left px-4"
         >
           Antiguo Testamento
         </button>

         <button
           type="button"
           onClick={() => abrirModalConTipo("nuevo")}
           className="p-2 bg-blue-500 text-white rounded flex-1 text-left px-4"
         >
           Nuevo Testamento
         </button>

         <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 flex-1">
           <h2 className="text-lg font-bold mb-2 sm:mb-0">
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

     {/* Lista de elementos de la prédica */}
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
   </div>
 );

}
