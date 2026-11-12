import { afterEach, describe, expect, it, vi } from "vitest";
import { URL_DHH, capituloDeArchivo, cargarDHH, leerCapituloDHH, olvidarDHH } from "./bibliaDHH.js";

// Un pedazo con la misma forma que el archivo del repositorio.
const ARCHIVO = {
  books: [
    {
      usfm: "GEN",
      human: "Génesis",
      chapters: [
        {
          usfm: "GEN.1",
          items: [
            { type: "heading1", verse_numbers: [], lines: ["La Creación"] },
            { type: "verse", verse_numbers: [1], lines: ["En el comienzo de todo, Dios creó el cielo y la tierra."] },
            { type: "verse", verse_numbers: [14, 15], lines: ["Entonces Dios dijo:", "«Que haya luces»"] },
            { type: "heading2", verse_numbers: [], lines: ["Los astros"] },
            { type: "verse", verse_numbers: [16], lines: ["Dios hizo las dos grandes luces <y> las estrellas & más."] },
          ],
        },
      ],
    },
    {
      usfm: "PSA",
      human: "Salmos",
      chapters: [
        {
          usfm: "PSA.4",
          items: [
            { type: "label", verse_numbers: [], lines: ["(1) Del maestro de coro."] },
            { type: "verse", verse_numbers: [1], lines: ["Dios y defensor mío,"] },
          ],
        },
      ],
    },
  ],
};

describe("capituloDeArchivo", () => {
  it("devuelve lo mismo que un documento de `biblia`: libro, capítulo, versículos y el HTML", () => {
    const capitulo = capituloDeArchivo(ARCHIVO, "GEN", 1, "Génesis");
    expect(capitulo.libro).toBe("Génesis");
    expect(capitulo.capitulo).toBe(1);
    expect(capitulo.versiculos["1"]).toBe("En el comienzo de todo, Dios creó el cielo y la tierra.");
    expect(capitulo.chapter_html).toContain("<h2>La Creación</h2><p><b>1</b> En el comienzo");
  });

  it("dos versículos juntos («14-15»): el texto queda en los dos números", () => {
    const { versiculos, chapter_html } = capituloDeArchivo(ARCHIVO, "GEN", 1);
    expect(versiculos["14"]).toBe("Entonces Dios dijo: «Que haya luces»");
    expect(versiculos["15"]).toBe(versiculos["14"]);
    expect(chapter_html).toContain("<p><b>14-15</b> Entonces Dios dijo:");
  });

  it("los subtítulos van como encabezado y el texto se escapa", () => {
    const { chapter_html } = capituloDeArchivo(ARCHIVO, "GEN", 1);
    expect(chapter_html).toContain("<h2>Los astros</h2>");
    expect(chapter_html).toContain("&lt;y&gt; las estrellas &amp; más.");
  });

  it("omite las etiquetas de los salmos, como la RVR1960 cargada", () => {
    const { chapter_html } = capituloDeArchivo(ARCHIVO, "PSA", 4);
    expect(chapter_html).toBe("<p><b>1</b> Dios y defensor mío,</p>");
  });

  it("libro o capítulo que no existen → null", () => {
    expect(capituloDeArchivo(ARCHIVO, "EXO", 1)).toBeNull();
    expect(capituloDeArchivo(ARCHIVO, "GEN", 2)).toBeNull();
    expect(capituloDeArchivo(null, "GEN", 1)).toBeNull();
  });
});

describe("cargarDHH", () => {
  afterEach(() => olvidarDHH());

  const respuesta = (cuerpo, ok = true) => ({ ok, status: ok ? 200 : 404, json: async () => cuerpo });

  it("baja el archivo una sola vez aunque se pidan varios capítulos", async () => {
    const pedir = vi.fn(async () => respuesta(ARCHIVO));
    const [a, b] = await Promise.all([
      leerCapituloDHH("GEN", 1, "Génesis", pedir),
      leerCapituloDHH("PSA", 4, "Salmos", pedir),
    ]);
    expect(pedir).toHaveBeenCalledTimes(1);
    expect(pedir).toHaveBeenCalledWith(URL_DHH);
    expect(a.libro).toBe("Génesis");
    expect(b.libro).toBe("Salmos");
  });

  it("si falla, la próxima consulta lo vuelve a intentar", async () => {
    const pedir = vi.fn().mockResolvedValueOnce(respuesta(null, false)).mockResolvedValueOnce(respuesta(ARCHIVO));
    await expect(cargarDHH(pedir)).rejects.toThrow("HTTP 404");
    await expect(cargarDHH(pedir)).resolves.toBe(ARCHIVO);
    expect(pedir).toHaveBeenCalledTimes(2);
  });
});
