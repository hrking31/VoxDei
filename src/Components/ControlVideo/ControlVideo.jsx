import { useState, useEffect, useCallback } from "react";
import { ref, set, update } from "firebase/database";
import {
  addDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import {
  VideoCameraIcon,
  PlayIcon,
  PauseIcon,
  PlusIcon,
  TrashIcon,
  TagIcon,
  BookmarkIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/solid";
import { database } from "../Firebase/Firebase";
import { colIglesia, docIglesia, VIDEOS } from "../Firebase/RutasIglesia";
import { idDeYouTube, miniaturaDe } from "../Video/YouTube";
import { useAppContext } from "../Context/AppContext";
import { useAuth } from "../../Components/Context/AuthContext";
import FranjaTurno from "../Cronograma/FranjaTurno.jsx";
import { useTurno } from "../Hooks/useTurno.js";
import BotonSalida from "../Navegacion/BotonSalida.jsx";

// Convierte segundos a m:ss
const enMinutos = (segundos) => {
  const total = Math.max(0, Math.floor(segundos || 0));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
};

export default function ControlVideo() {
  const { userData } = useAuth();
  const {
    visibleVideo,
    setVisibleVideo,
    visibleTitulo,
    setVisibleTitulo,
    visibleTicker,
    setVisibleTicker,
    showNotif,
    confirmAction,
  } = useAppContext();

  // Solo quien tiene el turno del cronograma (o un pastor) envía a la pantalla.
  // Guardar y borrar enlaces sí se puede siempre: es preparar, no proyectar.
  const { exigirTurno } = useTurno();

  const [videos, setVideos] = useState([]);
  const [titulo, setTitulo] = useState("");
  const [enlace, setEnlace] = useState("");
  const [enPantalla, setEnPantalla] = useState(null);
  const [reproduciendo, setReproduciendo] = useState(false);
  const [posicion, setPosicion] = useState(0);

  // Lista de videos guardados de la iglesia
  useEffect(() => {
    if (!userData?.groupId) return;

    const unsubscribe = onSnapshot(
      colIglesia(userData.groupId, VIDEOS),
      (snapshot) => {
        const data = snapshot.docs
          .map((documento) => ({ id: documento.id, ...documento.data() }))
          .sort((a, b) => String(a.titulo).localeCompare(String(b.titulo)));
        setVideos(data);
      },
      (error) => {
        console.error("Error al cargar los videos:", error);
        showNotif("error", "No se pudieron cargar los videos");
      }
    );

    return () => unsubscribe();
  }, [userData?.groupId]);

  // Manda una orden a la pantalla. La marca de tiempo permite al proyector
  // calcular el desfase si la orden llega con retraso.
  const enviarOrden = useCallback(
    (datos) => {
      set(ref(database, `displayVideo/${userData.groupId}`), {
        fuente: "youtube",
        marcaTiempo: Date.now(),
        ...datos,
      });
    },
    [userData?.groupId]
  );

  const encenderVideo = (estado) => {
    if (!exigirTurno()) return;
    const nuevoEstado = estado ?? !visibleVideo;
    setVisibleVideo(nuevoEstado);

    set(ref(database, `displayVisibleVideo/${userData.groupId}`), {
      visibleVideo: nuevoEstado,
      timestamp: Date.now(),
    });
  };

  // Guardar un enlace nuevo
  const guardarVideo = async () => {
    const videoId = idDeYouTube(enlace);

    if (!videoId) {
      showNotif("error", "Ese enlace de YouTube no se reconoce");
      return;
    }

    if (!titulo.trim()) {
      showNotif("warning", "Ponle un nombre para reconocerlo después");
      return;
    }

    try {
      await addDoc(colIglesia(userData.groupId, VIDEOS), {
        titulo: titulo.trim(),
        url: enlace.trim(),
        videoId,
        createdAt: serverTimestamp(),
      });

      setTitulo("");
      setEnlace("");
      showNotif("success", "Video guardado");
    } catch (error) {
      console.error("Error al guardar el video:", error);
      showNotif("error", "No se pudo guardar el video");
    }
  };

  const eliminarVideo = async (video) => {
    const accepted = await confirmAction(`¿Eliminar "${video.titulo}"?`);
    if (!accepted) return;

    try {
      await deleteDoc(docIglesia(userData.groupId, VIDEOS, video.id));

      if (enPantalla?.id === video.id) {
        setEnPantalla(null);
        setReproduciendo(false);
      }

      showNotif("success", "Video eliminado");
    } catch (error) {
      console.error("Error al eliminar el video:", error);
      showNotif("error", "No se pudo eliminar el video");
    }
  };

  // Mandar el video a la pantalla y arrancarlo
  const proyectar = (video) => {
    if (!exigirTurno()) return;
    setEnPantalla(video);
    setPosicion(0);
    setReproduciendo(true);

    enviarOrden({
      videoId: video.videoId,
      titulo: video.titulo,
      estado: "reproduciendo",
      posicion: 0,
    });

    encenderVideo(true);
    showNotif("success", `▶️ ${video.titulo}`);
  };

  const alternarReproduccion = () => {
    if (!enPantalla || !exigirTurno()) return;

    const nuevoEstado = !reproduciendo;
    setReproduciendo(nuevoEstado);

    enviarOrden({
      videoId: enPantalla.videoId,
      titulo: enPantalla.titulo,
      estado: nuevoEstado ? "reproduciendo" : "pausado",
      posicion,
    });
  };

  const moverA = (segundos) => {
    if (!enPantalla || !exigirTurno()) return;

    setPosicion(segundos);

    enviarOrden({
      videoId: enPantalla.videoId,
      titulo: enPantalla.titulo,
      estado: reproduciendo ? "reproduciendo" : "pausado",
      posicion: segundos,
    });
  };

  // Visibilidad del título y del ticker, por si se quieren dejar encima
  const toggleVisibleTitulo = () => {
    if (!exigirTurno()) return;
    const nuevoEstado = !visibleTitulo;
    setVisibleTitulo(nuevoEstado);

    update(ref(database, `displayVisibleTitulo/${userData.groupId}`), {
      visibleTitulo: nuevoEstado,
      timestamp: Date.now(),
    });
  };

  const toggleVisibleTicker = () => {
    if (!exigirTurno()) return;
    const nuevoEstado = !visibleTicker;
    setVisibleTicker(nuevoEstado);

    set(ref(database, `displayVisibleTicker/${userData.groupId}`), {
      visibleTicker: nuevoEstado,
      timestamp: Date.now(),
    });
  };

  return (
    <div className="min-h-svh bg-linear-to-b from-app-dark/50 to-app-light/50">
      {/* ENCABEZADO */}
      <div className="sticky top-0 border-b border-app-main bg-app-light z-10 px-2">
        <div className="-mx-2">
          <FranjaTurno />
        </div>
        <div className="flex items-center justify-between gap-2 py-2">
          <h1 className="font-bold text-app-main flex items-center gap-1 truncate">
            <VideoCameraIcon className="w-5 h-5 shrink-0" />
            <span className="truncate">
              {enPantalla ? enPantalla.titulo : "Video"}
            </span>
          </h1>

          <div className="flex items-center gap-2 shrink-0">
            <BotonSalida className="px-3 py-1.5" />

            <button onClick={toggleVisibleTicker} title="Ticker">
              <TagIcon
                className={`w-7 h-7 ${
                  visibleTicker ? "text-app-success" : "text-app-muted"
                }`}
              />
            </button>

            <button onClick={toggleVisibleTitulo} title="Título">
              <BookmarkIcon
                className={`w-7 h-7 ${
                  visibleTitulo ? "text-app-accent" : "text-app-muted"
                }`}
              />
            </button>

            <button
              onClick={() => encenderVideo()}
              title={
                visibleVideo
                  ? "Quitar el video de la pantalla"
                  : "Mostrar el video en la pantalla"
              }
            >
              <VideoCameraIcon
                className={`w-7 h-7 ${
                  visibleVideo ? "text-app-success" : "text-app-muted"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Controles de reproducción */}
        {enPantalla && (
          <div className="flex items-center gap-2 pb-2">
            <button
              onClick={alternarReproduccion}
              className="px-4 py-2 rounded bg-green-500 text-white font-bold flex items-center gap-1"
            >
              {reproduciendo ? (
                <>
                  <PauseIcon className="w-5 h-5" /> Pausar
                </>
              ) : (
                <>
                  <PlayIcon className="w-5 h-5" /> Reproducir
                </>
              )}
            </button>

            <input
              type="range"
              min="0"
              max="3600"
              step="5"
              value={posicion}
              onChange={(e) => moverA(Number(e.target.value))}
              className="flex-1 accent-app-main"
              title="Mover el video"
            />

            <span className="text-xs text-app-muted w-12 text-right">
              {enMinutos(posicion)}
            </span>
          </div>
        )}
      </div>

      <div className="p-2 sm:p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* AGREGAR */}
        <div className="bg-app-light border-2 border-app-border rounded-lg p-3 h-fit">
          <h2 className="font-bold text-app-main mb-2">Agregar un video</h2>

          <input
            type="text"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Nombre para reconocerlo"
            className="w-full mb-2 p-2 rounded border border-app-border text-app-muted focus:outline-none focus:ring-2 focus:ring-app-main"
          />

          <input
            type="text"
            value={enlace}
            onChange={(e) => setEnlace(e.target.value)}
            placeholder="Pega aquí el enlace de YouTube"
            className="w-full p-2 rounded border border-app-border text-app-muted focus:outline-none focus:ring-2 focus:ring-app-main"
          />

          {enlace && !idDeYouTube(enlace) && (
            <p className="text-xs text-app-error mt-1">
              Ese enlace no parece de YouTube.
            </p>
          )}

          <button
            onClick={guardarVideo}
            className="w-full mt-2 py-2 rounded bg-green-500 text-white font-bold flex items-center justify-center gap-1"
          >
            <PlusIcon className="w-5 h-5" />
            Guardar video
          </button>

          <p className="text-[11px] text-app-muted mt-2">
            El video se queda en YouTube: aquí solo se guarda el enlace. La
            pantalla de proyección necesita internet mientras se reproduce.
          </p>
        </div>

        {/* LISTA */}
        <div>
          <h2 className="font-bold text-app-main mb-2">
            Videos guardados ({videos.length})
          </h2>

          {videos.length === 0 ? (
            <p className="text-app-muted text-sm">
              Todavía no hay videos guardados.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {videos.map((video) => (
                <div
                  key={video.id}
                  className={`flex items-center gap-3 border rounded-lg p-2 transition-colors ${
                    enPantalla?.id === video.id
                      ? "border-app-success bg-app-success/10"
                      : "border-app-border hover:border-app-main"
                  }`}
                >
                  <img
                    src={miniaturaDe(video.videoId)}
                    alt=""
                    className="w-24 h-14 object-cover rounded shrink-0"
                  />

                  <button
                    onClick={() => proyectar(video)}
                    className="flex-1 text-left min-w-0"
                  >
                    <span className="block font-semibold text-app-main truncate">
                      {video.titulo}
                    </span>
                    <span className="text-xs text-app-muted">
                      {enPantalla?.id === video.id
                        ? "en pantalla"
                        : "Tocar para proyectar"}
                    </span>
                  </button>

                  <button
                    onClick={() => eliminarVideo(video)}
                    title="Eliminar"
                    className="p-2 rounded-full hover:bg-app-border shrink-0"
                  >
                    <TrashIcon className="w-5 h-5 text-app-muted hover:text-app-error" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
