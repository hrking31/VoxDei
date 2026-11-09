import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import {
  CalendarDaysIcon,
  MusicalNoteIcon,
  PlusIcon,
  StarIcon,
  TrashIcon,
  PencilIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";
import { db } from "../Firebase/Firebase";
import {
  docIglesia,
  CANCIONES,
  REPERTORIO,
  REPERTORIO_ACTUAL,
} from "../Firebase/RutasIglesia";
import { useAppContext } from "../Context/AppContext";
import { useAuth } from "../../Components/Context/AuthContext";
import { normalizar } from "../Canciones/UtilesCanciones";
import BotonSalida from "../Navegacion/BotonSalida.jsx";

// Cuántas favoritas se muestran: las mismas en ambos casos, pero en el celular
// van en una columna y en el computador en dos, más grandes.
const TOPE_FAVORITAS = 20;

// Catálogo de canciones y lista del día. Esta pantalla solo gestiona: no toca
// la proyección. Para eso está `ControlCancionProyectar`, en su propia ruta.
export default function ControlCanciones() {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const { showNotif, confirmAction, isDesktop } = useAppContext();

  // Catálogo común a todas las iglesias
  const [canciones, setCanciones] = useState([]);
  // Ids de las canciones que esta iglesia usará hoy
  const [repertorio, setRepertorio] = useState([]);
  // Favoritas de esta iglesia, elegidas a mano con la estrella. Viven en su
  // documento de repertorio y no en la canción: las reglas solo dejan modificar
  // una canción a la iglesia que la subió, así que marcar una ajena fallaría.
  const [favoritas, setFavoritas] = useState([]);
  const [busqueda, setBusqueda] = useState("");

  const buscadorRef = useRef(null);

  // Catálogo compartido, en vivo
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, CANCIONES),
      (snapshot) => {
        const data = snapshot.docs.map((documento) => ({
          id: documento.id,
          ...documento.data(),
        }));
        setCanciones(data);
      },
      (error) => {
        console.error("Error al cargar las canciones:", error);
        showNotif("error", "No se pudieron cargar las canciones");
      }
    );

    return () => unsubscribe();
  }, []);

  // Repertorio y favoritas de esta iglesia, en vivo
  useEffect(() => {
    if (!userData?.groupId) return;

    const unsubscribe = onSnapshot(
      docIglesia(userData.groupId, REPERTORIO, REPERTORIO_ACTUAL),
      (snapshot) => {
        setRepertorio(snapshot.data()?.canciones || []);
        setFavoritas(snapshot.data()?.favoritas || []);
      },
      (error) => {
        console.error("Error al cargar el repertorio:", error);
      }
    );

    return () => unsubscribe();
  }, [userData?.groupId]);

  const hayBusqueda = busqueda.trim().length > 0;

  // Cerrar la lista desplegable al tocar fuera o con Escape
  useEffect(() => {
    if (!hayBusqueda) return;

    const alTocarFuera = (evento) => {
      if (buscadorRef.current && !buscadorRef.current.contains(evento.target)) {
        setBusqueda("");
      }
    };
    const alPulsarEscape = (evento) => {
      if (evento.key === "Escape") setBusqueda("");
    };

    document.addEventListener("mousedown", alTocarFuera);
    document.addEventListener("keydown", alPulsarEscape);
    return () => {
      document.removeEventListener("mousedown", alTocarFuera);
      document.removeEventListener("keydown", alPulsarEscape);
    };
  }, [hayBusqueda]);

  const coincidencias = canciones
    .filter((cancion) =>
      normalizar(cancion.titulo).includes(normalizar(busqueda))
    )
    .sort((a, b) => normalizar(a.titulo).localeCompare(normalizar(b.titulo)));

  // Las favoritas de la iglesia, en el orden en que se marcaron
  const cancionesFavoritas = favoritas
    .map((id) => canciones.find((cancion) => cancion.id === id))
    .filter(Boolean)
    .slice(0, TOPE_FAVORITAS);

  // Las canciones del día, en el orden en que se agregaron
  const cancionesDelDia = repertorio
    .map((id) => canciones.find((cancion) => cancion.id === id))
    .filter(Boolean);

  // Solo se puede editar o borrar lo que subió la propia iglesia
  const esMia = (cancion) => cancion?.creadoPor === userData?.groupId;
  const esFavorita = (cancion) => favoritas.includes(cancion.id);

  // Ambas listas viven en el mismo documento: se escribe con `merge` para que
  // tocar una no borre la otra.
  const guardarEnRepertorio = async (datos) => {
    try {
      await setDoc(
        docIglesia(userData.groupId, REPERTORIO, REPERTORIO_ACTUAL),
        { ...datos, updatedAt: serverTimestamp() },
        { merge: true }
      );
    } catch (error) {
      console.error("Error al guardar en el repertorio:", error);
      showNotif("error", "No se pudo guardar el cambio");
    }
  };

  const guardarRepertorio = (ids) => guardarEnRepertorio({ canciones: ids });

  const alternarFavorita = (cancion) => {
    const nuevas = esFavorita(cancion)
      ? favoritas.filter((id) => id !== cancion.id)
      : [...favoritas, cancion.id];

    guardarEnRepertorio({ favoritas: nuevas });
  };

  const agregarAlRepertorio = (cancion) => {
    if (repertorio.includes(cancion.id)) return;
    guardarRepertorio([...repertorio, cancion.id]);
  };

  const quitarDelRepertorio = (cancion) => {
    guardarRepertorio(repertorio.filter((id) => id !== cancion.id));
  };

  const vaciarRepertorio = async () => {
    const accepted = await confirmAction("¿Vaciar la lista de hoy?");
    if (!accepted) return;
    guardarRepertorio([]);
  };

  const eliminarCancion = async (cancion) => {
    const accepted = await confirmAction(
      `¿Eliminar "${cancion.titulo}" del catálogo? La dejarás de ver tú y las demás iglesias.`
    );
    if (!accepted) return;

    try {
      await deleteDoc(doc(db, CANCIONES, cancion.id));

      // Si estaba en la lista de hoy o entre las favoritas, se quita de ahí
      if (repertorio.includes(cancion.id)) {
        guardarRepertorio(repertorio.filter((id) => id !== cancion.id));
      }
      if (esFavorita(cancion)) {
        guardarEnRepertorio({
          favoritas: favoritas.filter((id) => id !== cancion.id),
        });
      }

      showNotif("success", "Canción eliminada");
    } catch (error) {
      console.error("Error al eliminar la canción:", error);
      showNotif("error", "No se pudo eliminar la canción");
    }
  };

  // Los cuatro botones que acompañan a una canción en el desplegable
  const accionesDe = (cancion) => (
    <>
      <button
        onClick={() => alternarFavorita(cancion)}
        title={esFavorita(cancion) ? "Quitar de favoritas" : "Hacer favorita"}
        className="p-1 rounded-full hover:bg-app-border shrink-0"
      >
        <StarIcon
          className={`w-5 h-5 ${
            esFavorita(cancion)
              ? "text-app-main"
              : "text-app-border hover:text-app-muted"
          }`}
        />
      </button>

      <button
        onClick={() => agregarAlRepertorio(cancion)}
        disabled={repertorio.includes(cancion.id)}
        title="Agregar a la lista de hoy"
        className={`p-1 rounded-full shrink-0 ${
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
            onClick={() => navigate(`/ViewCancionEditar/${cancion.id}`)}
            title="Editar"
            className="p-1 rounded-full hover:bg-app-border shrink-0"
          >
            <PencilIcon className="w-5 h-5 text-app-muted" />
          </button>

          <button
            onClick={() => eliminarCancion(cancion)}
            title="Eliminar"
            className="p-1 rounded-full hover:bg-app-border shrink-0"
          >
            <TrashIcon className="w-5 h-5 text-app-muted hover:text-app-error" />
          </button>
        </>
      )}
    </>
  );

  // El listado de coincidencias. Es el mismo contenido en las dos formas de
  // mostrarlo: colgado de la caja en el computador y ocupando el hueco entero
  // en el celular.
  const resultados =
    coincidencias.length === 0 ? (
      <p className="text-app-muted text-sm p-3">
        Ninguna canción coincide con la búsqueda.
      </p>
    ) : (
      coincidencias.map((cancion) => (
        <div
          key={cancion.id}
          className="flex items-center gap-1 px-2 py-1 border-b border-app-border last:border-b-0 hover:bg-app-border/40"
        >
          <button
            onClick={() => navigate(`/ViewCancion/${cancion.id}`)}
            className="flex-1 text-left min-w-0 py-1"
          >
            <span className="block font-semibold text-app-main truncate">
              {cancion.titulo}
            </span>
          </button>

          {accionesDe(cancion)}
        </div>
      ))
    );

  // La pantalla mide lo que la ventana y no se desplaza: cada bloque se
  // desplaza por dentro.
  return (
    <div className="h-svh flex flex-col overflow-hidden bg-linear-to-b from-app-dark/50 to-app-light/50">
      {/* ENCABEZADO */}
      <div className="shrink-0 border-b border-app-main bg-app-light px-2">
        <div className="flex items-center justify-between gap-2 py-1">
          <h1 className="font-bold text-app-main flex items-center gap-1 truncate">
            <MusicalNoteIcon className="w-5 h-5 shrink-0" />
            <span className="truncate">Canciones</span>
          </h1>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => navigate("/ViewCancionEditar")}
              className="px-3 py-1.5 text-xs sm:text-sm font-bold text-app-main rounded inset-shadow-sm inset-shadow-app-main hover:bg-app-main hover:text-app-dark transition flex items-center gap-1"
            >
              <PlusIcon className="w-4 h-4" />
              Canciones
            </button>

            <BotonSalida className="px-3 py-1.5" />
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col gap-2 p-2 sm:p-4">
        {/* Velo que apaga el resto de la pantalla mientras se busca, para que
            la lista desplegada no se confunda con los recuadros de abajo. Va
            fuera del buscador a propósito: así tocarlo cuenta como "tocar
            fuera" y cierra la lista */}
        {hayBusqueda && (
          <div className="fixed inset-0 z-20 bg-app-dark/70" aria-hidden="true" />
        )}

        {/* BUSCADOR: al escribir se despliegan los nombres que coinciden. El
            ref abarca también la lista del celular, para que tocar un
            resultado no cuente como "tocar fuera" y la cierre antes de tiempo */}
        <div
          ref={buscadorRef}
          className={`relative z-30 sm:mb-2 flex flex-col gap-2 ${
            hayBusqueda && !isDesktop ? "flex-1 min-h-0" : "shrink-0"
          }`}
        >
          <div className="shrink-0 flex items-center gap-2">
            <div className="relative flex-1 min-w-0">
              <div className="flex items-center gap-2 bg-app-light border-2 border-app-border rounded-full px-3">
                {/* En el celular la lupa se vuelve X para limpiar, que ahorra
                    ancho; en el computador se queda y la X va al otro extremo.
                    Se pinta siempre como botón para que el alto no salte */}
                {isDesktop ? (
                  <MagnifyingGlassIcon className="w-5 h-5 text-app-main shrink-0" />
                ) : (
                  <button
                    onClick={() => setBusqueda("")}
                    disabled={!hayBusqueda}
                    title={hayBusqueda ? "Limpiar la búsqueda" : "Buscar"}
                    className={`shrink-0 p-1 rounded-full ${
                      hayBusqueda ? "hover:bg-app-border" : "cursor-default"
                    }`}
                  >
                    {hayBusqueda ? (
                      <XMarkIcon className="w-5 h-5 text-app-muted hover:text-app-error" />
                    ) : (
                      <MagnifyingGlassIcon className="w-5 h-5 text-app-main" />
                    )}
                  </button>
                )}

                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar canción..."
                  className="flex-1 bg-transparent py-2 text-app-muted focus:outline-none"
                />

                {/* En el celular la cuenta va aquí dentro y en corto */}
                {!isDesktop && (
                  <span className="shrink-0 text-sm text-app-muted">
                    <span
                      className="inline-block text-right tabular-nums"
                      style={{ minWidth: `${String(canciones.length).length}ch` }}
                    >
                      {coincidencias.length}
                    </span>{" "}
                    de {canciones.length}
                  </span>
                )}

                {/* En el computador, la X de limpiar al final de la caja */}
                {isDesktop && hayBusqueda && (
                  <button
                    onClick={() => setBusqueda("")}
                    title="Limpiar la búsqueda"
                    className="p-1 rounded-full hover:bg-app-border shrink-0"
                  >
                    <XMarkIcon className="w-5 h-5 text-app-muted hover:text-app-error" />
                  </button>
                )}
              </div>

              {/* En el computador la lista cuelga de la caja */}
              {isDesktop && hayBusqueda && (
                <div className="absolute top-full left-0 right-0 mt-1 z-30 max-h-80 overflow-y-auto scrollbar-custom bg-app-light border-2 border-app-border rounded-lg ring-1 ring-white/10 shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
                  {resultados}
                </div>
              )}
            </div>

            {/* En el computador la cuenta va afuera y completa, pegada al borde
                de abajo de la fila. Al número se le reserva el ancho del total,
                con cifras de ancho fijo, para que el texto no baile ni mueva la
                caja mientras se escribe */}
            {isDesktop && (
              <span className="shrink-0 self-end pb-1 text-base text-app-muted">
                <span
                  className="inline-block text-right tabular-nums"
                  style={{ minWidth: `${String(canciones.length).length}ch` }}
                >
                  {coincidencias.length}
                </span>{" "}
                canciones de {canciones.length}
              </span>
            )}
          </div>

          {/* En el celular la lista ocupa el hueco entero y los recuadros se
              ocultan: así no queda nada detrás con qué confundirla */}
          {!isDesktop && hayBusqueda && (
            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-custom bg-app-light border-2 border-app-border rounded-lg ring-1 ring-white/10 shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
              {resultados}
            </div>
          )}
        </div>

        {/* CANCIONES DE HOY */}
        <div
          className={`basis-2/5 grow-0 shrink-0 min-h-0 flex flex-col bg-app-light border-2 border-app-main rounded-lg p-2 ${
            !isDesktop && hayBusqueda ? "hidden" : ""
          }`}
        >
          <div className="shrink-0 flex items-center justify-between gap-2 mb-1">
            <h2 className="font-bold text-app-main flex items-center gap-1 min-w-0">
              <CalendarDaysIcon className="w-5 h-5 text-app-main shrink-0" />
              <span className="truncate">Canciones de hoy</span>

              {/* La cuenta, en un chip gris para no competir con el título */}
              <span className="ml-3 shrink-0 rounded-full bg-app-border/40 px-2 py-0.5 text-xs font-normal text-app-muted">
                {cancionesDelDia.length} canciones
              </span>
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
              Busca arriba las canciones del servicio y tócalas con el
              <PlusIcon className="w-4 h-4 inline mx-1" />
              para armar la lista de hoy.
            </p>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-custom pr-1 grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-2 content-start">
              {cancionesDelDia.map((cancion, orden) => (
                <div
                  key={cancion.id}
                  className="flex items-center gap-2 border border-app-border rounded-lg px-2 sm:px-3 py-1 sm:py-2 hover:border-app-main transition-colors"
                >
                  <span className="text-app-main font-bold w-5 text-center shrink-0">
                    {orden + 1}
                  </span>

                  <button
                    onClick={() => navigate(`/ViewCancion/${cancion.id}`)}
                    className="flex-1 text-left min-w-0"
                  >
                    <span className="flex items-baseline gap-1 min-w-0">
                      <span className="font-semibold text-app-main truncate sm:text-lg">
                        {cancion.titulo}
                      </span>
                      <span className="text-[11px] text-app-muted shrink-0">
                        {cancion.diapositivas?.length || 0} láminas
                      </span>
                    </span>
                  </button>

                  <button
                    onClick={() => quitarDelRepertorio(cancion)}
                    title="Quitar de la lista de hoy"
                    className="p-1 rounded-full hover:bg-app-border shrink-0"
                  >
                    <TrashIcon className="w-5 h-5 text-app-muted hover:text-app-error" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* FAVORITAS: hasta 20, en una columna en el celular y dos, más
            grandes, en el computador */}
        <div
          className={`flex-1 min-h-0 flex flex-col bg-app-light border-2 border-app-border rounded-lg p-2 ${
            !isDesktop && hayBusqueda ? "hidden" : ""
          }`}
        >
          <div className="shrink-0 flex items-center justify-between gap-2 mb-1">
            <h2 className="font-bold text-app-main flex items-center gap-1 min-w-0">
              <StarIcon className="w-5 h-5 text-app-main shrink-0" />
              {/* El nombre de la iglesia recuerda que las favoritas son suyas */}
              <span className="truncate">
                Favoritas {userData?.churchName || ""}
              </span>

              {/* La cuenta, en un chip gris para no competir con el título */}
              <span className="ml-3 shrink-0 rounded-full bg-app-border/40 px-2 py-0.5 text-xs font-normal text-app-muted">
                {cancionesFavoritas.length} canciones
              </span>
            </h2>
          </div>

          {cancionesFavoritas.length === 0 ? (
            <p className="text-sm text-app-muted">
              Busca una canción arriba y tócale la estrella para tenerla siempre
              aquí.
            </p>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-custom pr-1 grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-2 content-start">
              {cancionesFavoritas.map((cancion) => (
                <div
                  key={cancion.id}
                  className="flex items-center gap-1 border border-app-border rounded-lg px-2 sm:px-3 py-1 sm:py-2 hover:border-app-main transition-colors"
                >
                  <button
                    onClick={() => navigate(`/ViewCancion/${cancion.id}`)}
                    className="flex-1 text-left min-w-0"
                  >
                    <span className="flex items-baseline gap-1 min-w-0">
                      <span className="font-semibold text-app-main truncate sm:text-lg">
                        {cancion.titulo}
                      </span>
                      <span className="text-[11px] text-app-muted shrink-0">
                        {cancion.diapositivas?.length || 0} láminas
                      </span>
                    </span>
                  </button>

                  {accionesDe(cancion)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
