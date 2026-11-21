import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";

// La escena real se prueba en EscenaGuia.test.jsx; aquí importa cómo la usa el medidor. La falsa decide
// con una regla inventada: caben `escena.capacidad` renglones, y nunca cabe un punto que diga «enorme».
const escena = vi.hoisted(() => ({ capacidad: 3, vistos: [], medidas: [], sinMedir: false }));
vi.mock("../PantallaGuia/EscenaGuia.jsx", async () => {
  const { useLayoutEffect } = await import("react");
  return {
    default: function EscenaFalsa({ centro, titulo, estilos, medidas, alMedir }) {
      const renglones = centro.contenido.split("\n");
      useLayoutEffect(() => {
        escena.vistos.push(centro.contenido);
        escena.medidas.push({ ancho: medidas.ancho, titulo });
        // Con `sinMedir` la escena no contesta: el medidor se queda esperando (para ver su caja)
        if (escena.sinMedir) return;
        const enorme = renglones.some((r) => r.includes("enorme")) && (renglones.length > 1 || centro.contenido.includes("sola"));
        const pasada = renglones.length > escena.capacidad || enorme;
        alMedir?.(pasada ? "no-cabe" : renglones.length === escena.capacidad ? "justo" : "bien", { llenado: renglones.length / escena.capacidad });
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [centro.contenido]);
      return (
        <div data-escena-falsa data-alineacion={centro.alineacion} data-titulo={titulo} data-fondo={estilos?.fondo?.color ?? ""}>
          {centro.contenido}
        </div>
      );
    },
  };
});

import MedidorPuntos from "./MedidorPuntos.jsx";
import { ESTILOS_POR_DEFECTO } from "../Estilos/EstilosProyeccion.js";
import { numerosDePuntos } from "./utilesPredica.js";

beforeEach(() => {
  escena.capacidad = 3;
  escena.vistos = [];
  escena.medidas = [];
  escena.sinMedir = false;
});
afterEach(cleanup);

const punto = (id, contenido = id) => ({ id, tipo: "titulo", contenido });
const ocho = Array.from({ length: 8 }, (_, i) => punto(`p${i + 1}`, `Punto ${i + 1}`));
const medidas = { ancho: 1280, alto: 720, tipo: "desktop" };

const montar = (props = {}) => {
  const alTerminar = vi.fn();
  const base = { firma: "a", puntos: ocho, cortes: [], numeros: numerosDePuntos(ocho), medidas, estilos: ESTILOS_POR_DEFECTO, titulo: "La fe", alTerminar };
  const resultado = render(<MedidorPuntos {...base} {...props} />);
  const volver = (nuevas) => resultado.rerender(<MedidorPuntos {...base} {...props} {...nuevas} />);
  return { ...resultado, alTerminar: props.alTerminar || alTerminar, volver };
};
const ids = (grupos) => grupos.map((g) => g.ids);

describe("MedidorPuntos", () => {
  it("reparte los puntos en pantallas según lo que cabe y avisa una sola vez al terminar", async () => {
    const { alTerminar } = montar();
    await waitFor(() => expect(alTerminar).toHaveBeenCalledTimes(1));
    const grupos = alTerminar.mock.calls[0][0];
    expect(ids(grupos)).toEqual([["p1", "p2", "p3"], ["p4", "p5", "p6"], ["p7", "p8"]]);
    expect(grupos.map((g) => g.estado)).toEqual(["justo", "justo", "bien"]);
    expect(grupos[2].llenado).toBeCloseTo(2 / 3);
    // No avisa más veces aunque se vuelva a pintar
    await new Promise((r) => setTimeout(r, 20));
    expect(alTerminar).toHaveBeenCalledTimes(1);
  });

  it("mide con la numeración ORIGINAL (la numeración continúa): la segunda pantalla empieza en «IV.»", async () => {
    const { alTerminar } = montar();
    await waitFor(() => expect(alTerminar).toHaveBeenCalled());
    // Se probó, entre otros, el grupo que empieza en el punto 4, con su número de verdad
    expect(escena.vistos).toContain("IV. Punto 4");
    expect(escena.vistos).toContain("IV. Punto 4\nV. Punto 5");
    // Nunca vuelve a empezar la cuenta con «I.» en un grupo que no empieza en el primer punto
    expect(escena.vistos.filter((v) => v.startsWith("I. Punto 4"))).toEqual([]);
  });

  it("la escena se dibuja con la alineación del resumen, con el título de la prédica y con las medidas del templo", async () => {
    const { alTerminar } = montar();
    await waitFor(() => expect(alTerminar).toHaveBeenCalled());
    expect(escena.medidas.every((m) => m.ancho === 1280 && m.titulo === "La fe")).toBe(true);
  });

  it("respeta los cortes manuales", async () => {
    escena.capacidad = 20;
    const { alTerminar } = montar({ cortes: ["p3", "p7"] });
    await waitFor(() => expect(alTerminar).toHaveBeenCalledTimes(1));
    expect(ids(alTerminar.mock.calls[0][0])).toEqual([["p1", "p2"], ["p3", "p4", "p5", "p6"], ["p7", "p8"]]);
  });

  it("un punto que no cabe ni solo forma su pantalla, marcada «no-cabe»", async () => {
    escena.capacidad = 5;
    const puntos = [punto("a"), punto("b"), punto("x", "enorme sola"), punto("c")];
    const { alTerminar } = montar({ puntos, numeros: numerosDePuntos(puntos) });
    await waitFor(() => expect(alTerminar).toHaveBeenCalledTimes(1));
    const grupos = alTerminar.mock.calls[0][0];
    expect(ids(grupos)).toEqual([["a", "b"], ["x"], ["c"]]);
    expect(grupos.map((g) => g.estado)).toEqual(["bien", "no-cabe", "bien"]);
  });

  it("vuelve a medir cuando cambia lo que influye (otra firma) y avisa con la nueva agrupación", async () => {
    const { alTerminar, volver } = montar();
    await waitFor(() => expect(alTerminar).toHaveBeenCalledTimes(1));
    escena.capacidad = 5;
    volver({ firma: "b" });
    await waitFor(() => expect(alTerminar).toHaveBeenCalledTimes(2));
    expect(ids(alTerminar.mock.calls[1][0])).toEqual([["p1", "p2", "p3", "p4", "p5"], ["p6", "p7", "p8"]]);
  });

  it("con la misma firma no vuelve a medir", async () => {
    const { alTerminar, volver } = montar();
    await waitFor(() => expect(alTerminar).toHaveBeenCalledTimes(1));
    const dibujos = escena.vistos.length;
    volver({});
    volver({});
    expect(alTerminar).toHaveBeenCalledTimes(1);
    expect(escena.vistos.length).toBe(dibujos);
  });

  it("sin puntos, avisa de inmediato con una lista vacía y no dibuja nada", async () => {
    const { alTerminar } = montar({ puntos: [], numeros: {} });
    await waitFor(() => expect(alTerminar).toHaveBeenCalledWith([]));
    expect(document.querySelector("[data-medidor-puntos]")).toBeNull();
  });

  it("mientras mide, la escena está fuera de la vista, sin poder tocarse ni leerse", () => {
    escena.sinMedir = true;
    const { container } = render(
      <MedidorPuntos firma="a" puntos={ocho} cortes={[]} numeros={numerosDePuntos(ocho)} medidas={medidas} estilos={ESTILOS_POR_DEFECTO} titulo="" alTerminar={vi.fn()} />
    );
    const caja = container.querySelector("[data-medidor-puntos]");
    expect(caja).not.toBeNull();
    expect(caja.getAttribute("aria-hidden")).toBe("true");
    expect(caja.style.position).toBe("fixed");
    expect(caja.style.visibility).toBe("hidden");
    expect(caja.style.pointerEvents).toBe("none");
    expect(parseInt(caja.style.left, 10)).toBeLessThan(-10000);
    // Y prueba de a un punto: el primero solo
    expect(container.querySelector("[data-escena-falsa]").textContent).toBe("I. Punto 1");
  });
});
