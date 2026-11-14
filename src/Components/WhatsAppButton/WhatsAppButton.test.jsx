import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import WhatsAppButton from "./WhatsAppButton.jsx";
import { montar } from "../Navegacion/pruebas.utils.jsx";

// El enlace de WhatsApp lleva el bosquejo como texto: se decodifica para leerlo.
const textoDelEnlace = () => {
  const enlace = screen.getByTitle("Compartir");
  const url = new URL(enlace.getAttribute("href"));
  return { url, texto: url.searchParams.get("text") };
};

describe("WhatsAppButton", () => {
  it("abre wa.me en otra pestaña y sin pasar datos de la página", () => {
    montar(<WhatsAppButton message="Hola" title="Compartir" />);
    const enlace = screen.getByTitle("Compartir");
    expect(enlace.getAttribute("target")).toBe("_blank");
    expect(enlace.getAttribute("rel")).toBe("noopener noreferrer");
    expect(textoDelEnlace().url.origin + textoDelEnlace().url.pathname).toBe("https://wa.me/");
  });

  it("manda un texto tal cual", () => {
    montar(<WhatsAppButton message="Culto a las 10" title="Compartir" />);
    expect(textoDelEnlace().texto).toBe("Culto a las 10");
  });

  it("arma el bosquejo con un símbolo por tipo de ítem", () => {
    montar(
      <WhatsAppButton
        title="Compartir"
        message={[
          { tipo: "titulo", contenido: "La fe ve" },
          { tipo: "versiculo", contenido: { cita: "Juan 3:16", texto: "Porque de tal manera" } },
          { tipo: "imagen", contenido: { url: "https://x.test/a.jpg" } },
          { tipo: "mensaje", contenido: "Amén" },
        ]}
      />
    );
    const { texto } = textoDelEnlace();
    expect(texto).toContain("📘 La fe ve");
    expect(texto).toContain("📖 Juan 3:16: Porque de tal manera");
    expect(texto).toContain("🖼️ [Imagen] https://x.test/a.jpg");
    expect(texto).toContain("💬 Amén");
  });

  it("codifica &, # y + para que no corten ni corrompan el mensaje", () => {
    montar(<WhatsAppButton message="a&b #c +d" title="Compartir" />);
    const href = screen.getByTitle("Compartir").getAttribute("href");
    expect(href).not.toMatch(/[&#+ ]/); // solo el «?text=» del enlace
    expect(textoDelEnlace().texto).toBe("a&b #c +d");
  });

  it("sin mensaje no se rompe", () => {
    montar(<WhatsAppButton title="Compartir" />);
    expect(textoDelEnlace().texto).toBe("");
  });
});
