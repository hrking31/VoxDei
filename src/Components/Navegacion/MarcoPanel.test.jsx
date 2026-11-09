import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import MarcoPanel from "./MarcoPanel.jsx";
import { montar } from "./pruebas.utils.jsx";

const rutas = (
  <Routes>
    <Route element={<MarcoPanel />}>
      <Route path="/ViewGestion" element={<p>Contenido de Gestión</p>} />
    </Route>
  </Routes>
);

const hayBarra = () => screen.queryByRole("navigation", { name: "Secciones del panel" }) !== null;

describe("MarcoPanel", () => {
  it("en el computador y con sesión lista pone la barra junto al contenido", () => {
    montar(rutas);
    expect(hayBarra()).toBe(true);
    expect(screen.getByText("Contenido de Gestión")).toBeTruthy();
  });

  it("en el celular deja solo el contenido", () => {
    montar(rutas, { app: { isDesktop: false } });
    expect(hayBarra()).toBe(false);
    expect(screen.getByText("Contenido de Gestión")).toBeTruthy();
  });

  it("sin correo verificado, sin ficha o sin sesión no ofrece secciones", () => {
    for (const auth of [{ correoVerificado: false }, { userData: null }, { user: null }]) {
      const { unmount } = montar(rutas, { auth });
      expect(hayBarra()).toBe(false);
      unmount();
    }
  });
});
