import { ArrowUturnLeftIcon, ArrowUturnRightIcon } from "@heroicons/react/24/solid";

// Deshacer y Rehacer del bosquejo (12-11-2026, pedido del usuario: en vez de
// un «Cancelar», que con el guardado automático borraría todo de golpe). Solo
// el ícono; el nombre va en `title` y `aria-label`. En el computador van en la
// barra de abajo, antes de Borrar y Duplicar; en el celular, arriba.
export default function BotonesHistorial({ historial, className = "h-11 w-11 rounded-xl" }) {
  const { deshacer, rehacer, puedeDeshacer, puedeRehacer } = historial;
  const boton = (nombre, atajo, Icono, alTocar, activo) => (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={alTocar}
      disabled={!activo}
      aria-label={nombre}
      title={`${nombre} (${atajo})`}
      className={`grid shrink-0 place-items-center border border-app-border text-app-texto transition hover:border-app-texto disabled:pointer-events-none disabled:opacity-30 ${className}`}
    >
      <Icono className="h-5 w-5" aria-hidden="true" />
    </button>
  );
  return (
    <>
      {boton("Deshacer", "Ctrl+Z", ArrowUturnLeftIcon, deshacer, puedeDeshacer)}
      {boton("Rehacer", "Ctrl+Y", ArrowUturnRightIcon, rehacer, puedeRehacer)}
    </>
  );
}
