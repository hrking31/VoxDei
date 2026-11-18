import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Squares2X2Icon } from "@heroicons/react/24/solid";
import InterruptoresDeVista from "./InterruptoresDeVista.jsx";
import { INICIO } from "../Navegacion/Secciones.js";

afterEach(cleanup);

const abrir = (props = {}) => {
  const alCambiarPantalla = vi.fn();
  const alCambiarBotones = vi.fn();
  const resultado = render(
    <InterruptoresDeVista sinPantalla={false} alCambiarPantalla={alCambiarPantalla} sinBotones={false} alCambiarBotones={alCambiarBotones} {...props} />
  );
  return { ...resultado, alCambiarPantalla, alCambiarBotones };
};

describe("InterruptoresDeVista", () => {
  it("dos botones, con su nombre según el estado", () => {
    abrir();
    expect(screen.getByRole("button", { name: "Ocultar la pantalla" }).getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByRole("button", { name: "Ocultar los botones" }).getAttribute("aria-pressed")).toBe("false");
    cleanup();
    abrir({ sinPantalla: true, sinBotones: true });
    expect(screen.getByRole("button", { name: "Mostrar la pantalla" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Mostrar los botones" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("tocar uno avisa el valor contrario", () => {
    const { alCambiarPantalla, alCambiarBotones } = abrir();
    fireEvent.click(screen.getByRole("button", { name: "Ocultar la pantalla" }));
    expect(alCambiarPantalla).toHaveBeenCalledWith(true);
    fireEvent.click(screen.getByRole("button", { name: "Ocultar los botones" }));
    expect(alCambiarBotones).toHaveBeenCalledWith(true);
  });

  it("encendidos (ocultos) se ven dorados; sin ocultar, apagados", () => {
    abrir({ sinPantalla: true });
    expect(screen.getByRole("button", { name: "Mostrar la pantalla" }).className).toContain("text-app-main");
    expect(screen.getByRole("button", { name: "Ocultar los botones" }).className).toContain("text-app-muted");
  });

  it("el ícono de los botones no es el de Inicio del menú (los cuatro cuadritos), con el que se confundía", () => {
    abrir();
    const icono = document.querySelector("[data-alternar-botones] svg");
    const cuadritos = renderToStaticMarkup(createElement(Squares2X2Icon, { className: "h-5 w-5" }));
    // El de Inicio en la barra lateral es ese mismo ícono
    expect(INICIO.Icono).toBe(Squares2X2Icon);
    const pathsDelMenu = [...cuadritos.matchAll(/ d="([^"]+)"/g)].map((m) => m[1]);
    const pathsPropios = [...icono.querySelectorAll("path")].map((p) => p.getAttribute("d"));
    expect(pathsPropios.length).toBeGreaterThan(0);
    for (const d of pathsPropios) expect(pathsDelMenu).not.toContain(d);
  });

  it("son grandes para el dedo (40 px) y van separados (12 px), para que no choquen", () => {
    abrir();
    const grupo = document.querySelector("[role='group']");
    expect(grupo.className).toContain("gap-3");
    expect(grupo.className).not.toContain("gap-1 ");
    for (const boton of grupo.querySelectorAll("button")) {
      expect(boton.className).toContain("h-10");
      expect(boton.className).toContain("w-10");
      expect(boton.className).not.toContain("h-8");
    }
  });
});
