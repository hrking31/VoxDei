import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ClockIcon } from "@heroicons/react/24/solid";
import PanelHoja from "./PanelHoja.jsx";

afterEach(cleanup);

describe("PanelHoja (el panel único de los versículos, y de Libros y Recientes de Biblia)", () => {
  it("lleva la franja con su título, el contenido debajo y la X que cierra", () => {
    const alCerrar = vi.fn();
    render(
      <PanelHoja alCerrar={alCerrar} role="dialog" aria-label="Versículos" data-hoja="x" className="fixed inset-0">
        <p>contenido</p>
      </PanelHoja>
    );
    const panel = screen.getByRole("dialog", { name: "Versículos" });
    // La posición, el rol y los datos los pone quien lo usa y llegan al elemento de arriba
    expect(panel.className).toContain("fixed inset-0");
    expect(panel.getAttribute("data-hoja")).toBe("x");
    // La franja: título de fábrica, ícono y aguamarina
    const franja = panel.querySelector("[data-titulo-versiculo]");
    expect(franja.textContent).toBe("Versículo espontáneo");
    expect(franja.className).toContain("bg-app-agua/10");
    expect(franja.querySelector("svg")).not.toBeNull();
    expect(screen.getByText("contenido")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(alCerrar).toHaveBeenCalledTimes(1);
  });

  it("título e ícono propios, y otro tono", () => {
    render(
      <PanelHoja titulo="Recientes" icono={ClockIcon} tono="violeta" alCerrar={() => {}}>
        <span />
      </PanelHoja>
    );
    expect(screen.getByText("Recientes")).toBeTruthy();
    expect(document.querySelector("[data-titulo-versiculo]").className).toContain("bg-app-violeta/10");
    // Un tono desconocido vuelve al aguamarina
    cleanup();
    render(
      <PanelHoja tono="raro" alCerrar={() => {}}>
        <span />
      </PanelHoja>
    );
    expect(document.querySelector("[data-titulo-versiculo]").className).toContain("bg-app-agua/10");
  });

  it("entrega su referencia, para saber si un toque cayó fuera", () => {
    const referencia = { current: null };
    render(
      <PanelHoja panelRef={referencia} alCerrar={() => {}}>
        <span />
      </PanelHoja>
    );
    expect(referencia.current).toBe(document.querySelector("[data-panel-hoja]"));
  });
});
