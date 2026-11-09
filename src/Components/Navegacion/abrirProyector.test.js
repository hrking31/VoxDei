import { afterEach, describe, expect, it, vi } from "vitest";
import { VENTANA_PROYECTOR, abrirProyector } from "./abrirProyector.js";

describe("abrirProyector", () => {
  afterEach(() => vi.restoreAllMocks());

  it("abre /VOXDEI en la ventana del proyector, sin barras del navegador", () => {
    const abrir = vi.spyOn(window, "open").mockReturnValue(null);
    abrirProyector();
    expect(abrir).toHaveBeenCalledTimes(1);
    const [url, nombre, opciones] = abrir.mock.calls[0];
    expect(url).toBe("/VOXDEI");
    expect(nombre).toBe(VENTANA_PROYECTOR);
    expect(opciones).toContain("toolbar=no");
    expect(opciones).toContain("location=no");
    expect(opciones).not.toMatch(/\s/);
  });
});
