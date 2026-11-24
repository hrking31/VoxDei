import { describe, expect, it } from "vitest";
import { ANCHO_PINO, agujasFondo, agujasFrente, polvoDeNieve, ramaCentral, yRama } from "./pinoNavidad.js";

describe("geometría del pino", () => {
  it("las agujas del fondo son oscuras y las del frente claras, cada tono como un solo trazado", () => {
    expect(Object.keys(agujasFondo()).sort()).toEqual(["stroke-app-pino", "stroke-app-pino-oscuro"]);
    expect(Object.keys(agujasFrente()).sort()).toEqual(["stroke-app-pino", "stroke-app-pino-brillo", "stroke-app-pino-claro"]);
    for (const d of [...Object.values(agujasFondo()), ...Object.values(agujasFrente())]) {
      expect(d).toMatch(/^M[\d. -]+L[\d. -]+/);
      expect(d.split("M").length).toBeGreaterThan(50);
    }
  });

  it("el fondo y el frente no son el mismo dibujo, y siempre sale igual", () => {
    expect(agujasFondo()["stroke-app-pino"]).not.toBe(agujasFrente()["stroke-app-pino"]);
    expect(agujasFondo()).toEqual(agujasFondo());
    expect(agujasFrente()).toEqual(agujasFrente());
    expect(polvoDeNieve()).toEqual(polvoDeNieve());
  });

  it("la rama empieza y termina a la misma altura, para que al repetirse no haya costura", () => {
    expect(yRama(0)).toBeCloseTo(yRama(ANCHO_PINO), 6);
    expect(ramaCentral()).toMatch(/^M0 [\d.]+L6 /);
  });

  it("la nieve en polvo queda dentro del bloque", () => {
    const polvo = polvoDeNieve();
    expect(polvo.length).toBeGreaterThan(10);
    for (const { cx, cy, r } of polvo) {
      expect(cx).toBeGreaterThan(0);
      expect(cx).toBeLessThan(ANCHO_PINO);
      expect(cy).toBeGreaterThan(0);
      expect(r).toBeGreaterThan(0);
    }
  });
});
