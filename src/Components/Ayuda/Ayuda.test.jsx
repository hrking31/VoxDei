import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, within } from "@testing-library/react";
import Ayuda from "./Ayuda.jsx";
import { montar } from "../Navegacion/pruebas.utils.jsx";

describe("Ayuda", () => {
  afterEach(() => vi.restoreAllMocks());

  it("explica los tres pasos para preparar la pantalla, en orden", () => {
    montar(<Ayuda />);
    const seccion = screen.getByRole("heading", { name: /Así se prepara/ }).closest("section");
    const pasos = within(seccion).getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(pasos).toEqual([
      "Conecta el dispositivo al proyector",
      "Abre la pantalla del templo",
      "Administra desde este dispositivo o desde otro",
    ]);
  });

  it("trae qué revisar antes de empezar y qué hacer si algo falla", () => {
    montar(<Ayuda />);
    expect(screen.getByRole("heading", { name: "Antes de empezar" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Si algo no funciona" })).toBeTruthy();
  });

  it("no ofrece abrir la pantalla del templo: se abre con «Proyectar» en la entrada", () => {
    montar(<Ayuda />);
    expect(screen.queryByRole("button", { name: /Abrir pantalla/ })).toBeNull();
    expect(screen.getAllByText("Proyectar").length).toBeGreaterThan(0);
  });

  it("explica quién puede proyectar con la franja de verdad, según quién entra", () => {
    montar(<Ayuda />);
    expect(screen.getByRole("heading", { name: "¿Quién puede proyectar?" })).toBeTruthy();
    const ejemplos = [...document.querySelectorAll("[data-ejemplo-turno]")];
    expect(ejemplos).toHaveLength(8);
    const franja = (i) => ejemplos[i].querySelector("[data-franja-turno]");
    expect(franja(0).textContent).toContain("Turno de Laura");
    expect(franja(0).dataset.franjaTurno).toBe("puedo");
    // Solo el título se ve: el color dice si se puede.
    expect(franja(0).querySelector("p > :not(.sr-only)").textContent).toBe("Turno de Laura · 14:00 – 16:00");
    expect(franja(1).textContent).toContain("Tu turno");
    expect(franja(2).dataset.franjaTurno).toBe("no-puedo");
    expect(franja(4).textContent).toContain("Iniciar ensayo");
    expect(franja(6).textContent).toContain("Tomar ensayo");
    // Son dibujos: nada se puede pulsar ni se anuncia como estado.
    expect(screen.queryByRole("button", { name: /Iniciar ensayo|Tomar ensayo|Terminar/ })).toBeNull();
    expect(ejemplos.every((li) => !li.querySelector('p[role="status"]'))).toBe(true);
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
