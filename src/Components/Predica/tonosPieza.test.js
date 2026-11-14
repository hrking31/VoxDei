/* global process */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { tonoPieza } from "./tonosPieza.js";

const FORMAS = ["caja", "elegida", "acento", "contorno", "boton"];
const TIPOS = ["titulo", "mensaje", "versiculo", "imagen"];

describe("tonoPieza", () => {
  it("cada tipo de ítem trae las cinco formas de uso", () => {
    for (const tipo of TIPOS) {
      for (const forma of FORMAS) expect(tonoPieza(tipo)[forma], `${tipo}.${forma}`).toMatch(/\S/);
    }
  });

  it("un tipo desconocido (o ninguno) se ve como un mensaje", () => {
    expect(tonoPieza("raro")).toBe(tonoPieza("mensaje"));
    expect(tonoPieza(undefined)).toBe(tonoPieza("mensaje"));
  });

  it("cada tipo tiene su propio color de acento, y ninguno es el dorado de la app", () => {
    const acentos = TIPOS.map((t) => tonoPieza(t).acento);
    expect(new Set(acentos).size).toBe(TIPOS.length);
    for (const tipo of TIPOS) expect(JSON.stringify(tonoPieza(tipo))).not.toContain("app-main");
  });

  it("los fondos y brillos que nombra existen en index.css (si no, el tapete se vería sin color)", () => {
    const css = readFileSync(resolve(process.cwd(), "src/index.css"), "utf8");
    for (const tipo of TIPOS) {
      const clases = tonoPieza(tipo).caja.split(" ");
      for (const c of clases.filter((x) => x.startsWith("fondo-pieza-"))) expect(css, c).toContain(`@utility ${c}`);
      for (const c of clases.filter((x) => x.startsWith("shadow-neon-"))) expect(css, c).toContain(`--${c}:`);
    }
  });
});
