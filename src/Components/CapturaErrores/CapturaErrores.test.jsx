import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import CapturaErrores from "./CapturaErrores.jsx";
// Vite incrusta los SVG pequeños como data:, así que se compara con el import.
import simboloSvg from "../../assets/voxdei-simbolo.svg";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function Rompe() {
  throw new Error("fallo de prueba");
}

describe("CapturaErrores", () => {
  it("sin errores deja pasar el contenido", () => {
    render(
      <CapturaErrores>
        <p>Todo bien</p>
      </CapturaErrores>
    );
    expect(screen.getByText("Todo bien")).toBeTruthy();
  });

  it("si una pantalla falla muestra el proyector apagado y la salida", () => {
    // React y el componente escriben el fallo en la consola: se silencia.
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <CapturaErrores>
        <Rompe />
      </CapturaErrores>
    );
    expect(screen.getByRole("heading", { name: "La pantalla se apagó un momento" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Recargar" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Ir al inicio" })).toBeTruthy();
    const simbolo = document.querySelector("img");
    expect(simbolo.getAttribute("src")).toBe(simboloSvg);
    expect(simbolo.className).toContain("grayscale");
  });
});
