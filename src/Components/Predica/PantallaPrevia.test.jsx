import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import PantallaPrevia from "./PantallaPrevia.jsx";

afterEach(cleanup);

const pieza = { tipo: "mensaje", contenido: "Bienvenidos" };
const figura = () => document.querySelector("[data-pantalla-previa]");
const aviso = () => document.querySelector("[data-aviso-oculta]");

describe("PantallaPrevia: televisor de los 80", () => {
  it("lleva el marco curvo con viñeta y líneas de barrido (utilidad crt), sin la sombra de antes", () => {
    render(<PantallaPrevia pieza={pieza} />);
    expect(figura().className).toContain("crt");
    expect(figura().className).toContain("rounded-crt");
    expect(figura().className).not.toContain("shadow-xl");
    expect(figura().className).not.toContain("border-app-aviso");
  });

  it("grande o pequeña, conserva el grosor del marco", () => {
    render(<PantallaPrevia pieza={pieza} grande />);
    expect(figura().className).toContain("border-8");
    cleanup();
    render(<PantallaPrevia pieza={pieza} />);
    expect(figura().className).toContain("border-4");
  });
});

describe("PantallaPrevia: el marco toma el estado de la pantalla del templo", () => {
  it("sin estado (la vista previa de Preparar) no marca ninguno", () => {
    render(<PantallaPrevia pieza={pieza} />);
    expect(figura().hasAttribute("data-estado")).toBe(false);
    expect(aviso()).toBeNull();
  });

  it("anota el estado en el marco para que el CSS lo pinte", () => {
    for (const estado of ["apagada", "oculta", "ventana", "maximizada", "encendida"]) {
      render(<PantallaPrevia pieza={pieza} estadoPantalla={estado} />);
      expect(figura().dataset.estado, estado).toBe(estado);
      cleanup();
    }
  });

  it("abierta (ventana, maximizada, completa) y con algo que ver: sin aviso", () => {
    for (const estado of ["ventana", "maximizada", "encendida"]) {
      render(<PantallaPrevia pieza={pieza} estadoPantalla={estado} />);
      expect(aviso(), estado).toBeNull();
      cleanup();
    }
  });

  it("apagada: dice «Pantalla apagada», en gris", () => {
    render(<PantallaPrevia pieza={pieza} estadoPantalla="apagada" />);
    expect(aviso().textContent).toBe("Pantalla apagada");
    expect(aviso().className).toContain("text-app-muted");
    expect(figura().hasAttribute("data-oculta")).toBe(true);
  });

  it("oculta: dice «Pantalla oculta», en rojo", () => {
    render(<PantallaPrevia pieza={pieza} estadoPantalla="oculta" />);
    expect(aviso().textContent).toBe("Pantalla oculta");
    expect(aviso().className).toContain("text-app-error");
  });

  it("abierta pero sin nada que ver, dice «No se ve en el templo»", () => {
    render(<PantallaPrevia pieza={pieza} estadoPantalla="encendida" oculta />);
    expect(aviso().textContent).toBe("No se ve en el templo");
    expect(aviso().className).toContain("text-app-error");
  });

  it("apagada manda sobre «no se ve»: la pantalla no está, aunque haya algo enviado", () => {
    render(<PantallaPrevia pieza={pieza} estadoPantalla="apagada" oculta />);
    expect(aviso().textContent).toBe("Pantalla apagada");
  });

  it("sin dato todavía no afirma que esté apagada", () => {
    render(<PantallaPrevia pieza={pieza} estadoPantalla={null} />);
    expect(aviso()).toBeNull();
  });

  it("sin nada que mostrar, el texto de «vacío» sale solo si no hay un aviso encima", () => {
    render(<PantallaPrevia pieza={null} textoVacio="Sin texto en pantalla" estadoPantalla="encendida" />);
    expect(figura().textContent).toContain("Sin texto en pantalla");
    cleanup();
    render(<PantallaPrevia pieza={null} textoVacio="Sin texto en pantalla" />);
    expect(figura().textContent).toContain("Sin texto en pantalla");
  });

  it("con la pantalla apagada u oculta no sale «Sin texto en pantalla»: solo el aviso", () => {
    for (const estado of ["apagada", "oculta"]) {
      render(<PantallaPrevia pieza={null} textoVacio="Sin texto en pantalla" estadoPantalla={estado} />);
      expect(figura().textContent, estado).not.toContain("Sin texto en pantalla");
      expect(aviso(), estado).not.toBeNull();
      cleanup();
    }
  });

  it("si nada se ve en el templo (aviso «No se ve en el templo») tampoco se pisan los dos textos", () => {
    render(<PantallaPrevia pieza={null} textoVacio="Sin texto en pantalla" estadoPantalla="encendida" oculta />);
    expect(figura().textContent).not.toContain("Sin texto en pantalla");
    expect(aviso().textContent).toBe("No se ve en el templo");
  });
});
