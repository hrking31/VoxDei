import { describe, expect, it } from "vitest";
import { versiculosDeCapitulo } from "./versiculosCapitulo.js";

describe("versiculosDeCapitulo", () => {
  it("lee cada versículo con su número y su texto, en orden", () => {
    const lista = versiculosDeCapitulo("<p><b>1</b> Había un hombre.</p><p><b>2</b> Este vino a Jesús.</p>");
    expect(lista).toEqual([
      { numero: "1", texto: "Había un hombre.", titulo: "" },
      { numero: "2", texto: "Este vino a Jesús.", titulo: "" },
    ]);
  });

  it("el título de una sección va con el versículo que le sigue, y solo con ese", () => {
    const lista = versiculosDeCapitulo("<h2>Nicodemo</h2><p><b>1</b> Había un hombre.</p><p><b>2</b> Este vino a Jesús.</p>");
    expect(lista.map((v) => v.titulo)).toEqual(["Nicodemo", ""]);
  });

  it("la Dios Habla Hoy junta versículos: «14-15» es uno solo", () => {
    const lista = versiculosDeCapitulo("<p><b>13</b> Uno.</p><p><b>14-15</b> Dos y tres.</p><p><b>16</b> Cuatro.</p>");
    expect(lista.map((v) => v.numero)).toEqual(["13", "14-15", "16"]);
  });

  it("une el texto aunque lleve partes con formato (igual que al tocar el versículo, que une las partes con un espacio)", () => {
    const lista = versiculosDeCapitulo("<p><b>1</b> En el <i>principio</i> creó Dios.</p>");
    expect(lista[0].texto.replace(/\s+/g, " ")).toBe("En el principio creó Dios.");
  });

  it("sin HTML o sin versículos, lista vacía", () => {
    expect(versiculosDeCapitulo("")).toEqual([]);
    expect(versiculosDeCapitulo(null)).toEqual([]);
    expect(versiculosDeCapitulo("<div>nada</div>")).toEqual([]);
  });

  it("un párrafo sin número no cuenta como versículo", () => {
    expect(versiculosDeCapitulo("<p>Texto suelto</p>")).toEqual([]);
  });
});
