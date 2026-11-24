import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import simboloSvg from "../../assets/voxdei-simbolo.svg";
import simboloNavidadSvg from "../../assets/voxdei-simbolo-navidad.svg";
import LogoDeLaIglesia from "./LogoDeLaIglesia.jsx";
import { montar } from "../Navegacion/pruebas.utils.jsx";

const sesion = { userData: { name: "Ana", role: "Pastor", groupId: "g1", churchName: "Camino de Paz" } };

describe("LogoDeLaIglesia", () => {
  it("sin logo de la iglesia usa el de VOXDEI", () => {
    montar(<LogoDeLaIglesia data-prueba />, { auth: sesion, app: { iglesia: null } });
    const img = screen.getByAltText("VOXDEI");
    // El normal o el de Navidad, según la época: la prueba no depende de la fecha.
    expect([simboloSvg, simboloNavidadSvg]).toContain(img.getAttribute("src"));
    expect(img.hasAttribute("data-logo-iglesia")).toBe(false);
  });

  it("con logo de la iglesia lo usa, entero y con el nombre como texto alternativo", () => {
    montar(<LogoDeLaIglesia className="h-10 w-10" />, {
      auth: sesion,
      app: { iglesia: { nombre: "Camino de Paz", logo: "https://x.test/logo.png" } },
    });
    const img = screen.getByAltText("Camino de Paz");
    expect(img.getAttribute("src")).toBe("https://x.test/logo.png");
    expect(img.className).toContain("object-contain");
    expect(img.className).toContain("h-10");
    expect(img.hasAttribute("data-logo-iglesia")).toBe(true);
  });

  it("respeta el alt que se le pase, con o sin logo de la iglesia", () => {
    const { unmount } = montar(<LogoDeLaIglesia alt="" />, { auth: sesion, app: { iglesia: null } });
    expect(document.querySelector("img").getAttribute("alt")).toBe("");
    unmount();
    montar(<LogoDeLaIglesia alt="" />, { auth: sesion, app: { iglesia: { logo: "https://x.test/l.png" } } });
    expect(document.querySelector("img").getAttribute("alt")).toBe("");
  });

  it("la variante solo cambia el logo de respaldo", () => {
    montar(<LogoDeLaIglesia variante="vertical" />, { auth: sesion, app: { iglesia: null } });
    expect(screen.getByAltText("VOXDEI").getAttribute("src")).not.toBe(simboloSvg);
  });
});
