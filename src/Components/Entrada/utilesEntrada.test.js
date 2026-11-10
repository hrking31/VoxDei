import { describe, expect, it } from "vitest";
import { iniciales, primerNombre, saludoSegunHora } from "./utilesEntrada.js";

const a = (hora) => new Date(2026, 10, 9, hora, 0);

describe("saludoSegunHora", () => {
  it("días, tardes y noches", () => {
    expect(saludoSegunHora(a(7))).toBe("Buenos días");
    expect(saludoSegunHora(a(11))).toBe("Buenos días");
    expect(saludoSegunHora(a(12))).toBe("Buenas tardes");
    expect(saludoSegunHora(a(18))).toBe("Buenas tardes");
    expect(saludoSegunHora(a(19))).toBe("Buenas noches");
    expect(saludoSegunHora(a(2))).toBe("Buenos días");
  });
});

describe("primerNombre", () => {
  it("toma solo el primero, aunque el nombre sea muy largo", () => {
    expect(primerNombre("María Fernanda de los Ángeles Rodríguez")).toBe("María");
    expect(primerNombre("  Hernando   Rey ")).toBe("Hernando");
    expect(primerNombre("")).toBe("");
  });
});

describe("iniciales", () => {
  it("primera letra del primer y del último nombre", () => {
    expect(iniciales("Hernando Rey")).toBe("HR");
    expect(iniciales("maría fernanda rodríguez montenegro")).toBe("MM");
    expect(iniciales("Ana")).toBe("A");
    expect(iniciales("")).toBe("?");
  });
});
