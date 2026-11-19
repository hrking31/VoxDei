import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { TOPE_RECIENTES, useVersiculosRecientes } from "./useVersiculosRecientes.js";

const clave = "voxdei.biblia.recientes.g1";
const verso = (versiculo, extra = {}) => ({
  sigla: "JHN",
  nombre: "Juan",
  capitulo: 3,
  versiculo,
  numero: String(versiculo),
  cita: `Juan 3:${versiculo}`,
  texto: `Texto ${versiculo}`,
  ...extra,
});

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("useVersiculosRecientes", () => {
  it("empieza vacío", () => {
    const { result } = renderHook(() => useVersiculosRecientes("g1"));
    expect(result.current.recientes).toEqual([]);
  });

  it("el más reciente va primero", () => {
    const { result } = renderHook(() => useVersiculosRecientes("g1"));
    act(() => result.current.agregar(verso(16)));
    act(() => result.current.agregar(verso(17)));
    expect(result.current.recientes.map((r) => r.cita)).toEqual(["Juan 3:17", "Juan 3:16"]);
  });

  it("uno repetido sube al primer lugar en vez de duplicarse", () => {
    const { result } = renderHook(() => useVersiculosRecientes("g1"));
    act(() => result.current.agregar(verso(16)));
    act(() => result.current.agregar(verso(17)));
    act(() => result.current.agregar(verso(16)));
    expect(result.current.recientes.map((r) => r.cita)).toEqual(["Juan 3:16", "Juan 3:17"]);
  });

  it("el mismo número en otro capítulo u otro libro es otro versículo", () => {
    const { result } = renderHook(() => useVersiculosRecientes("g1"));
    act(() => result.current.agregar(verso(1)));
    act(() => result.current.agregar(verso(1, { capitulo: 4, cita: "Juan 4:1" })));
    act(() => result.current.agregar(verso(1, { sigla: "MAT", cita: "S. Mateo 3:1" })));
    expect(result.current.recientes).toHaveLength(3);
  });

  it("guarda como máximo " + TOPE_RECIENTES + ": se van los más viejos", () => {
    const { result } = renderHook(() => useVersiculosRecientes("g1"));
    for (let n = 1; n <= TOPE_RECIENTES + 5; n++) act(() => result.current.agregar(verso(n)));
    expect(result.current.recientes).toHaveLength(TOPE_RECIENTES);
    expect(result.current.recientes[0].versiculo).toBe(TOPE_RECIENTES + 5);
    expect(result.current.recientes.at(-1).versiculo).toBe(6);
  });

  it("recorta el texto largo, para no llenar el almacenamiento", () => {
    const { result } = renderHook(() => useVersiculosRecientes("g1"));
    act(() => result.current.agregar(verso(16, { texto: "x".repeat(500) })));
    expect(result.current.recientes[0].texto).toHaveLength(90);
  });

  it("se recuerda en este dispositivo, por iglesia", () => {
    const primero = renderHook(() => useVersiculosRecientes("g1"));
    act(() => primero.result.current.agregar(verso(16)));
    primero.unmount();
    expect(JSON.parse(localStorage.getItem(clave))).toHaveLength(1);
    expect(renderHook(() => useVersiculosRecientes("g1")).result.current.recientes[0].cita).toBe("Juan 3:16");
    // Otra iglesia en el mismo equipo no ve la lista
    expect(renderHook(() => useVersiculosRecientes("g2")).result.current.recientes).toEqual([]);
  });

  it("limpiar vacía la lista y lo guardado", () => {
    const { result } = renderHook(() => useVersiculosRecientes("g1"));
    act(() => result.current.agregar(verso(16)));
    act(() => result.current.limpiar());
    expect(result.current.recientes).toEqual([]);
    expect(JSON.parse(localStorage.getItem(clave))).toEqual([]);
  });

  it("ignora lo guardado que está dañado o no tiene la forma esperada", () => {
    localStorage.setItem(clave, "{esto no es json");
    expect(renderHook(() => useVersiculosRecientes("g1")).result.current.recientes).toEqual([]);
    localStorage.setItem(clave, JSON.stringify([verso(16), { sigla: 5 }, null, "x"]));
    expect(renderHook(() => useVersiculosRecientes("g1")).result.current.recientes.map((r) => r.cita)).toEqual(["Juan 3:16"]);
    localStorage.setItem(clave, JSON.stringify({ no: "lista" }));
    expect(renderHook(() => useVersiculosRecientes("g1")).result.current.recientes).toEqual([]);
  });

  it("sin almacenamiento sigue funcionando, solo que no se recuerda", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });
    const { result } = renderHook(() => useVersiculosRecientes("g1"));
    act(() => result.current.agregar(verso(16)));
    expect(result.current.recientes).toHaveLength(1);
  });

  it("rechaza lo que no es un versículo", () => {
    const { result } = renderHook(() => useVersiculosRecientes("g1"));
    act(() => result.current.agregar({ cita: "Juan 3:16" }));
    act(() => result.current.agregar(null));
    expect(result.current.recientes).toEqual([]);
  });
});
