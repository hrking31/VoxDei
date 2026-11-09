import { describe, expect, it } from "vitest";
import {
  ESQUINAS_MARCA_AGUA,
  ESTILOS_POR_DEFECTO,
  combinarEstilos,
  estiloMarcaAgua,
} from "./EstilosProyeccion.js";

const con = (marcaAgua, margen = 5) =>
  combinarEstilos({ marcaAgua, legibilidad: { margen } });

describe("marca de agua en los estilos", () => {
  it("viene apagada de fábrica, abajo a la derecha", () => {
    expect(ESTILOS_POR_DEFECTO.marcaAgua).toMatchObject({ visible: false, esquina: "abajoDerecha" });
  });

  it("los estilos guardados antes de existir la marca de agua la reciben apagada", () => {
    const viejos = combinarEstilos({ texto: { color: "#fff" } });
    expect(viejos.marcaAgua.visible).toBe(false);
  });

  it("todas las esquinas ofrecidas son válidas y tienen nombre legible", () => {
    for (const { valor, nombre, texto } of ESQUINAS_MARCA_AGUA) {
      expect(valor).toMatch(/^(arriba|abajo)(Izquierda|Derecha)$/);
      expect(nombre).toMatch(/^(Arriba|Abajo) a la (izquierda|derecha)$/);
      // Sin flechas: Windows las convierte en emoji.
      expect(texto).not.toMatch(/[↖↗↙↘]/);
    }
  });
});

describe("estiloMarcaAgua", () => {
  it("se coloca en la esquina elegida, con el margen de seguridad", () => {
    const e = estiloMarcaAgua(con({ esquina: "arribaIzquierda", tamano: 10, opacidad: 40 }));
    expect(e).toMatchObject({ top: "5%", left: "5%", width: "10%", opacity: 0.4 });
    expect(e.bottom).toBeUndefined();
    expect(e.right).toBeUndefined();
  });

  it("abajo y con el ticker encendido, sube por encima del ticker", () => {
    const e = estiloMarcaAgua(con({ esquina: "abajoDerecha" }), "3rem");
    expect(e.bottom).toBe("calc(5% + 3rem)");
    expect(e.right).toBe("5%");
  });

  it("arriba no le afecta el ticker", () => {
    expect(estiloMarcaAgua(con({ esquina: "arribaDerecha" }), "3rem").top).toBe("5%");
  });

  it("nunca pega al borde aunque el margen sea 0", () => {
    expect(estiloMarcaAgua(con({ esquina: "abajoIzquierda" }, 0)).left).toBe("2%");
  });

  it("no se puede pulsar: no estorba al botón de pantalla completa", () => {
    expect(estiloMarcaAgua(con({})).pointerEvents).toBe("none");
  });
});
