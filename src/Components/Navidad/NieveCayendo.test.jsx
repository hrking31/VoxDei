import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { montar } from "../Navegacion/pruebas.utils.jsx";
import NieveCayendo from "./NieveCayendo.jsx";

function fijarFecha(anio, mes, dia) {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(anio, mes, dia, 12));
}

// jsdom no dibuja canvas: se calla su aviso de «no implementado».
beforeEach(() => {
  fijarFecha(2026, 11, 25);
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  vi.spyOn(globalThis, "requestAnimationFrame").mockReturnValue(1);
  vi.spyOn(globalThis, "cancelAnimationFrame").mockImplementation(() => {});
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("NieveCayendo", () => {
  it("en Navidad pinta la capa de nieve, escondida al lector de pantalla y sin recibir toques", () => {
    const { container } = montar(<NieveCayendo />);
    const capa = container.querySelector("[data-nieve-cayendo]");
    expect(capa.getAttribute("aria-hidden")).toBe("true");
    expect(capa.className).toContain("pointer-events-none");
    expect(capa.querySelector("canvas")).not.toBeNull();
  });

  it("lleva la pila de nieve acumulada abajo, dentro de la misma capa", () => {
    const { container } = montar(<NieveCayendo />);
    const capa = container.querySelector("[data-nieve-cayendo]");
    expect(capa.querySelector("[data-pila-nieve]")).not.toBeNull();
    expect(capa.querySelectorAll("canvas")).toHaveLength(2);
  });

  it("fuera de temporada no pinta nada", () => {
    fijarFecha(2027, 5, 15);
    const { container } = montar(<NieveCayendo />);
    expect(container.querySelector("[data-nieve-cayendo]")).toBeNull();
  });

  it("no nieva sobre la pantalla del templo, ni con mayúsculas distintas", () => {
    const { container } = montar(<NieveCayendo />, { ruta: "/VOXDEI" });
    expect(container.querySelector("[data-nieve-cayendo]")).toBeNull();
  });

  it("con «reducir movimiento» no nieva", () => {
    // jsdom no trae matchMedia
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    const { container } = montar(<NieveCayendo />);
    expect(container.querySelector("[data-nieve-cayendo]")).toBeNull();
  });

  it("nieva en las demás pantallas, incluido el login", () => {
    const { container } = montar(<NieveCayendo />, { ruta: "/ViewLogin" });
    expect(container.querySelector("[data-nieve-cayendo]")).not.toBeNull();
  });
});
