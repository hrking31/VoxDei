import { useRef, useState } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, updateDoc } from "firebase/firestore";
import { CameraIcon } from "@heroicons/react/24/solid";
import { storage, db } from "../Firebase/Firebase";
import { useAuth } from "../Context/AuthContext";
import { useAppContext } from "../Context/AppContext";
import {
  LADO_PERFIL,
  comprimirImagen,
} from "../ComprimirImagen/ComprimirImagen.js";

// Foto de perfil propia, con cambio al pulsarla.
//
// Vive solo en la ficha propia de Usuarios (UserProfileCard con `esMiCuenta`):
// hasta el 23 de octubre de 2026 estaba en la cabecera de ViewGestion y el
// usuario pidió que se cambie únicamente desde la ficha.
//
// Cada quien cambia solo la suya: se sube a users/{uid}/profile.jpg y se guarda
// el enlace en el campo `photo` de su ficha. Las reglas de Firestore permiten
// tocar ese campo y ningún otro, así que desde aquí no se puede alterar el rol
// ni la iglesia aunque alguien manipulara la petición.
//
// `alCambiar` avisa a quien la monta (ViewUsers recarga la lista del equipo,
// que guarda su propia copia de las fichas).
export default function MiFoto({ tamano = "w-32 h-32", alCambiar }) {
  const { user, userData, setUserData } = useAuth();
  const { showNotif } = useAppContext();
  const inputRef = useRef(null);
  const [subiendo, setSubiendo] = useState(false);

  const uid = user?.uid;

  const cambiarFoto = async (evento) => {
    const elegido = evento.target.files?.[0];
    // Se limpia el input para poder volver a elegir el mismo archivo.
    evento.target.value = "";

    if (!elegido || !uid) return;

    if (!elegido.type.startsWith("image/")) {
      showNotif("error", "El archivo debe ser una imagen.");
      return;
    }

    setSubiendo(true);

    try {
      // Se achica primero: una foto de celular de más de 10 MB queda en
      // unos cientos de KB y ya pasa el límite.
      const archivo = await comprimirImagen(elegido, LADO_PERFIL);

      // Mismo límite que exigen las reglas de Storage.
      if (archivo.size >= 10 * 1024 * 1024) {
        showNotif("error", "La imagen debe pesar menos de 10 MB.");
        return;
      }

      const destino = ref(storage, `users/${uid}/profile.jpg`);
      await uploadBytes(destino, archivo);
      const photo = await getDownloadURL(destino);

      await updateDoc(doc(db, "users", uid), { photo });
      setUserData((previo) => ({ ...previo, photo }));
      alCambiar?.(photo);

      showNotif("success", "Foto actualizada");
    } catch (error) {
      console.error("Error al cambiar la foto:", error);
      showNotif("error", "No se pudo actualizar la foto");
    } finally {
      setSubiendo(false);
    }
  };

  const sinFoto = !userData?.photo;

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={subiendo}
        aria-label={
          sinFoto ? "Poner mi foto de perfil" : "Cambiar mi foto de perfil"
        }
        title={sinFoto ? "Pon tu foto" : "Cambiar mi foto"}
        className="group relative block rounded-full focus:outline-none focus:ring-2 focus:ring-app-main"
      >
        {sinFoto ? (
          <div
            className={`${tamano} rounded-full bg-app-main/20 border-2 border-dashed border-app-main flex items-center justify-center`}
          >
            <CameraIcon className="w-1/3 h-1/3 text-app-main" />
          </div>
        ) : (
          <img
            src={userData.photo}
            alt="Mi foto de perfil"
            className={`${tamano} rounded-full object-cover`}
          />
        )}

        {/* Velo mientras sube (y al pasar el mouse, en escritorio) */}
        {!sinFoto && (
          <span
            className={`absolute inset-0 rounded-full flex items-center justify-center bg-black/50 transition-opacity ${
              subiendo ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            }`}
          >
            {subiendo ? (
              <span className="text-xs text-white">Subiendo...</span>
            ) : (
              <CameraIcon className="w-1/4 h-1/4 text-white" />
            )}
          </span>
        )}

        {/* Cámara siempre visible: en el celular no hay «pasar el mouse», y
            sin ella nadie sabría que la foto se puede tocar. */}
        {!sinFoto && (
          <span className="absolute bottom-1 right-1 p-2 rounded-full bg-app-main text-black shadow-lg">
            <CameraIcon className="w-4 h-4" />
          </span>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={cambiarFoto}
        className="hidden"
      />
    </div>
  );
}
