import { describe, expect, it } from "vitest";
import { TAMANOS_PANTALLA, tipoDePantalla } from "./tamanosPantalla.js";

describe("TAMANOS_PANTALLA", () => {
  it("conserva los números de la pantalla del templo", () => {
    expect(TAMANOS_PANTALLA.proyector.text).toBe("clamp(2.5rem,4vw,4rem)");
    expect(TAMANOS_PANTALLA.desktop.tickerHeight).toBe("clamp(2.5rem,4vw,3rem)");
    expect(TAMANOS_PANTALLA.movil.verseCite).toBe("0.875rem");
    expect(Object.keys(TAMANOS_PANTALLA)).toEqual(["proyector", "desktop", "movil"]);
  });
});

describe("tipoDePantalla", () => {
  it("un computador con pantalla grande es proyector", () => {
    expect(tipoDePantalla({ ancho: 1920, alto: 1080, dispositivo: "computador" })).toBe("proyector");
    expect(tipoDePantalla({ ancho: 3840, alto: 2160 })).toBe("proyector");
  });
  it("un computador más chico es desktop", () => {
    expect(tipoDePantalla({ ancho: 1280, alto: 720, dispositivo: "computador" })).toBe("desktop");
    expect(tipoDePantalla({ ancho: 1366, alto: 768, dispositivo: "computador" })).toBe("desktop");
  });
  it("un celular es movil y una tableta grande, desktop", () => {
    expect(tipoDePantalla({ ancho: 390, alto: 844, dispositivo: "celular" })).toBe("movil");
    expect(tipoDePantalla({ ancho: 1024, alto: 1366, dispositivo: "tablet" })).toBe("desktop");
  });
});
