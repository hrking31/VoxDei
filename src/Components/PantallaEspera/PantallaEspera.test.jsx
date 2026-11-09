import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, screen } from "@testing-library/react";
import PantallaEspera from "./PantallaEspera.jsx";
import { contenidoEspera, HORAS_CUENTA_REGRESIVA } from "./utilesEspera.js";
import { ESTILOS_POR_DEFECTO } from "../Estilos/EstilosProyeccion.js";
import { montar } from "../Navegacion/pruebas.utils.jsx";

// 9 de noviembre de 2026, lunes, hora local.
const en = (dia, hora, minuto = 0, segundo = 0) =>
  new Date(2026, 10, dia, hora, minuto, segundo).getTime();
const culto = { nombre: "Culto dominical", inicio: "10:00", fin: "12:00", dias: [1] };

describe("contenidoEspera", () => {
  it("con el servicio cerca, cuenta regresiva", () => {
    const c = contenidoEspera([culto], en(9, 9, 47, 26));
    expect(c).toMatchObject({ modo: "cuenta", nombre: "Culto dominical", cuenta: "12:34" });
    expect(c.hora).toMatch(/10:00/);
  });

  it(`durante el servicio lo nombra; a más de ${HORAS_CUENTA_REGRESIVA} horas, día y hora`, () => {
    const c = contenidoEspera([culto], en(9, 11, 0));
    expect(c).toMatchObject({ modo: "enCurso", nombre: "Culto dominical" });
    const lejos = contenidoEspera([culto], en(10, 8, 0)); // martes: falta casi una semana
    expect(lejos).toMatchObject({ modo: "fecha", dia: "Lunes" });
  });

  it("con dos servicios cruzados nombra al que empezó más tarde", () => {
    const tarde = { ...culto, nombre: "Bautizos", inicio: "10:30" };
    expect(contenidoEspera([tarde, culto], en(9, 11)).nombre).toBe("Bautizos");
    expect(contenidoEspera([culto, tarde], en(9, 11)).nombre).toBe("Bautizos");
  });

  it("sin servicios no muestra cuenta", () => {
    expect(contenidoEspera([], en(9, 9))).toEqual({ modo: "nada" });
  });
});

describe("PantallaEspera", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(en(9, 9, 47, 26));
  });
  afterEach(() => vi.useRealTimers());

  const montarEspera = (servicios = [culto]) =>
    montar(<PantallaEspera tamanos={{ title: "3rem", verseTitle: "2rem" }} />, {
      auth: { userData: { name: "Ana", role: "Pastor", churchName: "Iglesia Camino de Paz" } },
      app: { servicios, estilos: ESTILOS_POR_DEFECTO },
    });

  it("muestra el logo, la iglesia y la cuenta, que baja cada segundo", () => {
    montarEspera();
    expect(screen.getByAltText("VOXDEI")).toBeTruthy();
    expect(screen.getByText("Iglesia Camino de Paz")).toBeTruthy();
    expect(screen.getByRole("timer").textContent).toBe("12:34");
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByRole("timer").textContent).toBe("12:33");
  });

  it("sin servicios queda solo el logo y la iglesia", () => {
    montarEspera([]);
    expect(screen.queryByRole("timer")).toBeNull();
    expect(screen.getByText("Iglesia Camino de Paz")).toBeTruthy();
  });
});
