import { AdjustmentsHorizontalIcon, TvIcon } from "@heroicons/react/24/solid";

// Los dos interruptores que ganan espacio en el celular (a prueba desde el
// 18-11-2026, pedido del usuario): ocultar la mini pantalla del templo (quien está
// frente al proyector no la necesita) y ocultar los cuatro botones (quien solo
// proyecta no los necesita). Van en el encabezado de la vista, a la derecha del
// nombre, y se quedan ahí para volver a mostrar: dorados cuando algo está oculto.
// El estado lo guarda quien los usa, con usePreferenciaLocal. De 40 px y a 12 px
// uno del otro (pedido del usuario: con 32 px y 4 px, los dedos chocaban).
export default function InterruptoresDeVista({ sinPantalla, alCambiarPantalla, sinBotones, alCambiarBotones }) {
  return (
    <div role="group" aria-label="Qué mostrar en esta vista" className="flex shrink-0 gap-3">
      <button
        type="button"
        data-alternar-pantalla
        aria-pressed={sinPantalla}
        aria-label={sinPantalla ? "Mostrar la pantalla" : "Ocultar la pantalla"}
        title={sinPantalla ? "Mostrar la pantalla del templo" : "Ocultar la pantalla del templo"}
        onClick={() => alCambiarPantalla(!sinPantalla)}
        className={`grid h-10 w-10 place-items-center rounded-lg transition ${sinPantalla ? "bg-app-main/15 text-app-main" : "text-app-muted"}`}
      >
        <TvIcon className="h-5 w-5" aria-hidden="true" />
      </button>
      <button
        type="button"
        data-alternar-botones
        aria-pressed={sinBotones}
        aria-label={sinBotones ? "Mostrar los botones" : "Ocultar los botones"}
        title={sinBotones ? "Mostrar los botones de Título, Texto, Ticker y Ocultar" : "Ocultar los botones de Título, Texto, Ticker y Ocultar"}
        onClick={() => alCambiarBotones(!sinBotones)}
        className={`grid h-10 w-10 place-items-center rounded-lg transition ${sinBotones ? "bg-app-main/15 text-app-main" : "text-app-muted"}`}
      >
        {/* No los cuatro cuadritos (Squares2X2Icon): ese es el ícono de Inicio en el menú
            y se confundía con él (pedido del usuario). */}
        <AdjustmentsHorizontalIcon className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  );
}
