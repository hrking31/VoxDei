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
  it("mide lo que la pila de nieve (--alto-pila-actual, 0 sin pila) y se activa cuando el bloque está en la página", () => {
    expect(css).not.toMatch(/--spacing-nieve/);
    expect(css).toMatch(/@utility h-nieve \{\s*height: var\(--alto-pila-actual, 0px\);/);
    expect(css).toMatch(/:root:has\(\[data-espacio-nieve\]\)\s*\{\s*--alto-nieve: var\(--alto-pila-actual, 0px\);/);
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

describe("la entrada en celulares de poco alto", () => {
  it("define las variantes de alto, y la «muy baja» va después para ganarle a la «baja»", () => {
    expect(css).toMatch(/@custom-variant pantalla-baja \(@media \(max-height: 780px\)\);/);
    expect(css).toMatch(/@custom-variant pantalla-muy-baja \(@media \(max-height: 680px\)\);/);
    expect(css.indexOf("@custom-variant pantalla-muy-baja")).toBeGreaterThan(css.indexOf("@custom-variant pantalla-baja"));
  });
});

describe("el espacio de la nieve crece sin saltos", () => {
  it("--alto-pila-actual está registrada como longitud y la raíz le da una transición", () => {
    expect(css).toMatch(/@property --alto-pila-actual \{\s*syntax: "<length>";\s*inherits: true;\s*initial-value: 0px;\s*\}/);
    expect(css).toMatch(/:root \{\s*transition: --alto-pila-actual \d+(\.\d+)?s linear;/);
  });
});
