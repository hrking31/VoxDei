import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import ListaRecientes from "./ListaRecientes.jsx";

afterEach(cleanup);

const recientes = [
  { sigla: "JHN", capitulo: 3, versiculo: 16, cita: "Juan 3:16", texto: "Porque de tal manera amó Dios" },
  { sigla: "GEN", capitulo: 1, versiculo: 1, cita: "Génesis 1:1", texto: "En el principio" },
];

describe("ListaRecientes", () => {
  it("sin versículos proyectados lo dice y no ofrece limpiar", () => {
    render(<ListaRecientes />);
    expect(screen.getByText("Aún no has proyectado versículos.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Limpiar recientes" })).toBeNull();
  });

  it("lista la cita y el comienzo del texto, en el orden recibido", () => {
    render(<ListaRecientes recientes={recientes} />);
    const filas = screen.getAllByRole("button", { name: /^Ir a / });
    expect(filas.map((f) => f.getAttribute("aria-label"))).toEqual(["Ir a Juan 3:16", "Ir a Génesis 1:1"]);
    expect(filas[0].textContent).toContain("Porque de tal manera amó Dios");
  });

  it("tocar una fila avisa cuál, y «Limpiar recientes» lo avisa", () => {
    const alElegirReciente = vi.fn();
    const alLimpiarRecientes = vi.fn();
    render(<ListaRecientes recientes={recientes} alElegirReciente={alElegirReciente} alLimpiarRecientes={alLimpiarRecientes} />);
    fireEvent.click(screen.getByRole("button", { name: "Ir a Juan 3:16" }));
    expect(alElegirReciente).toHaveBeenCalledWith(recientes[0]);
    fireEvent.click(screen.getByRole("button", { name: "Limpiar recientes" }));
    expect(alLimpiarRecientes).toHaveBeenCalledTimes(1);
  });

  it("con `grande` las filas son más altas, para el dedo", () => {
    render(<ListaRecientes recientes={recientes} grande />);
    expect(screen.getByRole("button", { name: "Ir a Juan 3:16" }).className).toContain("py-2.5");
  });
});
