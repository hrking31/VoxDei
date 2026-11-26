import { describe, expect, it } from "vitest";
import {
  bloqueDeFecha,
  conteoServicios,
  especialesProximos,
  marcasDelDia,
  ocurrenciaEn,
  seRepite,
  semanaDeRepetidos,
  textoFalta,
  textoRepeticion,
} from "./utilesServicios.js";

const servicio = (extra) => ({ id: "x", nombre: "Servicio", inicio: "10:00", fin: "12:00", dias: [], fecha: null, activo: true, ...extra });
const DOMINICAL = servicio({ id: "dom", nombre: "Dominical", inicio: "09:30", fin: "11:30", dias: [0] });
const ESCUELA = servicio({ id: "esc", nombre: "Escuela", inicio: "08:00", fin: "09:15", dias: [0] });
const ORACION = servicio({ id: "ora", nombre: "Oración", inicio: "19:00", fin: "20:30", dias: [3] });
const RETIRO = servicio({ id: "ret", nombre: "Retiro", inicio: "08:00", fin: "17:00", fecha: "2026-12-05" });
const VIGILIA = servicio({ id: "vig", nombre: "Vigilia", inicio: "22:00", fin: "23:30", fecha: "2026-12-24" });
const PASADO = servicio({ id: "pas", nombre: "Pasado", fecha: "2026-11-01" });
const TODOS = [DOMINICAL, ESCUELA, ORACION, RETIRO, VIGILIA, PASADO];
const HOY = "2026-11-25";

describe("semanaDeRepetidos", () => {
  it("siempre trae los 7 días, de lunes a domingo, con los servicios de cada uno por hora", () => {
    const semana = semanaDeRepetidos(TODOS);
    expect(semana.map((d) => d.largo)).toEqual(["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]);
    expect(semana.find((d) => d.largo === "Domingo").servicios.map((s) => s.id)).toEqual(["esc", "dom"]);
    expect(semana.find((d) => d.largo === "Miércoles").servicios.map((s) => s.id)).toEqual(["ora"]);
  });

  it("cada día trae su nombre abreviado para el encabezado del tablero", () => {
    expect(semanaDeRepetidos(TODOS).map((d) => d.abrev)).toEqual(["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]);
  });

  it("un día sin servicios queda vacío, y los especiales no entran", () => {
    const semana = semanaDeRepetidos(TODOS);
    expect(semana.find((d) => d.largo === "Lunes").servicios).toEqual([]);
    expect(semana.flatMap((d) => d.servicios).some((s) => s.id === "ret")).toBe(false);
  });

  it("un servicio de varios días sale en cada uno", () => {
    const doble = servicio({ id: "dos", dias: [1, 5] });
    const semana = semanaDeRepetidos([doble]);
    expect(semana.filter((d) => d.servicios.length).map((d) => d.largo)).toEqual(["Lunes", "Viernes"]);
  });

  it("sin servicios, nada", () => {
    expect(semanaDeRepetidos(undefined).every((d) => d.servicios.length === 0)).toBe(true);
  });
});

describe("especiales y conteos", () => {
  it("los especiales próximos van por fecha, sin los pasados ni los que se repiten", () => {
    expect(especialesProximos(TODOS, HOY).map((s) => s.id)).toEqual(["ret", "vig"]);
  });

  it("el de hoy todavía cuenta", () => {
    expect(especialesProximos([servicio({ id: "h", fecha: HOY })], HOY)).toHaveLength(1);
  });

  it("dos el mismo día van por hora", () => {
    const tarde = servicio({ id: "t", inicio: "18:00", fecha: "2026-12-05" });
    expect(especialesProximos([tarde, RETIRO], HOY).map((s) => s.id)).toEqual(["ret", "t"]);
  });

  it("cuenta cada clase para los filtros", () => {
    expect(conteoServicios(TODOS, HOY)).toEqual({ todos: 5, repiten: 3, especiales: 2 });
    expect(conteoServicios(undefined, HOY)).toEqual({ todos: 0, repiten: 0, especiales: 0 });
  });

  it("seRepite distingue las dos clases", () => {
    expect(seRepite(DOMINICAL)).toBe(true);
    expect(seRepite(RETIRO)).toBe(false);
  });
});

describe("textos", () => {
  it("cuánto falta", () => {
    expect(textoFalta("2026-11-25", HOY)).toBe("hoy");
    expect(textoFalta("2026-11-26", HOY)).toBe("mañana");
    expect(textoFalta("2026-12-05", HOY)).toBe("en 10 días");
    expect(textoFalta("2026-12-31", HOY)).toBe("en 36 días");
    expect(textoFalta("2026-11-01", HOY)).toBe("hoy");
  });

  it("el bloque de fecha trae mes corto en mayúsculas, día y día de la semana", () => {
    expect(bloqueDeFecha("2026-12-05")).toEqual({ mes: "DIC", dia: 5, semana: "sáb" });
    expect(bloqueDeFecha("2026-12-24")).toEqual({ mes: "DIC", dia: 24, semana: "jue" });
  });

  it("cómo se dice que se repite", () => {
    expect(textoRepeticion(DOMINICAL)).toBe("Cada domingo");
    expect(textoRepeticion(ORACION)).toBe("Cada miércoles");
    expect(textoRepeticion(servicio({ dias: [1, 5] }))).toBe("Cada semana");
    expect(textoRepeticion(servicio({ dias: [0, 1, 2, 3, 4, 5, 6] }))).toBe("Todos los días");
  });
});

describe("el calendario", () => {
  it("un domingo tiene los servicios que se repiten ese día, por hora", () => {
    const marcas = marcasDelDia(TODOS, "2026-11-29");
    expect(marcas.servicios.map((s) => s.id)).toEqual(["esc", "dom"]);
    expect(marcas).toMatchObject({ repite: true, unico: false });
  });

  it("una fecha especial se marca como única", () => {
    expect(marcasDelDia(TODOS, "2026-12-24")).toMatchObject({ repite: false, unico: true });
  });

  it("un día con las dos clases las lleva a las dos", () => {
    // El sábado 5 de diciembre tiene el retiro (especial) y, si hubiera, uno semanal
    const sabado = servicio({ id: "sab", dias: [6] });
    expect(marcasDelDia([sabado, RETIRO], "2026-12-05")).toMatchObject({ repite: true, unico: true });
  });

  it("un día libre no tiene nada", () => {
    expect(marcasDelDia(TODOS, "2026-11-30")).toEqual({ servicios: [], repite: false, unico: false });
  });

  it("los servicios pausados no se marcan", () => {
    expect(marcasDelDia([{ ...DOMINICAL, activo: false }], "2026-11-29").servicios).toEqual([]);
  });

  it("se marca todo el año: un domingo de junio de 2027 también", () => {
    expect(marcasDelDia(TODOS, "2027-06-06").repite).toBe(true);
  });

  it("ocurrenciaEn arma la fecha de la programación con el primero del día", () => {
    const o = ocurrenciaEn(TODOS, "2026-11-29");
    expect(o.id).toBe("esc_2026-11-29");
    expect(o.fecha).toBe("2026-11-29");
    expect(o.servicio).toBe(ESCUELA);
    expect(o.inicio).toBe(new Date(2026, 10, 29, 8).getTime());
    expect(o.fin).toBe(new Date(2026, 10, 29, 9, 15).getTime());
    expect(ocurrenciaEn(TODOS, "2026-11-30")).toBeNull();
  });
});
