// La alineación propia de un mensaje de Prédica (12-11-2026, pedido del
// usuario). Regla: solo el «Resumen de puntos vistos» la trae; va renglón por
// renglón, alineado, en un bloque centrado en la pantalla. Los demás mensajes
// no la traen y siguen la alineación de Estilos y colores.

// Lo que llega del nodo → "izquierda" | "derecha" | null (sin alineación propia).
export const alineacionValida = (valor) => (valor === "izquierda" || valor === "derecha" ? valor : null);

// Clases y estilo del bloque del mensaje en el templo.
export function bloqueDeMensaje(estiloTexto, alineacion) {
  const propia = alineacionValida(alineacion);
  if (!propia) return { clase: "w-full", estilo: estiloTexto };
  return {
    clase: "mx-auto w-fit max-w-full",
    estilo: { ...estiloTexto, textAlign: propia === "derecha" ? "right" : "left" },
  };
}

// Los renglones del resumen de puntos vistos, para dibujarlos con sangría
// francesa (12-11-2026, pedido del usuario): si un punto ocupa varias
// líneas, las siguientes se alinean con su texto, no con su número.
// «    a) Ve lo invisible» → { nivel: 1, etiqueta: "a)", texto: "Ve lo invisible" }.
// Un renglón sin número reconocible va entero en `texto`.
const SANGRIA = "    "; // la de SANGRIA_RESUMEN de Predica/utilesPredica.js
const ETIQUETA = /^([0-9]+|[A-Za-z]+)[.)]$/;
export function lineasDeResumen(texto) {
  return String(texto || "")
    .split("\n")
    .filter((linea) => linea.trim())
    .map((linea) => {
      // 4 espacios por nivel: «    a)» es 1, «        1.» es 2 (como mucho).
      const nivel = linea.startsWith(SANGRIA + SANGRIA) ? 2 : linea.startsWith(SANGRIA) ? 1 : 0;
      const limpia = linea.trim();
      const espacio = limpia.indexOf(" ");
      const primera = espacio > 0 ? limpia.slice(0, espacio) : "";
      return ETIQUETA.test(primera)
        ? { nivel, etiqueta: primera, texto: limpia.slice(espacio + 1).trim() }
        : { nivel, etiqueta: "", texto: limpia };
    });
}
