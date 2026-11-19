import { describe, expect, it } from "vitest";
import { TEXTO_CABIDA, elementosParaMedir } from "./utilesCabida.js";

const versiculo = (id, extra = {}) => ({ id, tipo: "versiculo", contenido: { cita: "Juan 3:16", texto: "Porque de tal manera amó Dios", ...extra } });
const punto = (id, contenido, extra = {}) => ({ id, tipo: "titulo", contenido, ...extra });
const mensaje = (id, contenido) => ({ id, tipo: "mensaje", contenido });
const imagen = (id, url = "https://img/a.jpg") => ({ id, tipo: "imagen", contenido: { url, nombre: "a" } });

describe("elementosParaMedir", () => {
  it("un mensaje va tal cual", () => {
    expect(elementosParaMedir([mensaje("m", "Hola iglesia")], "romanos")).toEqual([{ id: "m", centro: { tipo: "mensaje", contenido: "Hola iglesia" } }]);
  });

  it("un punto va como mensaje con su número, como lo proyecta el púlpito", () => {
    const medidos = elementosParaMedir([punto("a", "La fe"), mensaje("m", "texto"), punto("b", "La esperanza")], "romanos");
    expect(medidos.filter((e) => e.id !== "m").map((e) => e.centro.contenido)).toEqual(["I. La fe", "II. La esperanza"]);
    expect(medidos[0].centro.tipo).toBe("mensaje");
  });

  it("respeta el tipo de numeración de la prédica", () => {
    expect(elementosParaMedir([punto("a", "La fe")], "numeros")[0].centro.contenido).toBe("1. La fe");
    expect(elementosParaMedir([punto("a", "La fe")], "letras")[0].centro.contenido).toBe("A. La fe");
  });

  it("un subpunto lleva su propio número", () => {
    const medidos = elementosParaMedir([punto("a", "La fe"), punto("b", "Creer", { nivel: 1 })], "romanos", [null, null]);
    expect(medidos[1].centro.contenido).toMatch(/^[a-z1-9]+[.)] Creer$/i);
    expect(medidos[1].centro.contenido).not.toBe("II. Creer");
  });

  it("un versículo lleva su cita y su versión, sin título", () => {
    expect(elementosParaMedir([versiculo("v", { version: "DHHS94" })], "romanos")[0].centro).toEqual({
      tipo: "versiculo",
      contenido: { cita: "Juan 3:16", texto: "Porque de tal manera amó Dios", titulo: "", version: "DHHS94" },
    });
  });

  it("un versículo guardado antes de que hubiera versión es de la RVR1960", () => {
    expect(elementosParaMedir([versiculo("v")], "romanos")[0].centro.contenido.version).toBe("RVR1960");
  });

  it("no mide las imágenes ni los recuadros vacíos", () => {
    const piezas = [imagen("i"), imagen("sin-foto", ""), mensaje("vacio", ""), mensaje("m", "Hola")];
    expect(elementosParaMedir(piezas, "romanos").map((e) => e.id)).toEqual(["m"]);
  });

  it("sin piezas, nada que medir", () => {
    expect(elementosParaMedir([], "romanos")).toEqual([]);
  });

  it("conserva el orden del bosquejo", () => {
    const piezas = [mensaje("a", "1"), versiculo("b"), punto("c", "x"), mensaje("d", "4")];
    expect(elementosParaMedir(piezas, "romanos").map((e) => e.id)).toEqual(["a", "b", "c", "d"]);
  });
});

describe("TEXTO_CABIDA", () => {
  it("tiene un aviso para «justo» y otro para «no-cabe», y ninguno para «bien»", () => {
    expect(Object.keys(TEXTO_CABIDA).sort()).toEqual(["justo", "no-cabe"]);
    expect(TEXTO_CABIDA["no-cabe"]).toMatch(/cortaría/);
  });
});
