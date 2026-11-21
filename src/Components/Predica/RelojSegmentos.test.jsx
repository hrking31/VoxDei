import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import RelojSegmentos from "./RelojSegmentos.jsx";
import { ENCENDIDOS, SEGMENTOS } from "./segmentosReloj.js";

afterEach(cleanup);

const reloj = () => document.querySelector("[data-reloj-segmentos]");
const digitos = () => [...document.querySelectorAll("[data-digito]")];
const encendidosDe = (digito) => [...digito.querySelectorAll("[data-segmento]")].map((s) => s.getAttribute("data-segmento")).sort().join("");

describe("RelojSegmentos: números de siete segmentos, sin recuadro", () => {
  it("dibuja una cifra por cada número y unos dos puntos entre las partes", () => {
    render(<RelojSegmentos tiempo="12:34" />);
    expect(digitos().map((d) => d.getAttribute("data-digito"))).toEqual(["1", "2", "3", "4"]);
    expect(document.querySelectorAll("[data-dos-puntos]")).toHaveLength(1);
    cleanup();
    // Con horas: «1:02:03» lleva cinco cifras y dos pares de puntos
    render(<RelojSegmentos tiempo="1:02:03" />);
    expect(digitos().map((d) => d.getAttribute("data-digito"))).toEqual(["1", "0", "2", "0", "3"]);
    expect(document.querySelectorAll("[data-dos-puntos]")).toHaveLength(2);
  });

  it("cada cifra enciende los segmentos que le tocan", () => {
    render(<RelojSegmentos tiempo="01:23" />);
    render(<RelojSegmentos tiempo="45:67" />);
    render(<RelojSegmentos tiempo="89:00" />);
    for (const digito of digitos()) {
      const cifra = digito.getAttribute("data-digito");
      expect(encendidosDe(digito), `cifra ${cifra}`).toBe([...ENCENDIDOS[cifra]].sort().join(""));
    }
    // Algunas, a ojo: el 8 enciende todos y el 1 solo los de la derecha
    const ocho = digitos().find((d) => d.getAttribute("data-digito") === "8");
    expect(encendidosDe(ocho)).toBe("abcdefg");
    const uno = digitos().find((d) => d.getAttribute("data-digito") === "1");
    expect(encendidosDe(uno)).toBe("bc");
  });

  it("las tablas de los segmentos son coherentes: siete segmentos y las diez cifras", () => {
    expect(Object.keys(SEGMENTOS).sort().join("")).toBe("abcdefg");
    for (const puntos of Object.values(SEGMENTOS)) {
      // Un hexágono: seis puntos «x,y» dentro del dígito de 50 × 90
      const lista = puntos.split(" ").map((p) => p.split(",").map(Number));
      expect(lista).toHaveLength(6);
      for (const [x, y] of lista) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(50);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(90);
      }
    }
    expect(Object.keys(ENCENDIDOS).join("")).toBe("0123456789");
    for (const encendidos of Object.values(ENCENDIDOS)) {
      for (const segmento of encendidos) expect(SEGMENTOS[segmento]).toBeDefined();
    }
  });

  it("el texto del tiempo sigue ahí, oculto a la vista, y los dibujos no lo repiten a los lectores de pantalla", () => {
    render(<RelojSegmentos tiempo="12:34" />);
    const oculto = reloj().querySelector(".sr-only");
    expect(oculto.textContent).toBe("12:34");
    for (const dibujo of reloj().querySelectorAll("svg")) expect(dibujo.getAttribute("aria-hidden")).toBe("true");
    // El texto que se lee: el tiempo, una sola vez
    expect(reloj().textContent).toBe("12:34");
  });

  it("solo los números: sin recuadro, cuerpo, pantalla, borde, sombra ni fondo", () => {
    render(<RelojSegmentos tiempo="12:34" />);
    const todos = [reloj(), ...reloj().querySelectorAll("*")];
    for (const elemento of todos) {
      const clases = elemento.getAttribute("class") || "";
      expect(clases, elemento.tagName).not.toMatch(/(^|\s)(bg-|rounded|shadow|border|p-|px-|py-)/);
    }
    // Las cifras van en claro, sobre el fondo de quien lo use
    expect(reloj().className).toContain("text-app-texto");
    // Sin animación: ni brillo ni parpadeo
    expect(reloj().outerHTML).not.toContain("animate-");
  });

  it("admite una clase extra de quien lo usa", () => {
    render(<RelojSegmentos tiempo="00:05" className="mx-auto" />);
    expect(reloj().className).toContain("mx-auto");
    expect(reloj().className).toContain("text-app-texto");
  });
});
