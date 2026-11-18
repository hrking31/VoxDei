import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";

const servidor = vi.hoisted(() => ({
  personas: [],
  crear: vi.fn(async () => ({})),
}));

vi.mock("../../Components/Firebase/Firebase", () => ({ db: {}, functions: {}, storage: {} }));
vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  doc: vi.fn(),
  updateDoc: vi.fn(),
  setDoc: vi.fn(),
  serverTimestamp: vi.fn(),
  getDocs: vi.fn(async () => ({
    docs: servidor.personas.map((p) => ({ id: p.id, data: () => p })),
  })),
}));
vi.mock("firebase/functions", () => ({ httpsCallable: () => servidor.crear }));
vi.mock("firebase/storage", () => ({ ref: vi.fn(), uploadBytes: vi.fn(), getDownloadURL: vi.fn() }));

import ViewUsers from "./ViewUsers.jsx";
import { montar } from "../../Components/Navegacion/pruebas.utils.jsx";

const equipo = [
  { id: "d1", groupId: "d1", name: "Luis Pérez", email: "luis@iglesia.org", role: "Pastor" },
  { id: "o1", groupId: "d1", name: "Beto Ruiz", email: "beto@iglesia.org", role: "Operador" },
];

const dueno = {
  user: { uid: "d1" },
  userData: { uid: "d1", name: "Luis Pérez", role: "Pastor", groupId: "d1", churchName: "Camino de Paz" },
  setLoading: vi.fn(),
};
const operador = {
  user: { uid: "o1" },
  userData: { uid: "o1", name: "Beto Ruiz", role: "Operador", groupId: "d1", churchName: "Camino de Paz" },
  setLoading: vi.fn(),
};

async function abrir(auth) {
  servidor.personas = equipo;
  const resultado = montar(<ViewUsers />, { auth, app: { iglesia: null } });
  await screen.findByText("Beto Ruiz");
  return resultado;
}

describe("ViewUsers", () => {
  it("muestra la iglesia, cuántas personas hay y las agrupa en Pastores y Equipo", async () => {
    await abrir(dueno);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Camino de Paz");
    expect(document.querySelector("[data-contador-personas]").textContent).toBe("2 personas");
    expect(within(screen.getByRole("region", { name: "Pastores" })).getByText("Luis Pérez")).toBeTruthy();
    expect(within(screen.getByRole("region", { name: "Equipo" })).getByText("Beto Ruiz")).toBeTruthy();
  });

  it("marca al dueño y a quien mira la pantalla", async () => {
    await abrir(dueno);
    const fila = document.querySelector('[data-persona="d1"]');
    expect(fila.querySelector("[data-dueno]")).not.toBeNull();
    expect(fila.querySelector("[data-tu]")).not.toBeNull();
    expect(document.querySelector('[data-persona="o1"] [data-tu]')).toBeNull();
  });

  it("el operador ve la lista pero no puede añadir ni editar la iglesia", async () => {
    await abrir(operador);
    expect(document.querySelector("[data-anadir-persona]")).toBeNull();
    expect(document.querySelector("[data-datos-iglesia]")).toBeNull();
  });

  it("tocar una fila abre la ficha de esa persona", async () => {
    await abrir(dueno);
    fireEvent.click(document.querySelector('[data-persona="o1"]'));
    expect(await screen.findAllByText("beto@iglesia.org")).not.toHaveLength(0);
  });

  it("el pastor añade a alguien desde el panel y este se cierra", async () => {
    servidor.crear.mockClear();
    const { app } = await abrir(dueno);
    fireEvent.click(document.querySelector("[data-anadir-persona]"));
    const panel = document.querySelector("[data-panel-nueva-persona]");
    expect(panel).not.toBeNull();

    fireEvent.change(within(panel).getByPlaceholderText("Nombre de la persona"), { target: { name: "name", value: "Marta Díaz" } });
    fireEvent.click(within(panel).getByRole("radio", { name: "Femenino" }));
    fireEvent.change(within(panel).getByPlaceholderText("correo@ejemplo.com"), { target: { name: "email", value: "marta@iglesia.org" } });
    fireEvent.change(within(panel).getByPlaceholderText("Contraseña"), { target: { name: "password", value: "ClaveSegura12!" } });
    fireEvent.click(within(panel).getByRole("radio", { name: "Operador" }));
    fireEvent.click(within(panel).getByRole("button", { name: "Crear usuario" }));

    await waitFor(() =>
      expect(servidor.crear).toHaveBeenCalledWith({
        name: "Marta Díaz",
        email: "marta@iglesia.org",
        password: "ClaveSegura12!",
        role: "Operador",
        gender: "Femenino",
      })
    );
    expect(app.showNotif).toHaveBeenCalledWith("success", "Usuario creado correctamente.");
    await waitFor(() => expect(document.querySelector("[data-panel-nueva-persona]")).toBeNull());
  });

  it("con campos vacíos avisa y no llama al servidor", async () => {
    servidor.crear.mockClear();
    const { app } = await abrir(dueno);
    fireEvent.click(document.querySelector("[data-anadir-persona]"));
    fireEvent.click(screen.getByRole("button", { name: "Crear usuario" }));
    expect(app.showNotif).toHaveBeenCalledWith("error", "Por favor completa todos los campos.");
    expect(servidor.crear).not.toHaveBeenCalled();
  });

  it("el panel se cierra con Escape y con la X", async () => {
    await abrir(dueno);
    fireEvent.click(document.querySelector("[data-anadir-persona]"));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(document.querySelector("[data-panel-nueva-persona]")).toBeNull();
    fireEvent.click(document.querySelector("[data-anadir-persona]"));
    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(document.querySelector("[data-panel-nueva-persona]")).toBeNull();
  });
});
