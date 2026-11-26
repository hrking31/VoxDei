import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";

// Firestore de mentira: lo que se guarda o se borra se anota en `llamadas`.
const estado = vi.hoisted(() => ({
  existente: null,
  llamadas: [],
}));

vi.mock("../Firebase/Firebase", () => ({ db: {} }));
vi.mock("firebase/firestore", () => ({
  doc: (...partes) => partes.slice(1).join("/"),
  collection: (...partes) => partes.slice(1).join("/"),
  addDoc: vi.fn(async (ruta, datos) =>
    estado.llamadas.push({ accion: "addDoc", ruta, datos }),
  ),
  setDoc: vi.fn(async (ruta, datos) =>
    estado.llamadas.push({ accion: "setDoc", ruta, datos }),
  ),
  deleteDoc: vi.fn(async (ruta) =>
    estado.llamadas.push({ accion: "deleteDoc", ruta }),
  ),
  getDoc: vi.fn(async () => ({
    exists: () => Boolean(estado.existente),
    data: () => estado.existente,
  })),
  serverTimestamp: () => "ahora",
}));

import FormularioServicio from "./FormularioServicio.jsx";
import { SUGERENCIAS_NOMBRE } from "./utilesServicios.js";
import { montar } from "../Navegacion/pruebas.utils.jsx";

const pastora = { userData: { name: "Ana", role: "Pastora", groupId: "g1" } };

beforeEach(() => {
  estado.existente = null;
  estado.llamadas = [];
});
afterEach(() => vi.clearAllMocks());

const mostrar = (props = {}, app = {}) =>
  montar(<FormularioServicio {...props} />, { auth: pastora, app });
const guardar = () =>
  fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

describe("FormularioServicio · servicio nuevo", () => {
  it("lleva las opciones de siempre y no ofrece eliminar", () => {
    mostrar();
    expect(screen.getByLabelText("Nombre")).toBeTruthy();
    expect(screen.getByLabelText("Inicio").value).toBe("08:00");
    expect(screen.getByLabelText("Fin").value).toBe("10:00");
    expect(screen.getByTitle("Domingo")).toBeTruthy();
    expect(screen.getByLabelText("Fecha")).toBeTruthy();
    expect(screen.getByLabelText(/Activo/).checked).toBe(true);
    expect(
      screen.queryByRole("button", { name: "Eliminar servicio" }),
    ).toBeNull();
  });

  it("el nombre se puede escoger de una lista propia, con el estilo de la app, de lo que suele hacerse (incluidos los ensayos)", async () => {
    const alTerminar = vi.fn();
    mostrar({ alTerminar });
    const nombre = screen.getByLabelText("Nombre");
    expect(nombre.getAttribute("role")).toBe("combobox");
    expect(nombre.getAttribute("placeholder")).toBe(
      "Escoge o escribe",
    );
    expect(document.querySelector("datalist")).toBeNull();
    expect(screen.queryByRole("listbox")).toBeNull();
    fireEvent.focus(nombre);
    const lista = screen.getByRole("listbox");
    expect(lista.className).toContain("bg-app-light");
    expect(lista.className).toContain("border-app-border");
    const opciones = within(lista)
      .getAllByRole("option")
      .map((o) => o.textContent);
    expect(opciones).toEqual(SUGERENCIAS_NOMBRE);
    expect(opciones).toContain("Ensayo de alabanza");
    expect(opciones).toContain("Servicio dominical");
    // Se escoge una sugerencia…
    fireEvent.mouseDown(
      within(lista).getByRole("option", { name: "Ensayo de alabanza" }),
    );
    expect(nombre.value).toBe("Ensayo de alabanza");
    expect(screen.queryByRole("listbox")).toBeNull();
    fireEvent.click(screen.getByTitle("Sábado"));
    guardar();
    await waitFor(() => expect(alTerminar).toHaveBeenCalled());
    expect(estado.llamadas[0].datos.nombre).toBe("Ensayo de alabanza");
  });

  it("…o se escribe uno propio, que no está en la lista", async () => {
    const alTerminar = vi.fn();
    mostrar({ alTerminar });
    fireEvent.change(screen.getByLabelText("Nombre"), {
      target: { value: "Noche de adoración" },
    });
    fireEvent.click(screen.getByTitle("Viernes"));
    guardar();
    await waitFor(() => expect(alTerminar).toHaveBeenCalled());
    expect(estado.llamadas[0].datos.nombre).toBe("Noche de adoración");
  });

  it("ya no pide operador: el servicio se repite, y quién sirve se decide en la programación", () => {
    mostrar();
    expect(screen.queryByLabelText("Operador")).toBeNull();
    expect(screen.queryByText("Operador")).toBeNull();
  });

  it("con una fecha inicial (la que se tocó en el calendario) el formulario nace con ella y se guarda como de una sola vez", async () => {
    const alTerminar = vi.fn();
    mostrar({ alTerminar, fechaInicial: "2026-12-24" });
    expect(screen.getByLabelText("Fecha").value).toBe("2026-12-24");
    guardar();
    await waitFor(() => expect(alTerminar).toHaveBeenCalled());
    expect(estado.llamadas[0].datos).toMatchObject({
      dias: [],
      fecha: "2026-12-24",
    });
  });

  it("no guarda si el fin no es posterior al inicio ni sin días ni fecha", () => {
    const { app } = mostrar();
    fireEvent.change(screen.getByLabelText("Fin"), {
      target: { value: "07:00" },
    });
    guardar();
    expect(app.showNotif).toHaveBeenLastCalledWith(
      "error",
      "La hora de fin debe ser posterior a la de inicio.",
    );
    fireEvent.change(screen.getByLabelText("Fin"), {
      target: { value: "10:00" },
    });
    guardar();
    expect(app.showNotif).toHaveBeenLastCalledWith(
      "error",
      "Marca los días en que se repite o elige una fecha.",
    );
    expect(estado.llamadas).toEqual([]);
  });

  it("guarda un servicio semanal en la iglesia de quien lo crea y avisa que terminó", async () => {
    const alTerminar = vi.fn();
    const { app } = mostrar({ alTerminar });
    fireEvent.change(screen.getByLabelText("Nombre"), {
      target: { value: "  Dominical  " },
    });
    fireEvent.click(screen.getByTitle("Domingo"));
    guardar();
    await waitFor(() => expect(alTerminar).toHaveBeenCalledTimes(1));
    const [escrito] = estado.llamadas;
    expect(escrito.accion).toBe("addDoc");
    expect(escrito.ruta).toContain("g1");
    expect(escrito.datos).toMatchObject({
      nombre: "Dominical",
      inicio: "08:00",
      fin: "10:00",
      dias: [0],
      fecha: null,
      activo: true,
    });
    expect(escrito.datos).not.toHaveProperty("operadorUid");
    expect(escrito.datos).not.toHaveProperty("operadorNombre");
    expect(app.showNotif).toHaveBeenCalledWith("success", "Servicio guardado.");
  });

  it("sin días guarda la fecha de una sola vez", async () => {
    const alTerminar = vi.fn();
    mostrar({ alTerminar });
    fireEvent.change(screen.getByLabelText("Fecha"), {
      target: { value: "2026-12-24" },
    });
    guardar();
    await waitFor(() => expect(alTerminar).toHaveBeenCalled());
    expect(estado.llamadas[0].datos).toMatchObject({
      dias: [],
      fecha: "2026-12-24",
    });
  });
});

