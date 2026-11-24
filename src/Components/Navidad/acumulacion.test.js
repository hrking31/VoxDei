import { describe, expect, it, vi } from "vitest";
import { ALTO_MAXIMO, ANCHO_COLUMNA, Acumulacion, aportePorCopo } from "./acumulacion.js";

describe("Acumulacion", () => {
  it("empieza vacía, con una columna por cada 4 px de ancho", () => {
    const pila = new Acumulacion({ ancho: 400 });
    expect(pila.columnas).toBe(400 / ANCHO_COLUMNA);
    expect(pila.alturaEn(0)).toBe(0);
    expect(pila.alturaEn(399)).toBe(0);
  });

  it("un copo suma altura en su zona y no lejos de ella", () => {
    const pila = new Acumulacion({ ancho: 400, aporte: 2 });
    pila.deposita(200);
    expect(pila.alturaEn(200)).toBeGreaterThan(0);
    expect(pila.alturaEn(200)).toBeGreaterThan(pila.alturaEn(214));
    expect(pila.alturaEn(40)).toBe(0);
  });

  it("repartir un copo conserva el aporte: la suma de alturas sube lo que se aportó", () => {
    const pila = new Acumulacion({ ancho: 400, aporte: 3 });
    pila.deposita(200);
    const suma = pila.alturas.reduce((a, b) => a + b, 0);
    expect(suma).toBeCloseTo(3, 1);
  });

  it("nunca pasa del alto máximo, por más copos que caigan", () => {
    const pila = new Acumulacion({ ancho: 400, aporte: 5 });
    for (let i = 0; i < 3000; i++) pila.deposita((i * 37) % 400);
    expect(Math.max(...pila.alturas)).toBeLessThanOrEqual(ALTO_MAXIMO + 1);
    expect(Math.max(...pila.alturas)).toBeGreaterThan(ALTO_MAXIMO * 0.6);
  });

  it("la nieve no se apila en pared: entre dos columnas vecinas hay un desnivel limitado", () => {
    const pila = new Acumulacion({ ancho: 400, aporte: 6 });
    for (let i = 0; i < 400; i++) pila.deposita(200);
    let mayor = 0;
    for (let i = 0; i < pila.columnas - 1; i++) mayor = Math.max(mayor, Math.abs(pila.alturas[i] - pila.alturas[i + 1]));
    // Sin alisar, un solo punto con 400 copos dejaba ~14 px de pared entre columnas vecinas
    expect(mayor).toBeLessThan(2.2);
  });

  it("avisa cada vez que cambia, para volver a dibujarla", () => {
    const pila = new Acumulacion({ ancho: 400 });
    pila.alCambiar = vi.fn();
    pila.deposita(10);
    pila.deposita(20);
    expect(pila.alCambiar).toHaveBeenCalledTimes(2);
  });

  it("al cambiar el ancho conserva la forma que ya tenía", () => {
    const pila = new Acumulacion({ ancho: 400, aporte: 4 });
    for (let i = 0; i < 50; i++) pila.deposita(100);
    const antes = pila.alturaEn(100);
    pila.redimensionar(800);
    expect(pila.columnas).toBe(200);
    expect(Math.abs(pila.alturaEn(200) - antes)).toBeLessThan(1);
    expect(pila.alturaEn(700)).toBe(0);
  });

  it("deposita en los bordes sin fallar y alturaEn tolera x fuera del ancho", () => {
    const pila = new Acumulacion({ ancho: 400, aporte: 2 });
    expect(() => {
      pila.deposita(0);
      pila.deposita(399);
      pila.deposita(-50);
      pila.deposita(900);
    }).not.toThrow();
    expect(Number.isFinite(pila.alturaEn(-10))).toBe(true);
    expect(Number.isFinite(pila.alturaEn(5000))).toBe(true);
  });
});

describe("aportePorCopo", () => {
  it("más copos, menos aporte cada uno; más ancho, más aporte cada uno", () => {
    const base = { ancho: 1000, copos: 100, altoVentana: 800 };
    expect(aportePorCopo({ ...base, copos: 200 })).toBeLessThan(aportePorCopo(base));
    expect(aportePorCopo({ ...base, ancho: 2000 })).toBeGreaterThan(aportePorCopo(base));
  });

  it("con ese aporte la pila se llena en el tiempo previsto", () => {
    const datos = { ancho: 1280, copos: 110, altoVentana: 800, segundos: 150 };
    const aporte = aportePorCopo(datos);
    const columnas = Math.ceil(datos.ancho / ANCHO_COLUMNA);
    const aterrizajes = ((datos.copos * 60 * 1.4) / datos.altoVentana) * datos.segundos;
    expect((aporte * aterrizajes) / columnas).toBeCloseTo(ALTO_MAXIMO * 0.8, 5);
  });
});
