import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import Ayuda from "./Ayuda.jsx";
import { montar } from "../Navegacion/pruebas.utils.jsx";

describe("Ayuda", () => {
  afterEach(() => vi.restoreAllMocks());

  it("explica los tres pasos para preparar la pantalla, en orden", () => {
    montar(<Ayuda />);
    const pasos = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(pasos).toEqual([
      "Conecta el computador al proyector",
      "Abre la pantalla del templo en el computador",
      "Maneja todo desde tu celular",
    ]);
  });

  it("trae qué revisar antes de empezar y qué hacer si algo falla", () => {
    montar(<Ayuda />);
    expect(screen.getByRole("heading", { name: "Antes de empezar" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Si algo no funciona" })).toBeTruthy();
  });

  it("abre la pantalla del templo desde el paso 2", () => {
    const abrir = vi.spyOn(window, "open").mockReturnValue(null);
    montar(<Ayuda />);
    fireEvent.click(screen.getByRole("button", { name: "Abrir pantalla del templo" }));
    expect(abrir).toHaveBeenCalledWith("/VOXDEI", expect.any(String), expect.any(String));
  });

  it("los consejos llevan a su sección", () => {
    montar(<Ayuda />, { ruta: "/ViewAyuda" });
    fireEvent.click(screen.getByRole("button", { name: "Ir al Orden del culto" }));
    expect(screen.getByTestId("ruta").textContent).toBe("/ViewCulto");
  });

  it("los botones «Ir a Cronograma» van a Cronograma", () => {
    montar(<Ayuda />, { ruta: "/ViewAyuda" });
    const botones = screen.getAllByRole("button", { name: "Ir a Cronograma" });
    expect(botones.length).toBeGreaterThan(0);
    fireEvent.click(botones[0]);
    expect(screen.getByTestId("ruta").textContent).toBe("/ViewCronograma");
  });
});
