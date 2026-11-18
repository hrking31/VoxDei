import { describe, expect, it } from "vitest";
import { imagenesDeNodo, miniaturaDeVideo, piezaDelCentro, rutaConGuia, seVeAlgo } from "./utilesGuia.js";

const sinNada = { display: "", mensaje: "", mensajePredica: "", alineacion: null, versiculo: "", cita: "", titulo: "", ticker: "", imagenes: [], video: null };
const todoApagado = { titulo: false, texto: false, ticker: false, imagen: false, video: false, espera: false };

describe("rutaConGuia", () => {
  it("las secciones que proyectan la llevan, sin importar mayúsculas", () => {
    for (const ruta of ["/ViewVersiculo", "/ViewMessage", "/viewTicker", "/ViewImagenes", "/ViewVideo", "/ViewCulto", "/ViewCancion/abc"]) {
      expect(rutaConGuia(ruta), ruta).toBe(true);
    }
  });
  it("Prédica, la lista y el editor de canciones y las demás no", () => {
    for (const ruta of ["/ViewPredica", "/ViewCanciones", "/ViewCancionEditar", "/ViewCancionEditar/abc", "/ViewInicio", "/ViewCronograma", "/ViewUsers", "/ViewStylos", "/ViewAyuda", "/VOXDEI", "", undefined]) {
      expect(rutaConGuia(ruta), String(ruta)).toBe(false);
    }
  });
});

describe("piezaDelCentro", () => {
  it("con el texto apagado no hay nada en el centro", () => {
    expect(piezaDelCentro({ ...sinNada, display: "mensaje", mensaje: "Hola" }, todoApagado)).toBeNull();
  });
  it("un mensaje, un versículo y el resumen de la prédica", () => {
    const v = { ...todoApagado, texto: true };
    expect(piezaDelCentro({ ...sinNada, display: "mensaje", mensaje: "Hola" }, v)).toEqual({ tipo: "mensaje", contenido: "Hola" });
    expect(piezaDelCentro({ ...sinNada, display: "versiculo", versiculo: "Amó Dios", cita: "Juan 3:16" }, v)).toEqual({
      tipo: "versiculo",
      contenido: { cita: "Juan 3:16", texto: "Amó Dios" },
    });
    expect(piezaDelCentro({ ...sinNada, display: "mensajePredica", mensajePredica: "I. Fe", alineacion: "izquierda" }, v)).toEqual({
      tipo: "mensaje",
      contenido: "I. Fe",
      alineacion: "izquierda",
    });
  });
  it("sin contenido del tipo en pantalla, nada", () => {
    expect(piezaDelCentro({ ...sinNada, display: "versiculo" }, { ...todoApagado, texto: true })).toBeNull();
    expect(piezaDelCentro({ ...sinNada, display: "titulo", mensaje: "x" }, { ...todoApagado, texto: true })).toBeNull();
  });
  it("la imagen manda sobre el texto y el carrusel avanza", () => {
    const espejo = { ...sinNada, display: "mensaje", mensaje: "Hola", imagenes: ["a.jpg", "b.jpg"] };
    const v = { ...todoApagado, texto: true, imagen: true };
    expect(piezaDelCentro(espejo, v, 0).contenido.url).toBe("a.jpg");
    expect(piezaDelCentro(espejo, v, 3).contenido.url).toBe("b.jpg");
  });
  it("el video manda sobre la imagen y se ve como su miniatura", () => {
    const espejo = { ...sinNada, imagenes: ["a.jpg"], video: { videoId: "abc123", titulo: "Mi video" } };
    const pieza = piezaDelCentro(espejo, { ...todoApagado, imagen: true, video: true });
    expect(pieza.contenido.url).toBe(miniaturaDeVideo("abc123"));
    expect(pieza.contenido.nombre).toBe("Mi video");
  });
  it("la espera manda sobre todo", () => {
    const espejo = { ...sinNada, display: "mensaje", mensaje: "Hola", video: { videoId: "x" } };
    expect(piezaDelCentro(espejo, { ...todoApagado, texto: true, video: true, espera: true }).contenido).toBe("Pantalla de espera");
  });
});

describe("seVeAlgo", () => {
  it("el título y el ticker cuentan solo si están encendidos y con texto", () => {
    expect(seVeAlgo(null, sinNada, todoApagado)).toBe(false);
    expect(seVeAlgo(null, { ...sinNada, titulo: "T" }, { ...todoApagado, titulo: true })).toBe(true);
    expect(seVeAlgo(null, { ...sinNada, titulo: "T" }, todoApagado)).toBe(false);
    expect(seVeAlgo(null, { ...sinNada, ticker: "K" }, { ...todoApagado, ticker: true })).toBe(true);
    expect(seVeAlgo(null, { ...sinNada, ticker: "" }, { ...todoApagado, ticker: true })).toBe(false);
  });
  it("en la espera el título no sale", () => {
    expect(seVeAlgo(null, { ...sinNada, titulo: "T" }, { ...todoApagado, titulo: true, espera: true })).toBe(false);
  });
});

describe("imagenesDeNodo", () => {
  it("una imagen suelta, un carrusel o nada", () => {
    expect(imagenesDeNodo({ type: "single", image: "a.jpg" })).toEqual(["a.jpg"]);
    expect(imagenesDeNodo({ type: "carousel", images: ["a", "b"] })).toEqual(["a", "b"]);
    expect(imagenesDeNodo(null)).toEqual([]);
    expect(imagenesDeNodo({ type: "single" })).toEqual([]);
  });
});
