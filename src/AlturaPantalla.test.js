import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Las pantallas de alto fijo (h-pantalla) no deben recortar en un celular acostado:
// la regla vive en index.css y jsdom no la evalúa, así que se comprueba el texto.
const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "index.css"), "utf8");
const bloque = css.slice(css.indexOf("@utility h-pantalla"), css.indexOf("@utility min-h-pantalla"));

describe("h-pantalla en un celular acostado", () => {
  it("normalmente mide la ventana menos la barra y la guirnalda", () => {
    expect(bloque).toMatch(/^@utility h-pantalla \{\s*height: calc\(100svh - var\(--alto-barra\) - var\(--alto-guirnalda\)\);/);
  });

  it("en un táctil acostado y de menos de 500 px de alto pasa a alto automático con el mismo mínimo", () => {
    expect(bloque).toMatch(/@media \(pointer: coarse\) and \(orientation: landscape\) and \(max-height: 500px\) \{\s*height: auto;\s*min-height: calc\(100svh - var\(--alto-barra\) - var\(--alto-guirnalda\)\);/);
  });

  it("la tableta acostada (600 px de alto o más) no entra en esa regla", () => {
    const tope = Number(bloque.match(/max-height: (\d+)px/)[1]);
    expect(tope).toBeLessThan(600);
    // Un celular acostado: 430 px de alto o menos (iPhone Pro Max)
    expect(tope).toBeGreaterThanOrEqual(430);
  });
});
