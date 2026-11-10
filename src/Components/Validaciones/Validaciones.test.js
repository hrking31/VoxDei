// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { LARGO_MINIMO_CLAVE, REQUISITOS_CLAVE, SIMBOLOS_CLAVE, claveValida } from "./Validaciones.js";

const BUENA = "Templo2026!ab";

describe("Contraseñas", () => {
  it("acepta una contraseña que cumple todo", () => {
    expect(claveValida(BUENA)).toBe(true);
  });

  it("rechaza la que le falta cualquiera de los requisitos", () => {
    expect(claveValida("Templo26!ab")).toBe(false); // 11 caracteres
    expect(claveValida("templo2026!ab")).toBe(false); // sin mayúscula
    expect(claveValida("TEMPLO2026!AB")).toBe(false); // sin minúscula
    expect(claveValida("TemploNuevo!ab")).toBe(false); // sin número
    expect(claveValida("Templo2026abc")).toBe(false); // sin símbolo
  });

  it("la Ñ y las tildes no cuentan como mayúscula ni minúscula (así cuenta Firebase)", () => {
    // Su única «mayúscula» es la Ñ.
    expect(claveValida("ñandu2026!xÑ")).toBe(false);
    // Su única «minúscula» es la é.
    expect(claveValida("ÑANDU2026!Áé")).toBe(false);
    // Con una A-Z de verdad, ya cumple.
    expect(claveValida("ñandu2026!xÑA")).toBe(true);
  });

  it("+, = y el espacio no son símbolos para Firebase", () => {
    for (const casi of ["Templo2026+ab", "Templo2026=ab", "Templo 2026ab"]) {
      expect(claveValida(casi)).toBe(false);
    }
  });

  it("la lista de requisitos que ve la persona dice cuál falta", () => {
    const falta = REQUISITOS_CLAVE.filter((r) => !r.cumple("templo")).map((r) => r.texto);
    expect(falta).toEqual([
      `Al menos ${LARGO_MINIMO_CLAVE} caracteres`,
      "Una mayúscula (A-Z)",
      "Un número (0-9)",
      "Un símbolo",
    ]);
  });

  it("el servidor (crearUsuarioAdmin) exige exactamente lo mismo", () => {
    const servidor = readFileSync(resolve(import.meta.dirname, "../../../functions/index.js"), "utf8");
    const largo = servidor.match(/const LARGO_MINIMO_CLAVE = (\d+);/);
    const simbolos = servidor.match(/const SIMBOLOS_CLAVE = ("(?:[^"\\]|\\.)*");/);
    expect(Number(largo?.[1])).toBe(LARGO_MINIMO_CLAVE);
    expect(JSON.parse(simbolos?.[1] ?? '""')).toBe(SIMBOLOS_CLAVE);
  });
});
