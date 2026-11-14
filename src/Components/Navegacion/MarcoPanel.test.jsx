import { describe, expect, it } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import MarcoPanel from "./MarcoPanel.jsx";
import { montar } from "./pruebas.utils.jsx";

const rutas = (
  <Routes>
    <Route element={<MarcoPanel />}>
      <Route path="/ViewInicio" element={<p>Contenido de Inicio</p>} />
    </Route>
  </Routes>
);

// La lateral fija se reconoce por su botón de la flecha; la de arriba, por su marca.
const hayLateral = () =>
  screen.queryByRole("button", { name: "Mostrar los nombres de las secciones" }) !== null;
const haySuperior = () => document.querySelector("[data-barra-superior]") !== null;
const hayMenu = () => screen.queryByRole("navigation", { name: "Secciones del panel" }) !== null;

describe("MarcoPanel", () => {
  it("en el computador pone la barra lateral junto al contenido", () => {
    montar(rutas);
    expect(hayLateral()).toBe(true);
    expect(haySuperior()).toBe(false);
    expect(screen.getByText("Contenido de Inicio")).toBeTruthy();
  });

  it("en el celular pone la barra de arriba, sin barra inferior, y le deja sitio al contenido", () => {
    montar(rutas, { app: { isDesktop: false } });
    expect(haySuperior()).toBe(true);
    expect(hayLateral()).toBe(false);
    expect(document.querySelector("[data-barra-inferior]")).toBeNull();
    const contenido = screen.getByText("Contenido de Inicio");
    expect(contenido.parentElement.className).toContain("pt-barra-superior");
  });

  it("en el celular el menú arranca cerrado y el botón de arriba lo abre", () => {
    montar(rutas, { app: { isDesktop: false } });
    expect(hayMenu()).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "Abrir el menú" }));

    expect(hayMenu()).toBe(true);
    expect(screen.getByRole("button", { name: "Biblia" })).toBeTruthy();
  });

  it("en el celular elegir una sección cierra el menú y navega", () => {
    montar(rutas, { app: { isDesktop: false } });
    fireEvent.click(screen.getByRole("button", { name: "Abrir el menú" }));
    fireEvent.click(screen.getByRole("button", { name: "Biblia" }));

    expect(hayMenu()).toBe(false);
    expect(screen.getByTestId("ruta").textContent).toBe("/ViewVersiculo");
  });

  it("sin correo verificado, sin ficha o sin sesión no ofrece secciones", () => {
    for (const isDesktop of [true, false]) {
      for (const auth of [{ correoVerificado: false }, { userData: null }, { user: null }]) {
        const { unmount } = montar(rutas, { auth, app: { isDesktop } });
        expect(hayLateral() || haySuperior()).toBe(false);
        unmount();
      }
    }
  });
});
