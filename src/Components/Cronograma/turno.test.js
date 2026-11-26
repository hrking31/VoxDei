import { describe, expect, it } from "vitest";
import { ensayoVigente, puedeProyectar, tieneElTurno, turnoActual } from "./UtilesCronograma.js";

// Miércoles 25 de noviembre de 2026 (fechas en hora local, como la app)
const en = (dia, hora, minuto = 0) => new Date(2026, 10, dia, hora, minuto).getTime();

const DOMINICAL = { id: "s1", nombre: "Dominical", inicio: "10:00", fin: "12:00", dias: [0], fecha: null, activo: true };
const CRUZADO = { id: "s2", nombre: "Jóvenes", inicio: "11:00", fin: "13:00", dias: [0], fecha: null, activo: true };
const CARGOS = [
  { id: "conductor", nombre: "Conductor", orden: 0, proyecta: true },
  { id: "alabanza", nombre: "Alabanza", orden: 1, proyecta: false },
  { id: "proyeccion", nombre: "Proyección", orden: 2, proyecta: true },
];
const LUIS = { uid: "luis", nombre: "Luis", estado: "pendiente" };
const MARTA = { uid: "marta", nombre: "Marta", estado: "confirmado" };

const programar = (servicioId, fecha, asignaciones) => ({ [`${servicioId}_${fecha}`]: { servicioId, fecha, asignaciones } });

const pastor = { role: "Pastor" };
const pastora = { role: "Pastora" };
const lider = { role: "Líder" };
const operador = { role: "Operador" };

// Domingo 29 de noviembre, 10:30: en pleno servicio
const DURANTE = en(29, 10, 30);

describe("turnoActual: servicio en curso", () => {
  it("sin programación el servicio no tiene a nadie asignado", () => {
    const turno = turnoActual([DOMINICAL], null, DURANTE);
    expect(turno).toMatchObject({ tipo: "servicio", uid: null, uids: [], nombre: "" });
    expect(turno.servicio).toBe(DOMINICAL);
  });

  it("quien tiene el cargo de Proyección tiene el turno", () => {
    const prog = programar("s1", "2026-11-29", { proyeccion: [LUIS] });
    const turno = turnoActual([DOMINICAL], null, DURANTE, prog, CARGOS);
    expect(turno).toMatchObject({ tipo: "servicio", uid: "luis", uids: ["luis"], nombre: "Luis" });
  });

  it("el Conductor también tiene el turno, junto con quien proyecta", () => {
    const prog = programar("s1", "2026-11-29", { conductor: [MARTA], proyeccion: [LUIS] });
    const turno = turnoActual([DOMINICAL], null, DURANTE, prog, CARGOS);
    expect(turno.uids).toEqual(["marta", "luis"]);
    expect(turno.nombre).toBe("Marta, Luis");
    expect(turno.uid).toBe("marta");
  });

  it("un cargo que no proyecta (Alabanza) no da turno", () => {
    const prog = programar("s1", "2026-11-29", { alabanza: [LUIS] });
    expect(turnoActual([DOMINICAL], null, DURANTE, prog, CARGOS).uids).toEqual([]);
  });

  it("quien dijo «no puedo» deja de tener el turno", () => {
    const prog = programar("s1", "2026-11-29", { proyeccion: [{ ...LUIS, estado: "no_puede" }, MARTA] });
    expect(turnoActual([DOMINICAL], null, DURANTE, prog, CARGOS).uids).toEqual(["marta"]);
  });

  it("la programación de OTRA fecha no cuenta", () => {
    const prog = programar("s1", "2026-12-06", { proyeccion: [LUIS] });
    expect(turnoActual([DOMINICAL], null, DURANTE, prog, CARGOS).uids).toEqual([]);
  });

  it("la programación de OTRO servicio no cuenta", () => {
    const prog = programar("s2", "2026-11-29", { proyeccion: [LUIS] });
    expect(turnoActual([DOMINICAL], null, DURANTE, prog, CARGOS).uids).toEqual([]);
  });

  it("si dos servicios se cruzan, manda el que empezó más tarde", () => {
    const prog = { ...programar("s1", "2026-11-29", { proyeccion: [LUIS] }), ...programar("s2", "2026-11-29", { proyeccion: [MARTA] }) };
    const turno = turnoActual([DOMINICAL, CRUZADO], null, en(29, 11, 30), prog, CARGOS);
    expect(turno.servicio).toBe(CRUZADO);
    expect(turno.uids).toEqual(["marta"]);
  });

  it("un servicio pausado no da turno", () => {
    expect(turnoActual([{ ...DOMINICAL, activo: false }], null, DURANTE).tipo).toBe("libre");
  });
});

