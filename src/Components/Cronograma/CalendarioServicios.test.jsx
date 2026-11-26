import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import CalendarioServicios from "./CalendarioServicios.jsx";
import ListaServicios from "./ListaServicios.jsx";

const DOMINICAL = {
  id: "dom",
  nombre: "Dominical",
  inicio: "09:30",
  fin: "11:30",
  dias: [0],
  fecha: null,
  activo: true,
};
const RETIRO = {
  id: "ret",
  nombre: "Retiro",
  inicio: "08:00",
  fin: "17:00",
  dias: [],
  fecha: "2026-12-05",
  activo: true,
};
const SERVICIOS = [DOMINICAL, RETIRO];
const HOY = "2026-11-25";

// Sin `globals`, Testing Library no limpia sola entre pruebas
afterEach(cleanup);

const dia = (fecha) => document.querySelector(`[data-fecha="${fecha}"]`);

describe("CalendarioServicios", () => {
  const mostrar = (props = {}) =>
    render(
      <CalendarioServicios
        servicios={SERVICIOS}
        hoy={HOY}
        alTocarDia={vi.fn()}
        {...props}
      />,
    );

  it("abre en el mes de hoy o en el de la fecha elegida", () => {
    const primera = mostrar();
    expect(screen.getByText("Noviembre 2026")).toBeTruthy();
    primera.unmount();
    mostrar({ elegida: "2027-02-14" });
    expect(screen.getByText("Febrero 2027")).toBeTruthy();
  });

  it("marca hoy en violeta y cada día con servicio según su clase", () => {
    mostrar();
    expect(dia("2026-11-25").getAttribute("data-hoy")).toBe("true");
    expect(dia("2026-11-29").getAttribute("data-clase-dia")).toBe("repite");
    expect(dia("2026-11-30").getAttribute("data-clase-dia")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Mes siguiente" }));
    expect(dia("2026-12-05").getAttribute("data-clase-dia")).toBe("unico");
  });

  it("recorre todo el año: los domingos de junio de 2027 también están marcados", () => {
    mostrar();
    for (let i = 0; i < 7; i++)
      fireEvent.click(screen.getByRole("button", { name: "Mes siguiente" }));
    expect(screen.getByText("Junio 2027")).toBeTruthy();
    expect(dia("2027-06-06").getAttribute("data-clase-dia")).toBe("repite");
    expect(dia("2027-06-13").getAttribute("data-clase-dia")).toBe("repite");
  });

  it("«Hoy» aparece al irse de mes y vuelve al actual", () => {
    mostrar();
    expect(screen.queryByRole("button", { name: "Hoy" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Mes anterior" }));
    expect(screen.getByText("Octubre 2026")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Hoy" }));
    expect(screen.getByText("Noviembre 2026")).toBeTruthy();
  });

  it("tocar un día del mes avisa con la fecha y lo que hay ese día", () => {
    const alTocarDia = vi.fn();
    mostrar({ alTocarDia });
    fireEvent.click(dia("2026-11-29"));
    expect(alTocarDia).toHaveBeenCalledTimes(1);
    const [fecha, marcas] = alTocarDia.mock.calls[0];
    expect(fecha).toBe("2026-11-29");
    expect(marcas.servicios.map((s) => s.id)).toEqual(["dom"]);
  });

  it("un día gris del mes vecino solo cambia de mes, sin avisar", () => {
    const alTocarDia = vi.fn();
    mostrar({ alTocarDia });
    fireEvent.click(dia("2026-12-01"));
    expect(screen.getByText("Diciembre 2026")).toBeTruthy();
    expect(alTocarDia).not.toHaveBeenCalled();
  });

  it("el día elegido va marcado, y cada día dice qué servicio tiene para el lector de pantalla", () => {
    mostrar({ elegida: "2026-11-29" });
    expect(dia("2026-11-29").getAttribute("aria-current")).toBe("date");
    expect(dia("2026-11-29").getAttribute("aria-label")).toContain("Dominical");
    expect(dia("2026-11-30").getAttribute("aria-label")).not.toContain(":");
  });

  it("lleva la leyenda de las marcas", () => {
    mostrar();
    expect(screen.getByText("Se repite")).toBeTruthy();
    expect(screen.getByText("Una sola vez")).toBeTruthy();
  });
});

describe("ListaServicios", () => {
  const mostrar = (props = {}) =>
    render(
      <ListaServicios
        servicios={SERVICIOS}
        hoyISO={HOY}
        diaDeHoy={3}
        turno={{ tipo: "libre" }}
        editando={null}
        alTocar={vi.fn()}
        {...props}
      />,
    );

  it("sin permiso de corregir (sin alTocar) las tarjetas no son botones", () => {
    mostrar({ alTocar: null });
    expect(document.querySelector('[data-servicio="dom"]').tagName).toBe("DIV");
  });

  it("con permiso, tocar una tarjeta avisa con su servicio", () => {
    const alTocar = vi.fn();
    mostrar({ alTocar });
    fireEvent.click(document.querySelector('[data-servicio="ret"]'));
    expect(alTocar).toHaveBeenCalledWith(RETIRO);
  });

  it("el servicio en curso se marca y el que se corrige también", () => {
    mostrar({
      turno: { tipo: "servicio", servicio: DOMINICAL },
      editando: "ret",
    });
    expect(
      document.querySelector('[data-servicio="dom"]').textContent,
    ).toContain("en curso");
    expect(document.querySelector('[data-servicio="ret"]').className).toContain(
      "border-app-main",
    );
  });

  it("un servicio pausado lo dice", () => {
    mostrar({ servicios: [{ ...DOMINICAL, activo: false }] });
    expect(
      document.querySelector('[data-servicio="dom"]').textContent,
    ).toContain("pausado");
  });

  it("sin especiales explica cómo crear uno; sin ningún servicio, invita a crear el primero", () => {
    const conUno = mostrar({ servicios: [DOMINICAL] });
    expect(screen.getByText(/No hay fechas especiales/)).toBeTruthy();
    expect(screen.getByText(/Toca un día libre del calendario/)).toBeTruthy();
    conUno.unmount();
    mostrar({ servicios: [] });
    expect(screen.getByText(/Aún no hay servicios/)).toBeTruthy();
  });

  it("los especiales que ya pasaron no salen", () => {
    mostrar({ servicios: [{ ...RETIRO, fecha: "2026-11-01" }, DOMINICAL] });
    expect(document.querySelector('[data-servicio="ret"]')).toBeNull();
  });
});
