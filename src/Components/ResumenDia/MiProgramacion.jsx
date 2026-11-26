import { useMemo, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { ClipboardDocumentCheckIcon } from "@heroicons/react/24/solid";
import { functions } from "../Firebase/Firebase";
import { useAuth } from "../Context/AuthContext";
import { useAppContext } from "../Context/AppContext";
import { misTurnos } from "../Cronograma/programacion.js";

const TEXTO_ESTADO = {
  pendiente: "Sin responder",
  confirmado: "Confirmado",
  no_puede: "No puedes",
};

// «Mi programación» (25-11-2026, entrega 2): lo que te toca servir en las próximas fechas,
// con «Confirmo» y «No puedo». Sin cargos asignados, no se pinta. La respuesta la guarda la
// función `responderTurno`: quien no es pastor ni líder no puede escribir la programación.
export default function MiProgramacion({ ahora }) {
  const { user } = useAuth();
  const { servicios, programacion, cargos, showNotif } = useAppContext();
  const [enviando, setEnviando] = useState("");

  const turnos = useMemo(
    () =>
      misTurnos(servicios, programacion, cargos, user?.uid, ahora).slice(0, 4),
    [servicios, programacion, cargos, user?.uid, ahora],
  );
  if (!turnos.length) return null;

  const responder = async (turno, cargo, estado) => {
    const clave = `${turno.id}/${cargo.cargoId}`;
    setEnviando(clave);
    try {
      await httpsCallable(
        functions,
        "responderTurno",
      )({ id: turno.id, cargoId: cargo.cargoId, estado });
      showNotif(
        "success",
        estado === "confirmado"
          ? "Confirmado. ¡Gracias!"
          : "Listo, avisamos que no puedes.",
      );
    } catch (error) {
      console.error("Error al responder el turno:", error);
      showNotif(
        "error",
        error?.message ||
          "No se pudo guardar tu respuesta. Revisa tu conexión.",
      );
    } finally {
      setEnviando("");
    }
  };

  return (
    <section
      aria-label="Mi programación"
      data-mi-programacion
      className="flex flex-col gap-2 rounded-lg border border-app-border bg-app-light p-3 sm:col-span-2"
    >
      <h2 className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-app-muted">
        <ClipboardDocumentCheckIcon className="h-4 w-4" aria-hidden="true" />
        Mi programación
      </h2>
      <ul className="flex flex-col gap-2">
        {turnos.map((turno) => (
          <li
            key={turno.id}
            data-turno={turno.id}
            className="flex flex-col gap-1.5 rounded-md border border-app-border p-2.5"
          >
            <p className="text-sm font-semibold text-app-texto">
              {turno.servicio.nombre || "Servicio"} ·{" "}
              {new Date(turno.inicio).toLocaleDateString("es", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
              {", "}
              {turno.servicio.inicio}
            </p>
            {turno.cargos.map((cargo) => {
              const clave = `${turno.id}/${cargo.cargoId}`;
              return (
                <div
                  key={cargo.cargoId}
                  data-cargo={cargo.cargoId}
                  data-estado={cargo.estado}
                  className="flex flex-wrap items-center gap-2"
                >
                  <span className="text-sm text-app-muted">
                    {cargo.nombre} ·{" "}
                    <span
                      className={
                        cargo.estado === "confirmado"
                          ? "text-app-success"
                          : cargo.estado === "no_puede"
                            ? "text-app-error"
                            : ""
                      }
                    >
                      {TEXTO_ESTADO[cargo.estado]}
                    </span>
                  </span>
                  <span className="ml-auto flex gap-2">
                    {cargo.estado !== "confirmado" && (
                      <button
                        type="button"
                        disabled={enviando === clave}
                        onClick={() => responder(turno, cargo, "confirmado")}
                        className="rounded px-3 py-1.5 text-xs font-bold text-app-main inset-shadow-sm inset-shadow-app-main transition hover:bg-app-main hover:text-app-dark disabled:opacity-50 sm:text-sm"
                      >
                        Confirmo
                      </button>
                    )}
                    {cargo.estado !== "no_puede" && (
                      <button
                        type="button"
                        disabled={enviando === clave}
                        onClick={() => responder(turno, cargo, "no_puede")}
                        className="rounded px-3 py-1.5 text-xs font-bold text-app-muted transition hover:text-app-error disabled:opacity-50 sm:text-sm"
                      >
                        No puedo
                      </button>
                    )}
                  </span>
                </div>
              );
            })}
          </li>
        ))}
      </ul>
    </section>
  );
}
