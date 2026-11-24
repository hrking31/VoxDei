import { afterEach, describe, expect, it, vi } from "vitest";
import { getSize, igualProfundo, lerp, random, randomElement } from "./utils.js";
import Snowflake from "./Snowflake.js";
import { SnowfallCanvas } from "./SnowfallCanvas.js";
import { crearCopos } from "./copos.js";

afterEach(() => vi.restoreAllMocks());

describe("utils del motor de nieve", () => {
  it("random devuelve enteros entre dos enteros y decimales si alguno lo es", () => {
    for (let i = 0; i < 50; i++) {
      const entero = random(2, 5);
      expect(Number.isInteger(entero)).toBe(true);
      expect(entero).toBeGreaterThanOrEqual(2);
      expect(entero).toBeLessThanOrEqual(5);
      const decimal = random(0.5, 3);
      expect(decimal).toBeGreaterThanOrEqual(0.5);
      expect(decimal).toBeLessThan(3);
    }
  });

  it("lerp se acerca al objetivo según el ritmo", () => {
    expect(lerp(0, 10, 0)).toBe(0);
    expect(lerp(0, 10, 1)).toBe(10);
    expect(lerp(0, 10, 0.5)).toBe(5);
  });

  it("randomElement elige uno de la lista", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    expect(randomElement(["a", "b", "c"])).toBe("c");
  });

  it("getSize mide un elemento y da ceros sin elemento", () => {
    expect(getSize(null)).toEqual({ height: 0, width: 0 });
    expect(getSize({ offsetHeight: 7, offsetWidth: 9 })).toEqual({ height: 7, width: 9 });
  });

  it("igualProfundo compara listas y objetos por contenido y lo demás por referencia", () => {
    expect(igualProfundo([1, [2, 3]], [1, [2, 3]])).toBe(true);
    expect(igualProfundo([1, 2], [1, 3])).toBe(false);
    expect(igualProfundo([1], [1, 2])).toBe(false);
    expect(igualProfundo({ a: [1], b: 2 }, { b: 2, a: [1] })).toBe(true);
    expect(igualProfundo({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    expect(igualProfundo(undefined, undefined)).toBe(true);
    expect(igualProfundo(undefined, [1])).toBe(false);
    const imagen = {};
    expect(igualProfundo([imagen], [imagen])).toBe(true);
    expect(igualProfundo([{}], [{}])).toBe(true);
    expect(igualProfundo(new Date(1), new Date(1))).toBe(false);
  });
});

const canvasFalso = { offsetWidth: 200, offsetHeight: 100, getContext: () => null };

describe("Snowflake", () => {
  it("crea la cantidad pedida y ninguno sin canvas", () => {
    expect(Snowflake.createSnowflakes(canvasFalso, 7, {})).toHaveLength(7);
    expect(Snowflake.createSnowflakes(null, 7, {})).toEqual([]);
  });

  it("cae, y al salir por abajo vuelve a entrar por arriba", () => {
    const [copo] = Snowflake.createSnowflakes(canvasFalso, 1, { speed: [2, 2], wind: [0, 0], radius: [4, 4] });
    copo.params.y = 50;
    copo.update(200, 100, 1);
    expect(copo.params.y).toBeGreaterThan(50);
    copo.params.y = 99;
    copo.update(200, 100, 10);
    // (99 + 2 * 10) % (100 + 4 * 2) = 11: vuelve a entrar por arriba
    expect(copo.params.y).toBe(11);
  });

  it("sin suelo ni aviso se comporta como el original: aterriza abajo y no falla", () => {
    const [copo] = Snowflake.createSnowflakes(canvasFalso, 1, { speed: [2, 2], wind: [0, 0], radius: [4, 4] });
    copo.params.y = 99;
    expect(() => copo.update(200, 100, 1)).not.toThrow();
  });

  it("con suelo, aterriza donde empieza la nieve acumulada y avisa dónde", () => {
    const onLand = vi.fn();
    const [copo] = Snowflake.createSnowflakes(canvasFalso, 1, { speed: [1, 1], wind: [0, 0], radius: [4, 4], getSuelo: () => 20, onLand });
    copo.params.x = 50;
    // Sin suelo seguiría cayendo hasta 100 + 4; con 20 px de nieve, aterriza pasados los 84
    copo.params.y = 70;
    copo.update(200, 100, 1);
    expect(onLand).not.toHaveBeenCalled();
    copo.params.y = 84;
    copo.update(200, 100, 1);
    expect(onLand).toHaveBeenCalledTimes(1);
    expect(onLand).toHaveBeenCalledWith(50, 4, 200);
    expect(copo.params.y).toBe(-4);
  });

  it("el suelo se consulta en la x del copo", () => {
    const getSuelo = vi.fn(() => 0);
    const [copo] = Snowflake.createSnowflakes(canvasFalso, 1, { speed: [0, 0], wind: [0, 0], radius: [4, 4], getSuelo });
    copo.params.x = 123;
    copo.update(200, 100, 1);
    expect(getSuelo).toHaveBeenCalledWith(123);
  });

  it("si sale por un lado vuelve a entrar por el otro", () => {
    const [copo] = Snowflake.createSnowflakes(canvasFalso, 1, { speed: [0, 0], wind: [3, 3], radius: [4, 4] });
    copo.params.x = 199;
    copo.update(200, 100, 5);
    // (199 + 3 * 5) % (200 + 4 * 2) = 6: vuelve a entrar por la izquierda
    expect(copo.params.x).toBe(6);
  });
});

describe("SnowfallCanvas", () => {
  it("sin contexto de dibujo no falla y se puede pausar", () => {
    vi.spyOn(globalThis, "requestAnimationFrame").mockReturnValue(1);
    const cancelar = vi.spyOn(globalThis, "cancelAnimationFrame").mockImplementation(() => {});
    const nieve = new SnowfallCanvas(canvasFalso, { snowflakeCount: 5 });
    expect(nieve.snowflakes).toHaveLength(5);
    nieve.pause();
    expect(cancelar).toHaveBeenCalledWith(1);
  });

  it("al cambiar la cantidad crea o quita copos conservando los que quedan", () => {
    vi.spyOn(globalThis, "requestAnimationFrame").mockReturnValue(1);
    const nieve = new SnowfallCanvas(canvasFalso, { snowflakeCount: 5 });
    const primero = nieve.snowflakes[0];
    nieve.updateConfig({ snowflakeCount: 9 });
    expect(nieve.snowflakes).toHaveLength(9);
    nieve.updateConfig({ snowflakeCount: 3 });
    expect(nieve.snowflakes).toHaveLength(3);
    expect(nieve.snowflakes[0]).toBe(primero);
  });

  it("dibuja cada copo con su imagen cuando la configuración trae imágenes", () => {
    vi.spyOn(globalThis, "requestAnimationFrame").mockReturnValue(1);
    const ctx = {
      setTransform: vi.fn(), clearRect: vi.fn(), save: vi.fn(), restore: vi.fn(), drawImage: vi.fn(), globalAlpha: 1,
    };
    const lienzoConContexto = { offsetWidth: 200, offsetHeight: 100, getContext: () => ctx };
    const imagen = document.createElement("canvas");
    const nieve = new SnowfallCanvas(lienzoConContexto, { snowflakeCount: 4, images: [imagen], radius: [4, 4] });
    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 200, 100);
    expect(ctx.drawImage).toHaveBeenCalledTimes(4);
    nieve.pause();
  });
});

describe("copos", () => {
  it("crea varios dibujos, más suaves que cristales", () => {
    const copos = crearCopos();
    expect(copos.length).toBeGreaterThanOrEqual(4);
    for (const copo of copos) {
      expect(copo.width).toBe(64);
      expect(copo.height).toBe(64);
    }
  });
});
