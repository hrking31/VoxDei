import { describe, expect, it } from "vitest";
import { tonoDe } from "./tonosPredica.js";

describe("un color por estado de la prédica", () => {
  it("borrador naranja (no dorado: es el acento de la app), terminada azul, predicada verde, sin predicar rojo", () => {
    expect(tonoDe("borrador").borde).toBe("border-app-naranja");
    expect(tonoDe("terminada").borde).toBe("border-app-azul");
    expect(tonoDe("predicada").borde).toBe("border-app-success");
    expect(tonoDe("sin-predicar").borde).toBe("border-app-error");
    expect(tonoDe("borrador").chip).not.toContain("app-main");
  });

  it("lo desconocido se pinta como borrador", () => {
    expect(tonoDe("otro")).toBe(tonoDe("borrador"));
  });
});
