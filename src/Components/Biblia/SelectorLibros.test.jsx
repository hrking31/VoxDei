import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import SelectorLibros from "./SelectorLibros.jsx";
import * as libros from "../LibrosBiblia/LibrosBiblia";

afterEach(cleanup);

const genesis = libros.librosAntiguo.find((l) => l.nombre === "Génesis");

function abrir(props = {}) {
  const alElegirCapitulo = vi.fn();
  const alElegirVersiculo = vi.fn();
  const resultado = render(<SelectorLibros libros={libros} version="RVR1960" alElegirCapitulo={alElegirCapitulo} alElegirVersiculo={alElegirVersiculo} {...props} />);
  return { ...resultado, alElegirCapitulo, alElegirVersiculo };
}

describe("SelectorLibros", () => {
  it("muestra los libros del Antiguo Testamento listos para escoger", () => {
    abrir();
    expect(screen.getByRole("button", { name: "Génesis" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "S. Mateo" })).toBeNull();
    expect(screen.getByRole("button", { name: "Antiguo" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("Nuevo cambia a los libros del Nuevo Testamento", () => {
    abrir();
    fireEvent.click(screen.getByRole("button", { name: "Nuevo" }));
    expect(screen.getByRole("button", { name: "S. Mateo" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Génesis" })).toBeNull();
  });

  it("libro → capítulo: avisa qué capítulo se eligió", () => {
    const { alElegirCapitulo } = abrir();
    fireEvent.click(screen.getByRole("button", { name: "Génesis" }));
    expect(screen.getAllByRole("button", { name: /^Capítulo \d+$/ })).toHaveLength(genesis.capitulos);
    fireEvent.click(screen.getByRole("button", { name: "Capítulo 3" }));
    expect(alElegirCapitulo).toHaveBeenCalledWith(genesis, 3);
  });

  it("después del capítulo salen sus versículos y elegir uno lo avisa", () => {
    const { alElegirVersiculo } = abrir();
    fireEvent.click(screen.getByRole("button", { name: "Génesis" }));
    fireEvent.click(screen.getByRole("button", { name: "Capítulo 3" }));
    expect(screen.getAllByRole("button", { name: /^Versículo \d+$/ })).toHaveLength(genesis.capitulo3);
    fireEvent.click(screen.getByRole("button", { name: "Versículo 7" }));
    expect(alElegirVersiculo).toHaveBeenCalledWith(genesis, 3, 7);
  });

  it("la flecha de arriba vuelve de los versículos a los capítulos y a los libros", () => {
    abrir();
    fireEvent.click(screen.getByRole("button", { name: "Génesis" }));
    fireEvent.click(screen.getByRole("button", { name: "Capítulo 3" }));
    fireEvent.click(screen.getByRole("button", { name: /Génesis 3/ }));
    expect(screen.getByRole("button", { name: "Capítulo 3" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Génesis/ }));
    expect(screen.getByRole("button", { name: "Éxodo" })).toBeTruthy();
  });

  it("el campo busca en los dos testamentos, sin acentos", () => {
    abrir();
    fireEvent.change(screen.getByPlaceholderText("Escribe un libro: Juan"), { target: { value: "mateo" } });
    expect(screen.getByRole("button", { name: "S. Mateo" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Génesis" })).toBeNull();
  });

  it("Enter con un solo libro posible lo elige", () => {
    abrir();
    const campo = screen.getByPlaceholderText("Escribe un libro: Juan");
    fireEvent.change(campo, { target: { value: "genesis" } });
    fireEvent.submit(campo.closest("form"));
    expect(screen.getAllByRole("button", { name: /^Capítulo \d+$/ })).toHaveLength(genesis.capitulos);
  });

  it("si ningún libro empieza así, lo dice", () => {
    abrir();
    fireEvent.change(screen.getByPlaceholderText("Escribe un libro: Juan"), { target: { value: "zzz" } });
    expect(screen.getByText("No hay un libro que empiece así.")).toBeTruthy();
  });

  it("al cambiar de Biblia vuelve a los libros", () => {
    const { rerender } = abrir();
    fireEvent.click(screen.getByRole("button", { name: "Génesis" }));
    expect(screen.queryByRole("button", { name: "Éxodo" })).toBeNull();
    rerender(<SelectorLibros libros={libros} version="DHHS94" alElegirCapitulo={vi.fn()} alElegirVersiculo={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Éxodo" })).toBeTruthy();
  });

  it("la cuadrícula llena el alto libre de la columna y se encoge para que todo quepa", () => {
    abrir();
    const cuadricula = document.querySelector("[data-cuadricula-biblia]");
    expect(cuadricula.className).toContain("flex-1");
    expect(cuadricula.className).toContain("min-h-40");
    expect(cuadricula.className).toContain("overflow-y-auto");
    expect(cuadricula.className).not.toContain("shrink-0");
    expect(document.querySelector("[data-selector-libros]").className).toContain("flex-1");
  });

  it("de fábrica los botones son pequeños (h-8); con «grande», más altos y con letra más grande (para el dedo)", () => {
    abrir();
    expect(screen.getByRole("button", { name: "Génesis" }).className).toContain("h-8");
    expect(screen.getByRole("button", { name: "Génesis" }).className).toContain("text-xs");
    cleanup();
    abrir({ grande: true });
    const libro = screen.getByRole("button", { name: "Génesis" });
    expect(libro.className).toContain("h-11");
    expect(libro.className).toContain("text-sm");
    expect(libro.className).not.toContain("h-8");
  });

  it("con «grande», también los capítulos y los versículos, y Antiguo | Nuevo", () => {
    abrir({ grande: true });
    expect(screen.getByRole("button", { name: "Nuevo" }).className).toContain("py-2");
    fireEvent.click(screen.getByRole("button", { name: "Génesis" }));
    expect(screen.getByRole("button", { name: "Capítulo 3" }).className).toContain("h-11");
    fireEvent.click(screen.getByRole("button", { name: "Capítulo 3" }));
    expect(screen.getByRole("button", { name: "Versículo 5" }).className).toContain("h-11");
  });

  it("en la ventana del celular («grande») la cuadrícula se desplaza sin barra visible; en la columna, con su barra fina", () => {
    abrir({ grande: true });
    expect(document.querySelector("[data-cuadricula-biblia]").className).toContain("scrollbar-oculta");
    expect(document.querySelector("[data-cuadricula-biblia]").className).not.toContain("scrollbar-custom");
    cleanup();
    abrir();
    expect(document.querySelector("[data-cuadricula-biblia]").className).toContain("scrollbar-custom");
    expect(document.querySelector("[data-cuadricula-biblia]").className).not.toContain("scrollbar-oculta");
  });
});
