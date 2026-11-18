import { describe, expect, it } from "vitest";
import { agruparEquipo, esDueno, etiquetaDePersona, iniciales } from "./utilesUsuarios.js";

const gente = [
  { id: "o2", groupId: "d1", name: "Zoe", role: "Operador" },
  { id: "p2", groupId: "d1", name: "Ana", role: "Pastora" },
  { id: "d1", groupId: "d1", name: "Luis", role: "Pastor" },
  { id: "o1", groupId: "d1", name: "Beto", role: "Operador" },
];

describe("iniciales", () => {
  it("toma la primera letra del nombre y del último apellido", () => {
    expect(iniciales("Ana Gómez")).toBe("AG");
    expect(iniciales("ana maría de la cruz")).toBe("AC");
  });
  it("con una sola palabra o vacío", () => {
    expect(iniciales("ana")).toBe("A");
    expect(iniciales("  ")).toBe("?");
    expect(iniciales(undefined)).toBe("?");
  });
});

describe("agruparEquipo", () => {
  it("separa pastores y equipo, con el dueño primero y luego por nombre", () => {
    const { pastores, equipo } = agruparEquipo(gente);
    expect(pastores.map((u) => u.id)).toEqual(["d1", "p2"]);
    expect(equipo.map((u) => u.id)).toEqual(["o1", "o2"]);
  });
  it("tolera mayúsculas y datos ausentes", () => {
    expect(agruparEquipo([{ id: "x", groupId: "g", name: "A", role: " pastor " }]).pastores).toHaveLength(1);
    expect(agruparEquipo(null)).toEqual({ pastores: [], equipo: [] });
  });
});

describe("esDueno y etiquetaDePersona", () => {
  it("el dueño es quien tiene el uid igual al groupId", () => {
    expect(esDueno(gente[2])).toBe(true);
    expect(esDueno(gente[0])).toBe(false);
    expect(esDueno(null)).toBe(false);
  });
  it("la etiqueta avisa del dueño y de uno mismo", () => {
    expect(etiquetaDePersona(gente[2], "d1")).toBe("Luis, Pastor (dueño de la iglesia, tú)");
    expect(etiquetaDePersona(gente[0], "d1")).toBe("Zoe, Operador");
  });
});
