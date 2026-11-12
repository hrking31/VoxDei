import { describe, expect, it, vi } from "vitest";

const fb = vi.hoisted(() => ({ subidos: [], docs: [] }));

vi.mock("../Firebase/Firebase.js", () => ({ db: {}, storage: {} }));
vi.mock("firebase/storage", () => ({
  ref: (_s, ruta) => ruta,
  uploadBytes: vi.fn(async (ruta, archivo) => fb.subidos.push({ ruta, archivo })),
  getDownloadURL: vi.fn(async (ruta) => `https://storage/${ruta}`),
}));
vi.mock("firebase/firestore", () => ({
  collection: (_db, nombre) => nombre,
  addDoc: vi.fn(async (col, datos) => fb.docs.push({ col, datos })),
  serverTimestamp: () => "ahora",
  onSnapshot: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
}));
vi.mock("../ComprimirImagen/ComprimirImagen.js", () => ({
  LADO_PROYECCION: 1920,
  comprimirImagen: vi.fn(async (archivo) => new File(["comprimida"], archivo.name, { type: "image/jpeg" })),
}));

import { ordenarImagenes, subirImagen } from "./imagenesIglesia.js";
import { comprimirImagen } from "../ComprimirImagen/ComprimirImagen.js";

describe("imágenes de la iglesia (Imágenes y Prédica)", () => {
  it("comprime, sube a la carpeta de la iglesia y la registra", async () => {
    const original = new File(["x"], "culto.jpg", { type: "image/jpeg" });
    const resultado = await subirImagen("g1", original);
    expect(comprimirImagen).toHaveBeenCalledWith(original, 1920);
    expect(fb.subidos[0].ruta).toMatch(/^imagenes\/g1\/\d+-culto\.jpg$/);
    expect(fb.docs[0]).toMatchObject({ col: "imagenes", datos: { groupId: "g1", name: "culto.jpg", storagePath: fb.subidos[0].ruta } });
    expect(resultado).toEqual({ url: `https://storage/${fb.subidos[0].ruta}`, nombre: "culto.jpg", storagePath: fb.subidos[0].ruta });
  });

  it("sin iglesia no sube nada", async () => {
    await expect(subirImagen("", new File(["x"], "a.jpg"))).rejects.toThrow();
  });

  it("las más recientes primero; las recién subidas, arriba", () => {
    const lista = [{ id: "vieja", createdAt: { seconds: 1 } }, { id: "nueva" }, { id: "media", createdAt: { seconds: 5 } }];
    expect(ordenarImagenes(lista).map((i) => i.id)).toEqual(["nueva", "media", "vieja"]);
  });
});
