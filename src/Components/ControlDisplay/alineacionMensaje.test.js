import { describe, expect, it } from "vitest";
import { alineacionValida, bloqueDeMensaje, lineasDeResumen } from "./alineacionMensaje.js";

const ESTILO = { color: "#fff", textAlign: "center" };

describe("alineación propia del mensaje de Prédica (resumen de puntos vistos)", () => {
  it("solo acepta izquierda o derecha; lo demás es «sin alineación propia»", () => {
    expect(alineacionValida("izquierda")).toBe("izquierda");
    expect(alineacionValida("derecha")).toBe("derecha");
    expect(alineacionValida("centro")).toBeNull();
    expect(alineacionValida(undefined)).toBeNull();
  });

  it("sin alineación propia, el mensaje sigue Estilos y colores, a todo el ancho", () => {
    expect(bloqueDeMensaje(ESTILO, null)).toEqual({ clase: "w-full", estilo: ESTILO });
  });

  it("con alineación propia, un bloque centrado con los renglones alineados", () => {
    expect(bloqueDeMensaje(ESTILO, "izquierda")).toEqual({ clase: "mx-auto w-fit max-w-full", estilo: { color: "#fff", textAlign: "left" } });
    expect(bloqueDeMensaje(ESTILO, "derecha").estilo.textAlign).toBe("right");
  });
});

describe("renglones del resumen, para la sangría francesa", () => {
  it("separa nivel, número y texto de cada renglón", () => {
    const texto = "I. La fe ve\n    a) Ve lo invisible\nII. La fe obedece\n\n1) Uno\nsin número";
    expect(lineasDeResumen(texto)).toEqual([
      { nivel: 0, etiqueta: "I.", texto: "La fe ve" },
      { nivel: 1, etiqueta: "a)", texto: "Ve lo invisible" },
      { nivel: 0, etiqueta: "II.", texto: "La fe obedece" },
      { nivel: 0, etiqueta: "1)", texto: "Uno" },
      { nivel: 0, etiqueta: "", texto: "sin número" },
    ]);
    expect(lineasDeResumen("")).toEqual([]);
    expect(lineasDeResumen("        1. Como Moisés")).toEqual([{ nivel: 2, etiqueta: "1.", texto: "Como Moisés" }]);
  });
});
