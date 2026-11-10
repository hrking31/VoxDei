import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";

// Firebase de mentira: el orden llega por onSnapshot, lo que se proyecta se
// anota en `escritos` y lo que se guarda en `guardados`.
const estado = vi.hoisted(() => ({ pasos: [], escritos: [], guardados: [] }));

vi.mock("../Firebase/Firebase", () => ({ db: {}, database: {}, auth: {}, storage: {}, functions: {} }));
vi.mock("firebase/database", () => ({
  ref: (_db, ruta) => ruta,
  set: vi.fn(async (ruta, datos) => estado.escritos.push({ modo: "set", ruta, datos })),
  update: vi.fn(async (ruta, datos) => estado.escritos.push({ modo: "update", ruta, datos })),
}));
vi.mock("firebase/firestore", () => ({
  doc: (...partes) => partes.slice(1).join("/"),
  collection: (...partes) => partes.slice(1).join("/"),
  onSnapshot: (_ref, alCambiar) => {
    alCambiar({ data: () => ({ pasos: estado.pasos }) });
    return () => {};
  },
  setDoc: vi.fn(async (_ref, datos) => estado.guardados.push(datos)),
  serverTimestamp: () => "ahora",
  // Sirve para el repertorio y para la Biblia a la vez.
  getDoc: vi.fn(async () => ({
    exists: () => true,
    id: "x",
    data: () => ({ canciones: [], versiculos: { 16: "Porque de tal manera amó Dios al mundo…" }, libro: "S. Juan", capitulo: 3 }),
  })),
}));

import OrdenCulto from "./OrdenCulto.jsx";
import { montar } from "../Navegacion/pruebas.utils.jsx";

const PASOS = [
  { id: "a", tipo: "mensaje", texto: "Bienvenidos" },
  { id: "b", tipo: "cancion", titulo: "Santo", laminas: ["L1", "L2"] },
];
const pastor = { userData: { name: "Ana", role: "Pastor", groupId: "g1" } };

beforeEach(() => {
  estado.pasos = PASOS;
  estado.escritos = [];
  estado.guardados = [];
  sessionStorage.clear();
});
afterEach(() => vi.clearAllMocks());

const boton = (nombre) => screen.getByRole("button", { name: nombre });
const mensajes = () => estado.escritos.filter((e) => e.ruta === "displayMessage/g1").map((e) => e.datos.text);

describe("OrdenCulto · pestaña Culto", () => {
  it("lista los pasos y proyecta uno por uno con «Siguiente», lámina por lámina", async () => {
    montar(<OrdenCulto />, { auth: pastor });
    expect(screen.getByText("Bienvenidos")).toBeTruthy();

    fireEvent.click(boton(/Empezar el culto/));
    await waitFor(() => expect(mensajes()).toEqual(["Bienvenidos"]));
    fireEvent.click(boton(/Siguiente/));
    await waitFor(() => expect(mensajes()).toEqual(["Bienvenidos", "L1"]));
    fireEvent.click(boton(/Siguiente/));
    await waitFor(() => expect(mensajes()).toEqual(["Bienvenidos", "L1", "L2"]));

    expect(boton(/Fin del culto/)).toBeTruthy();
    expect(screen.getByText("«Santo» · lámina 2 de 2")).toBeTruthy();
  });

  it("enciende el texto y quita la pantalla de espera al proyectar", async () => {
    montar(<OrdenCulto />, { auth: pastor });
    fireEvent.click(boton(/Empezar el culto/));
    await waitFor(() => expect(estado.escritos.map((e) => e.ruta)).toEqual(["displayMessage/g1", "displayVisibleTexto/g1", "displayEspera/g1"]));
  });

  it("tocar un paso salta a él", async () => {
    montar(<OrdenCulto />, { auth: pastor });
    fireEvent.click(boton(/Santo/));
    await waitFor(() => expect(mensajes()).toEqual(["L1"]));
  });

  it("sin turno no proyecta nada y avisa", async () => {
    const { app } = montar(<OrdenCulto />, { auth: { userData: { name: "Luis", role: "Operador", groupId: "g1" } } });
    fireEvent.click(boton(/Empezar el culto/));
    expect(app.showNotif).toHaveBeenCalledWith("warning", expect.stringContaining("ensayo"));
    expect(estado.escritos).toEqual([]);
  });

  it("sin pasos invita a prepararlo", () => {
    estado.pasos = [];
    montar(<OrdenCulto />, { auth: pastor });
    fireEvent.click(boton("Preparar el orden"));
    expect(screen.getByRole("tab", { name: "Preparar" }).getAttribute("aria-selected")).toBe("true");
  });
});

describe("OrdenCulto · pestaña Preparar", () => {
  const preparar = () => {
    montar(<OrdenCulto />, { auth: pastor });
    fireEvent.click(screen.getByRole("tab", { name: "Preparar" }));
  };

  it("agrega un mensaje al final y lo guarda", () => {
    preparar();
    fireEvent.change(screen.getByLabelText("Texto del paso"), { target: { value: "Oremos" } });
    fireEvent.click(boton("Agregar"));
    const guardado = estado.guardados.at(-1).pasos;
    expect(guardado).toHaveLength(3);
    expect(guardado[2]).toMatchObject({ tipo: "mensaje", texto: "Oremos" });
    expect(guardado[2].id).toBeTruthy();
  });

  it("busca un versículo escrito a mano y lo agrega con su cita", async () => {
    preparar();
    fireEvent.click(screen.getByRole("radio", { name: /Versículo/ }));
    fireEvent.change(screen.getByLabelText("Cita bíblica"), { target: { value: "juan 3 16" } });
    fireEvent.click(boton("Buscar"));
    await screen.findByText(/Porque de tal manera/);
    fireEvent.click(boton("Agregar"));
    expect(estado.guardados.at(-1).pasos[2]).toMatchObject({
      tipo: "versiculo",
      cita: "Juan 3:16",
      texto: "Porque de tal manera amó Dios al mundo…",
    });
  });

  it("si la cita no se entiende, lo dice con un ejemplo", () => {
    const { app } = montar(<OrdenCulto />, { auth: pastor });
    fireEvent.click(screen.getByRole("tab", { name: "Preparar" }));
    fireEvent.click(screen.getByRole("radio", { name: /Versículo/ }));
    fireEvent.change(screen.getByLabelText("Cita bíblica"), { target: { value: "jo 1:1" } });
    fireEvent.click(boton("Buscar"));
    expect(app.showNotif).toHaveBeenCalledWith("warning", expect.stringContaining("Juan 3:16"));
  });

  it("sube, baja y quita pasos", () => {
    preparar();
    const lista = screen.getAllByRole("list")[0];
    fireEvent.click(within(lista).getByRole("button", { name: "Subir «Santo»" }));
    expect(estado.guardados.at(-1).pasos.map((p) => p.id)).toEqual(["b", "a"]);
    fireEvent.click(within(lista).getByRole("button", { name: "Quitar «Bienvenidos»" }));
    expect(estado.guardados.at(-1).pasos.map((p) => p.id)).toEqual(["b"]);
  });

  it("sin canciones de hoy explica dónde armarlas", async () => {
    preparar();
    fireEvent.click(screen.getByRole("radio", { name: /Canción/ }));
    expect(await screen.findByText(/No hay canciones de hoy/)).toBeTruthy();
  });
});
