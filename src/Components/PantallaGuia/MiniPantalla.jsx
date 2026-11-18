import PantallaPrevia from "../Predica/PantallaPrevia.jsx";
import { useMiniPantalla } from "./useMiniPantalla.js";

// La mini pantalla del templo (con el marco de su estado y el aspecto de
// televisor de los 80) para las vistas que no llevan la columna de la guía,
// como Biblia en el celular. Copia lo que de verdad hay en el templo.
export default function MiniPantalla() {
  const { espejo, visibles, centro, noSeVe, pantallaTemplo } = useMiniPantalla();

  return (
    <PantallaPrevia
      pieza={centro}
      etiqueta="En el templo ahora"
      oculta={noSeVe}
      estadoPantalla={pantallaTemplo}
      titulo={visibles.titulo && !visibles.espera ? espejo.titulo : ""}
      ticker={visibles.ticker ? espejo.ticker : ""}
      textoVacio="Sin texto en pantalla"
    />
  );
}
