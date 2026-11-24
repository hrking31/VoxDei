// Geometría de la franja de pino de la guirnalda (Navidad, 24 de noviembre de
// 2026). Las agujas son cientos de rayitas: se juntan en un solo trazado por
// color para que el SVG tenga pocos elementos. Todo es determinista (siempre sale
// el mismo dibujo) y la rama cae en el mismo punto a izquierda y derecha del
// bloque, así que al repetirse no se nota la costura.
export const ANCHO_PINO = 240;
export const ALTO_PINO = 30;
const Y_RAMA = 11;

/** Altura de la rama en cada x: dos ondas suaves por bloque. */
export const yRama = (x) => Y_RAMA + 1.6 * Math.sin((x / ANCHO_PINO) * Math.PI * 4);

// Generador de números al azar con semilla (mulberry32): mismo dibujo siempre
function conSemilla(semilla) {
  let a = semilla;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const entre = (azar, min, max) => min + azar() * (max - min);
const r1 = (n) => Math.round(n * 10) / 10;

// Fila de agujas: de cada punto de la rama salen dos hacia abajo y una hacia arriba
function fila(azar, desfase, colores, largoAbajo, largoArriba, acumulado) {
  for (let x = desfase; x <= ANCHO_PINO; x += 2.4) {
    const y = yRama(x);
    const sale = (largo, signo) => {
      const x2 = x + entre(azar, -5, 5);
      const y2 = y + signo * entre(azar, largo[0], largo[1]);
      const clase = colores[Math.floor(azar() * colores.length)];
      acumulado[clase] = `${acumulado[clase] ?? ""}M${r1(x)} ${r1(y)}L${r1(x2)} ${r1(y2)}`;
    };
    sale(largoAbajo, 1);
    sale(largoAbajo, 1);
    sale(largoArriba, -1);
  }
}

/**
 * Las agujas del fondo, más largas y oscuras, como un trazado por clase de color.
 * Van detrás del cable de luces.
 */
export function agujasFondo() {
  const azar = conSemilla(2411);
  const acumulado = {};
  fila(azar, 0, ["stroke-app-pino-oscuro", "stroke-app-pino"], [10, 18], [5, 10], acumulado);
  return acumulado;
}

/**
 * Las agujas del frente, más cortas y claras. Van por delante del cable de luces:
 * por eso parece que el cable se enreda dentro de la rama.
 */
export function agujasFrente() {
  const azar = conSemilla(9157);
  const acumulado = {};
  fila(azar, 1.2, ["stroke-app-pino", "stroke-app-pino-claro", "stroke-app-pino-brillo"], [7, 13], [4, 8], acumulado);
  return acumulado;
}

/** La rama central, como una línea que sigue la onda. */
export function ramaCentral() {
  let d = "";
  for (let x = 0; x <= ANCHO_PINO; x += 6) d += `${x === 0 ? "M" : "L"}${x} ${r1(yRama(x))}`;
  return d;
}

/** Puntitos de nieve en polvo sobre las agujas. */
export function polvoDeNieve() {
  const azar = conSemilla(77);
  return Array.from({ length: 18 }, () => ({
    cx: r1(entre(azar, 2, ANCHO_PINO - 2)),
    cy: r1(entre(azar, 3, 13)),
    r: r1(entre(azar, 0.7, 1.5)),
  }));
}
