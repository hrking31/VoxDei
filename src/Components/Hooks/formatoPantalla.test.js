import { describe, expect, it } from "vitest";
import { esBaja, formatoDe } from "./formatoPantalla.js";

describe("el formato de la pantalla del panel", () => {
  it("celular hasta 743, tableta de 744 a 1023, escritorio desde 1024", () => {
    expect(formatoDe(390)).toBe("celular");
    expect(formatoDe(743)).toBe("celular");
    expect(formatoDe(744)).toBe("tableta"); // iPad mini de pie
    expect(formatoDe(1023)).toBe("tableta");
    expect(formatoDe(1024)).toBe("escritorio");
    expect(formatoDe(1366)).toBe("escritorio"); // iPad Pro acostado
  });

  it("baja: solo el escritorio con menos de 800 de alto (un PC de 1280×720)", () => {
    expect(esBaja(1280, 720)).toBe(true);
    expect(esBaja(1366, 768)).toBe(true);
    expect(esBaja(1280, 900)).toBe(false);
    expect(esBaja(744, 600)).toBe(false); // una tableta no es «baja»
  });
});
