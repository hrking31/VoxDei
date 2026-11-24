import simbolo from "../../assets/voxdei-simbolo.svg";
import horizontal from "../../assets/voxdei-logo-horizontal-fondo-oscuro.svg";
import vertical from "../../assets/voxdei-logo-vertical-fondo-oscuro.svg";
import simboloNavidad from "../../assets/voxdei-simbolo-navidad.svg";
import horizontalNavidad from "../../assets/voxdei-logo-horizontal-fondo-oscuro-navidad.svg";
import verticalNavidad from "../../assets/voxdei-logo-vertical-fondo-oscuro-navidad.svg";
import haz from "../../assets/voxdei-marca-agua-haz.svg";
import polvo from "../../assets/voxdei-marca-agua-haz-polvo.svg";
import { navidadActiva } from "./utilesNavidad.js";

// Logos de VOXDEI. La app es oscura, así que aquí van las versiones de fondo
// oscuro; las de fondo claro (también en assets) son para el README, la
// tienda y lo impreso. Si el logo acompaña un texto que ya dice «VOXDEI»,
// pásale alt="" para que el lector de pantalla no lo repita. Cualquier otra
// propiedad (`style`, `data-*`…) pasa tal cual a la imagen.
//
// NAVIDAD (24 de noviembre de 2026): del 1 de diciembre al 6 de enero los tres
// logos se pintan con guirnalda y nieve (`navidadActiva`, en utilesNavidad.js).
// Quien deba quedarse siempre con el normal pasa `navidad={false}`: la marca de
// agua del proyector y su vista previa, la pantalla de carga y las de error.

function elegir(normal, navideno, navidad) {
  return navidad && navidadActiva() ? navideno : normal;
}

export function Simbolo({ alt = "VOXDEI", navidad = true, ...resto }) {
  return <img src={elegir(simbolo, simboloNavidad, navidad)} alt={alt} {...resto} />;
}

export function LogoHorizontal({ alt = "VOXDEI", navidad = true, ...resto }) {
  return <img src={elegir(horizontal, horizontalNavidad, navidad)} alt={alt} {...resto} />;
}

export function LogoVertical({ alt = "VOXDEI", navidad = true, ...resto }) {
  return <img src={elegir(vertical, verticalNavidad, navidad)} alt={alt} {...resto} />;
}

// Marca de agua «haz del proyector» detrás de toda la pantalla (diseñada con el
// usuario el 10 de noviembre de 2026 sobre
// https://claude.ai/artifact/XirrN72rgnKGVbisSdmQyU): el foco en la esquina de
// abajo a la derecha, los rayos cruzando en diagonal hasta arriba, polvo
// flotando en la luz y un parpadeo de proyector. Sin pantalla dorada ni cruz
// (pedido del usuario). La usan el registro y recuperar contraseña, en vez de
// un logo que ocupe alto. Es solo adorno: no se puede tocar. Quien la monta
// lleva `isolate`. Con «reducir movimiento», sin polvo y los rayos quietos.
// Los dos SVG se generaron con posiciones fijas; el del polvo anima con SMIL.
export function MarcaAguaHaz() {
  return (
    <div className="marca-haz" aria-hidden="true" data-marca-agua>
      <img src={haz} alt="" className="haz-esquina opacity-17 motion-safe:animate-marca-haz" />
      <img src={polvo} alt="" className="haz-esquina opacity-50 motion-reduce:hidden" />
    </div>
  );
}
