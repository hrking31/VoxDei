import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import PestanasCronograma from "./PestanasCronograma.jsx";

// Sin `globals`, Testing Library no limpia sola entre pruebas
afterEach(cleanup);

describe("PestanasCronograma", () => {
  it("dos pestañas, «Servicios» y «Programación», con la elegida marcada", () => {
    render(<PestanasCronograma valor="programacion" alCambiar={() => {}} />);
    expect(screen.getByRole("tablist", { name: "Cronograma" })).toBeTruthy();
    expect(
      screen
        .getByRole("tab", { name: "Servicios" })
        .getAttribute("aria-selected"),
    ).toBe("false");
    const elegida = screen.getByRole("tab", { name: "Programación" });
    expect(elegida.getAttribute("aria-selected")).toBe("true");
    expect(elegida.className).toContain("bg-app-main");
  });

  it("al tocar una pestaña avisa cuál se eligió", () => {
    const alCambiar = vi.fn();
    render(<PestanasCronograma valor="servicios" alCambiar={alCambiar} />);
    fireEvent.click(screen.getByRole("tab", { name: "Programación" }));
    expect(alCambiar).toHaveBeenCalledWith("programacion");
    fireEvent.click(screen.getByRole("tab", { name: "Servicios" }));
    expect(alCambiar).toHaveBeenLastCalledWith("servicios");
  });
});
