import { describe, expect, it } from "vitest";
import { LARGO_SIGLA, datosDeIglesia, normalizarSigla } from "./datosIglesia.js";

describe("normalizarSigla", () => {
  it("deja solo letras y números, en mayúsculas", () => {
    expect(normalizarSigla("c.d.p")).toBe("CDP");
    expect(normalizarSigla(" Camino 21 ")).toBe("CAMINO21");
    expect(normalizarSigla("iglesia de jesús")).toBe("IGLESIAD");
  });

  it(`no pasa de ${LARGO_SIGLA} caracteres y acepta vacío`, () => {
    expect(normalizarSigla("ABCDEFGHIJKL")).toHaveLength(LARGO_SIGLA);
    expect(normalizarSigla("")).toBe("");
    expect(normalizarSigla(undefined)).toBe("");
  });

  it("respeta la Ñ y las tildes", () => {
    expect(normalizarSigla("año")).toBe("AÑO");
    expect(normalizarSigla("misión")).toBe("MISIÓN");
  });
});

describe("datosDeIglesia", () => {
  it("usa los datos guardados de la iglesia", () => {
    expect(datosDeIglesia({ nombre: "Camino de Paz", sigla: "CDP", logo: "url" }, { churchName: "Viejo" }))
      .toEqual({ nombre: "Camino de Paz", sigla: "CDP", logo: "url" });
  });

  it("sin datos guardados usa el nombre de la ficha del usuario", () => {
    expect(datosDeIglesia(null, { churchName: "Camino de Paz" })).toEqual({ nombre: "Camino de Paz", sigla: "", logo: "" });
  });
});
