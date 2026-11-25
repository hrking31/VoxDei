import { useLocation } from "react-router-dom";
import { hayNieve } from "./utilesNieve.js";

// El espacio que la nieve de abajo reserva al final del contenido (Navidad,
// 24 de noviembre de 2026, pedido del usuario: «lo mismo que arriba con las luces y
// las ramas, dale un espacio de 12 px», subido después a 14 px). Ocupa su sitio, para que la capa de nieve
// no tape lo último de la pantalla. Las pantallas que miden la ventana entera
// (`h-pantalla` / `min-h-pantalla`) se lo descuentan con `--alto-nieve`, que se
// activa con el atributo `data-espacio-nieve` de este bloque (ver index.css).
// Solo existe cuando está nevando (`hayNieve`).
//
// El color: que no se note la franja. Las pantallas del panel pintan un degradado
// que empieza en el color de la página (`app-dark`) y termina en `app-light` al
// 50 %; este espacio toma ese color final, así que se funde con el fondo de la
// pantalla. Las que tienen columnas de colores distintos abajo (Prédica) llevan
// `data-sin-espacio-nieve`: ahí no se reserva espacio y la nieve se pinta encima
// (regla en index.css). Arriba, la guirnalda no necesita color: el degradado
// empieza justo en el de la página.
export default function EspacioNieve() {
  const { pathname } = useLocation();
  if (!hayNieve(pathname)) return null;
  return <div aria-hidden="true" data-espacio-nieve className="h-nieve bg-app-light/50" />;
}
