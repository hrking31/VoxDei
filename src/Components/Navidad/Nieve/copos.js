// Los dibujos de los copos de nieve, hechos en un canvas al arrancar (no hay
// imágenes que descargar ni dominios nuevos que sumar a la CSP). Se pasan a
// `Snowfall` en `images`, que los elige al azar para cada copo.
//
// Para que parezca nieve de verdad: la mayoría son copos suaves y desenfocados,
// como los que quedan fuera de foco en una foto, y algunos son cristales de seis
// brazos. Mezclados con tamaños y velocidades distintos dan sensación de
// profundidad. Un canvas no usa clases de Tailwind: el blanco va escrito aquí.
const LADO = 64;

function lienzo() {
  const canvas = document.createElement("canvas");
  canvas.width = LADO;
  canvas.height = LADO;
  return canvas;
}

/** Copo suave: un centro blanco que se difumina hacia el borde. `dureza` (0 a 1) es hasta dónde llega el centro sólido. */
function copoSuave(dureza) {
  const canvas = lienzo();
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  const medio = LADO / 2;
  const degradado = ctx.createRadialGradient(medio, medio, 0, medio, medio, medio);
  degradado.addColorStop(0, "rgb(255 255 255 / 1)");
  degradado.addColorStop(dureza, "rgb(255 255 255 / 0.85)");
  degradado.addColorStop(1, "rgb(255 255 255 / 0)");
  ctx.fillStyle = degradado;
  ctx.fillRect(0, 0, LADO, LADO);
  return canvas;
}

/** Cristal de seis brazos, cada uno con dos ramitas, con un leve resplandor. */
function copoCristal() {
  const canvas = lienzo();
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  const medio = LADO / 2;
  const brazo = 26;
  const ramita = 9;
  ctx.translate(medio, medio);
  ctx.strokeStyle = "rgb(255 255 255 / 0.95)";
  ctx.lineCap = "round";
  ctx.lineWidth = 3;
  ctx.shadowColor = "rgb(255 255 255 / 0.9)";
  ctx.shadowBlur = 5;
  for (let i = 0; i < 6; i++) {
    ctx.save();
    ctx.rotate((i * Math.PI) / 3);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -brazo);
    // Las ramitas, a 60 % del brazo, hacia los dos lados
    const y = -brazo * 0.6;
    ctx.moveTo(0, y);
    ctx.lineTo(-ramita * 0.75, y - ramita * 0.75);
    ctx.moveTo(0, y);
    ctx.lineTo(ramita * 0.75, y - ramita * 0.75);
    ctx.stroke();
    ctx.restore();
  }
  return canvas;
}

/** Los dibujos que se reparten entre los copos: más suaves que cristales. */
export function crearCopos() {
  return [copoSuave(0.1), copoSuave(0.4), copoSuave(0.4), copoSuave(0.7), copoCristal()];
}
