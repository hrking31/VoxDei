import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeftStartOnRectangleIcon, UserIcon } from "@heroicons/react/24/solid";
import { useAuth } from "../Context/AuthContext";
import { useAppContext } from "../Context/AppContext";
import { LogoHorizontal, Simbolo } from "../Logo/Logo.jsx";
import { AYUDA, GRUPOS, INICIO, MENU_INICIAL, estaActiva, seccionesPara } from "./Secciones.js";

// Barra lateral del panel en el computador. Encogida muestra solo íconos;
// al pulsar el símbolo se abre por encima del contenido con los nombres y,
// al elegir algo, se vuelve a encoger. No se esconde del todo: cambiar de
// sección queda siempre a un clic.
//
// Ocupa su sitio con un hueco del ancho encogido y se pinta `fixed`, para
// que al abrirse tape el contenido en vez de empujarlo.
export default function BarraLateral() {
  const [abierta, setAbierta] = useState(false);
  const { userData, logout } = useAuth();
  const { confirmAction } = useAppContext();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!abierta) return;
    const alPulsarTecla = (e) => {
      if (e.key === "Escape") setAbierta(false);
    };
    document.addEventListener("keydown", alPulsarTecla);
    return () => document.removeEventListener("keydown", alPulsarTecla);
  }, [abierta]);

  const ir = (ruta) => {
    setAbierta(false);
    navigate(ruta);
  };

  // Un clic suelto en pleno culto no debe sacar a nadie: se confirma.
  const cerrarSesion = async () => {
    setAbierta(false);
    if (await confirmAction("¿Cerrar sesión?")) await logout();
  };

  const secciones = seccionesPara(userData);

  return (
    <>
      <div className="w-barra shrink-0" aria-hidden="true" />

      {abierta && (
        <div
          data-testid="velo-barra"
          className="fixed inset-0 z-30 bg-app-velo"
          onClick={() => setAbierta(false)}
        />
      )}

      <nav
        aria-label="Secciones del panel"
        className={`fixed inset-y-0 left-0 z-40 flex flex-col gap-1 overflow-y-auto border-r border-app-border bg-app-light p-2 transition-[width] duration-200 ${
          abierta ? "w-barra-abierta shadow-barra" : "w-barra"
        }`}
      >
        {/* El logo vuelve al menú inicial (Proyectar / Administrar), como en
            casi todas las apps. Abrir y cerrar la barra va en la flecha. */}
        <button
          type="button"
          onClick={() => ir(MENU_INICIAL.ruta)}
          aria-label={MENU_INICIAL.nombre}
          title={MENU_INICIAL.nombre}
          className="flex h-12 shrink-0 items-center rounded-lg px-1.5 hover:bg-app-dark"
        >
          {abierta ? (
            // El archivo trae margen vacío alrededor: a la altura completa del
            // botón el texto se lee bien.
            <LogoHorizontal sinFondo className="h-12 w-auto" alt="" />
          ) : (
            <Simbolo sinFondo className="h-9 w-9" alt="" />
          )}
        </button>

        <Opcion
          seccion={INICIO}
          activa={estaActiva(INICIO, pathname)}
          abierta={abierta}
          onClick={() => ir(INICIO.ruta)}
        />

        {/* La pantalla del templo no se abre desde aquí: se abre una sola vez,
            en el dispositivo del proyector, desde la entrada (Proyectar). */}
        {GRUPOS.map((grupo) => {
          const delGrupo = secciones.filter((s) => s.grupo === grupo.id);
          if (delGrupo.length === 0) return null;
          return (
            <div key={grupo.id} role="group" aria-label={grupo.nombre} className="flex flex-col gap-1">
              <Rotulo abierta={abierta}>{grupo.nombre}</Rotulo>
              {delGrupo.map((s) => (
                <Opcion
                  key={s.ruta}
                  seccion={s}
                  activa={estaActiva(s, pathname)}
                  abierta={abierta}
                  onClick={() => ir(s.ruta)}
                />
              ))}
            </div>
          );
        })}

        <div className="min-h-2 flex-1" />

        {/* Abajo, de arriba hacia abajo (orden pedido por el usuario):
            la persona, Ayuda, una línea, Cerrar sesión y, al final, la
            flecha que abre o encoge la barra. */}
        <Persona userData={userData} abierta={abierta} />
        <Opcion
          seccion={AYUDA}
          activa={estaActiva(AYUDA, pathname)}
          abierta={abierta}
          onClick={() => ir(AYUDA.ruta)}
        />
        <hr data-divisoria className="mx-2 my-1 shrink-0 border-app-border" />
        <Opcion
          seccion={{ nombre: "Cerrar sesión", Icono: ArrowLeftStartOnRectangleIcon }}
          abierta={abierta}
          onClick={cerrarSesion}
        />
        <button
          type="button"
          onClick={() => setAbierta(!abierta)}
          aria-expanded={abierta}
          aria-label={abierta ? "Encoger la barra" : "Mostrar los nombres de las secciones"}
          title={abierta ? "Encoger la barra" : "Mostrar los nombres"}
          className={`flex h-8 shrink-0 items-center rounded-lg px-3.5 text-app-muted hover:bg-app-dark hover:text-app-texto ${
            abierta ? "justify-end" : "justify-start"
          }`}
        >
          <IconoEncoger abierta={abierta} />
        </button>
      </nav>
    </>
  );
}

