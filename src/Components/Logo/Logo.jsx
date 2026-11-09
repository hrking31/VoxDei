import simbolo from "../../assets/voxdei-simbolo.svg";
import horizontal from "../../assets/voxdei-logo-horizontal-fondo-oscuro.svg";
import vertical from "../../assets/voxdei-logo-vertical-fondo-oscuro.svg";

// Logos de VOXDEI. La app es oscura, así que aquí van las versiones de fondo
// oscuro; las de fondo claro (también en assets) son para el README, la
// tienda y lo impreso. Si el logo acompaña un texto que ya dice «VOXDEI»,
// pásale alt="" para que el lector de pantalla no lo repita.

export function Simbolo({ className = "", alt = "VOXDEI" }) {
  return <img src={simbolo} alt={alt} className={className} />;
}

export function LogoHorizontal({ className = "", alt = "VOXDEI" }) {
  return <img src={horizontal} alt={alt} className={className} />;
}

export function LogoVertical({ className = "", alt = "VOXDEI" }) {
  return <img src={vertical} alt={alt} className={className} />;
}
