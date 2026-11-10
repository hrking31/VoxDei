import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
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

// La lateral se reconoce por su botón del símbolo; la inferior, por su marca.
const hayLateral = () =>
  screen.queryByRole("button", { name: "Mostrar los nombres de las secciones" }) !== null;
const hayInferior = () => document.querySelector("[data-barra-inferior]") !== null;

describe("MarcoPanel", () => {
  it("en el computador pone la barra lateral junto al contenido", () => {
    montar(rutas);
    expect(hayLateral()).toBe(true);
    expect(hayInferior()).toBe(false);
    expect(screen.getByText("Contenido de Inicio")).toBeTruthy();
  });

  it("en el celular pone la barra inferior y le deja sitio al contenido", () => {
    montar(rutas, { app: { isDesktop: false } });
    expect(hayInferior()).toBe(true);
    expect(hayLateral()).toBe(false);
    const contenido = screen.getByText("Contenido de Inicio");
    expect(contenido.parentElement.className).toContain("pb-barra-inferior");
  });

  it("sin correo verificado, sin ficha o sin sesión no ofrece secciones", () => {
    for (const isDesktop of [true, false]) {
      for (const auth of [{ correoVerificado: false }, { userData: null }, { user: null }]) {
        const { unmount } = montar(rutas, { auth, app: { isDesktop } });
        expect(hayLateral() || hayInferior()).toBe(false);
        unmount();
      }
    }
  });
});
