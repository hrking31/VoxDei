// Ícono de la pestaña con el punto del turno (idea 4 del logo, 09-11-2026).
//
// El símbolo es un SVG: se le agrega un círculo abajo a la derecha y se usa
// como data: URI. Así no hace falta un archivo por color ni dibujar en canvas.

// Lee una variable del tema (`--color-app-success`…). Los colores no se
// repiten aquí: si cambian en index.css, cambian también en la pestaña.
export function colorDelTema(nombre) {
  return getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();
}

export function iconoConPunto(svg, { relleno, borde }) {
  const punto = `<circle cx="800" cy="800" r="190" fill="${relleno}" stroke="${borde}" stroke-width="56"/>`;
  const conPunto = svg.trim().replace(/<\/svg>$/, `${punto}</svg>`);
  return `data:image/svg+xml,${encodeURIComponent(conPunto)}`;
}

export function tituloDePestana(nombreSeccion) {
  return nombreSeccion ? `VOXDEI · ${nombreSeccion}` : "VOXDEI";
}
