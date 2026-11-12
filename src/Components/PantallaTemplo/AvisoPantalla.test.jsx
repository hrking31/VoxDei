import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, screen } from "@testing-library/react";
import { montar } from "../Navegacion/pruebas.utils.jsx";
import AvisoPantalla from "./AvisoPantalla";

const completa = { id: 1, antes: "ventana", ahora: "encendida" };

// Las dos únicas líneas de texto: el estado arriba y el cambio debajo.
function lineas(tarjeta) {
  const [estado, cambio] = tarjeta.querySelectorAll(".flex-col > span");
  return { estado: estado?.textContent, cambio: cambio?.textContent, total: tarjeta.querySelectorAll(".flex-col > *").length };
}

function mostrar(aviso, { isDesktop = true } = {}) {
  const setAvisoPantalla = vi.fn();
  const resultado = montar(<AvisoPantalla />, { app: { avisoPantalla: aviso, setAvisoPantalla, isDesktop } });
  const tarjeta = resultado.container.querySelector("[data-aviso-pantalla]");
  return { ...resultado, setAvisoPantalla, tarjeta };
}

describe("AvisoPantalla", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("sin aviso no pinta nada", () => {
    const { tarjeta } = mostrar(null);
    expect(tarjeta).toBeNull();
  });

  it("en el computador: tarjeta abajo a la derecha, con el estado arriba y el cambio debajo, nada más", () => {
    const { tarjeta } = mostrar(completa);
    expect(tarjeta.dataset.avisoPantalla).toBe("tarjeta");
    expect(tarjeta.parentElement.className).toContain("right-6");
    expect(tarjeta.dataset.estado).toBe("encendida");
    expect(lineas(tarjeta)).toEqual({ estado: "Pantalla completa", cambio: "VENTANACOMPLETA", total: 2 });
    expect(tarjeta.querySelector("b").textContent).toBe("COMPLETA");
    expect(tarjeta.querySelector("[data-escena]").dataset.escena).toBe("encendida");
  });

  it("se cierra sola a los 2 segundos", () => {
    const { setAvisoPantalla } = mostrar(completa);
    act(() => vi.advanceTimersByTime(1900));
    expect(setAvisoPantalla).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(200));
    expect(setAvisoPantalla).toHaveBeenCalledWith(null);
  });

  it("con el mouse encima se detiene la cuenta y al salir sigue con lo que le quedaba", () => {
    const { setAvisoPantalla, tarjeta } = mostrar(completa);
    act(() => vi.advanceTimersByTime(1000));
    fireEvent.mouseEnter(tarjeta);
    act(() => vi.advanceTimersByTime(5000));
    expect(setAvisoPantalla).not.toHaveBeenCalled();
    fireEvent.mouseLeave(tarjeta);
    act(() => vi.advanceTimersByTime(900));
    expect(setAvisoPantalla).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(200));
    expect(setAvisoPantalla).toHaveBeenCalledWith(null);
  });

  it("el botón de cerrar la quita al momento", () => {
    const { setAvisoPantalla } = mostrar(completa);
    fireEvent.click(screen.getByRole("button", { name: "Cerrar aviso" }));
    expect(setAvisoPantalla).toHaveBeenCalledWith(null);
  });

  it("en el celular: píldora arriba, con las mismas dos líneas, y tocarla la cierra", () => {
    const oculta = { id: 2, antes: "encendida", ahora: "oculta" };
    const { setAvisoPantalla, tarjeta } = mostrar(oculta, { isDesktop: false });
    expect(tarjeta.dataset.avisoPantalla).toBe("pildora");
    expect(tarjeta.parentElement.className).toContain("top-aviso-isla");
    expect(lineas(tarjeta)).toEqual({ estado: "Pantalla oculta", cambio: "COMPLETAOCULTA", total: 2 });
    fireEvent.click(tarjeta);
    expect(setAvisoPantalla).toHaveBeenCalledWith(null);
  });

  it("cada estado lleva su color y su mini pantalla", () => {
    const titulos = {
      encendida: "Pantalla completa",
      maximizada: "Modo maximizado",
      ventana: "Modo ventana",
      oculta: "Pantalla oculta",
      apagada: "Pantalla apagada",
    };
    for (const [ahora, titulo] of Object.entries(titulos)) {
      const { tarjeta, unmount } = mostrar({ id: 3, antes: "apagada", ahora });
      expect(tarjeta.dataset.estado).toBe(ahora);
      expect(tarjeta.className).toContain("aviso-templo");
      expect(tarjeta.querySelector("[data-escena]").dataset.escena).toBe(ahora);
      expect(screen.getByText(titulo)).toBeTruthy();
      unmount();
    }
  });
});
