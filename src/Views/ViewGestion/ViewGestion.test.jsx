import { describe, expect, it } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import ViewGestion from "./ViewGestion.jsx";
import { SECCIONES } from "../../Components/Navegacion/Secciones.js";
import { montar } from "../../Components/Navegacion/pruebas.utils.jsx";

const opcion = (nombre) => screen.queryByRole("button", { name: nombre });

describe("ViewGestion (cuadrícula del celular)", () => {
  it("al pastor le muestra todas las secciones de la lista única", () => {
    montar(<ViewGestion />, { app: { isDesktop: false } });
    for (const { nombre } of SECCIONES) expect(opcion(nombre)).toBeTruthy();
  });

  it("al operador no le muestra Prédica", () => {
    montar(<ViewGestion />, {
      app: { isDesktop: false },
      auth: { userData: { name: "Luis", role: "Operador" } },
    });
    expect(opcion("Prédica")).toBeNull();
    expect(opcion("Biblia")).toBeTruthy();
  });

  it("cada botón lleva a la dirección de su sección", () => {
    montar(<ViewGestion />, { app: { isDesktop: false } });
    fireEvent.click(opcion("Canciones"));
    expect(screen.getByTestId("ruta").textContent).toBe("/ViewCanciones");
  });

  it("ya no muestra botones «Próximamente»", () => {
    montar(<ViewGestion />, { app: { isDesktop: false } });
    expect(screen.queryByText("Próximamente")).toBeNull();
  });
});
