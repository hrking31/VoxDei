import { describe, expect, it } from "vitest";
import { esTemporadaNavidena } from "./utilesNavidad.js";

describe("esTemporadaNavidena", () => {
  it("empieza el 1 de diciembre", () => {
    expect(esTemporadaNavidena(new Date(2026, 10, 30))).toBe(false);
    expect(esTemporadaNavidena(new Date(2026, 11, 1))).toBe(true);
  });

  it("incluye todo diciembre y el cambio de año", () => {
    expect(esTemporadaNavidena(new Date(2026, 11, 25))).toBe(true);
    expect(esTemporadaNavidena(new Date(2026, 11, 31))).toBe(true);
    expect(esTemporadaNavidena(new Date(2027, 0, 1))).toBe(true);
  });

  it("termina el 6 de enero, día de Reyes", () => {
    expect(esTemporadaNavidena(new Date(2027, 0, 6))).toBe(true);
    expect(esTemporadaNavidena(new Date(2027, 0, 7))).toBe(false);
  });

  it("el resto del año no es temporada", () => {
    expect(esTemporadaNavidena(new Date(2027, 5, 15))).toBe(false);
    expect(esTemporadaNavidena(new Date(2026, 9, 31))).toBe(false);
  });
});
