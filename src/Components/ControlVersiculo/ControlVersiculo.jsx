// import VersiculoViewer from "../Vesiculos/Versiculos";

// export default function ControlVersiculo() {
//   return (
//     <div>
//       <h1 className="text-2xl text-left font-bold p-2">
//         Panel de Control Versiculos
//       </h1>

//       <div className="p-5 max-w-3xl mx-auto">
//         <VersiculoViewer />
//       </div>
//     </div>
//   );
// }
// import React, { useState } from "react";
// import { collection, getDocs } from "firebase/firestore";
// import { db } from "../Firebase/Firebase";

// export default function LibrosUnicos({ onLibrosObtenidos }) {
//   const [libros, setLibros] = useState([]);
//   const [cargando, setCargando] = useState(false);

//   const obtenerLibrosUnicos = async () => {
//     setCargando(true);
//     try {
//       const querySnapshot = await getDocs(collection(db, "biblia"));
//       const todos = querySnapshot.docs.map((doc) => doc.data());

//       const mapa = {};
//       todos.forEach((doc) => {
//         mapa[doc.sigla] = doc.libro;
//       });

//       const unicos = Object.entries(mapa).map(([sigla, nombre]) => ({
//         sigla,
//         nombre,
//       }));

//       setLibros(unicos);
//       if (onLibrosObtenidos) {
//         onLibrosObtenidos(unicos); // Aquí entrega el JSON al padre
//       }
//     } catch (error) {
//       console.error("Error al obtener libros:", error);
//     }
//     setCargando(false);
//   };

//   return (
//     <div className="p-4">
//       <button
//         onClick={obtenerLibrosUnicos}
//         className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
//         disabled={cargando}
//       >
//         {cargando ? "Cargando..." : "Obtener libros únicos"}
//       </button>

//       {libros.length > 0 && (
//         <pre className="mt-4 p-2 bg-gray-100 rounded max-h-64 overflow-auto">
//           {JSON.stringify(libros, null, 2)}
//         </pre>
//       )}
//     </div>
//   );
// }

import { useState } from "react";
import LibrosModal from "../../Components/LibrosModal/LibrosModal";

export default function ControlVersiculo() {
  const [libro, setLibro] = useState(null);
  const [capitulo, setCapitulo] = useState(null);
  const [versiculo, setVersiculo] = useState(null);
  const [modalActivo, setModalActivo] = useState(false);
  const [tipoLibros, setTipoLibros] = useState("antiguo");

  const abrirModalConTipo = (tipo) => {
    setTipoLibros(tipo);
    setModalActivo(true);
  };

    const LibroSeleccionado = (libro) => {
      setLibro(libro);
      setModalActivo(false); 
      console.log("Libro seleccionado:", libro);
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
      {/* {modalActivo === "libro" && (
        <ModalLibro
          onSelect={(libroSeleccionado) => {
            setLibro(libroSeleccionado);
            setModalActivo("capitulo");
          }}
          onClose={() => setModalActivo(null)}
        />
      )}

      {modalActivo === "capitulo" && (
        <ModalCapitulo
          libro={libro}
          onSelect={(capituloSeleccionado) => {
            setCapitulo(capituloSeleccionado);
            setModalActivo("versiculo");
          }}
          onBack={() => setModalActivo("libro")}
          onClose={() => setModalActivo(null)}
        />
      )}

      {modalActivo === "versiculo" && (
        <ModalVersiculo
          libro={libro}
          capitulo={capitulo}
          onSelect={(versiculoSeleccionado) => {
            setVersiculo(versiculoSeleccionado);
            setModalActivo(null); // Cerramos modal al final
          }}
          onBack={() => setModalActivo("capitulo")}
          onClose={() => setModalActivo(null)}
        />
      )} */}
    </div>
  );
}
