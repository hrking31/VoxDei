import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Ningún ítem del bosquejo palpita (20-11-2026, pedido del usuario): el que se está PROYECTANDO se
// amplía como si el recuadro fuera una lupa (ver colorFila en PulpitoPredica.jsx). Esta prueba vigila
// que la pulsación en bucle no vuelva: ni en el CSS ni en el componente.
const css = readFileSync(resolve(import.meta.dirname, "index.css"), "utf8");
const pulpito = readFileSync(resolve(import.meta.dirname, "Components", "Predica", "PulpitoPredica.jsx"), "utf8");

describe("el ítem proyectado del bosquejo: aumento de lupa, sin pulsación", () => {
  it("el CSS ya no tiene la animación «siguiente» ni su variable", () => {
    expect(css).not.toContain("@keyframes siguiente");
    expect(css).not.toContain("--animate-siguiente");
    expect(css).not.toContain("animate-siguiente");
  });

  it("el componente ya no usa la clase de la pulsación", () => {
    expect(pulpito).not.toContain("animate-siguiente");
  });

  it("el proyectado se amplía y se queda ampliado: escala fija, sin animación en bucle; el que sigue no se amplía", () => {
    const actual = pulpito.match(/actual: "([^"]+)"/);
    expect(actual).not.toBeNull();
    const clases = actual[1].split(" ");
    // El que sigue: un recuadro verde (solo el borde, sin fondo), sin escala
    const proximo = pulpito.match(/proximo: "([^"]+)"/)[1].split(" ");
    expect(proximo.some((c) => c.startsWith("scale-"))).toBe(false);
    expect(proximo).toContain("border-app-success/70");
    expect(proximo.filter((c) => /^bg-/.test(c))).toEqual([]);
    // Aumento de lupa: escala del 105 % (la fila ya lleva `transition`, así que entra suave)
    expect(clases).toContain("scale-105");
    expect(clases).toContain("z-10");
    // Sin ninguna animación (ni `animate-` ni `motion-safe:animate-`)
    expect(clases.filter((c) => c.includes("animate-"))).toEqual([]);
  });

  it("ninguna fila del bosquejo lleva sombra (el usuario veía una debajo del ítem y pidió quitarla)", () => {
    const estados = ["actual", "pasado", "proximo", "futuro"].map((e) => pulpito.match(new RegExp(`${e}: "([^"]+)"`))[1]);
    for (const clases of estados) {
      expect(clases.split(" ").filter((c) => /^(shadow|drop-shadow)/.test(c))).toEqual([]);
    }
  });

  it("el aumento no se pasa: cabe en el margen que deja la lista, sin recortarse a los lados", () => {
    // La lista del computador deja 8 px a cada lado (-mx-2 px-2) y la del celular 10 px: una escala de
    // 1,05 sobre filas de unos 290 px crece unos 7 px por lado.
    const actual = pulpito.match(/actual: "([^"]+)"/)[1];
    const escala = Number(actual.match(/scale-(\d+)/)[1]) / 100;
    expect(escala).toBeGreaterThan(1);
    expect(escala).toBeLessThanOrEqual(1.06);
    const crecePorLado = (290 * (escala - 1)) / 2;
    expect(crecePorLado).toBeLessThan(8);
  });
});
