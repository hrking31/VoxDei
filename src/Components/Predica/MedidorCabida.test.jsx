import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// Las medidas del templo y la escena, de mentira: la escena verdadera se prueba
// en EscenaGuia.test.jsx; aquí importa cómo la usa el medidor.
const templo = vi.hoisted(() => ({ medidas: { ancho: 1280, alto: 720, tipo: "desktop" } }));
vi.mock("../PantallaGuia/useEspejoTemplo.js", () => ({ useMedidasTemplo: () => templo.medidas }));
vi.mock("../PantallaGuia/EscenaGuia.jsx", async () => {
  const { useLayoutEffect } = await import("react");
  return {
    default: function EscenaFalsa({ centro, titulo, ticker, medidas, estilos, alMedir }) {
      // Un mensaje que dice «largo» no cabe; «justo», va justo; lo demás cabe.
      useLayoutEffect(() => {
        alMedir?.(centro.contenido === "largo" ? "no-cabe" : centro.contenido === "justo" ? "justo" : "bien");
      });
      return (
        <div data-escena-falsa data-ancho={medidas.ancho} data-alto={medidas.alto} data-titulo={titulo} data-ticker={ticker} data-fondo={estilos.fondo?.color ?? ""}>
          {centro.contenido}
        </div>
      );
    },
  };
});

import MedidorCabida from "./MedidorCabida.jsx";
import { montar } from "../Navegacion/pruebas.utils.jsx";
import { ESTILOS_POR_DEFECTO } from "../Estilos/EstilosProyeccion.js";

afterEach(() => {
  cleanup();
  templo.medidas = { ancho: 1280, alto: 720, tipo: "desktop" };
});

const sesion = { userData: { name: "Ana", role: "Pastor", groupId: "g1" } };
const el = (id, contenido) => ({ id, centro: { tipo: "mensaje", contenido } });
const dibujar = (props, app = {}) => montar(<MedidorCabida {...props} />, { auth: sesion, app });
const escenas = () => [...document.querySelectorAll("[data-escena-falsa]")];

describe("MedidorCabida", () => {
  it("sin ítems no dibuja nada y avisa que no hay nada medido", () => {
    const alMedir = vi.fn();
    dibujar({ elementos: [], alMedir });
    expect(document.querySelector("[data-medidor-cabida]")).toBeNull();
    expect(alMedir).toHaveBeenLastCalledWith({});
  });

  it("dibuja una escena por ítem, fuera de la vista, sin que se pueda tocar ni leer", () => {
    dibujar({ elementos: [el("a", "uno"), el("b", "dos")], alMedir: vi.fn() });
    expect(escenas()).toHaveLength(2);
    const caja = document.querySelector("[data-medidor-cabida]");
    expect(caja.getAttribute("aria-hidden")).toBe("true");
    expect(caja.style.position).toBe("fixed");
    expect(caja.style.visibility).toBe("hidden");
    expect(caja.style.pointerEvents).toBe("none");
    expect(parseInt(caja.style.left, 10)).toBeLessThan(-10000);
  });

  it("mide con las medidas reales del templo y con el nombre de la prédica en la franja de título, sin anuncio", () => {
    templo.medidas = { ancho: 1920, alto: 1080, tipo: "proyector" };
    dibujar({ elementos: [el("a", "uno")], titulo: "La fe que se atreve", alMedir: vi.fn() });
    const escena = escenas()[0];
    expect(escena.dataset.ancho).toBe("1920");
    expect(escena.dataset.alto).toBe("1080");
    expect(escena.dataset.titulo).toBe("La fe que se atreve");
    expect(escena.dataset.ticker).toBe("");
  });

  it("avisa el estado de cada ítem por su id", () => {
    const alMedir = vi.fn();
    dibujar({ elementos: [el("a", "largo"), el("b", "justo"), el("c", "corto")], alMedir });
    expect(alMedir).toHaveBeenLastCalledWith({ a: "no-cabe", b: "justo", c: "bien" });
  });

  it("no se queda en bucle: avisa un número pequeño de veces aunque cada escena avise en cada dibujo", () => {
    const alMedir = vi.fn();
    dibujar({ elementos: [el("a", "largo"), el("b", "corto")], alMedir });
    expect(alMedir.mock.calls.length).toBeLessThanOrEqual(3);
  });

  it("usa los estilos de la iglesia si los hay, y los de fábrica si no", () => {
    dibujar({ elementos: [el("a", "uno")], alMedir: vi.fn() });
    expect(escenas()[0].dataset.fondo).toBe(String(ESTILOS_POR_DEFECTO.fondo?.color ?? ""));
    cleanup();
    const propios = { ...ESTILOS_POR_DEFECTO, fondo: { ...ESTILOS_POR_DEFECTO.fondo, color: "#123456" } };
    dibujar({ elementos: [el("a", "uno")], alMedir: vi.fn() }, { estilos: propios });
    expect(escenas()[0].dataset.fondo).toBe("#123456");
  });
});
