import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ref, set, update } from "firebase/database";
import { doc, onSnapshot } from "firebase/firestore";
import {
  ChatBubbleLeftRightIcon,
  TagIcon,
  TvIcon,
  MusicalNoteIcon,
} from "@heroicons/react/24/solid";
import { database, db } from "../Firebase/Firebase";
import { CANCIONES } from "../Firebase/RutasIglesia";
import { useAppContext } from "../Context/AppContext";
import { useAuth } from "../../Components/Context/AuthContext";
import ModalVisibilidad from "../ModalVisibilidad/ModalVisibilidad.jsx";

// Pantalla de proyección de una canción. Es la única de las tres pantallas de
// canciones que toca la del templo: el catálogo y el formulario no la tocan.
export default function ControlCancionProyectar() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { userData } = useAuth();
  const {
    setVisibleTitulo,
    visibleTexto,
    setVisibleTexto,
    visibleTicker,
    setVisibleTicker,
    isDesktop,
    showNotif,
  } = useAppContext();

  const [cancion, setCancion] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [indiceActual, setIndiceActual] = useState(null);

  // La canción se lee en vivo: si alguien la corrige mientras está abierta, las
  // láminas se actualizan sin tener que salir.
  useEffect(() => {
    if (!id) return;

    const unsubscribe = onSnapshot(
      doc(db, CANCIONES, id),
      (snapshot) => {
        if (!snapshot.exists()) {
          showNotif("error", "Esa canción ya no está en el catálogo");
          navigate("/ViewCanciones");
          return;
        }
        setCancion({ id: snapshot.id, ...snapshot.data() });
        setCargando(false);
      },
      (error) => {
        console.error("Error al cargar la canción:", error);
        showNotif("error", "No se pudo cargar la canción");
        navigate("/ViewCanciones");
      }
    );

    return () => unsubscribe();
  }, [id, navigate]);

  // Al entrar, la pantalla del templo queda lista: letra y ticker encendidos y
  // el título apagado, que aquí nunca se proyecta.
  useEffect(() => {
    if (!userData?.groupId) return;
    const timestamp = Date.now();

    setVisibleTitulo(false);
    update(ref(database, `displayVisibleTitulo/${userData.groupId}`), {
      visibleTitulo: false,
      timestamp,
    });

    setVisibleTexto(true);
    update(ref(database, `displayVisibleTexto/${userData.groupId}`), {
      visibleTexto: true,
      timestamp,
    });

    setVisibleTicker(true);
    set(ref(database, `displayVisibleTicker/${userData.groupId}`), {
      visibleTicker: true,
      timestamp,
    });
  }, [userData?.groupId, setVisibleTitulo, setVisibleTexto, setVisibleTicker]);

  // Envía una lámina a la pantalla. El título no viaja: `display` es un solo
  // interruptor, y escribir dos canales con valores distintos deja el centro
  // de la proyección en blanco.
  const proyectarDiapositiva = useCallback(
    (indice) => {
      if (!cancion?.diapositivas?.length) return;

      const total = cancion.diapositivas.length;
      if (indice < 0 || indice >= total) return;

      set(ref(database, `displayMessage/${userData.groupId}`), {
        text: cancion.diapositivas[indice],
        display: "mensaje",
        timestamp: Date.now(),
      });

      setIndiceActual(indice);
    },
    [cancion, userData?.groupId]
  );

  const siguiente = useCallback(() => {
    if (indiceActual === null) return proyectarDiapositiva(0);
    proyectarDiapositiva(indiceActual + 1);
  }, [indiceActual, proyectarDiapositiva]);

  const anterior = useCallback(() => {
    if (indiceActual === null) return;
    proyectarDiapositiva(indiceActual - 1);
  }, [indiceActual, proyectarDiapositiva]);

  // Flechas del teclado, para operar desde el computador sin usar el mouse
  useEffect(() => {
    const manejarTecla = (evento) => {
      const etiqueta = evento.target.tagName;
      if (etiqueta === "TEXTAREA" || etiqueta === "INPUT") return;

      if (evento.key === "ArrowRight" || evento.key === "ArrowDown") {
        evento.preventDefault();
        siguiente();
      }
      if (evento.key === "ArrowLeft" || evento.key === "ArrowUp") {
        evento.preventDefault();
        anterior();
      }
    };

    window.addEventListener("keydown", manejarTecla);
    return () => window.removeEventListener("keydown", manejarTecla);
  }, [siguiente, anterior]);

  // Visibilidad del texto
  const toggleVisibleTexto = () => {
    const nuevoEstado = !visibleTexto;
    setVisibleTexto(nuevoEstado);

    update(ref(database, `displayVisibleTexto/${userData.groupId}`), {
      visibleTexto: nuevoEstado,
      timestamp: Date.now(),
    });
  };

  // Visibilidad del ticker
  const toggleVisibleTicker = () => {
    const nuevoEstado = !visibleTicker;
    setVisibleTicker(nuevoEstado);

    set(ref(database, `displayVisibleTicker/${userData.groupId}`), {
      visibleTicker: nuevoEstado,
      timestamp: Date.now(),
    });
  };

  // Deja en pantalla la letra y el ticker, y apaga el título
  const setAllVisible = () => {
    setVisibleTitulo(false);
    setVisibleTexto(true);
    setVisibleTicker(true);
    const timestamp = Date.now();

    update(ref(database, `displayVisibleTitulo/${userData.groupId}`), {
      visibleTitulo: false,
      timestamp,
    });

    update(ref(database, `displayVisibleTexto/${userData.groupId}`), {
      visibleTexto: true,
      timestamp,
    });

    set(ref(database, `displayVisibleTicker/${userData.groupId}`), {
      visibleTicker: true,
      timestamp,
    });
  };

  if (cargando || !cancion) {
    return (
      <div className="min-h-svh flex items-center justify-center bg-linear-to-b from-app-dark/50 to-app-light/50">
        <p className="text-app-muted">Cargando la canción...</p>
      </div>
    );
  }

  return (
    <div className="min-h-svh bg-linear-to-b from-app-dark/50 to-app-light/50">
      {/* ENCABEZADO */}
      <div className="sticky top-0 border-b border-app-main bg-app-light z-10 px-2">
        <div className="flex items-center justify-between gap-2 py-1">
          <h1 className="font-bold text-app-main flex items-center gap-1 truncate">
            <MusicalNoteIcon className="w-5 h-5 shrink-0" />
            <span className="truncate">{cancion.titulo}</span>
          </h1>

          {/* Cuántas láminas tiene la canción, o en cuál va */}
          <span className="text-xs text-app-muted shrink-0">
            {indiceActual === null
              ? `${cancion.diapositivas.length} láminas`
              : `${indiceActual + 1} / ${cancion.diapositivas.length}`}
          </span>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => navigate("/ViewCanciones")}
              className="w-20 h-8 text-xs sm:text-sm font-bold text-app-muted rounded inset-shadow-sm inset-shadow-app-muted hover:text-app-main"
            >
              Ver lista
            </button>

            {isDesktop ? (
              <div className="flex items-center gap-3">
                <button onClick={toggleVisibleTicker}>
                  <TagIcon
                    className={`w-7 h-7 ${
                      visibleTicker ? "text-app-success" : "text-app-muted"
                    }`}
                  />
                </button>
                <button onClick={toggleVisibleTexto}>
                  <ChatBubbleLeftRightIcon
                    className={`w-7 h-7 ${
                      visibleTexto ? "text-app-main" : "text-app-muted"
                    }`}
                  />
                </button>
                <button onClick={setAllVisible}>
                  <TvIcon className="w-7 h-7 text-app-success" />
                </button>
              </div>
            ) : (
              <div className="w-20 h-8">
                <ModalVisibilidad
                  toggleVisibleTicker={toggleVisibleTicker}
                  toggleVisibleTexto={toggleVisibleTexto}
                  setAllVisible={setAllVisible}
                  colorClass={"text-app-success"}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* LÁMINAS */}
      <div className="p-2 sm:p-4">
        {isDesktop && (
          <p className="text-xs text-app-muted mb-2 text-center">
            Usa las flechas del teclado para avanzar y retroceder.
          </p>
        )}

        <div className="mx-auto w-full max-w-6xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 md:gap-3 justify-items-center">
          {cancion.diapositivas.map((bloque, indice) => (
            <button
              key={indice}
              onClick={() => proyectarDiapositiva(indice)}
              className={`w-full text-center p-3 md:p-5 rounded-lg border-2 transition-colors whitespace-pre-wrap ${
                indiceActual === indice
                  ? "border-app-success bg-app-success/10"
                  : "border-app-border hover:border-app-main"
              }`}
            >
              <span className="block text-xs font-bold text-app-main mb-1">
                Lámina {indice + 1}
                {indiceActual === indice && " · en pantalla"}
              </span>
              <span className="text-sm md:text-base lg:text-lg text-app-muted leading-relaxed">
                {bloque}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
