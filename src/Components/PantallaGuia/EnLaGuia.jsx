import { createPortal } from "react-dom";
import { useRanuraGuia } from "./AccionesGuia.js";

// Pinta a sus hijos en la ranura de la columna derecha, debajo de la guía del
// templo. Sin ranura (celular, o sección sin guía) no pinta nada: quien lo use
// decide antes con `useRanuraGuia()` si deja los botones en su sitio de siempre.
export default function EnLaGuia({ children }) {
  const ranura = useRanuraGuia();
  return ranura ? createPortal(children, ranura) : null;
}
