import { describe, expect, it } from "vitest";
import {
  agruparPorCabida,
  candidatoActual,
  claveDeCandidato,
  cortesValidos,
  estadoInicial,
  gruposPorCantidad,
  lineasConNumeracion,
  paso,
  rotuloDeRango,
  tonoDeLlenado,
} from "./utilesPuntos.js";
import { numerosDePuntos } from "./utilesPredica.js";

const punto = (id, contenido = id, nivel = 0) => ({ id, tipo: "titulo", contenido, ...(nivel ? { nivel } : {}) });
const ocho = Array.from({ length: 8 }, (_, i) => punto(`p${i + 1}`, `Punto ${i + 1}`));
const ids = (grupos) => grupos.map((g) => g.ids);

// Una pantalla inventada: caben `K` puntos (sin mirar el texto)
const cabenK = (K) => (grupo) => ({ estado: grupo.length > K ? "no-cabe" : grupo.length === K ? "justo" : "bien", llenado: grupo.length / K });

describe("lineasConNumeracion: la numeración continúa de una pantalla a otra", () => {
  it("lleva el número ORIGINAL de cada punto, no vuelve a empezar", () => {
    const numeros = numerosDePuntos(ocho);
    // La segunda pantalla (puntos 5 a 7) sigue con V., VI., VII.
    expect(lineasConNumeracion(ocho.slice(4, 7), numeros)).toEqual(["V. Punto 5", "VI. Punto 6", "VII. Punto 7"]);
    expect(lineasConNumeracion([ocho[0]], numeros)).toEqual(["I. Punto 1"]);
  });

  it("los subpuntos llevan su letra y su sangría, con la numeración del bosquejo", () => {
    const piezas = [punto("a", "La fe"), punto("b", "Ve", 1), punto("c", "Obedece", 1), punto("d", "La esperanza")];
    const numeros = numerosDePuntos(piezas);
    expect(lineasConNumeracion(piezas.slice(2), numeros)).toEqual(["    b) Obedece", "II. La esperanza"]);
  });

  it("sin número, el texto solo", () => {
    expect(lineasConNumeracion([punto("a", "Hola")], {})).toEqual(["Hola"]);
  });
});

describe("cortesValidos", () => {
  it("deja solo ids de puntos que existen, sin el primero y sin repetir", () => {
    expect(cortesValidos(["p3", "p3", "p5", "fantasma", "p1", 7, null], ocho)).toEqual(["p3", "p5"]);
  });
  it("lo que no es una lista, o sin puntos, da vacío", () => {
    expect(cortesValidos(undefined, ocho)).toEqual([]);
    expect(cortesValidos("p3", ocho)).toEqual([]);
    expect(cortesValidos(["p3"], [])).toEqual([]);
  });
});

describe("gruposPorCantidad (el respaldo mientras no se mide)", () => {
  it("de a 6 puntos, sin medir", () => {
    const grupos = gruposPorCantidad(ocho);
    expect(ids(grupos)).toEqual([["p1", "p2", "p3", "p4", "p5", "p6"], ["p7", "p8"]]);
    expect(grupos.every((g) => g.estado === "sin-medir" && g.llenado === null)).toBe(true);
  });
  it("respeta los cortes manuales", () => {
    expect(ids(gruposPorCantidad(ocho, ["p3"]))).toEqual([["p1", "p2"], ["p3", "p4", "p5", "p6", "p7", "p8"]]);
  });
  it("sin puntos, sin pantallas", () => {
    expect(gruposPorCantidad([])).toEqual([]);
  });
});

describe("rotuloDeRango", () => {
  const numeros = numerosDePuntos(ocho);
  it("«IV – VII» para varios y «IV» para uno", () => {
    expect(rotuloDeRango(["p4", "p5", "p6", "p7"], numeros)).toBe("IV – VII");
    expect(rotuloDeRango(["p4"], numeros)).toBe("IV");
  });
  it("quita el signo final de las etiquetas con paréntesis o punto", () => {
    expect(rotuloDeRango(["a", "b"], { a: "1)", b: "3)" })).toBe("1 – 3");
  });
  it("sin número, vacío", () => {
    expect(rotuloDeRango(["a"], {})).toBe("");
  });
});

