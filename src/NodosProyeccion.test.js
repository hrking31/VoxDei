// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

// Guardia: todo nodo de Realtime Database que la app usa bajo un groupId
// (`<nodo>/${groupId}`) tiene que estar en dos sitios, o falla sin avisar:
//   - database.rules.json: si no, la escritura se rechaza con «permiso
//     denegado» y en el templo no aparece nada.
//   - NODOS_PROYECCION de functions/index.js: si no, sobrevive al borrado de
//     la iglesia (eliminarMiCuenta).

const raiz = resolve(import.meta.dirname, "..");

function archivos(dir) {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) return archivos(ruta);
    return /\.(js|jsx)$/.test(nombre) && !/\.test\./.test(nombre) ? [ruta] : [];
  });
}

// `ref(database, \`displayEspera/${...}\`)` y similares. Se ignoran las rutas
// especiales como `.info/serverTimeOffset`.
const usados = new Set(
  archivos(resolve(raiz, "src"))
    .filter((ruta) => !ruta.includes(`${join("src", "Upload")}`))
    .flatMap((ruta) => [
      ...readFileSync(ruta, "utf8").matchAll(/ref\(\s*database\s*,\s*`([A-Za-z]+)\/\$\{/g),
    ])
    .map((m) => m[1])
);

const reglas = readFileSync(resolve(raiz, "database.rules.json"), "utf8");
const permitidos = new Set(reglas.match(/matches\(\/\^\(([^)]*)\)\$\//)[1].split("|"));

const funciones = readFileSync(resolve(raiz, "functions", "index.js"), "utf8");
const listaBorrado = funciones.match(/const NODOS_PROYECCION = \[([\s\S]*?)\];/)[1];
const seBorran = new Set([...listaBorrado.matchAll(/"([A-Za-z]+)"/g)].map((m) => m[1]));

describe("nodos de proyección en Realtime Database", () => {
  it("encuentra los nodos que usa la app", () => {
    expect(usados.has("displayMessage")).toBe(true);
    expect(usados.has("displayEspera")).toBe(true);
  });

  it.each([...usados])("%s está permitido en database.rules.json", (nodo) => {
    expect(permitidos.has(nodo)).toBe(true);
  });

  it.each([...usados])("%s se borra con la iglesia (NODOS_PROYECCION)", (nodo) => {
    expect(seBorran.has(nodo)).toBe(true);
  });

  it("las reglas y la lista de borrado coinciden", () => {
    expect([...permitidos].sort()).toEqual([...seBorran].sort());
  });
});
