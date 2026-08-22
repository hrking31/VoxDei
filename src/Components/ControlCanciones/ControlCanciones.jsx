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
  MusicalNoteIcon,
  PlusIcon,
  MinusIcon,
  StarIcon,
  TrashIcon,
  PencilIcon,
  MagnifyingGlassIcon,
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

// Alto aproximado de una fila del listado, con el hueco que la separa de la
// siguiente. Sirve para calcular cuántas caben sin desplazar la pantalla.
const ALTO_FILA = 58;
// A partir de este ancho el listado va a dos columnas (el `sm:` de Tailwind).
const ANCHO_DOS_COLUMNAS = 640;

// Catálogo de canciones y lista del día. Esta pantalla solo gestiona: no toca
// la proyección. Para eso está `ControlCancionProyectar`, en su propia ruta.
export default function ControlCanciones() {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const { showNotif, confirmAction } = useAppContext();

  // Catálogo común a todas las iglesias
  const [canciones, setCanciones] = useState([]);
  // Ids de las canciones que esta iglesia usará hoy
  const [repertorio, setRepertorio] = useState([]);
  // Favoritas de esta iglesia, elegidas a mano con la estrella. Viven en su
  // documento de repertorio y no en la canción: las reglas solo dejan modificar
  // una canción a la iglesia que la subió, así que marcar una ajena fallaría.
  const [favoritas, setFavoritas] = useState([]);
  const [busqueda, setBusqueda] = useState("");

  // Cuántas filas caben en el hueco del catálogo, para no desplazar la pantalla
  const [caben, setCaben] = useState(6);
  const listaRef = useRef(null);

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

  // Se mide el hueco disponible y se recalcula al girar el teléfono o cambiar
  // el tamaño de la ventana.
  useEffect(() => {
    const nodo = listaRef.current;
    if (!nodo) return;

    const medir = () => {
      const columnas = nodo.clientWidth >= ANCHO_DOS_COLUMNAS ? 2 : 1;
      const filas = Math.max(1, Math.floor(nodo.clientHeight / ALTO_FILA));
      setCaben(filas * columnas);
    };

    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(nodo);
    return () => observador.disconnect();
  }, []);

  const hayBusqueda = busqueda.trim().length > 0;

  const cancionesFiltradas = canciones
    .filter((cancion) =>
      normalizar(cancion.titulo).includes(normalizar(busqueda))
    )
    .sort((a, b) => normalizar(a.titulo).localeCompare(normalizar(b.titulo)));

  // Las favoritas de la iglesia, en el orden en que se marcaron
  const cancionesFavoritas = favoritas
    .map((id) => canciones.find((cancion) => cancion.id === id))
    .filter(Boolean);

  // Sin buscar se ven las favoritas, tantas como quepan. Al buscar, manda la
  // búsqueda y la lista se desplaza si hace falta.
  const listaMostrada = hayBusqueda
    ? cancionesFiltradas
    : cancionesFavoritas.slice(0, caben);

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

            <button
              onClick={() => navigate("/ViewGestion")}
              className="px-3 py-1.5 boton-salida"
            >
              Salida
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col gap-2 p-2 sm:p-4">
        {/* LISTA DE HOY: privada de cada iglesia. Ocupa el 40% del alto y se
            desplaza por dentro si hay muchas. */}
        <div className="basis-2/5 grow-0 shrink-0 min-h-0 flex flex-col bg-app-light border-2 border-app-main rounded-lg p-2">
          <div className="shrink-0 flex items-center justify-between gap-2 mb-1">
            <h2 className="font-bold text-app-main">
              Canciones de hoy {cancionesDelDia.length}
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
            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-custom pr-1 grid grid-cols-1 sm:grid-cols-2 gap-2 content-start">
              {cancionesDelDia.map((cancion, orden) => (
                <div
                  key={cancion.id}
                  className="flex items-center gap-2 border border-app-border rounded-lg px-3 py-1.5 hover:border-app-main transition-colors"
                >
                  <span className="text-app-main font-bold w-5 text-center">
                    {orden + 1}
                  </span>

                  <button
                    onClick={() => navigate(`/ViewCancion/${cancion.id}`)}
                    className="flex-1 text-left min-w-0"
                  >
                    <span className="block font-semibold text-app-main truncate">
                      {cancion.titulo}
                    </span>
                    <span className="text-xs text-app-muted">
                      {cancion.diapositivas?.length || 0} láminas
                    </span>
                  </button>

                  <button
                    onClick={() => quitarDelRepertorio(cancion)}
                    title="Quitar de la lista de hoy"
                    className="p-1.5 rounded-full hover:bg-app-border"
                  >
                    <MinusIcon className="w-5 h-5 text-app-muted hover:text-app-error" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CATÁLOGO COMPARTIDO: ocupa el 60% restante */}
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="shrink-0 flex items-center gap-2 bg-app-light border-2 border-app-border rounded-full px-3">
            <MagnifyingGlassIcon className="w-5 h-5 text-app-main" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar canción..."
              className="flex-1 bg-transparent py-2 text-app-muted focus:outline-none"
            />
          </div>

          <p className="shrink-0 text-[11px] text-app-muted px-2 py-1">
            {hayBusqueda
              ? `${cancionesFiltradas.length} de ${canciones.length} canciones`
              : `Favoritas · ${listaMostrada.length} de ${cancionesFavoritas.length}`}
          </p>

          {/* El hueco se mide aquí: es lo que decide cuántas favoritas caben */}
          <div ref={listaRef} className="flex-1 min-h-0">
            {listaMostrada.length === 0 ? (
              <p className="text-app-muted text-sm p-2">
                {canciones.length === 0
                  ? "El catálogo está vacío. Agrega la primera canción."
                  : hayBusqueda
                    ? "Ninguna canción coincide con la búsqueda."
                    : "Todavía no tienes favoritas. Busca una canción y tócale la estrella para tenerla siempre aquí."}
              </p>
            ) : (
              <div
                className={`h-full grid grid-cols-1 sm:grid-cols-2 gap-2 content-start ${
                  hayBusqueda ? "overflow-y-auto scrollbar-custom pr-1" : ""
                }`}
              >
                {listaMostrada.map((cancion) => (
                  <div
                    key={cancion.id}
                    className="flex items-center gap-2 border border-app-border rounded-lg px-3 py-1.5 hover:border-app-main transition-colors h-fit"
                  >
                    <button
                      onClick={() => alternarFavorita(cancion)}
                      title={
                        esFavorita(cancion)
                          ? "Quitar de favoritas"
                          : "Marcar como favorita"
                      }
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
                      onClick={() => navigate(`/ViewCancion/${cancion.id}`)}
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
                      className={`p-1.5 rounded-full ${
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
                          onClick={() =>
                            navigate(`/ViewCancionEditar/${cancion.id}`)
                          }
                          title="Editar"
                          className="p-1.5 rounded-full hover:bg-app-border"
                        >
                          <PencilIcon className="w-5 h-5 text-app-muted" />
                        </button>

                        <button
                          onClick={() => eliminarCancion(cancion)}
                          title="Eliminar"
                          className="p-1.5 rounded-full hover:bg-app-border"
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
        </div>
      </div>
    </div>
  );
}
