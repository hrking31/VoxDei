import { useState } from "react";
import { addDoc, deleteDoc, setDoc } from "firebase/firestore";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/solid";
import { useAuth } from "../Context/AuthContext";
import { useAppContext } from "../Context/AppContext";
import { CARGOS, colIglesia, docIglesia } from "../Firebase/RutasIglesia";
import CampoConLista from "./CampoConLista.jsx";
import {
  CARGOS_BASICOS,
  SUGERENCIAS_CARGO,
  ordenarCargos,
} from "./programacion.js";

// Catálogo de cargos de la iglesia (Conductor, Proyección, Alabanza...), editable por
// pastor, pastora y líder (25-11-2026). Un cargo con «Proyecta» da el turno de la
// pantalla a quien lo tenga ese día. Cada cambio se guarda al momento.
export default function AdministrarCargos({ cargos }) {
  const { userData } = useAuth();
  const { showNotif, confirmAction } = useAppContext();
  const [nombre, setNombre] = useState("");
  const groupId = userData?.groupId;
  const lista = ordenarCargos(cargos);

  const intentar = async (accion, errorTexto) => {
    try {
      await accion();
      return true;
    } catch (error) {
      console.error(errorTexto, error);
      showNotif("error", `${errorTexto} Revisa tu conexión.`);
      return false;
    }
  };

  const usarBasicos = () =>
    intentar(
      () =>
        Promise.all(
          CARGOS_BASICOS.map(({ id, ...datos }) =>
            setDoc(docIglesia(groupId, CARGOS, id), datos),
          ),
        ),
      "No se pudieron crear los cargos.",
    );

  const agregar = async (evento) => {
    evento.preventDefault();
    const limpio = nombre.trim();
    if (!limpio) {
      showNotif("warning", "Escribe el nombre del cargo.");
      return;
    }
    if (lista.some((c) => c.nombre.toLowerCase() === limpio.toLowerCase())) {
      showNotif("warning", "Ya hay un cargo con ese nombre.");
      return;
    }
    const orden =
      lista.reduce((mayor, c) => Math.max(mayor, c.orden ?? 0), -1) + 1;
    const ok = await intentar(
      () =>
        addDoc(colIglesia(groupId, CARGOS), {
          nombre: limpio,
          orden,
          proyecta: false,
        }),
      "No se pudo agregar el cargo.",
    );
    if (ok) {
      setNombre("");
    }
  };

  const alternarProyecta = (cargo) => {
    const { id, ...datos } = cargo;
    return intentar(
      () =>
        setDoc(docIglesia(groupId, CARGOS, id), {
          ...datos,
          proyecta: !cargo.proyecta,
        }),
      "No se pudo cambiar el cargo.",
    );
  };

  const eliminar = async (cargo) => {
    if (
      !(await confirmAction(
        `¿Eliminar el cargo «${cargo.nombre}»? Las personas ya asignadas a él dejan de verse.`,
      ))
    )
      return;
    await intentar(
      () => deleteDoc(docIglesia(groupId, CARGOS, cargo.id)),
      "No se pudo eliminar el cargo.",
    );
  };

  return (
    <div data-administrar-cargos className="flex flex-col gap-3">
      {lista.length === 0 && (
        <div className="flex flex-col gap-2 rounded-lg border border-app-border p-3">
          <p className="m-0 text-xs text-app-muted">
            Aún no hay cargos. Empieza con los básicos y cámbialos a tu gusto:
            Conductor, Alabanza, Predica, Bienvenida, Oración, Ofrendas,
            Proyección, Sonido y Niños.
          </p>
          <button
            type="button"
            onClick={usarBasicos}
            className="rounded-lg bg-app-main py-2 text-sm font-bold text-app-dark transition hover:bg-app-main/90"
          >
            Usar los cargos básicos
          </button>
        </div>
      )}

      {lista.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {lista.map((cargo) => (
            <li
              key={cargo.id}
              className="flex items-center gap-2 rounded-lg border border-app-border px-3 py-1.5"
            >
              <span className="min-w-0 flex-1 truncate text-sm text-app-texto">
                {cargo.nombre}
              </span>
              <label
                className="flex shrink-0 items-center gap-1 text-xs text-app-muted"
                title="Quien lo tenga ese día puede proyectar"
              >
                <input
                  type="checkbox"
                  aria-label={`Proyecta: ${cargo.nombre}`}
                  checked={Boolean(cargo.proyecta)}
                  onChange={() => alternarProyecta(cargo)}
                  className="h-4 w-4 accent-app-main"
                />
                Proyecta
              </label>
              <button
                type="button"
                onClick={() => eliminar(cargo)}
                aria-label={`Eliminar el cargo ${cargo.nombre}`}
                className="shrink-0 rounded p-1 text-app-muted transition hover:text-app-error"
              >
                <TrashIcon className="h-4 w-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={agregar} className="flex flex-col gap-2">
        <div className="flex gap-2">
          <CampoConLista
            etiqueta="Nombre del cargo nuevo"
            valor={nombre}
            alCambiar={setNombre}
            opciones={SUGERENCIAS_CARGO}
            placeholder="Escoge o escribe"
            claseEtiqueta="sr-only"
            claseCampo="w-full rounded-lg border border-app-border bg-app-light p-2 text-sm text-app-muted focus:outline-none focus:ring-2 focus:ring-app-main"
            className="min-w-0 flex-1"
          />
          <button
            type="submit"
            className="flex shrink-0 items-center gap-1 rounded px-3 py-1.5 text-sm font-bold text-app-main inset-shadow-sm inset-shadow-app-main transition hover:bg-app-main hover:text-app-dark"
          >
            <PlusIcon className="h-4 w-4" aria-hidden="true" />
            Agregar cargo
          </button>
        </div>
      </form>
    </div>
  );
}
