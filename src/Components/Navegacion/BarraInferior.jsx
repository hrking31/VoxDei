import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeftStartOnRectangleIcon,
  ArrowUturnLeftIcon,
  EllipsisHorizontalIcon,
} from "@heroicons/react/24/solid";
import { useAuth } from "../Context/AuthContext";
import { useAppContext } from "../Context/AppContext";
import { AYUDA, CENTRO_BARRA_INFERIOR, INICIO, MENU_INICIAL, estaActiva, reparto } from "./Secciones.js";
import { useSeccionAnterior } from "./useSeccionAnterior.js";

// Navegación del panel en el celular (9 de noviembre de 2026): cuatro
// secciones a un toque —con el Orden del culto en el centro, más grande— y
// «Más» con el resto, Ayuda y Cerrar sesión. Reemplazó el ir y volver por la
// antigua cuadrícula de Gestión.
//
// Lleva `data-barra-inferior`: con eso index.css activa --alto-barra y las
// pantallas (h-pantalla) y los avisos (bottom-avisos) le dejan sitio.
export default function BarraInferior() {
  const { userData, logout } = useAuth();
  const { confirmAction } = useAppContext();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [masAbierto, setMasAbierto] = useState(false);
  const { enBarra, enMas } = reparto(userData);
  // En «Más»: Inicio, las secciones que no caben en la barra y Ayuda al final.
  const enHoja = [INICIO, ...enMas, AYUDA];
  const masActiva = enHoja.some((s) => estaActiva(s, pathname));

  useEffect(() => {
    if (!masAbierto) return;
    const alPulsarTecla = (e) => {
      if (e.key === "Escape") setMasAbierto(false);
    };
    document.addEventListener("keydown", alPulsarTecla);
    return () => document.removeEventListener("keydown", alPulsarTecla);
  }, [masAbierto]);

  const ir = (ruta) => {
    setMasAbierto(false);
    navigate(ruta);
  };

  // Un toque suelto en pleno culto no debe sacar a nadie: se confirma.
  const cerrarSesion = async () => {
    setMasAbierto(false);
    if (await confirmAction("¿Cerrar sesión?")) await logout();
  };

  return (
    <>
      {masAbierto && (
        <>
          <div data-testid="velo-mas" className="fixed inset-0 z-30 bg-app-velo" onClick={() => setMasAbierto(false)} />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Más secciones"
            className="fixed inset-x-0 bottom-barra-inferior z-40 grid grid-cols-3 gap-2 rounded-t-2xl border-t border-app-border bg-app-light p-3"
          >
            {enHoja.map((s) => (
              <button
                key={s.ruta}
                type="button"
                onClick={() => ir(s.ruta)}
                aria-current={estaActiva(s, pathname) ? "page" : undefined}
                className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-xs ${
                  estaActiva(s, pathname)
                    ? "border-app-main text-app-main"
                    : "border-app-border text-app-muted"
                }`}
              >
                <s.Icono className="h-6 w-6" aria-hidden="true" />
                {s.nombre}
              </button>
            ))}
            {/* En el computador, el logo de la barra lleva al menú inicial y
                «Cerrar sesión» está abajo; aquí, al final de «Más». */}
            <div className="col-span-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => ir(MENU_INICIAL.ruta)}
                className="flex items-center justify-center gap-2 rounded-xl border border-app-border p-3 text-xs text-app-muted transition hover:border-app-main hover:text-app-main"
              >
                <MENU_INICIAL.Icono className="h-5 w-5" aria-hidden="true" />
                {MENU_INICIAL.nombre}
              </button>
              <button
                type="button"
                onClick={cerrarSesion}
                className="flex items-center justify-center gap-2 rounded-xl border border-app-border p-3 text-xs text-app-muted transition hover:border-app-error/60 hover:text-app-error"
              >
                <ArrowLeftStartOnRectangleIcon className="h-5 w-5" aria-hidden="true" />
                Cerrar sesión
              </button>
            </div>
          </div>
        </>
      )}

      <nav
        data-barra-inferior
        aria-label="Secciones del panel"
        className="fixed inset-x-0 bottom-0 z-40 grid h-barra-inferior grid-cols-5 items-end border-t border-app-border bg-app-light px-1 pb-2"
      >
        {enBarra.map((s) =>
          s.ruta === CENTRO_BARRA_INFERIOR ? (
            <button
              key={s.ruta}
              type="button"
              onClick={() => ir(s.ruta)}
              aria-current={estaActiva(s, pathname) ? "page" : undefined}
              className={`flex flex-col items-center gap-0.5 text-xs ${
                estaActiva(s, pathname) ? "text-app-main" : "text-app-muted"
              }`}
            >
              <span className="-mt-6 grid h-14 w-14 place-items-center rounded-full border-4 border-app-light bg-app-main text-app-dark shadow-barra">
                <s.Icono className="h-7 w-7" aria-hidden="true" />
              </span>
              {s.corto || s.nombre}
            </button>
          ) : (
            <Opcion
              key={s.ruta}
              Icono={s.Icono}
              nombre={s.corto || s.nombre}
              activa={estaActiva(s, pathname)}
              onClick={() => ir(s.ruta)}
            />
          )
        )}
        <Opcion
          Icono={EllipsisHorizontalIcon}
          nombre="Más"
          activa={masActiva}
          expandido={masAbierto}
          onClick={() => setMasAbierto(!masAbierto)}
        />
      </nav>
    </>
  );
}

function Opcion({ Icono, nombre, activa, onClick, expandido }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={activa && expandido === undefined ? "page" : undefined}
      aria-expanded={expandido}
      className={`flex flex-col items-center gap-0.5 pt-1 text-xs ${activa ? "text-app-main" : "text-app-muted"}`}
    >
      <Icono className="h-6 w-6" aria-hidden="true" />
      {nombre}
    </button>
  );
}

// Botón flotante para volver con un toque a la sección anterior, justo donde
// se dejó. Lleva `data-boton-anterior` para que los avisos suban encima.
export function BotonAnterior() {
  const anterior = useSeccionAnterior();
  const navigate = useNavigate();
  if (!anterior) return null;

  return (
    <button
      type="button"
      data-boton-anterior
      onClick={() => navigate(anterior.ruta)}
      aria-label={`Volver a ${anterior.seccion.nombre}`}
      className="fixed bottom-flotante right-3 z-30 flex h-10 items-center gap-1.5 rounded-full border border-app-border bg-app-light px-3 text-sm text-app-texto shadow-barra"
    >
      <ArrowUturnLeftIcon className="h-4 w-4 text-app-main" aria-hidden="true" />
      {anterior.seccion.corto || anterior.seccion.nombre}
    </button>
  );
}
