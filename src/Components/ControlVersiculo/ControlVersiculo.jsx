import { useState, useEffect } from "react";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "../Firebase/Firebase";
import LibrosModal from "../../Components/LibrosModal/LibrosModal";
import CapituloModal from "../../Components/CapituloModal/CapituloModal";
import VersiculoModal from "../../Components/VersiculoModal/VersiculoModal";

export default function ControlVersiculo() {
  const [libro, setLibro] = useState({
    sigla: null,
    nombre: null,
    capitulos: null,
    versiculo: null,
  });
  const [capitulo, setCapitulo] = useState(null);
  const [versiculo, setVersiculo] = useState(null);
  const [modalActivo, setModalActivo] = useState(null);
  const [tipoLibros, setTipoLibros] = useState("antiguo");

  const abrirModalConTipo = (tipo) => {
    setTipoLibros(tipo);
    setModalActivo("libro");
  };

  const LibroSeleccionado = (libro) => {
    setLibro(libro);
    setModalActivo("capitulo");
  };
  console.log("todo el libro:", libro);

  const CapituloSeleccionado = (capitulo) => {
    setCapitulo(capitulo);
    setLibro((prevLibro) => ({
      ...prevLibro,
      capitulos: capitulo,
    }));
    setModalActivo("versiculo");
  };
  console.log("capitulo seleccionado:", capitulo);
  console.log("estado modal:", modalActivo);

  const VersiculoSeleccionado = (versiculo) => {
    setVersiculo(capitulo);
    setModalActivo("false");
  };
  return (
    <div className="flex  justify-center  gap-4 p-4">
      <button
        onClick={() => abrirModalConTipo("antiguo")}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        Antiguo Testamento
      </button>

      <button
        onClick={() => abrirModalConTipo("nuevo")}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        Nuevo Testamento
      </button>

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
