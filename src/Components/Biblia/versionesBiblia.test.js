import { describe, expect, it } from "vitest";
import { VERSIONES, VERSION_POR_DEFECTO, libroEnVersion, librosDe, versionValida } from "./versionesBiblia.js";

describe("versiones de la Biblia", () => {
  it("de fábrica la RVR1960; cualquier valor desconocido también", () => {
    expect(VERSION_POR_DEFECTO).toBe("RVR1960");
    expect(versionValida(undefined)).toBe("RVR1960");
    expect(versionValida("NVI")).toBe("RVR1960");
    expect(versionValida("DHHS94")).toBe("DHHS94");
  });

  it("la RVR1960 sigue con sus 66 libros y la DHH trae los 75", () => {
    const rvr = librosDe("RVR1960");
    const dhh = librosDe("DHHS94");
    expect(rvr.librosAntiguo.length + rvr.librosNuevo.length).toBe(66);
    expect(dhh.librosAntiguo).toHaveLength(48);
    expect(dhh.librosNuevo).toHaveLength(27);
    expect(dhh.librosNuevo[0]).toMatchObject({ sigla: "MAT", nombre: "S. Mateo", capitulos: 28 });
  });

  it("cada versión cuenta sus propios versículos", () => {
    expect(libroEnVersion("NUM", "RVR1960").capitulo25).toBe(18);
    expect(libroEnVersion("NUM", "DHHS94").capitulo25).toBe(19);
    expect(libroEnVersion("JHN", "DHHS94")).toMatchObject({ nombre: "S. Juan", capitulos: 21, capitulo3: 36 });
  });

  it("los deuterocanónicos solo están en la DHH", () => {
    expect(libroEnVersion("TOB", "DHHS94")).toMatchObject({ nombre: "Tobit", capitulos: 14 });
    expect(libroEnVersion("TOB", "RVR1960")).toBeNull();
  });

  it("cada versión muestra su aviso de derechos", () => {
    expect(VERSIONES.RVR1960.aviso).toMatch(/Sociedades Bíblicas/);
    expect(VERSIONES.DHHS94.aviso).toMatch(/Todos los derechos reservados/);
    expect(VERSIONES.DHHS94.corto).toBe("DHH");
  });
});
