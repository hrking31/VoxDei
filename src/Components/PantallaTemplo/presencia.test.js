import { describe, expect, it } from "vitest";
import { avisoDeCambio, estadoPantalla, tipoDispositivo } from "./presencia.js";

describe("estadoPantalla", () => {
  it("sin ventanas está apagada", () => {
    expect(estadoPantalla(null)).toBe("apagada");
    expect(estadoPantalla({})).toBe("apagada");
  });

  it("abierta sin pantalla completa", () => {
    expect(estadoPantalla({ a: { completa: false } })).toBe("sin-completa");
  });

  it("basta una ventana en pantalla completa para estar encendida", () => {
    expect(estadoPantalla({ a: { completa: false }, b: { completa: true } })).toBe("encendida");
  });
});

describe("avisoDeCambio", () => {
  it("no avisa al cargar ni si no cambia nada", () => {
    expect(avisoDeCambio(null, "encendida")).toBeNull();
    expect(avisoDeCambio("apagada", "apagada")).toBeNull();
  });

  it("avisa al encender, al apagar y si falta pantalla completa", () => {
    expect(avisoDeCambio("apagada", "encendida")).toEqual({ tipo: "success", texto: "Se encendió la pantalla del templo" });
    expect(avisoDeCambio("encendida", "apagada")).toEqual({ tipo: "info", texto: "Se apagó la pantalla del templo" });
    expect(avisoDeCambio("apagada", "sin-completa").texto).toMatch(/Falta pantalla completa/);
    expect(avisoDeCambio("encendida", "sin-completa").texto).toMatch(/salió de pantalla completa/);
    expect(avisoDeCambio("sin-completa", "encendida").tipo).toBe("success");
  });
});

describe("tipoDispositivo", () => {
  it("reconoce celular, tablet y computador", () => {
    expect(tipoDispositivo({ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)" }, 390)).toBe("celular");
    expect(tipoDispositivo({ userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile" }, 412)).toBe("celular");
    expect(tipoDispositivo({ userAgent: "Mozilla/5.0 (Linux; Android 14; SM-X200)" }, 1200)).toBe("tablet");
    expect(tipoDispositivo({ userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }, 1920)).toBe("computador");
  });
});
