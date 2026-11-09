import { useNavigate } from "react-router-dom";
import { useAppContext } from "../Context/AppContext";

// Botón «Salida» de los paneles: vuelve a la cuadrícula de Gestión. Antes
// cada panel tenía su propia copia. En el computador no se pinta, porque la
// barra lateral ya lleva a cualquier sección con un clic.
export default function BotonSalida({ className = "" }) {
  const navigate = useNavigate();
  const { isDesktop } = useAppContext();

  if (isDesktop) return null;

  return (
    <button
      type="button"
      onClick={() => navigate("/ViewGestion")}
      className={`boton-salida ${className}`}
    >
      Salida
    </button>
  );
}
