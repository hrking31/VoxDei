import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";

// El texto de un versículo, de mentira: la lectura de la Biblia se prueba en obtenerVersiculo.test.js
vi.mock("../FuncionesControlPredica/FuncionesControlPredica", () => ({
  obtenerVersiculo: vi.fn(async (sigla, capitulo, numero) => ({ texto: `Texto de ${sigla} ${capitulo}:${numero}`, libro: "S. Juan", capitulo, numero })),
}));
vi.mock("../Biblia/elegirBiblia", () => ({ guardarVersionBiblia: vi.fn(async () => {}) }));

import BuscadorVersiculos from "./BuscadorVersiculos.jsx";
import { montar } from "../Navegacion/pruebas.utils.jsx";

afterEach(cleanup);

const abrir = (props = {}) => {
  const onAgregar = vi.fn(() => true);
  const resultado = montar(<BuscadorVersiculos onAgregar={onAgregar} showNotif={vi.fn()} {...props} />);
  return { ...resultado, onAgregar };
};

// Libros → S. Juan → capítulo 3 → versículo 16, y deja la tarjeta lista para enviar
const elegirJuan316 = async () => {
  fireEvent.click(screen.getByRole("button", { name: "Nuevo" }));
  fireEvent.click(screen.getByRole("button", { name: "S. Juan" }));
  fireEvent.click(screen.getByRole("button", { name: "Capítulo 3" }));
  fireEvent.click(screen.getByRole("button", { name: "Versículo 16" }));
  return waitFor(() => expect(document.querySelector("[data-versiculo-elegido]")).not.toBeNull());
};

