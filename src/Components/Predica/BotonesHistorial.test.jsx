import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import BotonesHistorial from "./BotonesHistorial.jsx";
import { montar } from "../Navegacion/pruebas.utils.jsx";

const historial = (extra = {}) => ({
  deshacer: vi.fn(),
  rehacer: vi.fn(),
  puedeDeshacer: true,
  puedeRehacer: true,
  ...extra,
});

describe("BotonesHistorial", () => {
  it("dos botones solo con ícono, con su nombre y su atajo", () => {
    montar(<BotonesHistorial historial={historial()} />);
    const deshacer = screen.getByRole("button", { name: "Deshacer" });
    const rehacer = screen.getByRole("button", { name: "Rehacer" });
    expect(deshacer.title).toBe("Deshacer (Ctrl+Z)");
    expect(rehacer.title).toBe("Rehacer (Ctrl+Y)");
    for (const b of [deshacer, rehacer]) {
      expect(b.textContent).toBe("");
      expect(b.querySelector("svg")).not.toBeNull();
    }
  });

  it("cada uno llama a lo suyo", () => {
    const h = historial();
    montar(<BotonesHistorial historial={h} />);
    fireEvent.click(screen.getByRole("button", { name: "Deshacer" }));
    expect(h.deshacer).toHaveBeenCalledTimes(1);
    expect(h.rehacer).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Rehacer" }));
    expect(h.rehacer).toHaveBeenCalledTimes(1);
  });

  it("se apagan cuando no hay nada que deshacer o rehacer", () => {
    montar(<BotonesHistorial historial={historial({ puedeDeshacer: false })} />);
    expect(screen.getByRole("button", { name: "Deshacer" }).disabled).toBe(true);
    expect(screen.getByRole("button", { name: "Rehacer" }).disabled).toBe(false);
  });

  it("no le quita el foco al campo que se está escribiendo (mousedown sin efecto)", () => {
    montar(<BotonesHistorial historial={historial()} />);
    const evento = new MouseEvent("mousedown", { bubbles: true, cancelable: true });
    screen.getByRole("button", { name: "Deshacer" }).dispatchEvent(evento);
    expect(evento.defaultPrevented).toBe(true);
  });

  it("el tamaño lo decide quien lo pone (className)", () => {
    montar(<BotonesHistorial historial={historial()} className="h-9 w-9" />);
    expect(screen.getByRole("button", { name: "Deshacer" }).className).toContain("h-9 w-9");
  });
});
