import { describe, expect, it } from "vitest";
import {
  CARGOS_BASICOS,
  agregarPersona,
  asignadosConTurno,
  idProgramacion,
  ordenarCargos,
  personasDeCargo,
  proximasFechas,
  quitarPersona,
} from "./programacion.js";

const ms = (a, m, d, h = 0, min = 0) => new Date(a, m - 1, d, h, min).getTime();

const CARGOS = [
  { id: "conductor", nombre: "Conductor", orden: 0, proyecta: true },
  { id: "alabanza", nombre: "Alabanza", orden: 1, proyecta: false },
  { id: "proyeccion", nombre: "Proyección", orden: 2, proyecta: true },
];
const LUIS = { uid: "o1", nombre: "Luis", estado: "pendiente" };
const ANA = { uid: "l1", nombre: "Ana", estado: "confirmado" };

describe("cargos básicos", () => {
  it("arrancan con Conductor y Proyección como los que proyectan, y con ids fijos y orden", () => {
    expect(CARGOS_BASICOS.map((c) => c.nombre)).toEqual([
      "Conductor", "Alabanza", "Predica", "Bienvenida", "Oración", "Ofrendas", "Proyección", "Sonido", "Niños",
    ]);
    expect(CARGOS_BASICOS.filter((c) => c.proyecta).map((c) => c.id)).toEqual(["conductor", "proyeccion"]);
    expect(CARGOS_BASICOS.map((c) => c.orden)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(new Set(CARGOS_BASICOS.map((c) => c.id)).size).toBe(CARGOS_BASICOS.length);
  });

  it("ordenarCargos respeta el orden y desempata por nombre, sin tocar la lista original", () => {
    const original = [
      { id: "b", nombre: "Zeta", orden: 1 },
      { id: "a", nombre: "Beta", orden: 1 },
      { id: "c", nombre: "Alfa", orden: 0 },
    ];
    expect(ordenarCargos(original).map((c) => c.id)).toEqual(["c", "a", "b"]);
    expect(original.map((c) => c.id)).toEqual(["b", "a", "c"]);
    expect(ordenarCargos(null)).toEqual([]);
  });
});

describe("programación de una fecha", () => {
  it("el id junta el servicio y la fecha", () => {
    expect(idProgramacion("s1", "2026-11-29")).toBe("s1_2026-11-29");
  });

  it("personasDeCargo devuelve la lista del cargo o vacío", () => {
    const prog = { asignaciones: { conductor: [ANA] } };
    expect(personasDeCargo(prog, "conductor")).toEqual([ANA]);
    expect(personasDeCargo(prog, "sonido")).toEqual([]);
    expect(personasDeCargo(undefined, "conductor")).toEqual([]);
  });

  it("agregarPersona añade con estado pendiente, no repite y no toca lo anterior", () => {
    const base = { conductor: [ANA] };
    const nuevo = agregarPersona(base, "proyeccion", { uid: "o1", nombre: "Luis" });
    expect(nuevo.proyeccion).toEqual([{ uid: "o1", nombre: "Luis", estado: "pendiente" }]);
    expect(base).toEqual({ conductor: [ANA] });
    expect(agregarPersona(nuevo, "proyeccion", { uid: "o1", nombre: "Luis" }).proyeccion).toHaveLength(1);
    expect(agregarPersona(undefined, "conductor", { uid: "l1", nombre: "Ana" }).conductor).toHaveLength(1);
  });

  it("quitarPersona saca a esa persona y borra el cargo si queda vacío", () => {
    const base = { proyeccion: [LUIS, ANA] };
    expect(quitarPersona(base, "proyeccion", "o1").proyeccion).toEqual([ANA]);
    expect(quitarPersona({ proyeccion: [LUIS] }, "proyeccion", "o1")).toEqual({});
    expect(base.proyeccion).toHaveLength(2);
    expect(quitarPersona(undefined, "x", "u")).toEqual({});
  });
});

describe("asignadosConTurno", () => {
  const prog = { asignaciones: { conductor: [ANA], alabanza: [{ uid: "a1", nombre: "Alba", estado: "pendiente" }], proyeccion: [LUIS] } };

  it("junta a quienes tienen un cargo que proyecta, en el orden del catálogo", () => {
    expect(asignadosConTurno(prog, CARGOS)).toEqual([
      { uid: "l1", nombre: "Ana" },
      { uid: "o1", nombre: "Luis" },
    ]);
  });

  it("los cargos que no proyectan (Alabanza) no dan turno", () => {
    expect(asignadosConTurno(prog, CARGOS).map((a) => a.uid)).not.toContain("a1");
  });

  it("quien dijo «no puedo» no tiene el turno, y nadie se repite", () => {
    const con = { asignaciones: { conductor: [{ ...LUIS, estado: "no_puede" }], proyeccion: [LUIS, ANA] } };
    expect(asignadosConTurno(con, CARGOS).map((a) => a.uid)).toEqual(["o1", "l1"]);
    const solo = { asignaciones: { conductor: [{ ...LUIS, estado: "no_puede" }] } };
    expect(asignadosConTurno(solo, CARGOS)).toEqual([]);
    const repetido = { asignaciones: { conductor: [LUIS], proyeccion: [LUIS] } };
    expect(asignadosConTurno(repetido, CARGOS)).toHaveLength(1);
  });

  it("sin programación o sin catálogo, nadie", () => {
    expect(asignadosConTurno(undefined, CARGOS)).toEqual([]);
    expect(asignadosConTurno(prog, [])).toEqual([]);
    expect(asignadosConTurno(prog, undefined)).toEqual([]);
  });
});

describe("proximasFechas", () => {
  // Miércoles 25 de noviembre de 2026, 15:00
  const AHORA = ms(2026, 11, 25, 15);
  const DOMINICAL = { id: "s1", nombre: "Dominical", inicio: "10:00", fin: "12:00", dias: [0], fecha: null, activo: true };
  const MIERCOLES = { id: "s2", nombre: "Oración", inicio: "19:00", fin: "20:30", dias: [3], fecha: null, activo: true };

  it("lista las próximas fechas por orden, con su id y su fecha", () => {
    const lista = proximasFechas([DOMINICAL, MIERCOLES], AHORA, { cuantas: 3 });
    expect(lista.map((f) => f.id)).toEqual(["s2_2026-11-25", "s1_2026-11-29", "s2_2026-12-02"]);
    expect(lista[0].fecha).toBe("2026-11-25");
    expect(lista[1].inicio).toBe(ms(2026, 11, 29, 10));
    expect(lista[1].fin).toBe(ms(2026, 11, 29, 12));
  });

  it("incluye el servicio que está en curso y deja fuera el que ya terminó hoy", () => {
    const enCurso = proximasFechas([MIERCOLES], ms(2026, 11, 25, 19, 30), { cuantas: 1 });
    expect(enCurso[0].id).toBe("s2_2026-11-25");
    const terminado = proximasFechas([MIERCOLES], ms(2026, 11, 25, 21), { cuantas: 1 });
    expect(terminado[0].id).toBe("s2_2026-12-02");
  });

  it("un servicio de una sola vez sale en su fecha, y solo mientras no pase", () => {
    const unico = { id: "u1", nombre: "Vigilia", inicio: "22:00", fin: "23:30", dias: [], fecha: "2026-12-24", activo: true };
    expect(proximasFechas([unico], AHORA).map((f) => f.id)).toEqual(["u1_2026-12-24"]);
    expect(proximasFechas([unico], ms(2026, 12, 25, 8))).toEqual([]);
  });

  it("los servicios pausados no salen", () => {
    expect(proximasFechas([{ ...DOMINICAL, activo: false }], AHORA)).toEqual([]);
  });

  it("respeta cuántas pedir y cuántos días mirar", () => {
    expect(proximasFechas([DOMINICAL], AHORA, { cuantas: 2 })).toHaveLength(2);
    // El domingo 29 está a 4 días del miércoles 25
    expect(proximasFechas([DOMINICAL], AHORA, { diasAdelante: 4 })).toHaveLength(1);
    expect(proximasFechas([DOMINICAL], AHORA, { diasAdelante: 3 })).toHaveLength(0);
    expect(proximasFechas(null, AHORA)).toEqual([]);
  });
});
