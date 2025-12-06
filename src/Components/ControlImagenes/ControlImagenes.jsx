import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ref as dbRef, set as dbSet } from "firebase/database";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { database, storage, db } from "../../Components/Firebase/Firebase.js";
import { useAuth } from "../../Components/Context/AuthContext";

export default function ControlImagenes() {
  const navigate = useNavigate();
  const { userData } = useAuth();

  // Estados para selección y previews locales
  const [selectedFiles, setSelectedFiles] = useState([]); // File objects pendientes de subir
  const [localPreviews, setLocalPreviews] = useState([]); // objectURLs para previsualizar
  const [loading, setLoading] = useState(false);
  const [intervalo, setIntervalo] = useState(5); // segundos
  const [savedImages, setSavedImages] = useState([]); // imágenes ya guardadas en Firestore
  const [error, setError] = useState("");

  // --- Helpers para seleccionar archivos / carpetas ---
  const handleFilesInput = (e) => {
    const archivos = Array.from(e.target.files || []).filter((f) =>
      f.type.startsWith("image/")
    );
    if (archivos.length === 0) {
      setError("No se seleccionaron imágenes válidas.");
      return;
    }
    setError("");
    setSelectedFiles(archivos);
    createLocalPreviews(archivos);
  };

  // selector tipo carpeta (webkitdirectory)
  const handleFolderInput = (e) => {
    // e.target.files contiene todos los archivos dentro de la carpeta (recursivo en Chrome)
    const archivos = Array.from(e.target.files || []).filter((f) =>
      f.type.startsWith("image/")
    );
    if (archivos.length === 0) {
      setError("La carpeta no contiene imágenes válidas.");
      return;
    }
    setError("");
    setSelectedFiles(archivos);
    createLocalPreviews(archivos);
  };

  const createLocalPreviews = (files) => {
    // limpiamos previos objectURLs
    localPreviews.forEach((url) => URL.revokeObjectURL(url));
    const thumbs = files.map((file) => URL.createObjectURL(file));
    setLocalPreviews(thumbs);
  };

  useEffect(() => {
    // cleanup on unmount
    return () => {
      localPreviews.forEach((url) => URL.revokeObjectURL(url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Escuchar imágenes ya guardadas en Firestore para mostrar miniaturas individuales ---
  useEffect(() => {
    if (!userData?.groupId) return;

    const q = query(
      collection(db, "imagenes"),
      where("groupId", "==", userData.groupId),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const imgs = [];
        snap.forEach((doc) => {
          imgs.push({ id: doc.id, ...doc.data() });
        });
        setSavedImages(imgs);
      },
      (err) => {
        console.error("Error al obtener imágenes guardadas:", err);
      }
    );

    return () => unsub();
  }, [userData]);

  // --- Subir archivos seleccionados a Storage y guardar URL en Firestore ---
  const uploadAndSave = async (filesToUpload) => {
    if (!filesToUpload || filesToUpload.length === 0) return [];

    const uploadedUrls = [];
    for (const file of filesToUpload) {
      // ruta por groupId + timestamp + nombre
      const path = `imagenes/${userData.groupId}/${Date.now()}-${file.name}`;
      const sRef = storageRef(storage, path);

      await uploadBytes(sRef, file);
      const url = await getDownloadURL(sRef);

      // guardar documento individual en Firestore
      await addDoc(collection(db, "imagenes"), {
        groupId: userData.groupId,
        url,
        name: file.name,
        storagePath: path,
        createdAt: serverTimestamp(),
      });

      uploadedUrls.push(url);
    }
    return uploadedUrls;
  };

  // --- Acciones de botones ---
  const handleGuardar = async () => {
    if (selectedFiles.length === 0) {
      setError("Selecciona al menos una imagen para guardar.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await uploadAndSave(selectedFiles);
      // limpiar selección local
      setSelectedFiles([]);
      localPreviews.forEach((url) => URL.revokeObjectURL(url));
      setLocalPreviews([]);
      alert("✅ Imágenes guardadas correctamente.");
    } catch (err) {
      console.error(err);
      alert("❌ Error al guardar imágenes.");
    } finally {
      setLoading(false);
    }
  };

  // Proyecta las imágenes seleccionadas (si están sin subir, las sube primero)
  const handleProyectarSeleccionadas = async () => {
    if (selectedFiles.length === 0) {
      alert(
        "Selecciona imágenes para proyectar o usa las miniaturas guardadas."
      );
      return;
    }
    setLoading(true);
    try {
      // subir primero para obtener URLs
      const urls = await uploadAndSave(selectedFiles);

      // enviar a Realtime DB para el viewer (carousel)
      await dbSet(dbRef(database, `displayImage/${userData.groupId}`), {
        type: "carousel",
        images: urls,
        interval: Number(intervalo || 5) * 1000,
        timestamp: Date.now(),
      });

      // limpiar selección local
      setSelectedFiles([]);
      localPreviews.forEach((url) => URL.revokeObjectURL(url));
      setLocalPreviews([]);
      alert("✅ Carrusel proyectado correctamente.");
    } catch (err) {
      console.error("Error al proyectar:", err);
      alert("❌ Error al proyectar imágenes.");
    } finally {
      setLoading(false);
    }
  };

  // Proyectar una imagen guardada (miniatura)
  const handleProyectarGuardada = async (img) => {
    try {
      await dbSet(dbRef(database, `displayImage/${userData.groupId}`), {
        type: "single",
        image: img.url,
        interval: Number(intervalo || 5) * 1000,
        timestamp: Date.now(),
      });
    } catch (err) {
      console.error("Error al proyectar imagen guardada:", err);
      alert("❌ Error al proyectar la imagen.");
    }
  };

  // Opcional: eliminar imagen guardada (si quieres exponer esa opción)
  const handleEliminarGuardada = async (img) => {
    if (!img?.storagePath) return;
    const confirm = window.confirm("¿Eliminar esta imagen permanentemente?");
    if (!confirm) return;
    try {
      const sRef = storageRef(storage, img.storagePath);
      await deleteObject(sRef); // borra del storage
      // Nota: no borramos el doc de Firestore aquí; podrías hacerlo con deleteDoc si lo deseas.
      alert(
        "Imagen eliminada del storage (actualiza Firestore si quieres eliminar el documento)."
      );
    } catch (err) {
      console.error("Error eliminando:", err);
      alert("No se pudo eliminar la imagen.");
    }
  };

  return (
    <div>
      <h1 className="text-2xl text-left font-bold text-app-main p-2">
        Panel de Control de Imágenes
      </h1>

      {/* CONTROLES: elegir archivos o carpeta */}
      <div className="grid grid-cols-12 gap-2 p-2">
        <div className="col-span-12 md:col-span-6 flex flex-col">
          <label className="text-app-muted mb-1 font-bold">
            Seleccionar imágenes (una o varias)
          </label>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleFilesInput}
            className="border border-app-border p-1 rounded text-sm"
          />
          <p className="text-xs text-app-muted mt-1">
            Puedes seleccionar múltiples archivos. (Desktop & móviles
            compatibles)
          </p>
        </div>

        <div className="col-span-12 md:col-span-6 flex flex-col">
          <label className="text-app-muted mb-1 font-bold">
            Seleccionar carpeta (Chrome/Edge en desktop)
          </label>
          <input
            type="file"
            webkitdirectory="true"
            directory="true"
            multiple
            accept="image/*"
            onChange={handleFolderInput}
            className="border border-app-border p-1 rounded text-sm"
          />
          <p className="text-xs text-app-muted mt-1">
            Permite escoger carpetas completas en navegadores que lo soporten.
          </p>
        </div>

        {/* intervalo */}
        <div className="col-span-12 md:col-span-4 mt-2">
          <label className="text-app-muted mb-1 font-bold">
            Tiempo por imagen (segundos)
          </label>
          <input
            type="number"
            min={1}
            value={intervalo}
            onChange={(e) => setIntervalo(Number(e.target.value))}
            className="border border-app-border p-1 rounded text-sm w-28"
          />
        </div>
      </div>

      {/* BOTONES */}
      <div className="grid grid-cols-12 p-2">
        <div className="col-span-12 sm:col-span-10 flex gap-2">
          <button
            onClick={handleGuardar}
            disabled={loading || selectedFiles.length === 0}
            className={`w-full py-2 rounded text-white ${
              loading || selectedFiles.length === 0
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-green-500"
            }`}
          >
            Guardar imágenes
          </button>

          <button
            onClick={handleProyectarSeleccionadas}
            disabled={loading || selectedFiles.length === 0}
            className={`w-full py-2 rounded text-white ${
              loading || selectedFiles.length === 0
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-500"
            }`}
          >
            Proyectar selección
          </button>

          <button
            onClick={() => navigate("/ViewGestion")}
            className="w-full py-2 boton-salida"
          >
            Salida
          </button>
        </div>
      </div>

      {/* PREVIEWS LOCALES (archivos seleccionados antes de guardar) */}
      {localPreviews.length > 0 && (
        <div className="p-2">
          <h3 className="font-bold text-app-main mb-2">Previsualización</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
            {localPreviews.map((src, i) => (
              <div
                key={i}
                className="border border-app-border p-1 rounded shadow-sm"
              >
                <img
                  src={src}
                  alt={`preview-${i}`}
                  className="w-full h-28 object-cover rounded"
                />
                <p className="text-xs text-app-muted truncate mt-1">
                  {selectedFiles[i]?.name}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MINIATURAS DE IMÁGENES GUARDADAS (cada imagen por separado) */}
      <div className="p-2">
        <h3 className="font-bold text-app-main mb-2">Imágenes guardadas</h3>

        {savedImages.length === 0 ? (
          <p className="text-app-muted">No hay imágenes guardadas aún.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {savedImages.map((img) => (
              <div
                key={img.id}
                className="relative border border-app-border rounded-lg p-1 cursor-pointer hover:shadow-md"
              >
                <img
                  src={img.url}
                  alt={img.name}
                  className="w-full h-40 object-cover rounded"
                  onClick={() => handleProyectarGuardada(img)}
                />

                <div className="flex justify-between items-center mt-1">
                  <p className="text-xs text-app-muted truncate">{img.name}</p>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleProyectarGuardada(img)}
                      className="text-xs px-2 py-1 rounded bg-blue-500 text-white"
                    >
                      Proyectar
                    </button>
                    <button
                      onClick={() => handleEliminarGuardada(img)}
                      className="text-xs px-2 py-1 rounded bg-transparent border border-app-border text-app-muted"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && <p className="text-sm text-app-error p-2">{error}</p>}
    </div>
  );
}

// import React, { useEffect, useState } from "react";

// export default function ProjectorView() {
//   const [texto, setTexto] = useState("Esperando contenido...");
//   const [imagen, setImagen] = useState("");

//   // Verificar parámetro de seguridad
//   useEffect(() => {
//     const params = new URLSearchParams(window.location.search);
//     const modo = params.get("modo");

//     if (modo !== "proyector") {
//       alert("Acceso no válido");
//       window.location.href = "/";
//     }
//   }, []);

//   // Leer datos de localStorage en tiempo real
//   useEffect(() => {
//     const interval = setInterval(() => {
//       const nuevoTexto = localStorage.getItem("texto_proyector");
//       const nuevaImagen = localStorage.getItem("imagen_proyector");

//       if (nuevoTexto) {
//         setTexto(nuevoTexto);
//       }

//       if (nuevaImagen) {
//         setImagen(nuevaImagen);
//       }
//     }, 500); // actualiza cada medio segundo

//     return () => clearInterval(interval);
//   }, []);

//   return (
//     <div
//       style={{
//         background: "black",
//         color: "white",
//         height: "100vh",
//         width: "100vw",
//         display: "flex",
//         flexDirection: "column",
//         alignItems: "center",
//         justifyContent: "center",
//         padding: "30px",
//         textAlign: "center",
//       }}
//     >
//       {imagen && (
//         <img
//           src={imagen}
//           alt="proyección"
//           style={{
//             maxWidth: "90%",
//             maxHeight: "70vh",
//             marginBottom: "20px",
//             borderRadius: "10px",
//           }}
//         />
//       )}

//       <h1
//         style={{
//           fontSize: "4rem",
//           fontWeight: "bold",
//         }}
//       >
//         {texto}
//       </h1>
//     </div>
//   );
// }
