import { beforeEach, describe, expect, it, vi } from "vitest";

// Firebase de mentira: lo que se escribe queda anotado, en orden.
const fb = vi.hoisted(() => ({ escrito: [], creados: [] }));
vi.mock("../Firebase/Firebase", () => ({ db: {}, database: {} }));
vi.mock("firebase/database", () => ({
  ref: (_db, ruta) => ruta,
  set: vi.fn(async (ruta, datos) => fb.escrito.push({ ruta, datos })),
}));
vi.mock("firebase/firestore", () => ({
  collection: (_db, ...partes) => partes.join("/"),
  doc: (_db, ...partes) => partes.join("/"),
  addDoc: vi.fn(async (ruta, datos) => {
    fb.creados.push({ ruta, datos });
    return { id: "nueva" };
  }),
  setDoc: vi.fn(async () => {}),
  deleteDoc: vi.fn(async () => {}),
  serverTimestamp: () => "ahora",
}));

import { apagarImagen, cambiarVisible, crearPredica, encenderImagen, proyectarPieza } from "./accionesPredica.js";

beforeEach(() => {
  fb.escrito = [];
  fb.creados = [];
});

const rutas = () => fb.escrito.map((e) => e.ruta);

describe("proyectarPieza: qué se escribe en la pantalla y en qué orden", () => {
  it("el nombre de la prédica sube a título ANTES del ítem y con su mismo display (si no, el centro quedaría vacío)", async () => {
    await proyectarPieza("g1", { tipo: "versiculo", contenido: { cita: "Juan 3:16", texto: "Porque…", version: "DHHS94" } }, { tituloArriba: "La fe" });
    expect(rutas()).toEqual(["displayTitulo/g1", "displayVersiculo/g1"]);
    expect(fb.escrito[0].datos).toMatchObject({ text: "La fe", display: "versiculo" });
    expect(fb.escrito[1].datos).toMatchObject({ cita: "Juan 3:16", display: "versiculo", version: "DHHS94" });

    fb.escrito = [];
    await proyectarPieza("g1", { tipo: "mensaje", contenido: "Hola" }, { tituloArriba: "La fe" });
    expect(fb.escrito.map((e) => e.datos.display)).toEqual(["mensajePredica", "mensajePredica"]);
  });

  it("sin tituloArriba no toca la franja de título; un versículo de antes sin versión va como RVR1960", async () => {
    await proyectarPieza("g1", { tipo: "versiculo", contenido: { cita: "Juan 3:16", texto: "Porque…" } });
    expect(rutas()).toEqual(["displayVersiculo/g1"]);
    expect(fb.escrito[0].datos.version).toBe("RVR1960");
  });

  it("el resumen lleva su alineación; un mensaje cualquiera, no", async () => {
    await proyectarPieza("g1", { tipo: "mensaje", contenido: "I. Uno\nII. Dos", alineacion: "izquierda" });
    await proyectarPieza("g1", { tipo: "mensaje", contenido: "Hola" });
    expect(fb.escrito[0].datos).toMatchObject({ display: "mensajePredica", alineacion: "izquierda" });
    expect("alineacion" in fb.escrito[1].datos).toBe(false);
  });

  it("una imagen va por el canal de Imágenes y se enciende; con la imagen encendida, otro ítem la apaga primero", async () => {
    await proyectarPieza("g1", { tipo: "imagen", contenido: { url: "https://img/a.jpg" } });
    expect(rutas()).toEqual(["displayImage/g1", "displayVisibleImagen/g1"]);
    expect(fb.escrito[1].datos.visibleImagen).toBe(true);
    fb.escrito = [];
    await proyectarPieza("g1", { tipo: "mensaje", contenido: "Hola" }, { imagenEncendida: true });
    expect(rutas()).toEqual(["displayVisibleImagen/g1", "displayMessage/g1"]);
    expect(fb.escrito[0].datos.visibleImagen).toBe(false);
  });

  it("encender y apagar la imagen, y los interruptores, escriben en su nodo", async () => {
    await encenderImagen("g1");
    await apagarImagen("g1");
    await cambiarVisible("g1", "titulo", true);
    await cambiarVisible("g1", "texto", false);
    await cambiarVisible("g1", "ticker", true);
    expect(fb.escrito.map((e) => [e.ruta, Object.values(e.datos)[0]])).toEqual([
      ["displayVisibleImagen/g1", true],
      ["displayVisibleImagen/g1", false],
      ["displayVisibleTitulo/g1", true],
      ["displayVisibleTexto/g1", false],
      ["displayVisibleTicker/g1", true],
    ]);
  });
});

describe("crearPredica", () => {
  it("siempre nace borrador (así se vuelve a borrador: duplicando) y copia versículo base y numeración", async () => {
    await crearPredica("g1", {
      titulo: "La fe (copia)",
      fecha: "",
      estado: "terminada",
      base: "Juan 3:16",
      numeracion: "letras",
      numeracionNiveles: ["numeros-parentesis", null],
    });
    expect(fb.creados[0].ruta).toBe("iglesias/g1/predicas");
    expect(fb.creados[0].datos).toMatchObject({
      titulo: "La fe (copia)",
      estado: "borrador",
      base: "Juan 3:16",
      numeracion: "letras",
      numeracionNiveles: ["numeros-parentesis", null],
    });
  });
});
