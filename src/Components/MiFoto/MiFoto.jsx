import { useRef, useState } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, updateDoc } from "firebase/firestore";
import { CameraIcon } from "@heroicons/react/24/solid";
import { storage, db } from "../Firebase/Firebase";
import { useAuth } from "../Context/AuthContext";
import { useAppContext } from "../Context/AppContext";

// Foto de perfil propia, con cambio al pulsarla.
//
// Cada quien cambia solo la suya: se sube a users/{uid}/profile.jpg y se guarda
// el enlace en el campo `photo` de su ficha. Las reglas de Firestore permiten
// tocar ese campo y ningún otro, así que desde aquí no se puede alterar el rol
// ni la iglesia aunque alguien manipulara la petición.
export default function MiFoto({ tamano = "w-10 h-10" }) {
  const { user, userData, setUserData } = useAuth();
  const { showNotif } = useAppContext();
  const inputRef = useRef(null);
  const [subiendo, setSubiendo] = useState(false);

  const uid = user?.uid;

  const cambiarFoto = async (evento) => {
    const archivo = evento.target.files?.[0];
    // Se limpia el input para poder volver a elegir el mismo archivo.
    evento.target.value = "";

    if (!archivo || !uid) return;

    if (!archivo.type.startsWith("image/")) {
      showNotif("error", "El archivo debe ser una imagen.");
      return;
    }

    // Mismo límite que exigen las reglas de Storage.
    if (archivo.size >= 10 * 1024 * 1024) {
      showNotif("error", "La imagen debe pesar menos de 10 MB.");
      return;
    }

    setSubiendo(true);

    try {
      const destino = ref(storage, `users/${uid}/profile.jpg`);
      await uploadBytes(destino, archivo);
      const photo = await getDownloadURL(destino);

      await updateDoc(doc(db, "users", uid), { photo });
      setUserData((previo) => ({ ...previo, photo }));

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
          // Sin foto todavía: se muestra la cámara de forma permanente, para
          // que se vea que ahí se puede poner una. Con el muñequito genérico
          // parecía un adorno y nadie lo pulsaba.
          <div
            className={`${tamano} rounded-full bg-app-main/20 border-2 border-dashed border-app-main flex items-center justify-center`}
          >
            <CameraIcon className="w-5 h-5 text-app-main" />
          </div>
        ) : (
          <img
            src={userData.photo}
            alt="Mi foto de perfil"
            className={`${tamano} rounded-full object-cover`}
          />
        )}

        {/* Con foto puesta, la cámara solo asoma al pasar por encima */}
        {!sinFoto && (
          <span
            className={`absolute inset-0 rounded-full flex items-center justify-center bg-black/50 transition-opacity ${
              subiendo ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            }`}
          >
            <CameraIcon className="w-4 h-4 text-white" />
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
