import { useEffect, useRef } from "react";
import { UserPlusIcon, XMarkIcon } from "@heroicons/react/24/solid";
import CampoClave from "../CampoClave/CampoClave.jsx";
import RequisitosClave from "../RequisitosClave/RequisitosClave.jsx";

const GENEROS = ["Masculino", "Femenino"];

const CAMPO =
  "w-full rounded-lg border border-app-border bg-app-dark p-3 text-sm text-app-texto placeholder:text-app-muted focus:outline-none focus:ring-2 focus:ring-app-main transition";

// Botones de una sola elección (género y rol), en vez de un desplegable.
function Opciones({ nombre, opciones, valor, alElegir }) {
  return (
    <div role="radiogroup" aria-label={nombre} className="grid grid-cols-2 gap-2">
      {opciones.map((opcion) => (
        <button
          key={opcion}
          type="button"
          role="radio"
          aria-checked={valor === opcion}
          onClick={() => alElegir(opcion)}
          className={`rounded-lg border px-3 py-2.5 text-sm font-semibold transition ${
            valor === opcion
              ? "border-app-main bg-app-main/15 text-app-main"
              : "border-app-border text-app-muted hover:border-app-main/60 hover:text-app-texto"
          }`}
        >
          {opcion}
        </button>
      ))}
    </div>
  );
}

// Formulario para añadir a alguien al equipo. En el celular sube como una hoja
// desde abajo; en el computador es un panel que entra por la derecha. Toda la
// lógica (validar, llamar al servidor) vive en ViewUsers: aquí solo se pinta.
export default function PanelNuevaPersona({
  nuevo,
  alCambiar,
  alElegir,
  roles,
  puedeElegirRol,
  cargando,
  alEnviar,
  alCerrar,
}) {
  const primerCampo = useRef(null);

  useEffect(() => {
    primerCampo.current?.focus();
    const alTeclear = (e) => {
      if (e.key === "Escape") alCerrar();
    };
    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, [alCerrar]);

  return (
    <div className="fixed inset-0 z-40">
      {/* Velo: tocarlo cierra el panel */}
      <div aria-hidden="true" onClick={alCerrar} className="absolute inset-0 bg-app-velo" />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-nueva-persona"
        data-panel-nueva-persona
        className="absolute inset-x-0 bottom-0 flex max-h-[92svh] flex-col rounded-t-2xl border-t-2 border-app-main bg-app-light shadow-2xl lg:inset-y-0 lg:left-auto lg:right-0 lg:max-h-none lg:w-md lg:rounded-none lg:border-l-2 lg:border-t-0"
      >
        <header className="flex items-center justify-between gap-2 border-b border-app-border px-4 py-3">
          <h2 id="titulo-nueva-persona" className="flex items-center gap-2 font-bold text-app-main">
            <UserPlusIcon className="h-5 w-5" />
            Añadir persona
          </h2>
          <button
            type="button"
            onClick={alCerrar}
            aria-label="Cerrar"
            className="rounded-full p-1.5 text-app-muted transition hover:bg-app-border hover:text-app-texto"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </header>

        <form onSubmit={alEnviar} noValidate className="form-dark flex flex-1 flex-col gap-4 overflow-y-auto scrollbar-custom p-4">
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-app-muted">
            Nombre
            <input
              ref={primerCampo}
              type="text"
              name="name"
              autoComplete="off"
              placeholder="Nombre de la persona"
              value={nuevo.name}
              onChange={alCambiar}
              className={CAMPO}
            />
          </label>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-app-muted">Género</span>
            <Opciones nombre="Género" opciones={GENEROS} valor={nuevo.gender} alElegir={(gender) => alElegir({ gender })} />
          </div>

          <label className="flex flex-col gap-1.5 text-xs font-semibold text-app-muted">
            Correo electrónico
            <input
              type="email"
              name="email"
              autoComplete="off"
              placeholder="correo@ejemplo.com"
              value={nuevo.email}
              onChange={alCambiar}
              className={CAMPO}
            />
          </label>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-app-muted">Contraseña</span>
            <CampoClave
              name="password"
              autoComplete="new-password"
              placeholder="Contraseña"
              value={nuevo.password}
              onChange={alCambiar}
              className={CAMPO}
            />
            <RequisitosClave clave={nuevo.password} />
          </div>

          {/* El rol solo se elige mientras el dueño pueda dar de alta a su
              pareja pastoral; después todo lo que se crea es Operador. */}
          {puedeElegirRol && (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-app-muted">Rol</span>
              <Opciones nombre="Rol" opciones={roles} valor={nuevo.role} alElegir={(role) => alElegir({ role })} />
            </div>
          )}

          <button
            type="submit"
            disabled={cargando}
            className={`mt-auto flex items-center justify-center gap-2 rounded-lg bg-app-main py-3 font-bold text-app-dark transition hover:bg-app-main/90 ${
              cargando ? "cursor-not-allowed opacity-70" : ""
            }`}
          >
            <UserPlusIcon className="h-5 w-5" />
            {cargando ? "Creando..." : "Crear usuario"}
          </button>
        </form>
      </section>
    </div>
  );
}
