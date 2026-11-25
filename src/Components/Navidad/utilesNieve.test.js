import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hayNieve } from "./utilesNieve.js";

function fijarFecha(anio, mes, dia) {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(anio, mes, dia, 12));
}

beforeEach(() => fijarFecha(2026, 11, 25));
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("hayNieve", () => {
  it("nieva en las pantallas del panel y del login durante la temporada", () => {
    expect(hayNieve("/ViewInicio")).toBe(true);
    expect(hayNieve("/ViewPredica")).toBe(true);
    expect(hayNieve("/ViewLogin")).toBe(true);
  });

  it("fuera de temporada no nieva", () => {
    fijarFecha(2027, 5, 15);
    expect(hayNieve("/ViewInicio")).toBe(false);
  });

  it("nunca nieva sobre la pantalla del templo, con las mayúsculas que sean", () => {
    expect(hayNieve("/VOXDEI")).toBe(false);
    expect(hayNieve("/voxdei")).toBe(false);
    expect(hayNieve("/Voxdei")).toBe(false);
  });

  it("no nieva con «reducir movimiento» activo", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    expect(hayNieve("/ViewInicio")).toBe(false);
  });

  it("con «reducir movimiento» apagado, o sin matchMedia, nieva", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    expect(hayNieve("/ViewInicio")).toBe(true);
    vi.stubGlobal("matchMedia", undefined);
    expect(hayNieve("/ViewInicio")).toBe(true);
  });
});
