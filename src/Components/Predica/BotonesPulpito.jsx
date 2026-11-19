import { useEffect, useRef, useState } from "react";
import { BeakerIcon, ChevronDownIcon, PlayIcon } from "@heroicons/react/24/solid";

// Las dos entradas al púlpito (18-11-2026, pedido del usuario):
//   Pruebas   el púlpito en modo de ensayo: se pasa el bosquejo SIN mandar nada al templo
//   Predicar  el púlpito de verdad: lo que se toca se proyecta

// Computador: dos botones, uno al lado del otro, en el lugar donde estaba la
// pantalla de muestra de Preparar.
export function BotonesPulpito({ onPruebas, onPredicar }) {
  return (
    <div role="group" aria-label="Ir al púlpito" data-botones-pulpito className="flex shrink-0 gap-2">
      <button
        type="button"
        data-ir-pruebas
        onClick={onPruebas}
        title="Ensayar el bosquejo sin proyectar al templo"
        className="flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl border border-app-border text-sm font-semibold text-app-texto transition hover:border-app-main hover:text-app-main"
      >
        <BeakerIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
        Pruebas
      </button>
      <button
        type="button"
        data-ir-predicar
        onClick={onPredicar}
        title="Predicar: lo que toques se proyecta en el templo"
        className="flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-app-main text-sm font-bold text-app-dark transition hover:brightness-110"
      >
        <PlayIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
        Predicar
      </button>
    </div>
  );
}

// Celular y tableta: un solo botón, «Púlpito», que abre un menú con las dos
// opciones (se llama así y no «Predicar» porque al abrir un menú ya no es
// predicar). Se cierra al elegir, con Escape o tocando fuera.
export function MenuPulpito({ onPruebas, onPredicar, desactivado = false, grande = false }) {
  const [abierto, setAbierto] = useState(false);
  const raiz = useRef(null);

  useEffect(() => {
    if (!abierto) return undefined;
    const alPulsar = (e) => e.key === "Escape" && setAbierto(false);
    const alTocarFuera = (e) => {
      if (raiz.current && !raiz.current.contains(e.target)) setAbierto(false);
    };
    document.addEventListener("keydown", alPulsar);
    document.addEventListener("pointerdown", alTocarFuera);
    return () => {
      document.removeEventListener("keydown", alPulsar);
      document.removeEventListener("pointerdown", alTocarFuera);
    };
  }, [abierto]);

  const elegir = (accion) => () => {
    setAbierto(false);
    accion?.();
  };

  return (
    <div ref={raiz} className="relative shrink-0">
      <button
        type="button"
        data-menu-pulpito
        aria-haspopup="menu"
        aria-expanded={abierto}
        disabled={desactivado}
        onClick={() => setAbierto((si) => !si)}
        className={`flex items-center gap-1.5 rounded-lg bg-app-main font-bold text-app-dark disabled:opacity-40 ${grande ? "h-11 rounded-xl px-4 text-sm" : "h-9 px-3 text-sm"}`}
      >
        <PlayIcon className="h-3.5 w-3.5" aria-hidden="true" />
        Púlpito
        <ChevronDownIcon className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      {abierto && (
        <div role="menu" aria-label="Púlpito" data-menu-pulpito-opciones className="absolute top-full right-0 z-40 mt-1 flex w-60 flex-col gap-0.5 rounded-xl border border-app-border bg-app-light p-1 shadow-2xl">
          <button
            type="button"
            role="menuitem"
            data-ir-pruebas
            onClick={elegir(onPruebas)}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-app-texto transition hover:bg-app-border/50"
          >
            <BeakerIcon className="h-5 w-5 shrink-0 text-app-main" aria-hidden="true" />
            <span className="flex flex-col">
              <b className="text-sm">Pruebas</b>
              <span className="text-xs text-app-muted">Ensayar sin proyectar</span>
            </span>
          </button>
          <button
            type="button"
            role="menuitem"
            data-ir-predicar
            onClick={elegir(onPredicar)}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-app-texto transition hover:bg-app-border/50"
          >
            <PlayIcon className="h-5 w-5 shrink-0 text-app-main" aria-hidden="true" />
            <span className="flex flex-col">
              <b className="text-sm">Predicar</b>
              <span className="text-xs text-app-muted">Proyectar al templo</span>
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
