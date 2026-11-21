import { BookOpenIcon, XMarkIcon } from "@heroicons/react/24/solid";

// El panel de las hojas y los paneles de búsqueda (20-11-2026, pedido del usuario: «ese diálogo es el mismo,
// importa y usa»; «aplica lo mismo para los diálogos iguales en Biblia y Prédica»): una sola barra y un solo
// cuerpo para todos los sitios donde algo se abre en una hoja o en un panel del costado: los versículos de
// Preparar (celular y tableta) y de Predicar (a pantalla completa en el celular, al costado en la tableta) y
// los diálogos de Libros y Recientes de Biblia. El diseño es el de Predicar: una franja de borde a borde con su
// ícono y la X para cerrar, y debajo el contenido con su relleno y su desplazamiento.
//
// `tono` colorea la franja (aguamarina de los versículos, de fábrica). Quien lo usa pone la posición
// (`className`: fixed, absolute, ancho…) y su rol (`role`, `aria-label`, …); lo demás pasa tal cual al elemento de
// arriba. `panelRef` es la referencia del elemento de arriba, para saber si un toque cayó fuera.
const TONOS = {
  agua: { franja: "border-app-agua/40 bg-app-agua/10", texto: "text-app-agua", cerrar: "text-app-agua/70 hover:text-app-agua" },
  violeta: { franja: "border-app-violeta/40 bg-app-violeta/10", texto: "text-app-violeta", cerrar: "text-app-violeta/70 hover:text-app-violeta" },
};

export default function PanelHoja({ titulo = "Versículo espontáneo", icono: Icono = BookOpenIcon, tono = "agua", alCerrar, className = "", panelRef, children, ...resto }) {
  const color = TONOS[tono] || TONOS.agua;
  return (
    <div ref={panelRef} data-panel-hoja className={`flex min-h-0 flex-col bg-app-dark ${className}`} {...resto}>
      <div data-titulo-versiculo className={`flex h-12 shrink-0 items-center justify-between gap-2 border-b px-4 ${color.franja}`}>
        <span className={`flex items-center gap-2 text-sm font-bold ${color.texto}`}>
          <Icono className="h-5 w-5 shrink-0" aria-hidden="true" />
          {titulo}
        </span>
        <button type="button" onClick={alCerrar} aria-label="Cerrar" className={`grid h-8 w-8 place-items-center rounded-lg transition ${color.cerrar}`}>
          <XMarkIcon className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      <div className="scrollbar-oculta flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">{children}</div>
    </div>
  );
}
