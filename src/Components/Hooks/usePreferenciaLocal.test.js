import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { usePreferenciaLocal } from "./usePreferenciaLocal.js";

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("usePreferenciaLocal", () => {
  it("arranca en no, o en lo que se pida", () => {
    expect(renderHook(() => usePreferenciaLocal("a")).result.current[0]).toBe(false);
    expect(renderHook(() => usePreferenciaLocal("b", true)).result.current[0]).toBe(true);
  });

  it("al cambiar, se acuerda: otra vez que se monte, sigue igual", () => {
    const primera = renderHook(() => usePreferenciaLocal("c"));
    act(() => primera.result.current[1](true));
    expect(primera.result.current[0]).toBe(true);
    expect(localStorage.getItem("c")).toBe("1");
    primera.unmount();
    expect(renderHook(() => usePreferenciaLocal("c")).result.current[0]).toBe(true);
  });

  it("acepta una función, como useState", () => {
    const { result } = renderHook(() => usePreferenciaLocal("d"));
    act(() => result.current[1]((previo) => !previo));
    expect(result.current[0]).toBe(true);
    act(() => result.current[1]((previo) => !previo));
    expect(result.current[0]).toBe(false);
    expect(localStorage.getItem("d")).toBe("0");
  });

  it("cada clave es independiente", () => {
    const a = renderHook(() => usePreferenciaLocal("e1"));
    const b = renderHook(() => usePreferenciaLocal("e2"));
    act(() => a.result.current[1](true));
    expect(b.result.current[0]).toBe(false);
  });

  it("sin almacenamiento funciona igual, solo que no se recuerda", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });
    const { result } = renderHook(() => usePreferenciaLocal("f"));
    expect(result.current[0]).toBe(false);
    act(() => result.current[1](true));
    expect(result.current[0]).toBe(true);
  });
});
