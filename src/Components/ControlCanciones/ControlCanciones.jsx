import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ref, set, update } from "firebase/database";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import {
  BookmarkIcon,
  ChatBubbleLeftRightIcon,
  TagIcon,
  TvIcon,
  MusicalNoteIcon,
  PlusIcon,
  MinusIcon,
  TrashIcon,
  PencilIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/solid";
import { database, db } from "../Firebase/Firebase";
import {
  docIglesia,
  CANCIONES,
  REPERTORIO,
  REPERTORIO_ACTUAL,
} from "../Firebase/RutasIglesia";
import { useAppContext } from "../Context/AppContext";
import { useAuth } from "../../Components/Context/AuthContext.jsx";
import ModalVisibilidad from "../ModalVisibilidad/ModalVisibilidad.jsx";

// Parte la letra pegada en láminas: cada bloque separado por un renglón en
// blanco se proyecta por separado.
const partirLetra = (texto) =>
  String(texto || "")
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n+/)
    .map((bloque) => bloque.trim())
    .filter(Boolean);

// Quita tildes y mayúsculas para que el buscador sea tolerante.
const normalizar = (texto) =>
  String(texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

export default function ControlCanciones() {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const {
    visibleTitulo,
    setVisibleTitulo,
    visibleTexto,
    setVisibleTexto,
    visibleTicker,
    setVisibleTicker,
    isDesktop,
    showNotif,
    confirmAction,
  } = useAppContext();

  // Catálogo común a todas las iglesias
  const [canciones, setCanciones] = useState([]);
  // Ids de las canciones que esta iglesia usará hoy
  const [repertorio, setRepertorio] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [cancionActiva, setCancionActiva] = useState(null);
  const [indiceActual, setIndiceActual] = useState(null);

  // Formulario de alta / edición
  const [editando, setEditando] = useState(false);
  const [idEditando, setIdEditando] = useState(null);
  const [titulo, setTitulo] = useState("");
  const [letra, setLetra] = useState("");

  // Catálogo compartido, en vivo
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, CANCIONES),
      (snapshot) => {
        const data = snapshot.docs
          .map((documento) => ({ id: documento.id, ...documento.data() }))
          .sort((a, b) =>
            normalizar(a.titulo).localeCompare(normalizar(b.titulo))
          );
        setCanciones(data);
      },
      (error) => {
        console.error("Error al cargar las canciones:", error);
        showNotif("error", "❌ No se pudieron cargar las canciones");
      }
    );

    return () => unsubscribe();
  }, []);

  // Repertorio del día de esta iglesia, en vivo
  useEffect(() => {
    if (!userData?.groupId) return;

    const unsubscribe = onSnapshot(
      docIglesia(userData.groupId, REPERTORIO, REPERTORIO_ACTUAL),
      (snapshot) => {
        setRepertorio(snapshot.data()?.canciones || []);
      },
      (error) => {
        console.error("Error al cargar el repertorio:", error);
      }
    );

    return () => unsubscribe();
  }, [userData?.groupId]);

  const cancionesFiltradas = canciones.filter((cancion) =>
    normalizar(cancion.titulo).includes(normalizar(busqueda))
  );

  // Las canciones del día, en el orden en que se agregaron
  const cancionesDelDia = repertorio
    .map((id) => canciones.find((cancion) => cancion.id === id))
    .filter(Boolean);

  // Solo se puede editar o borrar lo que subió la propia iglesia
  const esMia = (cancion) => cancion?.creadoPor === userData?.groupId;

  const guardarRepertorio = async (ids) => {
    try {
      await setDoc(
        docIglesia(userData.groupId, REPERTORIO, REPERTORIO_ACTUAL),
        { canciones: ids, updatedAt: serverTimestamp() },
        { merge: true }
      );
    } catch (error) {
      console.error("Error al guardar el repertorio:", error);
      showNotif("error", "❌ No se pudo actualizar la lista de hoy");
    }
  };

  const agregarAlRepertorio = (cancion) => {
    if (repertorio.includes(cancion.id)) return;
    guardarRepertorio([...repertorio, cancion.id]);
    showNotif("success", `✅ "${cancion.titulo}" agregada a la lista de hoy`);
  };

  const quitarDelRepertorio = (cancion) => {
    guardarRepertorio(repertorio.filter((id) => id !== cancion.id));
  };

  const vaciarRepertorio = async () => {
    const accepted = await confirmAction("¿Vaciar la lista de hoy?");
    if (!accepted) return;
    guardarRepertorio([]);
  };

  // Envía una lámina a la pantalla
  const proyectarDiapositiva = useCallback(
    (indice) => {
      if (!cancionActiva?.diapositivas?.length) return;

      const total = cancionActiva.diapositivas.length;
      if (indice < 0 || indice >= total) return;

      set(ref(database, `displayMessage/${userData.groupId}`), {
        text: cancionActiva.diapositivas[indice],
        display: "mensaje",
        timestamp: Date.now(),
      });

      // El título de la canción viaja por su propio canal
      set(ref(database, `displayTitulo/${userData.groupId}`), {
        text: cancionActiva.titulo,
        display: "titulo",
        timestamp: Date.now(),
      });

      setIndiceActual(indice);
    },
    [cancionActiva, userData?.groupId]
  );

  const siguiente = useCallback(() => {
    if (indiceActual === null) return proyectarDiapositiva(0);
    proyectarDiapositiva(indiceActual + 1);
  }, [indiceActual, proyectarDiapositiva]);

  const anterior = useCallback(() => {
    if (indiceActual === null) return;
    proyectarDiapositiva(indiceActual - 1);
  }, [indiceActual, proyectarDiapositiva]);

  // Flechas del teclado para operar desde el computador sin usar el mouse
  useEffect(() => {
    if (!cancionActiva) return;

    const manejarTecla = (evento) => {
      // No robar las flechas mientras se escribe
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
  }, [cancionActiva, siguiente, anterior]);

  // Visibilidad del titulo
  const toggleVisibleTitulo = () => {
    const nuevoEstado = !visibleTitulo;
    setVisibleTitulo(nuevoEstado);

    update(ref(database, `displayVisibleTitulo/${userData.groupId}`), {
      visibleTitulo: nuevoEstado,
      timestamp: Date.now(),
    });
  };

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

  // Deja en pantalla el título y la letra, y apaga el ticker
  const setAllVisible = () => {
    setVisibleTitulo(true);
    setVisibleTexto(true);
    setVisibleTicker(false);
    const timestamp = Date.now();

    update(ref(database, `displayVisibleTitulo/${userData.groupId}`), {
      visibleTitulo: true,
      timestamp,
    });

    update(ref(database, `displayVisibleTexto/${userData.groupId}`), {
      visibleTexto: true,
      timestamp,
    });

    set(ref(database, `displayVisibleTicker/${userData.groupId}`), {
      visibleTicker: false,
      timestamp,
    });
  };

  const limpiarFormulario = () => {
    setEditando(false);
    setIdEditando(null);
    setTitulo("");
    setLetra("");
  };

  // Guardar canción nueva o los cambios de una propia
  const guardarCancion = async () => {
    if (!titulo.trim()) {
      showNotif("warning", "🚫 Ponle un título a la canción");
      return;
    }

    const diapositivas = partirLetra(letra);

    if (diapositivas.length === 0) {
      showNotif("warning", "🚫 Escribe o pega la letra de la canción");
      return;
    }

    try {
      const datos = {
        titulo: titulo.trim(),
        diapositivas,
        updatedAt: serverTimestamp(),
      };

      if (idEditando) {
        await setDoc(doc(db, CANCIONES, idEditando), datos, { merge: true });
        showNotif("success", `🔄 "${datos.titulo}" actualizada`);
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
          `✅ "${datos.titulo}" guardada con ${diapositivas.length} láminas`
        );
      }

      limpiarFormulario();
    } catch (error) {
      console.error("Error al guardar la canción:", error);
      showNotif("error", "❌ No se pudo guardar la canción");
    }
  };

  const editarCancion = (cancion) => {
    setEditando(true);
    setIdEditando(cancion.id);
    setTitulo(cancion.titulo);
    setLetra(cancion.diapositivas.join("\n\n"));
  };

  const eliminarCancion = async (cancion) => {
    const accepted = await confirmAction(
      `¿Eliminar "${cancion.titulo}" del catálogo? La dejarás de ver tú y las demás iglesias.`
    );
    if (!accepted) return;

    try {
      await deleteDoc(doc(db, CANCIONES, cancion.id));

      if (repertorio.includes(cancion.id)) {
        guardarRepertorio(repertorio.filter((id) => id !== cancion.id));
      }

      if (cancionActiva?.id === cancion.id) {
        setCancionActiva(null);
        setIndiceActual(null);
      }

      showNotif("success", "🗑️ Canción eliminada");
    } catch (error) {
      console.error("Error al eliminar la canción:", error);
      showNotif("error", "❌ No se pudo eliminar la canción");
    }
  };

  const abrirCancion = (cancion) => {
    setCancionActiva(cancion);
    setIndiceActual(null);
  };

  return (
    <div className="min-h-svh bg-linear-to-b from-app-dark/50 to-app-light/50">
      {/* ENCABEZADO */}
      <div className="sticky top-0 border-b border-app-main bg-app-light z-10 px-2">
        <div className="flex items-center justify-between gap-2 py-1">
          <h1 className="font-bold text-app-main flex items-center gap-1 truncate">
            <MusicalNoteIcon className="w-5 h-5 shrink-0" />
            <span className="truncate">
              {cancionActiva ? cancionActiva.titulo : "Canciones"}
            </span>
          </h1>

          <div className="flex items-center gap-2 shrink-0">
            {cancionActiva && (
              <button
                onClick={() => {
                  setCancionActiva(null);
                  setIndiceActual(null);
                }}
                className="text-xs sm:text-sm font-bold text-app-muted px-2 py-1 rounded inset-shadow-sm inset-shadow-app-muted hover:text-app-main"
              >
                Ver lista
              </button>
            )}

            <button
              onClick={() => navigate("/ViewGestion")}
              className="px-3 py-1.5 boton-salida"
            >
              Salida
            </button>

            {/* Visibilidad */}
            {isDesktop ? (
              <div className="flex items-center gap-3">
                <button onClick={toggleVisibleTicker}>
                  <TagIcon
                    className={`w-7 h-7 ${
                      visibleTicker ? "text-app-success" : "text-app-muted"
                    }`}
                  />
                </button>
                <button onClick={toggleVisibleTitulo}>
                  <BookmarkIcon
                    className={`w-7 h-7 ${
                      visibleTitulo ? "text-app-accent" : "text-app-muted"
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
              <ModalVisibilidad
                toggleVisibleTicker={toggleVisibleTicker}
                toggleVisibleTitulo={toggleVisibleTitulo}
                toggleVisibleTexto={toggleVisibleTexto}
                setAllVisible={setAllVisible}
                colorClass={"text-app-success"}
              />
            )}
          </div>
        </div>

        {/* Controles de avance, solo con una canción abierta */}
        {cancionActiva && (
          <div className="flex items-center gap-2 pb-2">
            <button
              onClick={anterior}
              disabled={indiceActual === null || indiceActual === 0}
              className={`flex-1 py-2 rounded flex items-center justify-center gap-1 font-bold ${
                indiceActual === null || indiceActual === 0
                  ? "bg-transparent border-2 border-app-border text-app-border cursor-not-allowed"
                  : "bg-app-light border-2 border-app-main text-app-main cursor-pointer"
              }`}
            >
              <ChevronLeftIcon className="w-5 h-5" />
              Anterior
            </button>

            <span className="text-xs text-app-muted w-16 text-center">
              {indiceActual === null
                ? `${cancionActiva.diapositivas.length} láminas`
                : `${indiceActual + 1} / ${cancionActiva.diapositivas.length}`}
            </span>

            <button
              onClick={siguiente}
              disabled={
                indiceActual !== null &&
                indiceActual >= cancionActiva.diapositivas.length - 1
              }
              className={`flex-1 py-2 rounded flex items-center justify-center gap-1 font-bold ${
                indiceActual !== null &&
                indiceActual >= cancionActiva.diapositivas.length - 1
                  ? "bg-transparent border-2 border-app-border text-app-border cursor-not-allowed"
                  : "bg-green-500 text-white cursor-pointer"
              }`}
            >
              Siguiente
              <ChevronRightIcon className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* CANCIÓN ABIERTA: sus láminas */}
      {cancionActiva ? (
        <div className="p-2 sm:p-4">
          {isDesktop && (
            <p className="text-xs text-app-muted mb-2">
              Usa las flechas del teclado para avanzar y retroceder.
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {cancionActiva.diapositivas.map((bloque, indice) => (
              <button
                key={indice}
                onClick={() => proyectarDiapositiva(indice)}
                className={`text-left p-3 rounded-lg border-2 transition-colors whitespace-pre-wrap ${
                  indiceActual === indice
                    ? "border-app-success bg-app-success/10"
                    : "border-app-border hover:border-app-main"
                }`}
              >
                <span className="block text-xs font-bold text-app-main mb-1">
                  Lámina {indice + 1}
                  {indiceActual === indice && " · en pantalla"}
                </span>
                <span className="text-sm text-app-muted leading-relaxed">
                  {bloque}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-2 sm:p-4 flex flex-col gap-4">
          {/* LISTA DE HOY: privada de cada iglesia */}
          <div className="bg-app-light border-2 border-app-main rounded-lg p-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <h2 className="font-bold text-app-main">
                Canciones de hoy ({cancionesDelDia.length})
              </h2>
              {cancionesDelDia.length > 0 && (
                <button
                  onClick={vaciarRepertorio}
                  className="text-xs text-app-muted hover:text-app-error"
                >
                  Vaciar lista
                </button>
              )}
            </div>

            {cancionesDelDia.length === 0 ? (
              <p className="text-sm text-app-muted">
                Busca abajo las canciones del servicio y tócalas con el
                <PlusIcon className="w-4 h-4 inline mx-1" />
                para armar la lista de hoy.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {cancionesDelDia.map((cancion, orden) => (
                  <div
                    key={cancion.id}
                    className="flex items-center gap-2 border border-app-border rounded-lg px-3 py-2 hover:border-app-main transition-colors"
                  >
                    <span className="text-app-main font-bold w-5 text-center">
                      {orden + 1}
                    </span>

                    <button
                      onClick={() => abrirCancion(cancion)}
                      className="flex-1 text-left"
                    >
                      <span className="block font-semibold text-app-main">
                        {cancion.titulo}
                      </span>
                      <span className="text-xs text-app-muted">
                        {cancion.diapositivas?.length || 0} láminas
                      </span>
                    </button>

                    <button
                      onClick={() => quitarDelRepertorio(cancion)}
                      title="Quitar de la lista de hoy"
                      className="p-2 rounded-full hover:bg-app-border"
                    >
                      <MinusIcon className="w-5 h-5 text-app-muted hover:text-app-error" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* CATÁLOGO COMPARTIDO */}
            <div>
              <h2 className="font-bold text-app-main mb-2">
                Catálogo de canciones
              </h2>

              <div className="flex items-center gap-2 mb-2 bg-app-light border-2 border-app-border rounded-full px-3">
                <MagnifyingGlassIcon className="w-5 h-5 text-app-main" />
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar canción..."
                  className="flex-1 bg-transparent py-2 text-app-muted focus:outline-none"
                />
              </div>

              {cancionesFiltradas.length === 0 ? (
                <p className="text-app-muted text-sm p-2">
                  {canciones.length === 0
                    ? "El catálogo está vacío. Agrega la primera canción."
                    : "Ninguna canción coincide con la búsqueda."}
                </p>
              ) : (
                <div className="flex flex-col gap-2 max-h-96 overflow-y-auto scrollbar-custom pr-1">
                  {cancionesFiltradas.map((cancion) => (
                    <div
                      key={cancion.id}
                      className="flex items-center gap-2 border border-app-border rounded-lg px-3 py-2 hover:border-app-main transition-colors"
                    >
                      <button
                        onClick={() => abrirCancion(cancion)}
                        className="flex-1 text-left min-w-0"
                      >
                        <span className="block font-semibold text-app-main truncate">
                          {cancion.titulo}
                        </span>
                        <span className="text-xs text-app-muted">
                          {cancion.diapositivas?.length || 0} láminas
                          {!esMia(cancion) && cancion.iglesia
                            ? ` · ${cancion.iglesia}`
                            : ""}
                        </span>
                      </button>

                      <button
                        onClick={() => agregarAlRepertorio(cancion)}
                        disabled={repertorio.includes(cancion.id)}
                        title="Agregar a la lista de hoy"
                        className={`p-2 rounded-full ${
                          repertorio.includes(cancion.id)
                            ? "text-app-success cursor-default"
                            : "text-app-muted hover:bg-app-border hover:text-app-main"
                        }`}
                      >
                        <PlusIcon className="w-5 h-5" />
                      </button>

                      {/* Solo se edita y borra lo que subió esta iglesia */}
                      {esMia(cancion) && (
                        <>
                          <button
                            onClick={() => editarCancion(cancion)}
                            title="Editar"
                            className="p-2 rounded-full hover:bg-app-border"
                          >
                            <PencilIcon className="w-5 h-5 text-app-muted" />
                          </button>

                          <button
                            onClick={() => eliminarCancion(cancion)}
                            title="Eliminar"
                            className="p-2 rounded-full hover:bg-app-border"
                          >
                            <TrashIcon className="w-5 h-5 text-app-muted hover:text-app-error" />
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* FORMULARIO */}
            <div className="bg-app-light border-2 border-app-border rounded-lg p-3 h-fit">
              <h2 className="font-bold text-app-main mb-2">
                {editando ? "Editar canción" : "Agregar canción al catálogo"}
              </h2>

              <input
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Título de la canción"
                className="w-full mb-2 p-2 rounded border border-app-border text-app-muted focus:outline-none focus:ring-2 focus:ring-app-main"
              />

              <textarea
                value={letra}
                onChange={(e) => setLetra(e.target.value)}
                placeholder={
                  "Pega aquí la letra completa.\n\n" +
                  "Deja un renglón en blanco entre estrofa y estrofa:\n" +
                  "cada bloque será una lámina en la pantalla."
                }
                className="w-full h-64 p-2 rounded border border-app-border text-app-muted resize-none scrollbar-custom focus:outline-none focus:ring-2 focus:ring-app-main"
              />

              <p className="text-xs text-app-muted mt-1">
                {partirLetra(letra).length} lámina
                {partirLetra(letra).length === 1 ? "" : "s"} se crearán
              </p>

              <div className="flex gap-2 mt-2">
                <button
                  onClick={guardarCancion}
                  className="flex-1 py-2 rounded bg-green-500 text-white font-bold flex items-center justify-center gap-1"
                >
                  <PlusIcon className="w-5 h-5" />
                  {editando ? "Guardar cambios" : "Guardar canción"}
                </button>

                {editando && (
                  <button
                    onClick={limpiarFormulario}
                    className="flex-1 py-2 rounded font-bold text-app-muted inset-shadow-sm inset-shadow-app-muted hover:text-app-error"
                  >
                    Cancelar
                  </button>
                )}
              </div>

              <p className="text-[11px] text-app-muted mt-2">
                El catálogo es común a todas las iglesias. La lista de hoy es
                solo tuya.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
