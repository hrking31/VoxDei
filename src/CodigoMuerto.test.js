// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";

// Guardia contra el código muerto heredado (20-11-2026, pedido del usuario: «revisa el proyecto en busca de código
// muerto heredado y elimina»): todo archivo de producción de src/ tiene que ser importado, de verdad (no en una línea
// comentada), por otro archivo de producción. Si no, es un archivo huérfano: se borra. Antes había dos scripts de
// carga masiva (Upload/) que solo aparecían comentados en una vista.

const SRC = join(import.meta.dirname, ".").replace(/\\/g, "/");
const todos = [];
(function recorrer(carpeta) {
  for (const nombre of readdirSync(carpeta)) {
    const ruta = join(carpeta, nombre);
    if (statSync(ruta).isDirectory()) recorrer(ruta);
    else if (/\.(js|jsx)$/.test(nombre)) todos.push(ruta.replace(/\\/g, "/"));
  }
})(SRC);

const esPrueba = (ruta) => /\.test\.(js|jsx)$/.test(ruta) || /pruebas\.utils/.test(ruta);
const produccion = todos.filter((ruta) => !esPrueba(ruta));
const texto = Object.fromEntries(produccion.map((ruta) => [ruta, readFileSync(ruta, "utf8")]));

// Las líneas de import / export-from / import() que no están comentadas
const importaA = (ruta, nombre) => {
  const re = new RegExp("[\"'/]" + nombre + "(\\.jsx?)?[\"']");
  return texto[ruta].split("\n").some((linea) => re.test(linea) && !/^\s*\/\//.test(linea) && /(import|from|require)/.test(linea));
};

describe("sin código muerto heredado", () => {
  it("todo archivo de producción lo importa algún otro (salvo la entrada, main.jsx)", () => {
    const huerfanos = produccion.filter((ruta) => {
      const nombre = basename(ruta).replace(/\.jsx?$/, "");
      if (nombre === "main") return false;
      return !produccion.some((otro) => otro !== ruta && importaA(otro, nombre));
    });
    expect(huerfanos.map((ruta) => ruta.replace(SRC + "/", ""))).toEqual([]);
  });

  it("los scripts de carga masiva de la Biblia (Upload/) ya no existen", () => {
    expect(todos.some((ruta) => /\/Upload\//.test(ruta))).toBe(false);
  });

  it("las vistas no dejan imports ni JSX comentados", () => {
    const comentados = produccion
      .filter((ruta) => /\/Views\//.test(ruta))
      .filter((ruta) => /^\s*\/\/\s*import\s/m.test(texto[ruta]) || /\{\/\*\s*<[A-Z]/.test(texto[ruta]));
    expect(comentados).toEqual([]);
  });
});
