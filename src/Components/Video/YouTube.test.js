import { describe, expect, it } from "vitest";
import { TOLERANCIA_SEGUNDOS, idDeYouTube, miniaturaDe } from "./YouTube.js";

describe("idDeYouTube", () => {
  const ID = "dQw4w9WgXcQ";

  it("reconoce cada forma de enlace de YouTube", () => {
    expect(idDeYouTube(`https://youtu.be/${ID}`)).toBe(ID);
    expect(idDeYouTube(`https://www.youtube.com/watch?v=${ID}`)).toBe(ID);
    expect(idDeYouTube(`https://www.youtube.com/watch?feature=share&v=${ID}`)).toBe(ID);
    expect(idDeYouTube(`https://www.youtube.com/embed/${ID}`)).toBe(ID);
    expect(idDeYouTube(`https://www.youtube.com/shorts/${ID}`)).toBe(ID);
    expect(idDeYouTube(`https://www.youtube.com/live/${ID}`)).toBe(ID);
  });

  it("acepta el identificador pegado solo y tolera espacios alrededor", () => {
    expect(idDeYouTube(ID)).toBe(ID);
    expect(idDeYouTube(`  ${ID}  `)).toBe(ID);
  });

  it("devuelve null con lo que no es un enlace de YouTube", () => {
    expect(idDeYouTube("")).toBeNull();
    expect(idDeYouTube(null)).toBeNull();
    expect(idDeYouTube(undefined)).toBeNull();
    expect(idDeYouTube("hola mundo")).toBeNull();
    expect(idDeYouTube("https://example.com/video")).toBeNull();
    expect(idDeYouTube("corto")).toBeNull();
  });
});

describe("miniaturaDe y tolerancia", () => {
  it("la miniatura es la de mqdefault de i.ytimg.com (la que permite la CSP)", () => {
    expect(miniaturaDe("abc")).toBe("https://i.ytimg.com/vi/abc/mqdefault.jpg");
  });

  it("la tolerancia de la proyección es de un segundo y medio", () => {
    expect(TOLERANCIA_SEGUNDOS).toBe(1.5);
  });
});
