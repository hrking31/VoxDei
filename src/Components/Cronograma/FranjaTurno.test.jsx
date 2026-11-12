import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";

const estado = vi.hoisted(() => ({ turno: { tipo: "libre" } }));
const ensayo = vi.hoisted(() => ({ iniciar: vi.fn(async () => {}), terminar: vi.fn(async () => {}) }));

vi.mock("../Hooks/useTurno.js", () => ({ useTurno: () => estado }));
vi.mock("./AccionesEnsayo.js", () => ({ iniciarEnsayo: ensayo.iniciar, terminarEnsayo: ensayo.terminar }));

import FranjaTurno from "./FranjaTurno.jsx";
import { montar } from "../Navegacion/pruebas.utils.jsx";

const pastora = { user: { uid: "p1" }, userData: { name: "Ana", role: "Pastora", groupId: "g1" } };
const operador = { user: { uid: "o1" }, userData: { name: "Luis", role: "Operador", groupId: "g1" } };

function abrir({ turno = { tipo: "libre" }, auth = pastora, pantalla = "encendida", app = {} } = {}) {
  estado.turno = turno;
  return montar(<FranjaTurno />, { auth, app: { pantallaTemplo: pantalla, ...app } });
}

const franja = () => document.querySelector("[data-franja-turno]");
const textoVisible = () => [...franja().querySelectorAll("p > :not(.sr-only)")].map((n) => n.textContent).join("");

describe("FranjaTurno", () => {
  it("un solo renglón, todo verde, y solo dice de quién es el turno", () => {
    abrir();
    expect(franja().className).toContain("h-8");
    expect(franja().className).toContain("bg-app-success/10");
    expect(textoVisible()).toBe("Sin servicio");
    expect(screen.getByTitle("Sin servicio. Puedes proyectar como pastora.")).toBeTruthy();
  });

  it("en rojo tampoco hay texto: el color ya dice que no", () => {
    abrir({ auth: operador });
    expect(franja().dataset.franjaTurno).toBe("no-puedo");
    expect(franja().className).toContain("bg-app-error/10");
    expect(textoVisible()).toBe("Sin servicio");
    expect(screen.getByTitle("Sin servicio. Inicia un ensayo para poder proyectar.")).toBeTruthy();
  });

  it("a la derecha, cómo está la pantalla del templo", () => {
    const { unmount } = abrir({ pantalla: "ventana" });
    expect(screen.getByText("VENTANA")).toBeTruthy();
    unmount();
    abrir({ pantalla: null });
    expect(screen.queryByText(/COMPLETA|Apagada|VENTANA/)).toBeNull();
  });

  it("el operador inicia el ensayo", () => {
    abrir({ auth: operador });
    fireEvent.click(screen.getByRole("button", { name: "Iniciar ensayo" }));
    expect(ensayo.iniciar).toHaveBeenCalledWith("g1", { uid: "o1", nombre: "Luis" }, "o1");
  });

  it("quien tiene el ensayo lo termina", () => {
    abrir({ turno: { tipo: "ensayo", uid: "o1", nombre: "Luis", hasta: Date.now() + 3600000 }, auth: operador });
    expect(franja().textContent).toContain("Tu ensayo");
    fireEvent.click(screen.getByRole("button", { name: "Terminar" }));
    expect(ensayo.terminar).toHaveBeenCalledWith("g1");
  });

  it("tomar el ensayo de otro pide confirmación", async () => {
    ensayo.iniciar.mockClear();
    const confirmAction = vi.fn(async () => true);
    abrir({ turno: { tipo: "ensayo", uid: "x", nombre: "Laura", hasta: Date.now() + 3600000 }, auth: operador, app: { confirmAction } });
    fireEvent.click(screen.getByRole("button", { name: "Tomar ensayo" }));
    await waitFor(() => expect(ensayo.iniciar).toHaveBeenCalled());
    expect(confirmAction).toHaveBeenCalledWith("Laura tiene el ensayo. ¿Quieres tomarlo?");
  });
});