describe("turnoActual: ensayo y turno libre", () => {
  const ENSAYO = (inicio) => ({ uid: "luis", nombre: "Luis", inicio });

  it("fuera de un servicio, el ensayo vigente da el turno", () => {
    const ahora = en(25, 15);
    const turno = turnoActual([DOMINICAL], ENSAYO(en(25, 14)), ahora);
    expect(turno).toMatchObject({ tipo: "ensayo", uid: "luis", uids: ["luis"], nombre: "Luis" });
    expect(turno.hasta).toBe(en(25, 14) + 3 * 60 * 60 * 1000);
  });

  it("el ensayo termina a las 3 horas y al empezar un servicio", () => {
    expect(ensayoVigente(ENSAYO(en(25, 10)), [], en(25, 12, 59))).toBe(true);
    expect(ensayoVigente(ENSAYO(en(25, 10)), [], en(25, 13))).toBe(false);
    // Ensayo iniciado a las 9:30 de un domingo con servicio a las 10:00
    expect(turnoActual([DOMINICAL], ENSAYO(en(29, 9, 30)), en(29, 9, 45)).tipo).toBe("ensayo");
    // Cuando el servicio termina (12:00) el ensayo no «revive»: el servicio empezó después de iniciarlo
    expect(turnoActual([DOMINICAL], ENSAYO(en(29, 9, 30)), en(29, 12, 5)).tipo).toBe("libre");
  });

  it("durante un servicio manda el servicio, aunque haya un ensayo", () => {
    expect(turnoActual([DOMINICAL], ENSAYO(en(29, 9, 30)), DURANTE).tipo).toBe("servicio");
  });

  it("sin servicio ni ensayo, el turno es libre", () => {
    expect(turnoActual([DOMINICAL], null, en(25, 15))).toEqual({ tipo: "libre" });
    expect(turnoActual([], null, en(25, 15))).toEqual({ tipo: "libre" });
  });
});

describe("quién puede proyectar", () => {
  const prog = programar("s1", "2026-11-29", { proyeccion: [LUIS] });
  const turnoServicio = turnoActual([DOMINICAL], null, DURANTE, prog, CARGOS);
  const turnoSinNadie = turnoActual([DOMINICAL], null, DURANTE);
  const turnoLibre = { tipo: "libre" };
  const turnoEnsayo = { tipo: "ensayo", uid: "luis", uids: ["luis"], nombre: "Luis", hasta: 1 };

  it("pastor, pastora y líder proyectan siempre", () => {
    for (const persona of [pastor, pastora, lider]) {
      for (const turno of [turnoServicio, turnoSinNadie, turnoLibre, turnoEnsayo]) {
        expect(puedeProyectar(turno, persona, "otro")).toBe(true);
      }
    }
  });

  it("el operador asignado proyecta en su servicio; otro operador no", () => {
    expect(puedeProyectar(turnoServicio, operador, "luis")).toBe(true);
    expect(puedeProyectar(turnoServicio, operador, "marta")).toBe(false);
  });

  it("con un servicio sin nadie asignado, ningún operador proyecta", () => {
    expect(puedeProyectar(turnoSinNadie, operador, "luis")).toBe(false);
    expect(puedeProyectar(turnoSinNadie, operador, undefined)).toBe(false);
  });

  it("sin servicio ni ensayo, un operador no proyecta; con el ensayo, solo quien lo tiene", () => {
    expect(puedeProyectar(turnoLibre, operador, "luis")).toBe(false);
    expect(puedeProyectar(turnoEnsayo, operador, "luis")).toBe(true);
    expect(puedeProyectar(turnoEnsayo, operador, "marta")).toBe(false);
  });

  it("sin datos de usuario nunca se concede", () => {
    expect(puedeProyectar(turnoServicio, null, "luis")).toBe(true); // tiene el turno por uid
    expect(puedeProyectar(turnoLibre, null, undefined)).toBe(false);
    expect(puedeProyectar(turnoLibre, { role: "Otro" }, "x")).toBe(false);
  });

  it("tieneElTurno entiende la lista `uids` y el `uid` suelto de los ejemplos de la Ayuda", () => {
    expect(tieneElTurno({ tipo: "servicio", uids: ["a", "b"] }, "b")).toBe(true);
    expect(tieneElTurno({ tipo: "servicio", uid: "a" }, "a")).toBe(true);
    expect(tieneElTurno({ tipo: "libre", uids: ["a"] }, "a")).toBe(false);
    expect(tieneElTurno({ tipo: "servicio", uids: ["a"] }, "")).toBe(false);
  });
});
