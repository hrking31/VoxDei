import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import PilaDeNieve from "./PilaDeNieve.jsx";
import { Acumulacion } from "./acumulacion.js";

function contextoFalso() {
  const gradiente = { addColorStop: vi.fn() };
  return {
    setTransform: vi.fn(), clearRect: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(), closePath: vi.fn(), fill: vi.fn(), createLinearGradient: vi.fn(() => gradiente), gradiente,
  };
}

let ctx;
let pendientes;
// El navegador dibuja en el siguiente cuadro, nunca al instante: se simula con una cola
function siguienteCuadro() {
  const cola = pendientes;
  pendientes = [];
  cola.forEach((cb) => cb());
}
beforeEach(() => {
  ctx = contextoFalso();
  pendientes = [];
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(ctx);
  vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation((cb) => pendientes.push(cb));
  vi.spyOn(globalThis, "cancelAnimationFrame").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("PilaDeNieve", () => {
  it("es un adorno: escondido al lector de pantalla, sin recibir toques y pegado abajo", () => {
    const { container } = render(<PilaDeNieve pila={new Acumulacion({ ancho: 400 })} />);
    const lienzo = container.querySelector("[data-pila-nieve]");
    expect(lienzo.getAttribute("aria-hidden")).toBe("true");
    expect(lienzo.className).toContain("pointer-events-none");
    expect(lienzo.className).toContain("bottom-0");
    expect(lienzo.className).toContain("h-pila");
  });

  it("dibuja la pila al montarse y otra vez cada vez que un copo aterriza", () => {
    const pila = new Acumulacion({ ancho: 400, aporte: 2 });
    render(<PilaDeNieve pila={pila} />);
    siguienteCuadro();
    expect(ctx.fill).toHaveBeenCalledTimes(1);
    pila.deposita(100);
    siguienteCuadro();
    expect(ctx.fill).toHaveBeenCalledTimes(2);
    expect(ctx.quadraticCurveTo).toHaveBeenCalled();
  });

  it("varios copos en el mismo cuadro se dibujan una sola vez", () => {
    const pila = new Acumulacion({ ancho: 400, aporte: 2 });
    render(<PilaDeNieve pila={pila} />);
    siguienteCuadro();
    pila.deposita(10);
    pila.deposita(20);
    pila.deposita(30);
    siguienteCuadro();
    expect(ctx.fill).toHaveBeenCalledTimes(2);
  });

  it("al cerrarse deja de escuchar a la pila", () => {
    const pila = new Acumulacion({ ancho: 400 });
    const { unmount } = render(<PilaDeNieve pila={pila} />);
    expect(pila.alCambiar).toBeTypeOf("function");
    unmount();
    expect(pila.alCambiar).toBeNull();
  });

  it("sin contexto de dibujo no falla", () => {
    HTMLCanvasElement.prototype.getContext.mockReturnValue(null);
    const pila = new Acumulacion({ ancho: 400 });
    expect(() => {
      render(<PilaDeNieve pila={pila} />);
      pila.deposita(10);
      siguienteCuadro();
    }).not.toThrow();
  });
});
