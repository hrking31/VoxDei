import { describe, expect, it } from "vitest";
import { GRUPOS, INICIO, SECCIONES, estaActiva, seccionesPara } from "./Secciones.js";

const seccion = (nombre) => SECCIONES.find((s) => s.nombre === nombre);

describe("seccionesPara", () => {
  it("al pastor y a la pastora les muestra todas, con Prédica", () => {
    for (const role of ["Pastor", "Pastora"]) {
      const nombres = seccionesPara({ role }).map((s) => s.nombre);
      expect(nombres).toContain("Prédica");
      expect(nombres).toHaveLength(SECCIONES.length);
    }
  });

  it("al operador le oculta Prédica y nada más", () => {
    const nombres = seccionesPara({ role: "Operador" }).map((s) => s.nombre);
    expect(nombres).not.toContain("Prédica");
    expect(nombres).toHaveLength(SECCIONES.length - 1);
  });

  it("sin ficha no concede Prédica", () => {
    expect(seccionesPara(undefined).map((s) => s.nombre)).not.toContain("Prédica");
  });
});

describe("estaActiva", () => {
  it("enciende la sección de la ruta exacta", () => {
    expect(estaActiva(seccion("Biblia"), "/ViewVersiculo")).toBe(true);
    expect(estaActiva(seccion("Biblia"), "/ViewCanciones")).toBe(false);
  });

  it("no distingue mayúsculas, igual que el enrutador", () => {
    expect(estaActiva(seccion("Ticker"), "/viewTicker")).toBe(true);
  });

  it("dentro de una canción sigue encendida Canciones", () => {
    expect(estaActiva(seccion("Canciones"), "/ViewCancion/abc123")).toBe(true);
    expect(estaActiva(seccion("Canciones"), "/ViewCancionEditar")).toBe(true);
    expect(estaActiva(seccion("Canciones"), "/ViewCancionEditar/abc123")).toBe(true);
  });

  it("al editar un servicio sigue encendido Cronograma", () => {
    expect(estaActiva(seccion("Cronograma"), "/ViewServicioEditar/x")).toBe(true);
  });

  it("Inicio solo se enciende en Gestión", () => {
    expect(estaActiva(INICIO, "/ViewGestion")).toBe(true);
    expect(estaActiva(INICIO, "/ViewUsers")).toBe(false);
  });
});

describe("la lista", () => {
  it("cada sección pertenece a un grupo que existe", () => {
    const ids = GRUPOS.map((g) => g.id);
    for (const s of SECCIONES) expect(ids).toContain(s.grupo);
  });

  it("no repite rutas", () => {
    const rutas = SECCIONES.map((s) => s.ruta.toLowerCase());
    expect(new Set(rutas).size).toBe(rutas.length);
  });
});
