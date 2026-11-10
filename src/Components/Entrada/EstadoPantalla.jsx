import { ArrowsPointingOutIcon, ComputerDesktopIcon } from "@heroicons/react/24/outline";
import { useAppContext } from "../Context/AppContext";
import { TEXTO_ESTADO } from "../PantallaTemplo/presencia.js";

const COLORES = {
  apagada: "border-app-border text-app-muted",
  "sin-completa": "border-app-main/50 text-app-main",
  encendida: "border-app-success/50 text-app-success",
};

const EXPLICACION = {
  apagada: "Pantalla del templo apagada",
  "sin-completa": "Pantalla del templo abierta: falta tocar pantalla completa",
  encendida: "Pantalla del templo encendida",
};

// Cómo está la pantalla del templo, junto al próximo servicio. Monitor gris
// (apagada) o verde (encendida); las flechas de pantalla completa en ámbar
// cuando está abierta pero falta ponerla en pantalla completa.
export default function EstadoPantalla() {
  const { pantallaTemplo } = useAppContext();
  if (!pantallaTemplo) return null;
  const Icono = pantallaTemplo === "sin-completa" ? ArrowsPointingOutIcon : ComputerDesktopIcon;

  return (
    <span
      role="status"
      title={EXPLICACION[pantallaTemplo]}
      aria-label={EXPLICACION[pantallaTemplo]}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs ${COLORES[pantallaTemplo]}`}
    >
      <Icono className="h-4 w-4" aria-hidden="true" />
      {TEXTO_ESTADO[pantallaTemplo]}
    </span>
  );
}
