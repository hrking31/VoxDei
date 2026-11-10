// @vitest-environment node
import { describe, expect, it } from "vitest";
import { cantidad, textoServicio } from "./utilesResumen.js";

describe("Resumen del día", () => {
  it("servicio en curso, con su operador", () => {
    expect(textoServicio({ modo: "enCurso", nombre: "Culto dominical", operador: "Ana" })).toEqual({
      principal: "Culto dominical · en curso",
      detalle: "Maneja la pantalla: Ana",
    });
  });

  it("cuenta regresiva, sin operador asignado", () => {
    expect(textoServicio({ modo: "cuenta", nombre: "Oración", cuenta: "2 h 5 min", hora: "19:00" })).toEqual({
      principal: "Oración empieza en 2 h 5 min",
      detalle: "19:00 · Sin operador asignado",
    });
  });

  it("servicio lejano: día y hora", () => {
    expect(
      textoServicio({ modo: "fecha", nombre: "Jóvenes", dia: "Sábado", hora: "17:00", operador: "Luis" })
    ).toEqual({ principal: "Jóvenes: Sábado, 17:00", detalle: "Maneja la pantalla: Luis" });
  });

  it("sin servicios lo dice", () => {
    expect(textoServicio({ modo: "nada" })).toEqual({ principal: "No hay servicios en el cronograma", detalle: "" });
  });

  it("singular y plural", () => {
    expect(cantidad(1, "paso", "pasos")).toBe("1 paso");
    expect(cantidad(0, "paso", "pasos")).toBe("0 pasos");
    expect(cantidad(3, "canción", "canciones")).toBe("3 canciones");
  });
});
