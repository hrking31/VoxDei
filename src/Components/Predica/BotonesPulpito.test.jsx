import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { BotonesPulpito } from "./BotonesPulpito.jsx";

afterEach(cleanup);

const botones = () => [screen.getByRole("button", { name: "Pruebas" }), screen.getByRole("button", { name: "Predicar" })];

describe("BotonesPulpito", () => {
  it("cada botón avisa lo suyo", () => {
    const onPruebas = vi.fn();
    const onPredicar = vi.fn();
    render(<BotonesPulpito onPruebas={onPruebas} onPredicar={onPredicar} />);
    const [pruebas, predicar] = botones();
    fireEvent.click(pruebas);
    expect(onPruebas).toHaveBeenCalledTimes(1);
    expect(onPredicar).not.toHaveBeenCalled();
    fireEvent.click(predicar);
    expect(onPredicar).toHaveBeenCalledTimes(1);
  });

  it("los dos tienen el mismo peso: ninguno va relleno y ninguno parece apagado", () => {
    render(<BotonesPulpito onPruebas={() => {}} onPredicar={() => {}} />);
    for (const boton of botones()) {
      // Estilo tonal: fondo suave (con /10), borde y letra del color
      expect(boton.className).toMatch(/\bbg-app-[a-z]+\/10\b/);
      expect(boton.className).toMatch(/\bborder-app-[a-z]+\b/);
      expect(boton.className).toMatch(/\btext-app-[a-z]+\b/);
      // Ni el relleno sólido del botón principal ni el borde gris del apagado
      expect(boton.className).not.toMatch(/\bbg-app-main\b(?!\/)/);
      expect(boton.className).not.toContain("border-app-border");
      expect(boton.className).not.toContain("text-app-dark");
      expect(boton.className).not.toContain("text-app-texto");
    }
  });

  it("mismo alto, mismo ancho, mismo grosor de letra y mismo tamaño de ícono", () => {
    render(<BotonesPulpito onPruebas={() => {}} onPredicar={() => {}} />);
    const [pruebas, predicar] = botones();
    for (const clase of ["h-11", "flex-1", "font-bold", "text-sm", "border"]) {
      expect(pruebas.className, clase).toMatch(new RegExp(`(^|\\s)${clase}(\\s|$)`));
      expect(predicar.className, clase).toMatch(new RegExp(`(^|\\s)${clase}(\\s|$)`));
    }
    expect(pruebas.querySelector("svg").getAttribute("class")).toBe(predicar.querySelector("svg").getAttribute("class"));
  });

  it("cada uno con su color: Pruebas azul y Predicar dorado", () => {
    render(<BotonesPulpito onPruebas={() => {}} onPredicar={() => {}} />);
    const [pruebas, predicar] = botones();
    expect(pruebas.className).toContain("text-app-azul");
    expect(pruebas.className).toContain("border-app-azul");
    expect(predicar.className).toContain("text-app-main");
    expect(predicar.className).toContain("border-app-main");
  });
});

describe("BotonesPulpito: tableta y celular", () => {
  it("soloIconos (celular): sin texto ni recuadro (ni borde ni fondo), con el color en el ícono y su nombre en aria-label", () => {
    render(<BotonesPulpito compacto soloIconos onPruebas={() => {}} onPredicar={() => {}} />);
    const [pruebas, predicar] = botones();
    expect(pruebas.textContent).toBe("");
    expect(predicar.textContent).toBe("");
    expect(pruebas.querySelector("svg")).not.toBeNull();
    expect(pruebas.className).toContain("text-app-azul");
    expect(predicar.className).toContain("text-app-main");
    for (const boton of [pruebas, predicar]) {
      expect(boton.className.split(" ").filter((c) => /^(border|bg-)/.test(c))).toEqual([]); // sin recuadro
    }
  });

  it("desactivado apaga los dos y no avisa nada", () => {
    const onPruebas = vi.fn();
    const onPredicar = vi.fn();
    render(<BotonesPulpito desactivado onPruebas={onPruebas} onPredicar={onPredicar} />);
    for (const boton of botones()) {
      expect(boton.disabled).toBe(true);
      fireEvent.click(boton);
    }
    expect(onPruebas).not.toHaveBeenCalled();
    expect(onPredicar).not.toHaveBeenCalled();
  });

  it("compacto (celular): más bajos y con letra pequeña, con los mismos colores; className da el ancho", () => {
    render(<BotonesPulpito compacto className="w-44" onPruebas={() => {}} onPredicar={() => {}} />);
    const [pruebas, predicar] = botones();
    for (const boton of [pruebas, predicar]) {
      expect(boton.className.split(" ")).toContain("h-9");
      expect(boton.className.split(" ")).toContain("text-xs");
      expect(boton.className.split(" ")).not.toContain("h-11");
    }
    expect(pruebas.className).toContain("text-app-azul");
    expect(predicar.className).toContain("text-app-main");
    expect(screen.getByRole("group", { name: "Ir al púlpito" }).className).toContain("w-44");
  });
});
