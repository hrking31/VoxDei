import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import ViewSelector from "./ViewSelector.jsx";
import { montar } from "../../Components/Navegacion/pruebas.utils.jsx";

const pastor = { userData: { name: "Hernando Rey", role: "Pastor", groupId: "g1", churchName: "Camino de Paz" } };
const entrar = (app = {}, auth = pastor) =>
  montar(<ViewSelector />, { ruta: "/ViewSelector", auth, app: { pantallaTemplo: "apagada", ...app } });
const ficha = (titulo) => screen.queryByRole("button", { name: new RegExp(`^${titulo}`) });

describe("ViewSelector · los dos pasos", () => {
  afterEach(() => vi.restoreAllMocks());

  it("con la pantalla apagada ofrece 1 · Proyectar y 2 · Administrar", () => {
    entrar();
    expect(ficha("1Proyectar")).toBeTruthy();
    expect(ficha("2Administrar")).toBeTruthy();
    expect(screen.getByText("¿Qué hará este dispositivo hoy?")).toBeTruthy();
  });

  it("Proyectar abre la pantalla del templo en otra ventana", () => {
    const abrir = vi.spyOn(window, "open").mockReturnValue(null);
    entrar();
    fireEvent.click(ficha("1Proyectar"));
    expect(abrir).toHaveBeenCalledWith("/VOXDEI", expect.any(String), expect.any(String));
  });

  it("con la pantalla ya abierta en cualquier equipo, queda solo Administrar", () => {
    for (const pantallaTemplo of ["encendida", "maximizada", "ventana", "oculta"]) {
      const { unmount } = entrar({ pantallaTemplo });
      expect(ficha("1Proyectar")).toBeNull();
      expect(ficha("Administrar")).toBeTruthy();
      expect(screen.getByText("Todo listo para el culto")).toBeTruthy();
      unmount();
    }
  });

  it("si todavía no se sabe cómo está la pantalla, ofrece Proyectar", () => {
    entrar({ pantallaTemplo: null });
    expect(ficha("1Proyectar")).toBeTruthy();
  });

  it("en el celular también se ofrece Proyectar: puede ser el que va al proyector", () => {
    entrar({ isDesktop: false });
    expect(ficha("1Proyectar")).toBeTruthy();
  });

  it("Administrar entra al panel, a Inicio", () => {
    entrar({ pantallaTemplo: "encendida" });
    fireEvent.click(ficha("Administrar"));
    expect(screen.getByTestId("ruta").textContent).toBe("/ViewInicio");
  });

  it("saluda con el primer nombre y lleva a la Ayuda", () => {
    entrar();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(/, Hernando$/);
    fireEvent.click(screen.getByRole("button", { name: "¿Primera vez? Ayuda" }));
    expect(screen.getByTestId("ruta").textContent).toBe("/ViewAyuda");
  });

  it("muestra el estado de la pantalla junto al próximo servicio", () => {
    entrar({ pantallaTemplo: "ventana" });
    expect(screen.getByRole("status", { name: /falta tocar pantalla completa/ }).textContent).toBe("VENTANA");
  });

  it("chip e ícono verdes si está abierta, grises si está apagada; el texto lleva el color del estado", () => {
    const casos = [
      ["apagada", "text-app-muted", "Apagada", "text-app-muted"],
      ["oculta", "text-app-success", "OCULTA", "text-app-error"],
      ["ventana", "text-app-success", "VENTANA", "text-app-main"],
      ["maximizada", "text-app-success", "MAXIMIZADA", "text-app-azul"],
      ["encendida", "text-app-success", "COMPLETA", "text-app-success"],
    ];
    const iconos = new Set();
    for (const [pantallaTemplo, colorIcono, texto, colorTexto] of casos) {
      const { unmount } = entrar({ pantallaTemplo });
      const chip = screen.getByRole("status", { name: /Pantalla del templo/ });
      const icono = chip.querySelector("svg");
      expect(chip.className).toContain(pantallaTemplo === "apagada" ? "border-app-border" : "border-app-success");
      expect(icono.getAttribute("class")).toContain(colorIcono);
      expect(screen.getByText(texto).className).toBe(colorTexto);
      iconos.add(icono.innerHTML);
      unmount();
    }
    // Cada estado lleva su propio ícono.
    expect(iconos.size).toBe(5);
  });
});

describe("ViewSelector · encabezado de usuario", () => {
  it("nombre, rol e iglesia", () => {
    entrar();
    expect(screen.getByText("Hernando Rey")).toBeTruthy();
    expect(screen.getByText("Pastor")).toBeTruthy();
    expect(screen.getByText("Camino de Paz")).toBeTruthy();
    expect(screen.getByText("HR")).toBeTruthy();
  });

  it("los nombres largos se cortan, pero el texto completo queda al pasar el mouse", () => {
    const largo = "María Fernanda de los Ángeles Rodríguez Montenegro";
    const iglesia = "Iglesia Cristiana Evangélica Pentecostal Camino de Paz y Restauración";
    entrar({ iglesia: { nombre: iglesia } }, { userData: { name: largo, role: "Pastora", groupId: "g1" } });
    expect(screen.getByText(largo).className).toContain("truncate");
    expect(screen.getByTitle(largo)).toBeTruthy();
    expect(screen.getByTitle(iglesia)).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(/, María$/);
  });

  it("en el celular usa la sigla de la iglesia si la hay", () => {
    entrar({ isDesktop: false, iglesia: { nombre: "Camino de Paz", sigla: "CDP" } });
    expect(screen.getByText("CDP")).toBeTruthy();
    expect(screen.getByTitle("Camino de Paz")).toBeTruthy();
  });

  it("cerrar sesión pide confirmación", async () => {
    const { auth, app } = entrar({ confirmAction: vi.fn().mockResolvedValue(true) });
    fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    await waitFor(() => expect(auth.logout).toHaveBeenCalled());
    expect(app.confirmAction).toHaveBeenCalledWith("¿Cerrar sesión?");
  });
});
