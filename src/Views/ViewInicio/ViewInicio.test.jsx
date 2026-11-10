import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";

// Firestore de mentira: el orden del culto trae 3 pasos y el repertorio, 2.
vi.mock("../../Components/Firebase/Firebase", () => ({ db: {}, database: {}, auth: {}, storage: {}, functions: {} }));
vi.mock("firebase/firestore", () => ({
  doc: (...partes) => partes.slice(1).join("/"),
  collection: (...partes) => partes.slice(1).join("/"),
  onSnapshot: (ruta, alCambiar) => {
    const datos = ruta.includes("ordenCulto") ? { pasos: [1, 2, 3] } : { canciones: ["a", "b"] };
    alCambiar({ data: () => datos });
    return () => {};
  },
}));
vi.mock("firebase/database", () => ({ ref: (_db, ruta) => ruta, set: vi.fn(async () => {}), update: vi.fn(async () => {}) }));

import ViewInicio from "./ViewInicio.jsx";
import { montar } from "../../Components/Navegacion/pruebas.utils.jsx";

const pastor = { userData: { name: "Ana", role: "Pastor", groupId: "g1" } };

describe("ViewInicio (resumen del día)", () => {
  it("resume el servicio, el orden del culto y las canciones de hoy", () => {
    montar(<ViewInicio />, { auth: pastor, app: { pantallaTemplo: "encendida" } });
    expect(screen.getByRole("heading", { name: "Hoy" })).toBeTruthy();
    expect(screen.getByText("3 pasos listos")).toBeTruthy();
    expect(screen.getByText("2 canciones")).toBeTruthy();
    expect(screen.getByText("No hay servicios en el cronograma")).toBeTruthy();
  });

  it("junto al servicio dice cómo está la pantalla del templo", () => {
    montar(<ViewInicio />, { auth: pastor, app: { pantallaTemplo: "apagada" } });
    expect(screen.getByRole("status", { name: /apagada/ })).toBeTruthy();
  });

  it("no ofrece abrir la pantalla del templo ni tiene ficha con X", () => {
    montar(<ViewInicio />, { auth: pastor, app: { pantallaTemplo: "apagada" } });
    expect(screen.queryByRole("button", { name: /Abrir pantalla/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /entrada/ })).toBeNull();
  });

  it("cada tarjeta lleva a su sección", () => {
    montar(<ViewInicio />, { auth: pastor });
    fireEvent.click(screen.getByRole("button", { name: "Abrir el Orden del culto" }));
    expect(screen.getByTestId("ruta").textContent).toBe("/ViewCulto");
  });
});
