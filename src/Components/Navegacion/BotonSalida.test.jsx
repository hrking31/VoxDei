import { describe, expect, it } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import BotonSalida from "./BotonSalida.jsx";
import { montar } from "./pruebas.utils.jsx";

describe("BotonSalida", () => {
  it("en el celular vuelve a la cuadrícula de Gestión", () => {
    montar(<BotonSalida className="px-3" />, { ruta: "/ViewTicker", app: { isDesktop: false } });
    const boton = screen.getByRole("button", { name: "Salida" });
    expect(boton.className).toContain("boton-salida");
    expect(boton.className).toContain("px-3");

    fireEvent.click(boton);
    expect(screen.getByTestId("ruta").textContent).toBe("/ViewGestion");
  });

  it("en el computador no se pinta: la barra lateral lo reemplaza", () => {
    montar(<BotonSalida />, { app: { isDesktop: true } });
    expect(screen.queryByRole("button", { name: "Salida" })).toBeNull();
  });
});
