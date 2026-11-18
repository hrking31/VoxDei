import { useAuth } from "../Context/AuthContext";
import { useAppContext } from "../Context/AppContext";
import { datosDeIglesia } from "../Iglesia/datosIglesia.js";
import { Simbolo, LogoHorizontal, LogoVertical } from "./Logo.jsx";

const DE_VOXDEI = { simbolo: Simbolo, horizontal: LogoHorizontal, vertical: LogoVertical };

// REGLA DE LA APP (18 de noviembre de 2026, pedido del usuario): donde se sepa
// de qué iglesia es la sesión, el logo que se pinta es el que la iglesia subió;
// si no subió ninguno, el de VOXDEI. Toda vista nueva con logo pasa por aquí.
//
// Quedan con el logo de VOXDEI, a propósito: lo que se ve antes de iniciar
// sesión (login, registro, recuperar y eliminar cuenta, carga, errores) y la
// marca de agua del proyector (decisión del usuario).
//
// `variante` es la del logo de VOXDEI que se usa de respaldo. El logo de la
// iglesia se muestra entero (`object-contain`), sin recortar.
export default function LogoDeLaIglesia({ variante = "simbolo", alt, className = "", ...resto }) {
  const { userData } = useAuth();
  const { iglesia } = useAppContext();
  const { logo, nombre } = datosDeIglesia(iglesia, userData);

  if (logo) {
    return <img src={logo} alt={alt ?? nombre} className={`${className} object-contain`} data-logo-iglesia {...resto} />;
  }

  const LogoVoxdei = DE_VOXDEI[variante] || Simbolo;
  return <LogoVoxdei alt={alt} className={className} {...resto} />;
}
