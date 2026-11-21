import { useEffect, useSyncExternalStore } from "react";

// Un texto que una vista puede poner en la barra superior del celular EN LUGAR del estado del
// servicio y de la pantalla del templo (20-11-2026, pedido del usuario: las Pruebas de Prédica
// muestran ahí «Modo de prueba»). Es un almacén mínimo, fuera de React, para no tocar los
// contextos: quien lo pone lo quita al desmontarse.
let aviso = null;
const oyentes = new Set();
const emitir = () => oyentes.forEach((alCambiar) => alCambiar());
const suscribir = (alCambiar) => {
  oyentes.add(alCambiar);
  return () => oyentes.delete(alCambiar);
};

// Lo lee la barra superior: el texto puesto, o null si no hay.
export const useAvisoBarraSuperior = () => useSyncExternalStore(suscribir, () => aviso, () => null);

// Lo usa la vista: mientras `texto` sea distinto de null (y la vista esté montada), la barra superior
// lo muestra. Al cambiar a null o desmontarse, la barra vuelve a su estado de siempre.
export function usePonerAvisoEnBarra(texto) {
  useEffect(() => {
    if (!texto) return undefined;
    aviso = texto;
    emitir();
    return () => {
      if (aviso === texto) {
        aviso = null;
        emitir();
      }
    };
  }, [texto]);
}
