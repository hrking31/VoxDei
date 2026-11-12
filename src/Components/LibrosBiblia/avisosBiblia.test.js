import { describe, expect, it } from "vitest";
import { AVISOS_BIBLIA, avisoBiblia } from "./avisosBiblia.js";
import { VERSIONES } from "../Biblia/versionesBiblia.js";

describe("aviso de la Biblia en la pantalla del templo", () => {
  it("nombre y derechos de cada versión", () => {
    expect(avisoBiblia("RVR1960")).toMatch(/^Reina-Valera 1960 · Texto bíblico Reina-Valera 1960® © Sociedades Bíblicas/);
    expect(avisoBiblia("DHHS94")).toMatch(/^Dios Habla Hoy · .*Todos los derechos reservados\.$/);
  });

  it("sin versión o una desconocida, la RVR1960", () => {
    expect(avisoBiblia(undefined)).toBe(avisoBiblia("RVR1960"));
    expect(avisoBiblia("NVI")).toBe(avisoBiblia("RVR1960"));
  });

  // TEMPORAL DHH: el selector del panel muestra los mismos textos.
  it("el selector del panel usa los mismos avisos", () => {
    expect(VERSIONES.RVR1960.aviso).toBe(AVISOS_BIBLIA.RVR1960.aviso);
    expect(VERSIONES.DHHS94.aviso).toBe(AVISOS_BIBLIA.DHHS94.aviso);
  });
});

describe("iniciales de la Biblia en el tapete", () => {
  it("RVR1960 y DHH; sin versión, RVR1960", async () => {
    const { siglaBiblia } = await import("./avisosBiblia.js");
    expect(siglaBiblia("RVR1960")).toBe("RVR1960");
    expect(siglaBiblia("DHHS94")).toBe("DHH");
    expect(siglaBiblia(undefined)).toBe("RVR1960");
  });
});
