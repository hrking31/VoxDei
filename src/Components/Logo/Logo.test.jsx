import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Simbolo, LogoHorizontal, LogoVertical } from "./Logo.jsx";
// Vite incrusta los SVG pequeños como data:, así que se compara con el import.
import simboloSvg from "../../assets/voxdei-simbolo.svg";
import simboloNavidadSvg from "../../assets/voxdei-simbolo-navidad.svg";
import horizontalSvg from "../../assets/voxdei-logo-horizontal-fondo-oscuro.svg";
import horizontalNavidadSvg from "../../assets/voxdei-logo-horizontal-fondo-oscuro-navidad.svg";
import verticalSvg from "../../assets/voxdei-logo-vertical-fondo-oscuro.svg";
import verticalNavidadSvg from "../../assets/voxdei-logo-vertical-fondo-oscuro-navidad.svg";

function fijarFecha(anio, mes, dia) {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(anio, mes, dia, 12));
}

const fuente = () => screen.getByRole("img").getAttribute("src");

beforeEach(() => fijarFecha(2027, 5, 15));
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("logos de VOXDEI", () => {
  it("fuera de temporada son los de siempre", () => {
    render(<Simbolo />);
    expect(fuente()).toBe(simboloSvg);
    cleanup();
    render(<LogoHorizontal />);
    expect(fuente()).toBe(horizontalSvg);
    cleanup();
    render(<LogoVertical />);
    expect(fuente()).toBe(verticalSvg);
  });

  it("en Navidad los tres llevan guirnalda y nieve", () => {
    fijarFecha(2026, 11, 25);
    render(<Simbolo />);
    expect(fuente()).toBe(simboloNavidadSvg);
    cleanup();
    render(<LogoHorizontal />);
    expect(fuente()).toBe(horizontalNavidadSvg);
    cleanup();
    render(<LogoVertical />);
    expect(fuente()).toBe(verticalNavidadSvg);
  });

  it("empiezan el 1 de diciembre y terminan el 6 de enero", () => {
    fijarFecha(2026, 10, 30);
    render(<LogoVertical />);
    expect(fuente()).toBe(verticalSvg);
    cleanup();
    fijarFecha(2026, 11, 1);
    render(<LogoVertical />);
    expect(fuente()).toBe(verticalNavidadSvg);
    cleanup();
    fijarFecha(2027, 0, 6);
    render(<LogoVertical />);
    expect(fuente()).toBe(verticalNavidadSvg);
    cleanup();
    fijarFecha(2027, 0, 7);
    render(<LogoVertical />);
    expect(fuente()).toBe(verticalSvg);
  });

  it("con navidad={false} se queda el normal aun en Navidad y la propiedad no llega a la imagen", () => {
    fijarFecha(2026, 11, 25);
    render(<Simbolo navidad={false} data-prueba />);
    const img = screen.getByRole("img");
    expect(img.getAttribute("src")).toBe(simboloSvg);
    expect(img.hasAttribute("navidad")).toBe(false);
    expect(img.hasAttribute("data-prueba")).toBe(true);
  });

  it("conserva el alt por defecto y el que se le pase", () => {
    render(<Simbolo />);
    expect(screen.getByAltText("VOXDEI")).toBeTruthy();
    cleanup();
    render(<Simbolo alt="" />);
    expect(document.querySelector("img").getAttribute("alt")).toBe("");
  });
});
