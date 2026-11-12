import { beforeEach, describe, expect, it, vi } from "vitest";

const fb = vi.hoisted(() => ({
  getDoc: vi.fn(),
  leerCapituloDHH: vi.fn(),
}));

vi.mock("../Firebase/Firebase", () => ({ db: {} }));
vi.mock("firebase/firestore", () => ({
  doc: (_db, ...partes) => partes.join("/"),
  getDoc: fb.getDoc,
  setDoc: vi.fn(),
  deleteDoc: vi.fn(),
}));
vi.mock("../Biblia/bibliaDHH", () => ({ leerCapituloDHH: fb.leerCapituloDHH }));

import { obtenerVersiculo } from "./FuncionesControlPredica.jsx";

const CAPITULO = { libro: "S. Juan", capitulo: 3, versiculos: { 16: "Pues Dios amó tanto al mundo…" }, chapter_html: "<p><b>16</b> …</p>" };

describe("obtenerVersiculo según la Biblia elegida", () => {
  beforeEach(() => {
    fb.getDoc.mockReset();
    fb.leerCapituloDHH.mockReset();
  });

  it("sin versión (Prédica, Orden del culto) lee la RVR1960 de Firestore", async () => {
    fb.getDoc.mockResolvedValue({ exists: () => true, data: () => ({ ...CAPITULO, libro: "S. Juan" }) });
    const resultado = await obtenerVersiculo("JHN", 3, 16, "versiculo", vi.fn());
    expect(fb.getDoc).toHaveBeenCalledWith("biblia/JHN_3");
    expect(fb.leerCapituloDHH).not.toHaveBeenCalled();
    expect(resultado.texto).toBe("Pues Dios amó tanto al mundo…");
  });

  it("con la DHH lee del repositorio, con el nombre del libro de su catálogo", async () => {
    fb.leerCapituloDHH.mockResolvedValue(CAPITULO);
    const resultado = await obtenerVersiculo("JHN", 3, 16, "capitulo", vi.fn(), "DHHS94");
    expect(fb.leerCapituloDHH).toHaveBeenCalledWith("JHN", 3, "S. Juan");
    expect(fb.getDoc).not.toHaveBeenCalled();
    expect(resultado).toMatchObject({ texto: CAPITULO.chapter_html, libro: "S. Juan", capitulo: 3 });
  });

  it("si no se puede bajar la DHH, avisa con qué hacer", async () => {
    fb.leerCapituloDHH.mockRejectedValue(new Error("Failed to fetch"));
    const showNotif = vi.fn();
    const resultado = await obtenerVersiculo("JHN", 3, 16, "capitulo", showNotif, "DHHS94");
    expect(resultado).toBeUndefined();
    expect(showNotif).toHaveBeenCalledTimes(1);
    expect(showNotif).toHaveBeenCalledWith("error", "No se pudo cargar la Dios Habla Hoy. Revisa el internet o cambia a RVR1960.");
  });
});
