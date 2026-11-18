import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import EstadoPantalla from "./EstadoPantalla.jsx";
import { montar } from "../Navegacion/pruebas.utils.jsx";

describe("EstadoPantalla", () => {
  it("de fábrica es un chip con borde (Inicio)", () => {
    montar(<EstadoPantalla estado="encendida" />);
    const estado = screen.getByText("COMPLETA").parentElement;
    expect(estado.className).toContain("rounded-full");
    expect(estado.className).toContain("border");
  });

  it("con sinChip solo lleva el ícono y la palabra (la franja del turno)", () => {
    montar(<EstadoPantalla estado="oculta" sinChip />);
    const estado = screen.getByText("OCULTA").parentElement;
    expect(estado.hasAttribute("data-sin-chip")).toBe(true);
    expect(estado.className).not.toContain("rounded-full");
    expect(estado.querySelector("[data-icono='oculta']")).not.toBeNull();
  });

  it("sin saber el estado, no muestra nada", () => {
    const { container } = montar(<EstadoPantalla />, { app: { pantallaTemplo: null } });
    expect(container.querySelector("[role='status'][title]")).toBeNull();
  });

  it("el ícono toma el color del estado, igual que el texto (también en la franja, sin chip)", () => {
    const colores = {
      apagada: "text-app-muted",
      oculta: "text-app-error",
      ventana: "text-app-main",
      maximizada: "text-app-azul",
      encendida: "text-app-success",
    };
    for (const [estado, color] of Object.entries(colores)) {
      const { unmount } = montar(<EstadoPantalla estado={estado} sinChip />);
      const icono = document.querySelector(`[data-icono='${estado}']`);
      expect(icono.getAttribute("class"), estado).toContain(color);
      // Y no el verde de siempre cuando el estado no es verde
      if (color !== "text-app-success") expect(icono.getAttribute("class"), estado).not.toContain("text-app-success");
      unmount();
    }
  });
});
