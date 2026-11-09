// @vitest-environment node
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

// Lo que ven WhatsApp, Facebook y Google al compartir el enlace (idea 12):
// index.html y la imagen de public/. Se prueba aquí porque un error no se ve
// en la app; solo aparece como un enlace pelado al compartirlo.

const raiz = resolve(import.meta.dirname, "..");
const html = readFileSync(resolve(raiz, "index.html"), "utf8");
const meta = (propiedad) =>
  html.match(new RegExp(`<meta (?:property|name)="${propiedad}" content="([^"]*)"`))?.[1];

// Ancho y alto de un JPEG: están en el primer bloque SOF0/SOF2.
function medidasJpeg(ruta) {
  const b = readFileSync(ruta);
  let i = 2;
  while (i < b.length) {
    const marca = b[i + 1];
    const largo = b.readUInt16BE(i + 2);
    if (marca === 0xc0 || marca === 0xc2) {
      return { alto: b.readUInt16BE(i + 5), ancho: b.readUInt16BE(i + 7) };
    }
    i += 2 + largo;
  }
  return null;
}

describe("tarjeta al compartir el enlace", () => {
  it("tiene título, descripción e imagen absoluta del hosting", () => {
    expect(meta("og:title")).toBe("VOXDEI");
    expect(meta("og:description")).toBe(meta("description"));
    expect(meta("og:image")).toBe("https://voxdei-ec499.web.app/og-voxdei.jpg");
    expect(meta("twitter:card")).toBe("summary_large_image");
  });

  it("la imagen existe en public/, mide 1200 × 630 y pesa menos de 300 KB", () => {
    const ruta = resolve(raiz, "public", "og-voxdei.jpg");
    expect(existsSync(ruta)).toBe(true);
    expect(medidasJpeg(ruta)).toEqual({ ancho: 1200, alto: 630 });
    expect(readFileSync(ruta).length).toBeLessThan(300 * 1024);
    expect(meta("og:image:width")).toBe("1200");
    expect(meta("og:image:height")).toBe("630");
  });
});
