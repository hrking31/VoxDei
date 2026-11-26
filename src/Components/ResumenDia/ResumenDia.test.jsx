import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";

const base = vi.hoisted(() => ({
  cambiarEspera: vi.fn(),
  orden: 0,
  canciones: 0,
}));

vi.mock("../Firebase/Firebase", () => ({
  db: {},
  database: {},
  functions: {},
}));
vi.mock("firebase/functions", () => ({ httpsCallable: () => vi.fn() }));
vi.mock("firebase/firestore", () => ({
  doc: (_db, ...partes) => partes.join("/"),
  collection: (_db, ...partes) => partes.join("/"),
  // Cada suscripción responde al instante con el conteo de la prueba
  onSnapshot: (ruta, alDato) => {
    const esOrden = String(ruta).includes("ordenCulto");
    alDato({
      data: () =>
        esOrden
          ? { pasos: Array.from({ length: base.orden }) }
          : { canciones: Array.from({ length: base.canciones }) },
    });
    return () => {};
  },
}));
vi.mock("../PantallaEspera/accionesEspera.js", () => ({
  cambiarEspera: (...a) => base.cambiarEspera(...a),
}));
vi.mock("../Entrada/EstadoPantalla.jsx", () => ({
  default: () => <span>estado</span>,
}));

import ResumenDia from "./ResumenDia.jsx";
import { montar } from "../Navegacion/pruebas.utils.jsx";

const mostrar = (app = {}) =>
  montar(<ResumenDia />, {
    auth: {
      user: { uid: "u1" },
      userData: { name: "Ana", role: "Pastor", groupId: "g1" },
    },
    app: { visibleEspera: false, programacion: {}, cargos: [], ...app },
  });

describe("ResumenDia (Inicio)", () => {
  beforeEach(() => {
    base.cambiarEspera.mockReset().mockResolvedValue(undefined);
    base.orden = 0;
    base.canciones = 0;
  });

  it("muestra el servicio, el orden del culto y las canciones de hoy", () => {
    mostrar();
    expect(screen.getByRole("region", { name: "Servicio" })).toBeTruthy();
    expect(
      screen.getByRole("region", { name: "Orden del culto" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("region", { name: "Canciones de hoy" }),
    ).toBeTruthy();
    expect(screen.getByText("Sin preparar")).toBeTruthy();
    expect(screen.getByText("Ninguna todavía")).toBeTruthy();
  });

  it("cuenta los pasos y las canciones preparados", () => {
    base.orden = 3;
    base.canciones = 1;
    mostrar();
    expect(screen.getByText("3 pasos listos")).toBeTruthy();
    expect(screen.getByText("1 canción")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Abrir el Orden del culto" }),
    ).toBeTruthy();
  });

  it("los botones llevan a Cronograma, al Orden del culto y a Canciones", () => {
    mostrar();
    fireEvent.click(screen.getByRole("button", { name: "Ir a Cronograma" }));
    expect(screen.getByTestId("ruta").textContent).toBe("/ViewCronograma");
    fireEvent.click(
      screen.getByRole("button", { name: "Preparar el Orden del culto" }),
    );
    expect(screen.getByTestId("ruta").textContent).toBe("/ViewCulto");
    fireEvent.click(screen.getByRole("button", { name: "Ir a Canciones" }));
    expect(screen.getByTestId("ruta").textContent).toBe("/ViewCanciones");
  });

  it("la pantalla de espera se enciende y se apaga desde aquí", async () => {
    const { unmount } = mostrar({ visibleEspera: false });
    fireEvent.click(
      screen.getByRole("button", { name: "Mostrar la pantalla de espera" }),
    );
    await waitFor(() =>
      expect(base.cambiarEspera).toHaveBeenCalledWith("g1", true),
    );
    unmount();
    mostrar({ visibleEspera: true });
    fireEvent.click(
      screen.getByRole("button", { name: "Quitar la pantalla de espera" }),
    );
    await waitFor(() =>
      expect(base.cambiarEspera).toHaveBeenLastCalledWith("g1", false),
    );
  });

  it("sin turno (operador sin cargo) no escribe en la pantalla y avisa", () => {
    const { app } = montar(<ResumenDia />, {
      auth: {
        user: { uid: "o1" },
        userData: { name: "Luis", role: "Operador", groupId: "g1" },
      },
      app: { visibleEspera: false, programacion: {}, cargos: [] },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Mostrar la pantalla de espera" }),
    );
    expect(base.cambiarEspera).not.toHaveBeenCalled();
    expect(app.showNotif).toHaveBeenCalled();
  });
});
