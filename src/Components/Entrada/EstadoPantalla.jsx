import {
  ArrowsPointingOutIcon,
  ComputerDesktopIcon,
  EyeSlashIcon,
  PowerIcon,
  WindowIcon,
} from "@heroicons/react/24/outline";
import { useAppContext } from "../Context/AppContext";
import { TEXTO_ESTADO } from "../PantallaTemplo/presencia.js";

// Un ícono distinto por estado (pedido del usuario el 10 de noviembre de 2026).
const ICONO = {
  apagada: PowerIcon,
  oculta: EyeSlashIcon,
  ventana: WindowIcon,
  maximizada: ComputerDesktopIcon,
  encendida: ArrowsPointingOutIcon,
};

// El texto lleva el color del estado; el chip y el ícono, solo gris (apagada)
// o verde (abierta en cualquier modo), porque en los cuatro modos la pantalla
// ya está encendida. Así lo pidió el usuario el 10 de noviembre de 2026.
const COLOR_TEXTO = {
  apagada: "text-app-muted",
  oculta: "text-app-error",
  ventana: "text-app-main",
  maximizada: "text-app-azul",
  encendida: "text-app-success",
};

const EXPLICACION = {
  apagada: "Pantalla del templo apagada",
  oculta: "Pantalla del templo abierta pero oculta: está minimizada, en otra pestaña o tapada",
  ventana: "Pantalla del templo abierta en una ventana pequeña: falta tocar pantalla completa",
  maximizada: "Pantalla del templo abierta y maximizada: falta tocar pantalla completa",
  encendida: "Pantalla del templo encendida en pantalla completa",
};

// Cómo está la pantalla del templo, junto al próximo servicio y en la franja
// del turno. `estado` fija uno a mano (los ejemplos de la Ayuda); sin él, el
// de verdad.
export default function EstadoPantalla({ estado } = {}) {
  const { pantallaTemplo: enVivo } = useAppContext();
  const pantallaTemplo = estado ?? enVivo;
  if (!pantallaTemplo) return null;
  const Icono = ICONO[pantallaTemplo];
  const apagada = pantallaTemplo === "apagada";

  return (
    <span
      role="status"
      title={EXPLICACION[pantallaTemplo]}
      aria-label={EXPLICACION[pantallaTemplo]}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs ${
        apagada ? "border-app-border" : "border-app-success/50"
      }`}
    >
      <Icono
        data-icono={pantallaTemplo}
        className={`h-4 w-4 ${apagada ? "text-app-muted" : "text-app-success"}`}
        aria-hidden="true"
      />
      <span className={COLOR_TEXTO[pantallaTemplo]}>{TEXTO_ESTADO[pantallaTemplo]}</span>
    </span>
  );
}
