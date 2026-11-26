import { describe, expect, it } from "vitest";
import { textoFecha, textoFechaProgramada } from "./textosProgramacion.js";

// Domingo 29 de noviembre de 2026, 10:00
const INICIO = new Date(2026, 10, 29, 10).getTime();

describe("textosProgramacion", () => {
  it("textoFecha: día de la semana, número y mes, en español", () => {
    expect(textoFecha(INICIO)).toBe("domingo, 29 de noviembre");
  });

  it("textoFechaProgramada: con nombre del servicio, fecha y horas", () => {
    const texto = textoFechaProgramada({
      inicio: INICIO,
      servicio: { nombre: "Dominical", inicio: "10:00", fin: "12:00" },
    });
    expect(texto.startsWith("Dominical · domingo")).toBe(true);
    expect(texto).toContain("29 de noviembre");
    expect(texto).toContain(" – ");
  });

  it("sin nombre de servicio empieza por la fecha", () => {
    const texto = textoFechaProgramada({
      inicio: INICIO,
      servicio: { nombre: "", inicio: "10:00", fin: "12:00" },
    });
    expect(texto.startsWith("domingo")).toBe(true);
  });
});
