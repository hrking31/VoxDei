import { useCallback, useState } from "react";

// Los versículos recientes de la sección Biblia (18-11-2026, pedido del usuario):
// la lista de lo que se ha proyectado, para volver a uno ya visto sin buscarlo de
// nuevo. Se recuerda en este dispositivo (localStorage), por iglesia; nunca debe
// romper la vista: sin almacenamiento solo se pierde la lista.
//   r = { sigla, nombre, capitulo, versiculo, numero, cita, texto }
export const TOPE_RECIENTES = 20;
const LARGO_TEXTO = 90;

const valido = (r) =>
  Boolean(r) &&
  typeof r.sigla === "string" &&
  Number.isInteger(r.capitulo) &&
  Number.isInteger(r.versiculo) &&
  typeof r.cita === "string";

function leer(clave) {
  try {
    const guardado = JSON.parse(localStorage.getItem(clave));
    return Array.isArray(guardado) ? guardado.filter(valido).slice(0, TOPE_RECIENTES) : [];
  } catch {
    return [];
  }
}

function guardar(clave, lista) {
  try {
    localStorage.setItem(clave, JSON.stringify(lista));
  } catch {
    // sin almacenamiento: solo se pierde la lista
  }
}

export function useVersiculosRecientes(groupId) {
  const clave = `voxdei.biblia.recientes.${groupId || "sin-iglesia"}`;
  const [recientes, setRecientes] = useState(() => leer(clave));

  // El más reciente va primero; uno repetido sube al primer lugar en vez de duplicarse.
  const agregar = useCallback(
    (r) => {
      if (!valido(r)) return;
      const entrada = { ...r, texto: String(r.texto || "").trim().slice(0, LARGO_TEXTO) };
      setRecientes((previo) => {
        const mismo = (x) => x.sigla === entrada.sigla && x.capitulo === entrada.capitulo && x.versiculo === entrada.versiculo;
        const nuevo = [entrada, ...previo.filter((x) => !mismo(x))].slice(0, TOPE_RECIENTES);
        guardar(clave, nuevo);
        return nuevo;
      });
    },
    [clave]
  );

  const limpiar = useCallback(() => {
    setRecientes([]);
    guardar(clave, []);
  }, [clave]);

  return { recientes, agregar, limpiar };
}