describe("agruparPorCabida: se prueba con la pantalla un punto más cada vez", () => {
  it("si todo cabe, una sola pantalla", () => {
    const grupos = agruparPorCabida(ocho, [], cabenK(20));
    expect(ids(grupos)).toEqual([ocho.map((p) => p.id)]);
    expect(grupos[0].estado).toBe("bien");
    expect(grupos[0].llenado).toBeCloseTo(8 / 20);
  });

  it("corta donde ya no caben: de a 3 y el resto", () => {
    const grupos = agruparPorCabida(ocho, [], cabenK(3));
    expect(ids(grupos)).toEqual([["p1", "p2", "p3"], ["p4", "p5", "p6"], ["p7", "p8"]]);
    // Las llenas van «justo»; la última, «bien»
    expect(grupos.map((g) => g.estado)).toEqual(["justo", "justo", "bien"]);
    expect(grupos[2].llenado).toBeCloseTo(2 / 3);
  });

  it("el punto que no cupo empieza la siguiente pantalla (no se pierde ni se repite)", () => {
    const grupos = agruparPorCabida(ocho, [], cabenK(5));
    expect(ids(grupos)).toEqual([["p1", "p2", "p3", "p4", "p5"], ["p6", "p7", "p8"]]);
    expect(grupos.flatMap((g) => g.ids)).toEqual(ocho.map((p) => p.id));
  });

  it("un corte manual cierra la pantalla antes de ese punto, aunque todavía cupieran más", () => {
    const grupos = agruparPorCabida(ocho, ["p3", "p7"], cabenK(20));
    expect(ids(grupos)).toEqual([["p1", "p2"], ["p3", "p4", "p5", "p6"], ["p7", "p8"]]);
  });

  it("los cortes y la cabida se combinan", () => {
    const grupos = agruparPorCabida(ocho, ["p3"], cabenK(3));
    expect(ids(grupos)).toEqual([["p1", "p2"], ["p3", "p4", "p5"], ["p6", "p7", "p8"]]);
  });

  it("un punto que no cabe ni solo forma su propia pantalla, marcada «no-cabe», y se sigue con los demás", () => {
    const puntos = ["a", "b", "x", "c", "d"].map((id) => punto(id));
    const medir = (grupo) => {
      if (grupo.includes("x")) return { estado: "no-cabe", llenado: 1.6 };
      return { estado: grupo.length > 3 ? "no-cabe" : "bien", llenado: grupo.length / 4 };
    };
    const grupos = agruparPorCabida(puntos, [], medir);
    expect(ids(grupos)).toEqual([["a", "b"], ["x"], ["c", "d"]]);
    expect(grupos.map((g) => g.estado)).toEqual(["bien", "no-cabe", "bien"]);
    expect(grupos[1].llenado).toBe(1.6);
  });

  it("un solo punto, una sola pantalla; sin puntos, ninguna", () => {
    expect(ids(agruparPorCabida([punto("a")], [], cabenK(3)))).toEqual([["a"]]);
    expect(agruparPorCabida([], [], cabenK(3))).toEqual([]);
  });

  it("todos los puntos aparecen exactamente una vez, con cualquier capacidad", () => {
    for (let k = 1; k <= 9; k++) {
      const grupos = agruparPorCabida(ocho, ["p4"], cabenK(k));
      expect(grupos.flatMap((g) => g.ids), `K=${k}`).toEqual(ocho.map((p) => p.id));
      expect(Math.max(...grupos.map((g) => g.ids.length)), `K=${k}`).toBeLessThanOrEqual(Math.max(k, 1));
    }
  });
});

describe("paso: la máquina del medidor", () => {
  it("empieza midiendo el primer punto solo", () => {
    const estado = estadoInicial(ocho, []);
    expect(candidatoActual(estado)).toEqual(["p1"]);
    expect(claveDeCandidato(estado)).toBe("0-1");
    expect(estado.terminado).toBe(false);
  });

  it("si cabe, prueba con uno más", () => {
    const estado = paso(estadoInicial(ocho, []), { clave: "0-1", estado: "bien", llenado: 0.2 });
    expect(candidatoActual(estado)).toEqual(["p1", "p2"]);
    expect(estado.grupos).toEqual([]);
  });

  it("una medida repetida o de otro candidato se ignora (así no se avanza dos veces)", () => {
    const uno = paso(estadoInicial(ocho, []), { clave: "0-1", estado: "bien", llenado: 0.2 });
    // Llega otra vez la medida del candidato anterior: no cambia nada
    expect(paso(uno, { clave: "0-1", estado: "bien", llenado: 0.2 })).toBe(uno);
    expect(paso(uno, { clave: "5-2", estado: "no-cabe", llenado: 2 })).toBe(uno);
  });

  it("termina cuando el último punto cupo, y después ya no cambia", () => {
    let estado = estadoInicial([punto("a"), punto("b")], []);
    estado = paso(estado, { clave: "0-1", estado: "bien", llenado: 0.3 });
    estado = paso(estado, { clave: "0-2", estado: "bien", llenado: 0.6 });
    expect(estado.terminado).toBe(true);
    expect(estado.grupos).toEqual([{ ids: ["a", "b"], estado: "bien", llenado: 0.6 }]);
    expect(paso(estado, { clave: "2-1", estado: "bien", llenado: 0.1 })).toBe(estado);
  });

  it("sin puntos nace terminado", () => {
    expect(estadoInicial([], []).terminado).toBe(true);
  });
});

describe("tonoDeLlenado", () => {
  it("un tono por estado de la pantalla", () => {
    expect(tonoDeLlenado({ estado: "bien" })).toBe("bien");
    expect(tonoDeLlenado({ estado: "justo" })).toBe("justo");
    expect(tonoDeLlenado({ estado: "no-cabe" })).toBe("error");
    expect(tonoDeLlenado({ estado: "sin-medir" })).toBe("sin-medir");
  });
});
