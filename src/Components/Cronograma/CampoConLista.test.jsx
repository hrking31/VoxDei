import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { useState } from "react";
import CampoConLista from "./CampoConLista.jsx";

// Sin `globals`, Testing Library no limpia sola entre pruebas
afterEach(cleanup);

const OPCIONES = [
  "Servicio dominical",
  "Escuela dominical",
  "Oración",
  "Ensayo de alabanza",
];

// Un envoltorio con estado, como lo usa el formulario
function Campo({ inicial = "", alCambiarFuera = () => {} }) {
  const [valor, setValor] = useState(inicial);
  return (
    <CampoConLista
      etiqueta="Nombre"
      valor={valor}
      alCambiar={(v) => {
        setValor(v);
        alCambiarFuera(v);
      }}
      opciones={OPCIONES}
      placeholder="Escoge o escribe"
      claseEtiqueta="etiqueta"
      claseCampo="campo"
    />
  );
}

const campo = () => screen.getByLabelText("Nombre");
const opciones = () =>
  within(screen.getByRole("listbox"))
    .getAllByRole("option")
    .map((o) => o.textContent);

describe("CampoConLista", () => {
  it("cerrado al principio; al enfocarlo abre la lista con todas las sugerencias", () => {
    render(<Campo />);
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(campo().getAttribute("aria-expanded")).toBe("false");
    fireEvent.focus(campo());
    expect(opciones()).toEqual(OPCIONES);
    expect(campo().getAttribute("aria-expanded")).toBe("true");
  });

  it("la lista lleva el estilo de la app, no la nativa del navegador", () => {
    render(<Campo />);
    fireEvent.focus(campo());
    const lista = screen.getByRole("listbox");
    expect(lista.className).toContain("bg-app-light");
    expect(lista.className).toContain("border-app-border");
    expect(lista.className).toContain("scrollbar-custom");
    expect(document.querySelector("datalist")).toBeNull();
  });

  it("al escribir se filtra, sin distinguir mayúsculas; sin coincidencias no se muestra", () => {
    render(<Campo />);
    fireEvent.focus(campo());
    fireEvent.change(campo(), { target: { value: "DOMINICAL" } });
    expect(opciones()).toEqual(["Servicio dominical", "Escuela dominical"]);
    fireEvent.change(campo(), { target: { value: "zzz" } });
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("con una sugerencia ya escrita entera, salen todas otra vez", () => {
    render(<Campo inicial="Oración" />);
    fireEvent.focus(campo());
    expect(opciones()).toEqual(OPCIONES);
  });

  it("escoger una sugerencia la pone en el campo y cierra la lista", () => {
    const alCambiarFuera = vi.fn();
    render(<Campo alCambiarFuera={alCambiarFuera} />);
    fireEvent.focus(campo());
    fireEvent.mouseDown(screen.getByRole("option", { name: "Oración" }));
    expect(campo().value).toBe("Oración");
    expect(alCambiarFuera).toHaveBeenLastCalledWith("Oración");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("también se puede escribir un nombre propio que no está en la lista", () => {
    const alCambiarFuera = vi.fn();
    render(<Campo alCambiarFuera={alCambiarFuera} />);
    fireEvent.change(campo(), { target: { value: "Noche de adoración" } });
    expect(campo().value).toBe("Noche de adoración");
    expect(alCambiarFuera).toHaveBeenLastCalledWith("Noche de adoración");
  });

  it("con el teclado: flechas para moverse, Enter para escoger y Escape para cerrar", () => {
    render(<Campo />);
    fireEvent.focus(campo());
    fireEvent.keyDown(campo(), { key: "ArrowDown" });
    fireEvent.keyDown(campo(), { key: "ArrowDown" });
    const activa = screen.getByRole("option", {
      selected: false,
      name: "Escuela dominical",
    });
    expect(campo().getAttribute("aria-activedescendant")).toBe(activa.id);
    expect(activa.className).toContain("bg-app-main/15");
    fireEvent.keyDown(campo(), { key: "ArrowUp" });
    fireEvent.keyDown(campo(), { key: "Enter" });
    expect(campo().value).toBe("Servicio dominical");
    expect(screen.queryByRole("listbox")).toBeNull();
    fireEvent.keyDown(campo(), { key: "ArrowDown" });
    expect(screen.getByRole("listbox")).toBeTruthy();
    fireEvent.keyDown(campo(), { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("al salir del campo se cierra", () => {
    render(<Campo />);
    fireEvent.focus(campo());
    fireEvent.blur(campo());
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("marca en dorado la sugerencia que ya está escrita", () => {
    render(<Campo inicial="Oración" />);
    fireEvent.focus(campo());
    const elegida = screen.getByRole("option", { name: "Oración" });
    expect(elegida.getAttribute("aria-selected")).toBe("true");
    expect(elegida.className).toContain("text-app-main");
  });
});
