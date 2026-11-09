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

// Ancho y alto de un PNG: bytes 16 a 24, en el bloque IHDR.
function medidasPng(ruta) {
  const b = readFileSync(ruta);
  return { ancho: b.readUInt32BE(16), alto: b.readUInt32BE(20) };
}

describe("app instalable: manifiesto e íconos (ideas 9 y 10)", () => {
  const manifiesto = JSON.parse(readFileSync(resolve(raiz, "public", "manifest.webmanifest"), "utf8"));

  it("index.html enlaza el manifiesto y el ícono de Apple", () => {
    expect(html).toContain('<link rel="manifest" href="/manifest.webmanifest" />');
    expect(html).toContain('<link rel="apple-touch-icon" href="/apple-touch-icon.png" />');
  });

  it("tiene nombre, arranque en una ruta que existe y colores de la pantalla de arranque", () => {
    expect(manifiesto.name).toBe("VOXDEI");
    expect(manifiesto.display).toBe("standalone");
    const app = readFileSync(resolve(raiz, "src", "App.jsx"), "utf8");
    expect(app).toContain(`path="${manifiesto.start_url}"`);
    expect(manifiesto.background_color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(manifiesto.theme_color).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it("cada ícono existe en public/ y mide lo que dice", () => {
    for (const icono of manifiesto.icons) {
      const ruta = resolve(raiz, "public", icono.src.replace(/^\//, ""));
      expect(existsSync(ruta), icono.src).toBe(true);
      const [ancho, alto] = icono.sizes.split("x").map(Number);
      expect(medidasPng(ruta), icono.src).toEqual({ ancho, alto });
    }
  });

  it("trae íconos maskable de 192 y 512 para que Android no los recorte mal", () => {
    const maskable = manifiesto.icons.filter((i) => i.purpose === "maskable").map((i) => i.sizes);
    expect(maskable).toEqual(expect.arrayContaining(["192x192", "512x512"]));
  });

  it("el ícono de Apple mide 180 × 180", () => {
    expect(medidasPng(resolve(raiz, "public", "apple-touch-icon.png"))).toEqual({ ancho: 180, alto: 180 });
  });
});

describe("archivos para la ficha de Google Play (idea 11)", () => {
  it("gráfico destacado de 1024 × 500 en JPEG", () => {
    expect(medidasJpeg(resolve(raiz, "docs", "grafico-destacado-play-store.jpg"))).toEqual({ ancho: 1024, alto: 500 });
  });

  it("ícono de la tienda de 512 × 512", () => {
    expect(medidasPng(resolve(raiz, "docs", "icono-play-store-512.png"))).toEqual({ ancho: 512, alto: 512 });
  });
});

describe("kit de bienvenida para imprimir (idea 14)", () => {
  it("el PDF existe y cabe en una sola hoja", () => {
    const pdf = readFileSync(resolve(raiz, "docs", "kit-bienvenida.pdf"), "latin1");
    expect(pdf.match(/\/Count (\d+)/)?.[1]).toBe("1");
  });

  it("su fuente usa el logo claro, que existe", () => {
    const fuente = readFileSync(resolve(raiz, "docs", "kit-bienvenida.html"), "utf8");
    const logo = fuente.match(/<img src="([^"]+)"/)[1];
    expect(logo).toContain("fondo-claro");
    expect(existsSync(resolve(raiz, "docs", logo))).toBe(true);
  });
});

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
