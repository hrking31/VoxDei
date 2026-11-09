import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import Loading from "./Loading.jsx";
// Vite incrusta los SVG pequeños como data:, así que se compara con el import.
import simboloSvg from "../../assets/voxdei-simbolo.svg";

afterEach(cleanup);

describe("Loading", () => {
  it("muestra el símbolo encendiéndose y el texto que se le pasa", () => {
    render(<Loading text="Encendiendo el proyector..." />);
    const estado = screen.getByRole("status");
    expect(estado.textContent).toContain("Encendiendo el proyector...");
    const simbolo = estado.querySelector("img");
    expect(simbolo.getAttribute("src")).toBe(simboloSvg);
    expect(simbolo.className).toContain("motion-safe:animate-enciende");
  });

  it("sin texto dice «Cargando...»", () => {
    render(<Loading />);
    expect(screen.getByRole("status").textContent).toContain("Cargando...");
  });
});
