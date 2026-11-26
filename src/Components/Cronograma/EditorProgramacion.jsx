import { serverTimestamp, setDoc } from "firebase/firestore";
import { XMarkIcon } from "@heroicons/react/24/solid";
import { useAuth } from "../Context/AuthContext";
import { useAppContext } from "../Context/AppContext";
import { PROGRAMACION, docIglesia } from "../Firebase/RutasIglesia";
import {
  agregarPersona,
  ordenarCargos,
  personasDeCargo,
  quitarPersona,
} from "./programacion.js";
import { textoFechaProgramada } from "./textosProgramacion.js";

// Asigna las personas de cada cargo en UNA fecha concreta de un servicio (25-11-2026).
// Cada cambio se guarda al momento en iglesias/{groupId}/programacion/{servicioId}_{fecha};
// lo que se ve sale del documento que llega por InicializarEstados, así todos lo ven igual.
// Lo usan pastor, pastora y líder (firestore.rules lo vuelve a exigir).
export default function EditorProgramacion({
  ocurrencia,
  cargos,
  equipo,
  programacion,
}) {
  const { userData } = useAuth();
  const { showNotif } = useAppContext();
  const groupId = userData?.groupId;
  const asignaciones = programacion?.asignaciones || {};
  const lista = ordenarCargos(cargos);

  const guardar = async (nuevas) => {
    try {
      await setDoc(docIglesia(groupId, PROGRAMACION, ocurrencia.id), {
        servicioId: ocurrencia.servicio.id,
        fecha: ocurrencia.fecha,
        asignaciones: nuevas,
        actualizado: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error al guardar la programación:", error);
      showNotif(
        "error",
        "No se pudo guardar la programación. Revisa tu conexión.",
      );
    }
  };

  const agregar = (cargoId, uid) => {
    const persona = equipo.find((p) => p.uid === uid);
    if (persona) guardar(agregarPersona(asignaciones, cargoId, persona));
  };

  if (lista.length === 0) {
    return (
      <p className="m-0 text-sm text-app-muted">
        Primero crea los cargos del servicio (Conductor, Proyección...) en
        «Administrar cargos».
      </p>
    );
  }

  return (
    <div data-editor-programacion className="flex flex-col gap-4">
      <p className="m-0 text-xs text-app-muted">
        {textoFechaProgramada(ocurrencia)}
      </p>

      {lista.map((cargo) => {
        const personas = personasDeCargo(programacion, cargo.id);
        const libres = equipo.filter(
          (p) => !personas.some((a) => a.uid === p.uid),
        );
        return (
          <section
            key={cargo.id}
            aria-label={cargo.nombre}
            className="flex flex-col gap-1.5"
          >
            <h3 className="m-0 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-app-muted">
              {cargo.nombre}
              {cargo.proyecta && (
                <span
                  className="rounded-full border border-app-main/40 px-1.5 text-[0.65rem] normal-case tracking-normal text-app-main"
                  title="Quien lo tenga ese día puede proyectar"
                >
                  proyecta
                </span>
              )}
            </h3>

            {personas.length > 0 && (
              <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
                {personas.map((p) => (
                  <li
                    key={p.uid}
                    data-estado={p.estado}
                    className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-sm ${
                      p.estado === "no_puede"
                        ? "border-app-error text-app-error line-through"
                        : p.estado === "confirmado"
                          ? "border-app-success text-app-success"
                          : "border-app-border text-app-texto"
                    }`}
                  >
                    {p.nombre}
                    <button
                      type="button"
                      onClick={() =>
                        guardar(quitarPersona(asignaciones, cargo.id, p.uid))
                      }
                      aria-label={`Quitar a ${p.nombre} de ${cargo.nombre}`}
                      className="rounded-full p-0.5 text-app-muted transition hover:text-app-error"
                    >
                      <XMarkIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <select
              value=""
              onChange={(e) => agregar(cargo.id, e.target.value)}
              aria-label={`Agregar a ${cargo.nombre}`}
              disabled={libres.length === 0}
              className="w-full rounded-lg border border-app-border bg-app-light p-2 text-sm text-app-muted focus:outline-none focus:ring-2 focus:ring-app-main"
            >
              <option value="">
                {personas.length ? "Agregar otra persona" : "Elige una persona"}
              </option>
              {libres.map((p) => (
                <option key={p.uid} value={p.uid}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </section>
        );
      })}
    </div>
  );
}
