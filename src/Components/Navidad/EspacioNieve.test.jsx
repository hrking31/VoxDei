import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { montar } from "../Navegacion/pruebas.utils.jsx";
import EspacioNieve from "./EspacioNieve.jsx";

function fijarFecha(anio, mes, dia) {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(anio, mes, dia, 12));
}

beforeEach(() => fijarFecha(2026, 11, 25));
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("EspacioNieve", () => {
  it("en temporada ocupa su sitio con la medida del tema, escondido al lector de pantalla", () => {
    const { container } = montar(<EspacioNieve />);
    const espacio = container.querySelector("[data-espacio-nieve]");
    expect(espacio.getAttribute("aria-hidden")).toBe("true");
    expect(espacio.className).toContain("h-nieve");
    expect(espacio.className).not.toMatch(/\b(absolute|fixed|sticky)\b/);
  });

  it("toma el color del final del degradado de las pantallas, para que no se note la franja", () => {
    const { container } = montar(<EspacioNieve />);
    expect(container.querySelector("[data-espacio-nieve]").className).toContain("bg-app-light/50");
  });

  it("fuera de temporada, en el proyector y con «reducir movimiento» no reserva nada", () => {
    fijarFecha(2027, 5, 15);
    const fuera = montar(<EspacioNieve />);
    expect(fuera.container.querySelector("[data-espacio-nieve]")).toBeNull();
    fuera.unmount();
    fijarFecha(2026, 11, 25);
    const proyector = montar(<EspacioNieve />, { ruta: "/VOXDEI" });
    expect(proyector.container.querySelector("[data-espacio-nieve]")).toBeNull();
    proyector.unmount();
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    const quieto = montar(<EspacioNieve />);
    expect(quieto.container.querySelector("[data-espacio-nieve]")).toBeNull();
  });
});
