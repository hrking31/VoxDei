// Utilidades compartidas por las tres pantallas de canciones: el catálogo, la
// proyección y el formulario.

// Parte la letra pegada en láminas: cada bloque separado por un renglón en
// blanco se proyecta por separado.
export const partirLetra = (texto) =>
  String(texto || "")
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n+/)
    .map((bloque) => bloque.trim())
    .filter(Boolean);

// Quita tildes y mayúsculas para que el buscador sea tolerante.
export const normalizar = (texto) =>
  String(texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
