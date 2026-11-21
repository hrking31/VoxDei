import { BeakerIcon, PlayIcon } from "@heroicons/react/24/solid";

// Las dos entradas al púlpito (18-11-2026, pedido del usuario):
//   Pruebas   el púlpito en modo de ensayo: se pasa el bosquejo SIN mandar nada al templo
//   Predicar  el púlpito de verdad: lo que se toca se proyecta

// Dos botones, uno al lado del otro, en todos los tamaños de pantalla (computador: donde estaba la
// pantalla de muestra de Preparar; tableta y celular: en la barra de arriba, 20-11-2026). Los dos con el mismo estilo «tonal» (fondo
// suave, borde y letra de su color), mismo alto, ancho y grosor (20-11-2026, pedido
// del usuario): antes Predicar iba relleno de dorado y Pruebas solo con borde, y
// Pruebas parecía apagado. Pruebas en azul y Predicar en dorado.
const BASE_BOTON = "flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl border text-sm font-bold transition";
// Celular (20-11-2026): más bajos y con letra pequeña, para caber en la barra de arriba junto a los íconos.
const BASE_BOTON_COMPACTO = "flex h-9 min-w-0 flex-1 items-center justify-center gap-1 rounded-lg border text-xs font-bold transition";
// Los colores de cada uno, iguales en todos los tamaños de pantalla.
const COLOR_PRUEBAS = "border-app-azul bg-app-azul/10 text-app-azul hover:bg-app-azul/20";
const COLOR_PREDICAR = "border-app-main bg-app-main/10 text-app-main hover:bg-app-main/20";
// Solo con el ícono (celular, 20-11-2026, pedido del usuario): sin recuadro, ni borde ni fondo; el color queda
// en el ícono y, al tocar, se tiñe con un fondo suave del mismo color.
const BASE_ICONO = "flex h-9 min-w-0 flex-1 items-center justify-center rounded-lg transition";
const ICONO_PRUEBAS = "text-app-azul active:bg-app-azul/15";
const ICONO_PREDICAR = "text-app-main active:bg-app-main/15";
// En la barra de abajo de la tableta (20-11-2026, revisión de diseño): el mismo tamaño que todos los botones de ícono de
// esa barra (56 × 44) y con su recuadro del color de cada uno, para que la barra sea uniforme.
const ICONO_BARRA = "flex h-11 w-14 shrink-0 items-center justify-center rounded-xl border transition";
const TITULO_PRUEBAS = "Ensayar el bosquejo sin proyectar al templo";
const TITULO_PREDICAR = "Predicar: lo que toques se proyecta en el templo";

// `desactivado` y `className` (el ancho, en la barra de la tableta: 20-11-2026, pedido del usuario, «en iPad
// separa los botones de Predicar y Pruebas», en lugar del menú «Púlpito»).
export function BotonesPulpito({ onPruebas, onPredicar, desactivado = false, compacto = false, soloIconos = false, barra = false, className = "" }) {
  const base = compacto ? BASE_BOTON_COMPACTO : BASE_BOTON;
  // Celular: solo el ícono, sin recuadro; el nombre queda en aria-label y title.
  const nombre = (texto) => (soloIconos ? undefined : texto);
  const apagado = "disabled:pointer-events-none disabled:opacity-40";
  return (
    <div role="group" aria-label="Ir al púlpito" data-botones-pulpito className={`flex shrink-0 gap-2 ${className}`}>
      <button type="button" data-ir-pruebas disabled={desactivado} onClick={onPruebas} aria-label={soloIconos ? "Pruebas" : undefined} title={TITULO_PRUEBAS} className={`${soloIconos ? (barra ? `${ICONO_BARRA} ${COLOR_PRUEBAS}` : `${BASE_ICONO} ${ICONO_PRUEBAS}`) : `${base} ${COLOR_PRUEBAS}`} ${apagado}`}>
        <BeakerIcon className={soloIconos ? "h-5 w-5 shrink-0" : "h-4 w-4 shrink-0"} aria-hidden="true" />
        {nombre("Pruebas")}
      </button>
      <button type="button" data-ir-predicar disabled={desactivado} onClick={onPredicar} aria-label={soloIconos ? "Predicar" : undefined} title={TITULO_PREDICAR} className={`${soloIconos ? (barra ? `${ICONO_BARRA} ${COLOR_PREDICAR}` : `${BASE_ICONO} ${ICONO_PREDICAR}`) : `${base} ${COLOR_PREDICAR}`} ${apagado}`}>
        <PlayIcon className={soloIconos ? "h-5 w-5 shrink-0" : "h-4 w-4 shrink-0"} aria-hidden="true" />
        {nombre("Predicar")}
      </button>
    </div>
  );
}
