import simbolo from "../../assets/voxdei-simbolo.svg";
import simboloSinFondo from "../../assets/voxdei-simbolo-sin-fondo.svg";
import horizontal from "../../assets/voxdei-logo-horizontal-fondo-oscuro.svg";
import horizontalSinFondo from "../../assets/voxdei-logo-horizontal-sin-fondo.svg";
import vertical from "../../assets/voxdei-logo-vertical-fondo-oscuro.svg";

// Logos de VOXDEI. La app es oscura, así que aquí van las versiones de fondo
// oscuro; las de fondo claro (también en assets) son para el README, la
// tienda y lo impreso. Si el logo acompaña un texto que ya dice «VOXDEI»,
// pásale alt="" para que el lector de pantalla no lo repita. Cualquier otra
// propiedad (`style`, `data-*`…) pasa tal cual a la imagen.
//
// `sinFondo`: el símbolo sin su cuadro morado, para ponerlo directamente
// sobre el gris de la app (la barra lateral, pedido del usuario). Las copias
// sin fondo son los mismos SVG sin el <rect> de fondo ni su degradado.

export function Simbolo({ alt = "VOXDEI", sinFondo = false, ...resto }) {
  return <img src={sinFondo ? simboloSinFondo : simbolo} alt={alt} {...resto} />;
}

export function LogoHorizontal({ alt = "VOXDEI", sinFondo = false, ...resto }) {
  return <img src={sinFondo ? horizontalSinFondo : horizontal} alt={alt} {...resto} />;
}

export function LogoVertical({ alt = "VOXDEI", ...resto }) {
  return <img src={vertical} alt={alt} {...resto} />;
}
