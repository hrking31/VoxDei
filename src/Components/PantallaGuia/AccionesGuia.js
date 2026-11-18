import { createContext, useContext } from "react";

// La ranura de la columna derecha (18-11-2026, pedido del usuario): debajo de la
// guía del templo, en el computador, cada sección puede colocar sus botones,
// como hace Prédica. MarcoPanel guarda aquí el elemento de esa ranura (o null si
// no hay guía: celular, o una sección que no proyecta).
export const AccionesGuiaContext = createContext(null);

export function useRanuraGuia() {
  return useContext(AccionesGuiaContext);
}
