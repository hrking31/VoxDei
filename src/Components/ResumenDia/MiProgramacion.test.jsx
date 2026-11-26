import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, waitFor, within } from "@testing-library/react";

const servidor = vi.hoisted(() => ({ responder: vi.fn(), falla: false }));
vi.mock("../Firebase/Firebase", () => ({ functions: {} }));
vi.mock("firebase/functions", () => ({
  // La promesa rechazada se crea aquí y no dentro de `vi.fn`, que la marcaría como sin manejar
  httpsCallable: (_f, nombre) => (datos) =>
    servidor.falla
      ? Promise.reject(new Error("No tienes ese cargo en esa fecha."))
      : servidor.responder(nombre, datos),
}));

import MiProgramacion from "./MiProgramacion.jsx";
import { misTurnos } from "../Cronograma/programacion.js";
import { montar } from "../Navegacion/pruebas.utils.jsx";

// Miércoles 25 de noviembre de 2026, 15:00
const AHORA = new Date(2026, 10, 25, 15).getTime();
const DOMINICAL = {
  id: "s1",
  nombre: "Dominical",
  inicio: "10:00",
  fin: "12:00",
  dias: [0],
  fecha: null,
  activo: true,
};
const CARGOS = [
  { id: "conductor", nombre: "Conductor", orden: 0, proyecta: true },
  { id: "alabanza", nombre: "Alabanza", orden: 1, proyecta: false },
];
const programacion = (estado = "pendiente") => ({
  "s1_2026-11-29": {
    asignaciones: {
      conductor: [{ uid: "o1", nombre: "Luis", estado }],
      alabanza: [
        { uid: "o1", nombre: "Luis", estado: "confirmado" },
        { uid: "x2", nombre: "Marta", estado: "pendiente" },
      ],
      borrado: [{ uid: "o1", nombre: "Luis", estado: "pendiente" }],
    },
  },
});

describe("misTurnos", () => {
  it("lista las fechas donde esa persona tiene cargos, con su estado, e ignora cargos que ya no existen", () => {
    const lista = misTurnos([DOMINICAL], programacion(), CARGOS, "o1", AHORA);
    expect(lista).toHaveLength(1);
    expect(lista[0].id).toBe("s1_2026-11-29");
    expect(lista[0].cargos).toEqual([
      { cargoId: "conductor", nombre: "Conductor", estado: "pendiente" },
      { cargoId: "alabanza", nombre: "Alabanza", estado: "confirmado" },
    ]);
  });

  it("sin cargos, sin sesión o sin programación devuelve una lista vacía", () => {
    expect(
      misTurnos([DOMINICAL], programacion(), CARGOS, "otro", AHORA),
    ).toEqual([]);
    expect(misTurnos([DOMINICAL], programacion(), CARGOS, null, AHORA)).toEqual(
      [],
    );
    expect(misTurnos([DOMINICAL], {}, CARGOS, "o1", AHORA)).toEqual([]);
    expect(misTurnos(null, null, null, "o1", AHORA)).toEqual([]);
  });

  it("un estado ausente cuenta como pendiente", () => {
    const sin = {
      "s1_2026-11-29": {
        asignaciones: { conductor: [{ uid: "o1", nombre: "Luis" }] },
      },
    };
    expect(
      misTurnos([DOMINICAL], sin, CARGOS, "o1", AHORA)[0].cargos[0].estado,
    ).toBe("pendiente");
  });
});

describe("MiProgramacion", () => {
  const mostrar = (prog = programacion(), uid = "o1") =>
    montar(<MiProgramacion ahora={AHORA} />, {
      auth: {
        user: { uid },
        userData: { name: "Luis", role: "Operador", groupId: "g1" },
      },
      app: { servicios: [DOMINICAL], cargos: CARGOS, programacion: prog },
    });

  beforeEach(() => {
    servidor.falla = false;
    servidor.responder.mockReset().mockResolvedValue({ data: { ok: true } });
  });

  it("sin cargos asignados no pinta nada", () => {
    mostrar(programacion(), "nadie");
    expect(document.querySelector("[data-mi-programacion]")).toBeNull();
  });

  it("muestra cada cargo con su estado: pendiente con los dos botones, confirmado solo con «No puedo»", () => {
    mostrar();
    const conductor = document.querySelector("[data-cargo='conductor']");
    expect(conductor.getAttribute("data-estado")).toBe("pendiente");
    expect(within(conductor).getByText("Sin responder")).toBeTruthy();
    expect(
      within(conductor).getByRole("button", { name: "Confirmo" }),
    ).toBeTruthy();
    expect(
      within(conductor).getByRole("button", { name: "No puedo" }),
    ).toBeTruthy();
    const alabanza = document.querySelector("[data-cargo='alabanza']");
    expect(within(alabanza).getByText("Confirmado")).toBeTruthy();
    expect(
      within(alabanza).queryByRole("button", { name: "Confirmo" }),
    ).toBeNull();
    expect(
      within(alabanza).getByRole("button", { name: "No puedo" }),
    ).toBeTruthy();
  });

  it("«Confirmo» llama a la función con la fecha, el cargo y el estado, y avisa", async () => {
    const { app } = mostrar();
    fireEvent.click(
      within(document.querySelector("[data-cargo='conductor']")).getByRole(
        "button",
        { name: "Confirmo" },
      ),
    );
    await waitFor(() => expect(servidor.responder).toHaveBeenCalledTimes(1));
    expect(servidor.responder).toHaveBeenCalledWith("responderTurno", {
      id: "s1_2026-11-29",
      cargoId: "conductor",
      estado: "confirmado",
    });
    await waitFor(() =>
      expect(app.showNotif).toHaveBeenCalledWith(
        "success",
        "Confirmado. ¡Gracias!",
      ),
    );
  });

  it("«No puedo» manda no_puede", async () => {
    mostrar();
    fireEvent.click(
      within(document.querySelector("[data-cargo='alabanza']")).getByRole(
        "button",
        { name: "No puedo" },
      ),
    );
    await waitFor(() =>
      expect(servidor.responder).toHaveBeenCalledWith("responderTurno", {
        id: "s1_2026-11-29",
        cargoId: "alabanza",
        estado: "no_puede",
      }),
    );
  });

  it("si la función falla, avisa del error", async () => {
    servidor.falla = true;
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { app } = mostrar();
    fireEvent.click(
      within(document.querySelector("[data-cargo='conductor']")).getByRole(
        "button",
        { name: "Confirmo" },
      ),
    );
    await waitFor(() =>
      expect(app.showNotif).toHaveBeenCalledWith(
        "error",
        "No tienes ese cargo en esa fecha.",
      ),
    );
  });
});
