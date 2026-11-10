// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

// Sin red: collection y doc devuelven la ruta armada, para ver dónde escribe.
vi.mock("./Firebase", () => ({ db: "db" }));
vi.mock("firebase/firestore", () => ({
  collection: (_db, ...partes) => partes.join("/"),
  doc: (_db, ...partes) => partes.join("/"),
}));

const { colIglesia, docIglesia, TICKERS, ORDEN_CULTO, ORDEN_ACTUAL } = await import("./RutasIglesia.js");

describe("RutasIglesia", () => {
  it("todo lo de una iglesia cuelga de iglesias/{groupId}", () => {
    expect(colIglesia("igl1", TICKERS)).toBe("iglesias/igl1/tickers");
    expect(docIglesia("igl1", TICKERS, "ticker1")).toBe("iglesias/igl1/tickers/ticker1");
    expect(docIglesia("igl1", ORDEN_CULTO, ORDEN_ACTUAL)).toBe("iglesias/igl1/ordenCulto/actual");
  });

  it("dos iglesias nunca escriben en el mismo documento", () => {
    expect(docIglesia("a", TICKERS, "ticker1")).not.toBe(docIglesia("b", TICKERS, "ticker1"));
  });

  it("sin groupId falla con un mensaje claro en vez de escribir en otra parte", () => {
    for (const vacio of [undefined, null, ""]) {
      expect(() => colIglesia(vacio, TICKERS)).toThrow(/Falta el groupId/);
      expect(() => docIglesia(vacio, TICKERS, "ticker1")).toThrow(/Falta el groupId/);
    }
  });
});
