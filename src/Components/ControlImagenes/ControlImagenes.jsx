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
  doc,
  deleteDoc,
  serverTimestamp,
  onSnapshot,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { PhotoIcon } from "@heroicons/react/24/solid";
import { database, storage, db } from "../../Components/Firebase/Firebase.js";
import { useAuth } from "../../Components/Context/AuthContext";
import { useAppContext } from "../../Components/Context/AppContext";

export default function ControlImagenes() {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const { visibleImagen, setVisibleImagen, showNotif, confirmAction } =
    useAppContext();
  // Imágenes guardadas que el usuario marcó para proyectar juntas
  const [seleccionGuardadas, setSeleccionGuardadas] = useState([]);

  // Estados para selección y previews locales
  const [selectedFiles, setSelectedFiles] = useState([]); // File objects pendientes de subir
  const [localPreviews, setLocalPreviews] = useState([]); // objectURLs para previsualizar
  const [loading, setLoading] = useState(false);
  const [intervalo, setIntervalo] = useState(5); // segundos
  const [savedImages, setSavedImages] = useState([]); // imágenes ya guardadas en Firestore

  // --- Helpers para seleccionar archivos / carpetas ---
  const handleFilesInput = (e) => {
    const archivos = Array.from(e.target.files || []).filter((f) =>
      f.type.startsWith("image/")
    );
    if (archivos.length === 0) {
      showNotif("error", "No se seleccionaron imágenes válidas.");
      return;
    }
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
      showNotif("error", "La carpeta no contiene imágenes válidas.");
      return;
    }
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
      showNotif("error", "Selecciona al menos una imagen para guardar.");
      return;
    }
    setLoading(true);
    try {
      await uploadAndSave(selectedFiles);
      // limpiar selección local
      setSelectedFiles([]);
      localPreviews.forEach((url) => URL.revokeObjectURL(url));
      setLocalPreviews([]);
      showNotif("success", "Imágenes guardadas correctamente");
    } catch (err) {
      console.error(err);
      showNotif("error", "Error al guardar las imágenes");
    } finally {
      setLoading(false);
    }
  };

  // Enciende o apaga la imagen en la pantalla de proyección
  const toggleVisibleImagen = (estado) => {
    const nuevoEstado = estado ?? !visibleImagen;
    setVisibleImagen(nuevoEstado);

    dbSet(dbRef(database, `displayVisibleImagen/${userData.groupId}`), {
      visibleImagen: nuevoEstado,
      timestamp: Date.now(),
    });
  };

  // Envía a la pantalla una lista de URLs y enciende la imagen
  const proyectarUrls = async (urls) => {
    await dbSet(dbRef(database, `displayImage/${userData.groupId}`), {
      type: urls.length > 1 ? "carousel" : "single",
      images: urls,
      image: urls[0],
      interval: Number(intervalo || 5) * 1000,
      timestamp: Date.now(),
    });

    toggleVisibleImagen(true);
  };

  // Proyecta las imágenes recién seleccionadas (las sube primero)
  const handleProyectarSeleccionadas = async () => {
    if (selectedFiles.length === 0) {
      showNotif(
        "warning",
        "Selecciona imágenes o usa las que ya tienes guardadas"
      );
      return;
    }
    setLoading(true);
    try {
      // subir primero para obtener URLs
      const urls = await uploadAndSave(selectedFiles);
      await proyectarUrls(urls);

      // limpiar selección local
      setSelectedFiles([]);
      localPreviews.forEach((url) => URL.revokeObjectURL(url));
      setLocalPreviews([]);
      showNotif("success", "Imágenes proyectadas");
    } catch (err) {
      console.error("Error al proyectar:", err);
      showNotif("error", "Error al proyectar las imágenes");
    } finally {
      setLoading(false);
    }
  };

  // Proyectar una imagen guardada (miniatura)
  const handleProyectarGuardada = async (img) => {
    try {
      await proyectarUrls([img.url]);
    } catch (err) {
      console.error("Error al proyectar imagen guardada:", err);
      showNotif("error", "Error al proyectar la imagen");
    }
  };

  // Marca o desmarca una imagen guardada para proyectarlas en grupo
  const toggleSeleccionGuardada = (id) => {
    setSeleccionGuardadas((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Proyecta como carrusel todas las imágenes guardadas que estén marcadas
  const handleProyectarMarcadas = async () => {
    const urls = savedImages
      .filter((img) => seleccionGuardadas.includes(img.id))
      .map((img) => img.url);

    if (urls.length === 0) return;

    try {
      await proyectarUrls(urls);
      showNotif(
        "success",
        urls.length > 1
          ? `Carrusel de ${urls.length} imágenes proyectado`
          : "Imagen proyectada"
      );
    } catch (err) {
      console.error("Error al proyectar la selección:", err);
      showNotif("error", "Error al proyectar las imágenes");
    }
  };

  // Eliminar imagen guardada: borra el archivo y su ficha
  const handleEliminarGuardada = async (img) => {
    const accepted = await confirmAction(
      `¿Eliminar definitivamente "${img.name}"?`
    );
    if (!accepted) return;

    try {
      // El archivo puede no existir ya; eso no debe impedir borrar la ficha,
      // porque si no la miniatura queda rota para siempre.
      if (img.storagePath) {
        try {
          await deleteObject(storageRef(storage, img.storagePath));
        } catch (err) {
          console.warn("No se pudo borrar el archivo:", err.message);
        }
      }

      await deleteDoc(doc(db, "imagenes", img.id));

      setSeleccionGuardadas((prev) => prev.filter((x) => x !== img.id));
      showNotif("success", "Imagen eliminada");
    } catch (err) {
      console.error("Error eliminando:", err);
      showNotif("error", "No se pudo eliminar la imagen");
    }
  };

  return (
    <div>
      <h1 className="font-bold text-app-main flex items-center gap-1 p-2">
        <PhotoIcon className="w-5 h-5 shrink-0" />
        <span>Imágenes</span>
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

          {/* Encender / apagar la imagen en la pantalla */}
          <button
            onClick={() => toggleVisibleImagen()}
            title={
              visibleImagen
                ? "Quitar la imagen de la pantalla"
                : "Mostrar la imagen en la pantalla"
            }
            className="px-3 flex items-center justify-center transition-all duration-200"
          >
            <PhotoIcon
              className={`w-8 h-8 ${
                visibleImagen ? "text-app-success" : "text-app-muted"
              }`}
            />
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
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h3 className="font-bold text-app-main">Imágenes guardadas</h3>

          {/* Proyectar en grupo las que estén marcadas */}
          {seleccionGuardadas.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-app-muted">
                {seleccionGuardadas.length} marcada
                {seleccionGuardadas.length > 1 ? "s" : ""}
              </span>
              <button
                onClick={handleProyectarMarcadas}
                className="text-xs px-3 py-1.5 rounded bg-green-500 text-white"
              >
                Proyectar juntas
              </button>
              <button
                onClick={() => setSeleccionGuardadas([])}
                className="text-xs px-3 py-1.5 rounded border border-app-border text-app-muted"
              >
                Quitar marcas
              </button>
            </div>
          )}
        </div>

        {savedImages.length === 0 ? (
          <p className="text-app-muted">No hay imágenes guardadas aún.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {savedImages.map((img) => (
              <div
                key={img.id}
                className={`relative border rounded-lg p-1 cursor-pointer hover:shadow-md ${
                  seleccionGuardadas.includes(img.id)
                    ? "border-app-success border-2"
                    : "border-app-border"
                }`}
              >
                <img
                  src={img.url}
                  alt={img.name}
                  className="w-full h-40 object-cover rounded"
                  onClick={() => handleProyectarGuardada(img)}
                />

                {/* Marcar para proyectar en grupo */}
                <button
                  onClick={() => toggleSeleccionGuardada(img.id)}
                  title="Marcar para proyectar junto con otras"
                  className={`absolute top-2 left-2 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                    seleccionGuardadas.includes(img.id)
                      ? "bg-app-success border-app-success text-white"
                      : "bg-black/40 border-white/70 text-transparent"
                  }`}
                >
                  ✓
                </button>

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