describe("BuscadorVersiculos: después de enviar un versículo", () => {
  beforeEach(() => vi.clearAllMocks());

  it("Predicar (proyectar): al enviarlo a la pantalla, la cuadrícula vuelve a mostrar los libros", async () => {
    const { onAgregar } = abrir({ accion: "proyectar" });
    await elegirJuan316();
    // Antes de enviar, la cuadrícula está en los versículos de Juan 3
    expect(screen.getByLabelText("Versículos de S. Juan 3")).toBeTruthy();
    expect(screen.queryByLabelText("Libros")).toBeNull();

    fireEvent.click(document.querySelector("[data-versiculo-elegido]"));

    expect(onAgregar).toHaveBeenCalledTimes(1);
    // Vuelven los libros (del testamento que se estaba viendo), y ya no los capítulos ni los versículos
    expect(screen.getByLabelText("Libros")).toBeTruthy();
    expect(screen.queryByLabelText("Versículos de S. Juan 3")).toBeNull();
    expect(screen.queryByLabelText(/Capítulos de/)).toBeNull();
    expect(screen.getByRole("button", { name: "S. Mateo" })).toBeTruthy();
    // La tarjeta y el campo quedan limpios, listos para otro
    expect(document.querySelector("[data-versiculo-elegido]")).toBeNull();
    expect(screen.getByPlaceholderText("Escribe una cita: Juan 3 16").value).toBe("");
  });

  it("Predicar: también al enviarlo con Enter desde el campo", async () => {
    const { onAgregar } = abrir({ accion: "proyectar" });
    await elegirJuan316();
    expect(screen.getByLabelText("Versículos de S. Juan 3")).toBeTruthy();
    // La tarjeta ya está elegida; Enter con el campo vacío la envía
    fireEvent.submit(screen.getByRole("form", { name: "Proyectar versículo" }));
    await waitFor(() => expect(onAgregar).toHaveBeenCalledTimes(1));
    expect(screen.getByLabelText("Libros")).toBeTruthy();
    expect(screen.queryByLabelText("Versículos de S. Juan 3")).toBeNull();
  });

  it("Predicar: si no se pudo enviar (sin turno), la cuadrícula y la tarjeta se quedan como estaban", async () => {
    const onAgregar = vi.fn(() => false);
    abrir({ accion: "proyectar", onAgregar });
    await elegirJuan316();
    fireEvent.click(document.querySelector("[data-versiculo-elegido]"));
    expect(onAgregar).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Versículos de S. Juan 3")).toBeTruthy();
    expect(document.querySelector("[data-versiculo-elegido]")).not.toBeNull();
  });

  it("Preparar (agregar al bosquejo): también vuelve a mostrar los libros, y la tarjeta y el campo quedan limpios", async () => {
    const { onAgregar } = abrir({ accion: "agregar" });
    await elegirJuan316();
    expect(screen.getByLabelText("Versículos de S. Juan 3")).toBeTruthy();
    fireEvent.click(document.querySelector("[data-versiculo-elegido]"));
    expect(onAgregar).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Libros")).toBeTruthy();
    expect(screen.queryByLabelText("Versículos de S. Juan 3")).toBeNull();
    expect(screen.queryByLabelText(/Capítulos de/)).toBeNull();
    expect(screen.getByRole("button", { name: "S. Mateo" })).toBeTruthy();
    expect(document.querySelector("[data-versiculo-elegido]")).toBeNull();
    expect(screen.getByPlaceholderText("Escribe una cita: Juan 3 16").value).toBe("");
  });

  it("Preparar: también al agregar con Enter desde el campo, y si no se pudo agregar se queda como estaba", async () => {
    const { onAgregar } = abrir({ accion: "agregar" });
    await elegirJuan316();
    fireEvent.submit(screen.getByRole("form", { name: "Agregar versículo" }));
    await waitFor(() => expect(onAgregar).toHaveBeenCalledTimes(1));
    expect(screen.getByLabelText("Libros")).toBeTruthy();
    cleanup();
    // Si no se pudo (onAgregar devuelve false), nada se reinicia
    const fallido = vi.fn(() => false);
    abrir({ accion: "agregar", onAgregar: fallido });
    await elegirJuan316();
    fireEvent.click(document.querySelector("[data-versiculo-elegido]"));
    expect(fallido).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Versículos de S. Juan 3")).toBeTruthy();
  });

  it("Predicar: se puede buscar otro versículo desde los libros, y volverá a la lista al enviarlo", async () => {
    const { onAgregar } = abrir({ accion: "proyectar" });
    await elegirJuan316();
    fireEvent.click(document.querySelector("[data-versiculo-elegido]"));
    // Otro: Mateo 5:3
    fireEvent.click(screen.getByRole("button", { name: "S. Mateo" }));
    fireEvent.click(screen.getByRole("button", { name: "Capítulo 5" }));
    fireEvent.click(screen.getByRole("button", { name: "Versículo 3" }));
    await waitFor(() => expect(document.querySelector("[data-versiculo-elegido]")).not.toBeNull());
    fireEvent.click(document.querySelector("[data-versiculo-elegido]"));
    expect(onAgregar).toHaveBeenCalledTimes(2);
    expect(screen.getByLabelText("Libros")).toBeTruthy();
  });
});

describe("BuscadorVersiculos: el recuadro del versículo elegido en tableta", () => {
  beforeEach(() => vi.clearAllMocks());

  it("con `cajaFija` queda abajo y con un alto máximo (no se estira por el espacio que sobra), igual el aviso vacío", async () => {
    abrir({ cajaFija: true });
    const vacio = document.querySelector("p.border-dashed");
    expect(vacio.className).toContain("mt-auto");
    expect(vacio.className).toContain("max-h-1/3");
    // Lo que sobra es de la cuadrícula, que crece (antes tenía un alto fijo)
    const cuadricula = document.querySelector("[data-cuadricula-biblia]");
    expect(cuadricula.className).toContain("flex-1");
    expect(cuadricula.className.split(" ")).not.toContain("h-94");
    await elegirJuan316();
    const caja = document.querySelector("[data-versiculo-elegido]");
    expect(caja.className).toContain("mt-auto");
    expect(caja.className).toContain("max-h-1/3");
    expect(caja.className).not.toContain("flex-1"); // no se estira
  });

  it("sin `cajaFija` (celular, computador) llena el espacio libre, como siempre", async () => {
    abrir();
    await elegirJuan316();
    const caja = document.querySelector("[data-versiculo-elegido]");
    expect(caja.className).toContain("flex-1");
    expect(caja.className).not.toContain("max-h-1/3");
    expect(caja.className).not.toContain("mt-auto");
    expect(document.querySelector("[data-cuadricula-biblia]").className).toContain("h-94"); // la cuadrícula conserva su alto fijo
  });
});
