import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { MusicalNoteIcon } from "@heroicons/react/24/solid";
import { db } from "../Firebase/Firebase";
import { CANCIONES } from "../Firebase/RutasIglesia";
import { useAppContext } from "../Context/AppContext";
import { useAuth } from "../../Components/Context/AuthContext";
import { partirLetra } from "../Canciones/UtilesCanciones";

// Alta y edición de una canción del catálogo. Sin id es una canción nueva; con
// id se corrige una que subió esta misma iglesia. No toca la proyección.
export default function ControlCancionEditar() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { userData } = useAuth();
  const { showNotif } = useAppContext();

  const [titulo, setTitulo] = useState("");
  const [letra, setLetra] = useState("");
  const [cargando, setCargando] = useState(Boolean(id));
  const [guardando, setGuardando] = useState(false);

  const editando = Boolean(id);

  // Al editar, se trae la canción una sola vez: mientras se escribe no interesa
  // que el texto cambie por debajo.
  useEffect(() => {
    if (!id) return;

    const traer = async () => {
      try {
        const snapshot = await getDoc(doc(db, CANCIONES, id));

        if (!snapshot.exists()) {
          showNotif("error", "Esa canción ya no está en el catálogo");
          navigate("/ViewCanciones");
          return;
        }

        const datos = snapshot.data();

        // El catálogo es común, pero cada iglesia solo corrige lo suyo.
        if (datos.creadoPor !== userData?.groupId) {
          showNotif("warning", "Esa canción es de otra iglesia");
          navigate("/ViewCanciones");
          return;
        }

        setTitulo(datos.titulo || "");
        setLetra((datos.diapositivas || []).join("\n\n"));
        setCargando(false);
      } catch (error) {
        console.error("Error al cargar la canción:", error);
        showNotif("error", "No se pudo cargar la canción");
        navigate("/ViewCanciones");
      }
    };

    traer();
  }, [id, userData?.groupId, navigate]);

  const guardarCancion = async () => {
    if (!titulo.trim()) {
      showNotif("warning", "Ponle un título a la canción");
      return;
    }

    const diapositivas = partirLetra(letra);

    if (diapositivas.length === 0) {
      showNotif("warning", "Escribe o pega la letra de la canción");
      return;
    }

    setGuardando(true);

    try {
      const datos = {
        titulo: titulo.trim(),
        diapositivas,
        updatedAt: serverTimestamp(),
      };

      if (id) {
        await setDoc(doc(db, CANCIONES, id), datos, { merge: true });
        showNotif("success", `"${datos.titulo}" actualizada`);
      } else {
        // Queda registrado quién la subió: es lo que permite que cada iglesia
        // edite solo lo suyo dentro de un catálogo compartido.
        await addDoc(collection(db, CANCIONES), {
          ...datos,
          creadoPor: userData.groupId,
          iglesia: userData.churchName || "",
          createdAt: serverTimestamp(),
        });
        showNotif(
          "success",
          `"${datos.titulo}" guardada con ${diapositivas.length} láminas`
        );
      }

      navigate("/ViewCanciones");
    } catch (error) {
      console.error("Error al guardar la canción:", error);
      showNotif("error", "No se pudo guardar la canción");
      setGuardando(false);
    }
  };

  const laminas = partirLetra(letra).length;

  if (cargando) {
    return (
      <div className="h-svh flex items-center justify-center bg-linear-to-b from-app-dark/50 to-app-light/50">
        <p className="text-app-muted">Cargando la canción...</p>
      </div>
    );
  }

  // La pantalla mide exactamente lo que la ventana y no se desplaza: lo único
  // que crece es la letra, y esa se desplaza por dentro.
  return (
    <div className="h-svh flex flex-col overflow-hidden bg-linear-to-b from-app-dark/50 to-app-light/50">
      {/* ENCABEZADO, con los botones de guardar y volver */}
      <div className="shrink-0 border-b border-app-main bg-app-light px-2">
        <div className="flex items-center justify-between gap-2 py-1">
          <h1 className="font-bold text-app-main flex items-center gap-1 truncate">
            <MusicalNoteIcon className="w-5 h-5 shrink-0" />
            <span className="truncate">
              {editando ? "Editar canción" : "Nueva canción"}
            </span>
          </h1>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={guardarCancion}
              disabled={guardando}
              className={`w-20 h-8 text-xs sm:text-sm font-bold rounded ${
                guardando
                  ? "bg-app-border text-app-muted cursor-not-allowed"
                  : "bg-green-500 text-white"
              }`}
            >
              Guardar
            </button>

            {/* Vuelve al catálogo sin guardar: hace de cancelar */}
            <button
              onClick={() => navigate("/ViewCanciones")}
              className="w-20 h-8 text-xs sm:text-sm font-bold text-app-muted rounded inset-shadow-sm inset-shadow-app-muted hover:text-app-main"
            >
              Canciones
            </button>
          </div>
        </div>
      </div>

      {/* CAMPOS: sueltos, sin recuadro, ocupando lo que queda de pantalla */}
      <div className="flex-1 min-h-0 flex flex-col gap-2 p-2 sm:p-4">
        <input
          type="text"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Título de la canción"
          className="w-full shrink-0 p-2 rounded border border-app-border text-app-muted text-center md:text-lg focus:outline-none focus:ring-2 focus:ring-app-main"
        />

        <textarea
          value={letra}
          onChange={(e) => setLetra(e.target.value)}
          placeholder={
            "Pega aquí la letra completa.\n\n" +
            "Deja un renglón en blanco entre estrofa y estrofa:\n" +
            "cada bloque será una lámina en la pantalla."
          }
          className="w-full flex-1 min-h-0 p-2 rounded border border-app-border text-app-muted text-center md:text-base resize-none overflow-y-auto scrollbar-custom focus:outline-none focus:ring-2 focus:ring-app-main"
        />

        <p className="shrink-0 text-xs text-app-muted">
          {laminas} lámina{laminas === 1 ? "" : "s"} se crearán · El catálogo es
          común a todas las iglesias.
        </p>
      </div>
    </div>
  );
}
