// Copia de react-snowfall 2.4.0 (MIT, © 2018 Cahil Foley), portada a JavaScript.
// Ver LICENCIA.txt. Diferencia: `igualProfundo` en lugar de `react-fast-compare`.
import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { snowfallBaseStyle } from "./config.js";
import { getSize, igualProfundo } from "./utils.js";

/**
 * Alto y ancho de un elemento HTML. Usa `ResizeObserver` si existe para detectar
 * cambios; si no, escucha el `resize` de la ventana.
 */
export const useComponentSize = (ref) => {
  const [size, setSize] = useState(getSize(ref.current));

  const resizeHandler = useCallback(() => {
    if (ref.current) {
      setSize(getSize(ref.current));
    }
  }, [ref]);

  useEffect(() => {
    const { ResizeObserver } = window;

    if (!ref.current) return;
    resizeHandler();

    if (typeof ResizeObserver === "function") {
      const resizeObserver = new ResizeObserver(resizeHandler);
      resizeObserver.observe(ref.current);

      return () => resizeObserver.disconnect();
    } else {
      window.addEventListener("resize", resizeHandler);

      return () => window.removeEventListener("resize", resizeHandler);
    }
  }, [ref, resizeHandler]);

  return size;
};

/** Mezcla el estilo recibido con el estilo base del canvas. */
export const useSnowfallStyle = (overrides) => {
  const styles = useMemo(
    () => ({
      ...snowfallBaseStyle,
      ...(overrides || {}),
    }),
    [overrides]
  );

  return styles;
};

/** Como `useEffect`, pero compara las dependencias en profundidad. */
export function useDeepCompareEffect(effect, deps) {
  const ref = useRef(deps);

  // Solo se actualizan las dependencias si no son iguales en profundidad
  if (!igualProfundo(deps, ref.current)) {
    ref.current = deps;
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useEffect(effect, ref.current);
}

/**
 * Estabiliza la referencia de un valor: devuelve siempre el mismo objeto hasta
 * que el contenido cambia de verdad.
 */
export function useDeepMemo(value) {
  const [state, setState] = useState(value);

  useDeepCompareEffect(() => setState(value), [value]);

  return state;
}
