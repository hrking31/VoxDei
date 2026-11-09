import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { iconoConPunto, tituloDePestana } from "./iconoPestana.js";
import IconoPestana from "./IconoPestana.jsx";
import { montar } from "./pruebas.utils.jsx";

const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><rect/></svg>\n';
const decodificar = (uri) => decodeURIComponent(uri.replace("data:image/svg+xml,", ""));

describe("iconoConPunto", () => {
  it("agrega el punto antes del cierre del SVG, con los colores pedidos", () => {
    const uri = iconoConPunto(SVG, { relleno: "#4ade80", borde: "#323437" });
    expect(uri.startsWith("data:image/svg+xml,")).toBe(true);
    const svg = decodificar(uri);
    expect(svg).toMatch(/<rect\/><circle [^>]*fill="#4ade80"[^>]*stroke="#323437"[^>]*\/><\/svg>$/);
  });
});

describe("tituloDePestana", () => {
  it("nombra la sección, o solo VOXDEI", () => {
    expect(tituloDePestana("Canciones")).toBe("VOXDEI · Canciones");
    expect(tituloDePestana()).toBe("VOXDEI");
  });
});

describe("IconoPestana", () => {
  let enlace;
  beforeEach(() => {
    // Los colores salen del tema; jsdom no carga el CSS, se definen aquí.
    document.documentElement.style.setProperty("--color-app-success", "#4ade80");
    document.documentElement.style.setProperty("--color-app-error", "#ef4444");
    document.documentElement.style.setProperty("--color-app-dark", "#323437");
    enlace = document.createElement("link");
    enlace.rel = "icon";
    enlace.href = "/src/assets/voxdei-simbolo.svg";
    document.head.appendChild(enlace);
    document.title = "VOXDEI";
  });
  afterEach(() => enlace.remove());

  it("al pastor (siempre puede proyectar) le pone el punto verde y el nombre de la sección", () => {
    montar(<IconoPestana />, { ruta: "/ViewCancion/abc" });
    const svg = decodificar(enlace.getAttribute("href"));
    expect(svg).toContain('fill="#4ade80"');
    expect(document.title).toBe("VOXDEI · Canciones");
  });

  it("al operador sin turno le pone el punto rojo", () => {
    montar(<IconoPestana />, { auth: { userData: { name: "Luis", role: "Operador" } } });
    expect(decodificar(enlace.getAttribute("href"))).toContain('fill="#ef4444"');
  });

  it("al salir del panel deja el ícono y el título como estaban", () => {
    const { unmount } = montar(<IconoPestana />, { ruta: "/ViewVersiculo" });
    expect(document.title).toBe("VOXDEI · Biblia");
    unmount();
    expect(enlace.getAttribute("href")).toBe("/src/assets/voxdei-simbolo.svg");
    expect(document.title).toBe("VOXDEI");
  });
});
