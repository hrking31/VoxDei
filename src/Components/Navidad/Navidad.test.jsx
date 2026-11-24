import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import GuirnaldaNavidad from "./GuirnaldaNavidad.jsx";

function fijarFecha(anio, mes, dia) {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(anio, mes, dia, 12));
}

beforeEach(() => fijarFecha(2027, 5, 15));
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("GuirnaldaNavidad", () => {
  it("fuera de temporada no pinta nada", () => {
    const { container } = render(<GuirnaldaNavidad />);
    expect(container.firstChild).toBeNull();
  });

  it("en Navidad pinta el pino y las luces, escondidos al lector de pantalla y sin recibir toques", () => {
    fijarFecha(2026, 11, 25);
    const { container } = render(<GuirnaldaNavidad />);
    const guirnalda = container.querySelector("[data-guirnalda]");
    expect(guirnalda.getAttribute("aria-hidden")).toBe("true");
    expect(guirnalda.className).toContain("pointer-events-none");
    expect(container.querySelectorAll("[data-pino]")).toHaveLength(2);
    expect(container.querySelectorAll("[data-luz]").length).toBe(12);
  });

  it("el pino va en dos capas con el cable de luces en medio: fondo, cable y frente", () => {
    fijarFecha(2026, 11, 25);
    const { container } = render(<GuirnaldaNavidad />);
    const capas = [...container.querySelector("[data-guirnalda]").children].map((e) => e.getAttribute("data-capa") ?? (e.hasAttribute("data-cable") ? "cable" : "otro"));
    expect(capas.slice(0, 3)).toEqual(["fondo", "cable", "frente"]);
  });

  it("el fondo lleva la rama y agujas oscuras; el frente, agujas claras, acebo con bayas, bolas, piñas y nieve", () => {
    fijarFecha(2026, 11, 25);
    const { container } = render(<GuirnaldaNavidad />);
    const fondo = container.querySelector('[data-capa="fondo"] pattern');
    expect(fondo.querySelector("path.stroke-app-pino-oscuro").getAttribute("d")).toMatch(/^M/);
    expect(fondo.querySelector("path.stroke-app-pino").getAttribute("d")).toMatch(/^M/);
    const frente = container.querySelector('[data-capa="frente"] pattern');
    expect(frente.querySelector("path.stroke-app-pino-claro").getAttribute("d")).toMatch(/^M/);
    expect(frente.querySelector("path.stroke-app-pino-brillo").getAttribute("d")).toMatch(/^M/);
    expect(frente.querySelectorAll("circle.fill-app-baya").length).toBeGreaterThanOrEqual(7);
    expect(frente.querySelectorAll('circle[fill^="url(#bola-"]').length).toBe(3);
    expect(frente.querySelectorAll("ellipse.fill-app-pina").length).toBeGreaterThanOrEqual(1);
    expect(frente.querySelectorAll("circle.fill-app-nieve").length).toBeGreaterThan(10);
    expect(container.querySelectorAll("radialGradient")).toHaveLength(3);
  });

  it("lleva un lazo rojo en cada punta y el cable serpentea alrededor de la rama", () => {
    fijarFecha(2026, 11, 25);
    const { container } = render(<GuirnaldaNavidad />);
    expect(container.querySelectorAll("[data-lazo]")).toHaveLength(2);
    const d = container.querySelector("[data-cable] path").getAttribute("d");
    expect(d).toMatch(/^M0\.00 [\d.]+L/);
    expect(d.split("L")).toHaveLength(121);
  });

  it("los bombillos van alternados, uno arriba y otro abajo de la rama, y encima del pino", () => {
    fijarFecha(2026, 11, 25);
    const { container } = render(<GuirnaldaNavidad />);
    const tops = [...container.querySelectorAll("[data-luz]")].map((l) => parseFloat(l.style.top));
    expect(tops).toHaveLength(12);
    tops.forEach((t, i) => {
      if (i > 0) expect(t > 40).not.toBe(tops[i - 1] > 40);
    });
    const hijos = [...container.querySelector("[data-guirnalda]").children];
    expect(hijos.findIndex((e) => e.querySelector("[data-luz]"))).toBeGreaterThan(hijos.findIndex((e) => e.getAttribute("data-capa") === "frente"));
  });

  it("ocupa su sitio en la página, para no tapar ningún texto, y las pantallas se lo descuentan", () => {
    fijarFecha(2026, 11, 25);
    const { container } = render(<GuirnaldaNavidad />);
    const clases = container.querySelector("[data-guirnalda]").className;
    expect(clases).toContain("relative");
    expect(clases).toContain("h-guirnalda");
    expect(clases).not.toMatch(/\b(absolute|fixed|sticky)\b/);
    // El atributo `data-guirnalda` es lo que activa --alto-guirnalda en index.css
    const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "../../index.css"), "utf8");
    expect(css).toMatch(/:root:has\(\[data-guirnalda\]\)\s*\{\s*--alto-guirnalda: var\(--spacing-guirnalda\)/);
    expect(css).toMatch(/@utility h-pantalla \{\s*height: calc\(100svh - var\(--alto-barra\) - var\(--alto-guirnalda\)\)/);
    expect(css).toMatch(/@utility min-h-pantalla \{\s*min-height: calc\(100svh - var\(--alto-barra\) - var\(--alto-guirnalda\)\)/);
  });

  it("las luces alternan los cuatro colores", () => {
    fijarFecha(2026, 11, 25);
    const { container } = render(<GuirnaldaNavidad />);
    const colores = new Set([...container.querySelectorAll("[data-luz] > span:last-child")].map((l) => l.className.match(/text-app-[a-z-]+/)[0]));
    expect(colores.size).toBe(4);
  });

  it("los colores salen del tema, sin valores sueltos", () => {
    fijarFecha(2026, 11, 25);
    const { container } = render(<GuirnaldaNavidad />);
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,6}\b/);
    const colores = new Set([...container.querySelectorAll("[data-luz] > span:last-child")].map((l) => l.className.match(/text-app-[a-z-]+/)[0]));
    expect(colores.size).toBe(4);
  });
});