describe("FormularioServicio · servicio existente", () => {
  beforeEach(() => {
    estado.existente = {
      nombre: "Dominical",
      inicio: "09:00",
      fin: "11:00",
      dias: [0],
      fecha: null,
      operadorUid: "o1",
      operadorNombre: "Luis",
      activo: true,
    }; // un servicio viejo, con operador
  });

  it("carga el servicio y al guardar lo reescribe en su documento", async () => {
    const alTerminar = vi.fn();
    mostrar({ id: "s1", alTerminar });
    await waitFor(() =>
      expect(screen.getByLabelText("Nombre").value).toBe("Dominical"),
    );
    expect(screen.getByLabelText("Inicio").value).toBe("09:00");
    guardar();
    await waitFor(() => expect(alTerminar).toHaveBeenCalled());
    expect(estado.llamadas[0].accion).toBe("setDoc");
    expect(estado.llamadas[0].ruta).toContain("s1");
    // Al guardar un servicio viejo se deja atrás el operador que traía
    expect(estado.llamadas[0].datos).not.toHaveProperty("operadorUid");
  });

  it("eliminar pide confirmación y borra su documento", async () => {
    const alTerminar = vi.fn();
    const { app } = mostrar({ id: "s1", alTerminar });
    fireEvent.click(
      await screen.findByRole("button", { name: "Eliminar servicio" }),
    );
    await waitFor(() => expect(alTerminar).toHaveBeenCalled());
    expect(app.confirmAction).toHaveBeenCalledWith(
      "¿Eliminar este servicio del cronograma?",
    );
    expect(estado.llamadas[0]).toMatchObject({ accion: "deleteDoc" });
    expect(estado.llamadas[0].ruta).toContain("s1");
  });

  it("si no confirma, no borra nada", async () => {
    const { app } = mostrar(
      { id: "s1" },
      { confirmAction: vi.fn().mockResolvedValue(false) },
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Eliminar servicio" }),
    );
    await waitFor(() => expect(app.confirmAction).toHaveBeenCalled());
    expect(estado.llamadas).toEqual([]);
  });

  it("si el servicio ya no existe, lo dice y avisa a quien lo montó", async () => {
    estado.existente = null;
    const alNoExistir = vi.fn();
    const { app } = mostrar({ id: "s9", alNoExistir });
    await waitFor(() => expect(alNoExistir).toHaveBeenCalled());
    expect(app.showNotif).toHaveBeenCalledWith(
      "error",
      "Ese servicio ya no existe.",
    );
  });
});
