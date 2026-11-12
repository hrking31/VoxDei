import { useRef, useState } from "react";
import { ArrowUpTrayIcon, PhotoIcon } from "@heroicons/react/24/solid";
import { useAuth } from "../Context/AuthContext";
import { subirImagen } from "../Imagenes/imagenesIglesia.js";
import ModalImagenes from "./ModalImagenes.jsx";
import { tonoPieza } from "./tonosPieza.js";

// «Subir imagen | Mis imágenes», uno al lado del otro (11 de noviembre de
// 2026). Va dentro del recuadro de una imagen nueva en el computador y en el
// campo del celular. Subir comprime la foto y la deja también en la sección
// Imágenes; en el celular, `accept="image/*"` ofrece la galería o la cámara.
// Devuelve la elegida con `onElegida({ url, nombre })`.
export default function ElegirImagen({ onElegida, showNotif, compacto = false }) {
  const { userData } = useAuth();
  const groupId = userData?.groupId;
  const archivo = useRef(null);
  const [subiendo, setSubiendo] = useState(false);
  const [verImagenes, setVerImagenes] = useState(false);

  const alElegirArchivo = async (e) => {
    const elegido = e.target.files?.[0];
    e.target.value = ""; // para poder elegir el mismo archivo otra vez
    if (!elegido) return;
    setSubiendo(true);
    try {
      const { url, nombre } = await subirImagen(groupId, elegido);
      onElegida({ url, nombre });
    } catch (error) {
      console.error("No se pudo subir la imagen:", error);
      showNotif("error", "No se pudo subir la imagen. Revisa la conexión.");
    } finally {
      setSubiendo(false);
    }
  };

  const alto = compacto ? "h-11 text-sm" : "h-11";

  return (
    <>
      <input ref={archivo} type="file" accept="image/*" onChange={alElegirArchivo} className="hidden" aria-label="Archivo de imagen" />
      <button
        type="button"
        onClick={() => archivo.current?.click()}
        disabled={subiendo}
        className={`flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl font-bold transition disabled:opacity-60 ${tonoPieza("imagen").boton} ${alto}`}
      >
        <ArrowUpTrayIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
        {subiendo ? "Subiendo…" : "Subir imagen"}
      </button>
      <button
        type="button"
        onClick={() => setVerImagenes(true)}
        disabled={subiendo}
        className={`flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl border border-app-border font-semibold text-app-texto transition hover:border-app-texto disabled:opacity-60 ${alto}`}
      >
        <PhotoIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
        Mis imágenes
      </button>
      <ModalImagenes
        abierto={verImagenes}
        groupId={groupId}
        onElegir={(imagen) => {
          setVerImagenes(false);
          onElegida({ url: imagen.url, nombre: imagen.name || "" });
        }}
        onCerrar={() => setVerImagenes(false)}
      />
    </>
  );
}
