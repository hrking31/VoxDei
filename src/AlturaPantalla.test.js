import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Las pantallas de alto fijo (h-pantalla) no deben recortar en un celular acostado:
// la regla vive en index.css y jsdom no la evalúa, así que se comprueba el texto.
const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "index.css"), "utf8");
const bloque = css.slice(css.indexOf("@utility h-pantalla"), css.indexOf("@utility min-h-pantalla"));

describe("h-pantalla en un celular acostado", () => {
  it("normalmente mide la ventana menos la barra, la guirnalda y el espacio de la nieve", () => {
    expect(bloque).toMatch(/^@utility h-pantalla \{\s*height: calc\(100svh - var\(--alto-barra\) - var\(--alto-guirnalda\) - var\(--alto-nieve\)\);/);
  });

  it("en un táctil acostado y de menos de 500 px de alto pasa a alto automático con el mismo mínimo", () => {
    expect(bloque).toMatch(/@media \(pointer: coarse\) and \(orientation: landscape\) and \(max-height: 500px\) \{\s*height: auto;\s*min-height: calc\(100svh - var\(--alto-barra\) - var\(--alto-guirnalda\) - var\(--alto-nieve\)\);/);
  });

  it("la tableta acostada (600 px de alto o más) no entra en esa regla", () => {
    const tope = Number(bloque.match(/max-height: (\d+)px/)[1]);
    expect(tope).toBeLessThan(600);
    // Un celular acostado: 430 px de alto o menos (iPhone Pro Max)
    expect(tope).toBeGreaterThanOrEqual(430);
  });
});

describe("el espacio de la nieve de abajo", () => {
  it("mide 14 px y se activa cuando el bloque del espacio está en la página", () => {
    expect(css).toMatch(/--spacing-nieve: 0\.875rem;/);
    expect(css).toMatch(/:root:has\(\[data-espacio-nieve\]\)\s*\{\s*--alto-nieve: var\(--spacing-nieve\);/);
  });

  it("las pantallas marcadas con data-sin-espacio-nieve no lo reservan: lo ponen en cero y lo ocultan, y la regla va después", () => {
    expect(css).toMatch(/:root:has\(\[data-sin-espacio-nieve\]\)\s*\{\s*--alto-nieve: 0px;/);
    expect(css).toMatch(/:root:has\(\[data-sin-espacio-nieve\]\) \[data-espacio-nieve\]\s*\{\s*display: none;/);
    expect(css.indexOf(":root:has([data-sin-espacio-nieve]) {")).toBeGreaterThan(css.indexOf(":root:has([data-espacio-nieve]) {"));
  });

  it("todas las pantallas de alto fijo de Prédica (columnas de colores distintos abajo) llevan esa marca", () => {
    const fuente = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "Components/ControlPredica/ControlPredica.jsx"), "utf8");
    const raices = fuente.match(/<div className="h-pantalla flex flex-col[^"]*"[^>]*>/g);
    expect(raices.length).toBeGreaterThanOrEqual(4);
    for (const raiz of raices) expect(raiz).toContain("data-sin-espacio-nieve");
  });
});