// Nombre de un grupo. Encogida la barra, una rayita en su lugar.
// «‹|»: flecha hacia la barra, el ícono que eligió el usuario para encogerla.
// Encogida se ve al revés, «|›», para abrirla. Heroicons no lo trae: se
// dibuja aquí y toma el color del texto (currentColor), como los demás.
function IconoEncoger({ abierta }) {
  return (
    <svg
      data-icono-encoger={abierta ? "encoger" : "abrir"}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`h-4 w-4 ${abierta ? "" : "-scale-x-100"}`}
    >
      <path d="M14 6l-6 6 6 6" />
      <path d="M19 5v14" />
    </svg>
  );
}

function Rotulo({ abierta, children }) {
  return (
    <span className="flex h-6 shrink-0 items-center px-3 text-xs uppercase tracking-widest text-app-muted">
      {abierta ? children : <span className="h-px w-6 bg-app-border" />}
    </span>
  );
}

// Encogida, el nombre va en `aria-label` y en una etiqueta que aparece al
// pasar el ratón; abierta, el nombre se lee del propio texto.
function Opcion({ seccion, activa = false, abierta, onClick }) {
  const { Icono, nombre } = seccion;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={activa ? "page" : undefined}
      aria-label={abierta ? undefined : nombre}
      className={`group relative flex h-10 w-full shrink-0 items-center gap-3 whitespace-nowrap rounded-lg px-3 text-left transition-colors ${
        activa
          ? "bg-app-main/15 text-app-main"
          : "text-app-muted hover:bg-app-dark hover:text-app-texto"
      }`}
    >
      {activa && (
        <span className="absolute -left-2 inset-y-2 w-1 rounded-r bg-app-main" aria-hidden="true" />
      )}
      <Icono className="h-6 w-6 shrink-0" aria-hidden="true" />
      {abierta ? (
        <span className="text-sm">{nombre}</span>
      ) : (
        <span
          aria-hidden="true"
          className="pointer-events-none fixed left-barra-etiqueta z-50 rounded bg-app-dark px-2 py-1 text-xs text-app-texto opacity-0 shadow-barra transition-opacity group-hover:opacity-100"
        >
          {nombre}
        </span>
      )}
    </button>
  );
}

function Persona({ userData, abierta }) {
  return (
    <div data-persona className="flex shrink-0 items-center gap-2 overflow-hidden rounded-lg px-1.5 py-1">
      {userData?.photo ? (
        <img src={userData.photo} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
      ) : (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-app-border">
          <UserIcon className="h-5 w-5 text-app-muted" aria-hidden="true" />
        </span>
      )}
      {abierta && (
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-sm font-medium text-app-main">
            {userData?.name || "Usuario"}
          </span>
          <span className="truncate text-xs text-app-muted">{userData?.role}</span>
        </span>
      )}
    </div>
  );
}
