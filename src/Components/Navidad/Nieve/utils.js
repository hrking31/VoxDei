// Copia de react-snowfall 2.4.0 (MIT, © 2018 Cahil Foley), portada a JavaScript.
// Ver LICENCIA.txt. Diferencia: `igualProfundo` reemplaza a `react-fast-compare`,
// para no sumar una dependencia.

/**
 * Número al azar entre un mínimo y un máximo. Si ambos son enteros, devuelve un
 * entero; si no, un decimal.
 */
export function random(min, max) {
  if (!Number.isInteger(min) || !Number.isInteger(max)) {
    return Math.random() * (max - min) + min;
  }
  return Math.floor(Math.random() * (max - min + 1) + min);
}

/** Interpolación lineal: se acerca poco a poco a un valor objetivo. */
export function lerp(start, end, normal) {
  return (1 - normal) * start + normal * end;
}

/** Un elemento al azar de una lista. */
export function randomElement(items) {
  const index = Math.floor(Math.random() * items.length);
  return items[index];
}

/** Alto y ancho de un elemento HTML. */
export function getSize(element) {
  if (!element) return { height: 0, width: 0 };

  return {
    height: element.offsetHeight,
    width: element.offsetWidth,
  };
}

/** PI * 2, calculado una sola vez. */
export const twoPi = Math.PI * 2;

/**
 * Comparación profunda de listas, objetos y valores simples. Lo que no sea de
 * esos tipos (una imagen, un canvas) se compara por referencia.
 */
export function igualProfundo(a, b) {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((valor, i) => igualProfundo(valor, b[i]));
  }
  const objetoSimple = (v) => v !== null && typeof v === "object" && Object.getPrototypeOf(v) === Object.prototype;
  if (objetoSimple(a) && objetoSimple(b)) {
    const clavesA = Object.keys(a);
    return clavesA.length === Object.keys(b).length && clavesA.every((k) => k in b && igualProfundo(a[k], b[k]));
  }
  return Number.isNaN(a) && Number.isNaN(b);
}
