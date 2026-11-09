import { describe, expect, it } from "vitest";
import { proximoServicio, textoCuentaRegresiva } from "./UtilesCronograma.js";

// Fechas en hora local, igual que la app. El 9 de noviembre de 2026 es lunes.
const en = (dia, hora, minuto = 0) => new Date(2026, 10, dia, hora, minuto).getTime();
const servicio = (extra) => ({ nombre: "Culto", inicio: "10:00", fin: "12:00", dias: [], fecha: null, ...extra });

describe("proximoServicio", () => {
  it("encuentra el de hoy que aún no empieza", () => {
    const culto = servicio({ dias: [1] }); // lunes
    const r = proximoServicio([culto], en(9, 9, 30));
    expect(r.servicio).toBe(culto);
    expect(r.inicio).toBe(en(9, 10));
  });

  it("si el de hoy ya empezó, salta a la próxima semana", () => {
    const culto = servicio({ dias: [1] });
    const r = proximoServicio([culto], en(9, 10, 1));
    expect(r.inicio).toBe(en(16, 10));
  });

  it("entre varios del mismo día gana el más temprano por empezar", () => {
    const manana = servicio({ nombre: "Mañana", inicio: "08:00", dias: [1] });
    const tarde = servicio({ nombre: "Tarde", inicio: "18:00", dias: [1] });
    expect(proximoServicio([tarde, manana], en(9, 7)).servicio).toBe(manana);
    expect(proximoServicio([tarde, manana], en(9, 9)).servicio).toBe(tarde);
  });

  it("un día cercano gana a uno lejano aunque empiece más tarde", () => {
    const martesNoche = servicio({ inicio: "20:00", dias: [2] });
    const domingo = servicio({ inicio: "08:00", dias: [0] });
    expect(proximoServicio([domingo, martesNoche], en(9, 12)).servicio).toBe(martesNoche);
  });

  it("respeta los de una sola fecha y los pausados", () => {
    const especial = servicio({ fecha: "2026-11-11" });
    const pausado = servicio({ dias: [1, 2], activo: false });
    expect(proximoServicio([pausado, especial], en(9, 12)).inicio).toBe(en(11, 10));
    expect(proximoServicio([pausado], en(9, 12))).toBeNull();
  });

  it("sin servicios no hay próximo", () => {
    expect(proximoServicio([], en(9, 12))).toBeNull();
    expect(proximoServicio(undefined, en(9, 12))).toBeNull();
  });
});

describe("textoCuentaRegresiva", () => {
  it("minutos y segundos, con horas solo si hacen falta", () => {
    expect(textoCuentaRegresiva(754000)).toBe("12:34");
    expect(textoCuentaRegresiva(3754000)).toBe("1:02:34");
    expect(textoCuentaRegresiva(59000)).toBe("00:59");
  });

  it("redondea hacia arriba y nunca es negativa", () => {
    expect(textoCuentaRegresiva(1)).toBe("00:01");
    expect(textoCuentaRegresiva(-5000)).toBe("00:00");
  });
});
