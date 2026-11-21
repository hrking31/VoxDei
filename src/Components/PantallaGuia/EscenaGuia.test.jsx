import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import EscenaGuia from "./EscenaGuia.jsx";
import { ESTILOS_POR_DEFECTO } from "../Estilos/EstilosProyeccion.js";

afterEach(cleanup);

const medidas = { ancho: 1920, alto: 1080, tipo: "proyector" };
const dibujar = (props) => render(<EscenaGuia estilos={ESTILOS_POR_DEFECTO} medidas={medidas} titulo="" ticker="" {...props} />);
const escena = () => document.querySelector("[data-escena-guia]");

describe("EscenaGuia", () => {
  it("se dibuja con las medidas reales del proyector", () => {
    dibujar({ centro: null });
    expect(escena().style.width).toBe("1920px");
    expect(escena().style.height).toBe("1080px");
    dibujar({ centro: null, medidas: { ancho: 1280, alto: 720, tipo: "desktop" } });
    expect(document.querySelectorAll("[data-escena-guia]")[1].style.width).toBe("1280px");
  });

  it("pinta un mensaje con su texto", () => {
    dibujar({ centro: { tipo: "mensaje", contenido: "Bienvenidos a casa" } });
    expect(escena().textContent).toContain("Bienvenidos a casa");
  });

  it("un versículo lleva su texto, la cita y el aviso de derechos de la Biblia", () => {
    dibujar({ centro: { tipo: "versiculo", contenido: { texto: "Jehová es mi pastor", cita: "Salmo 23:1", titulo: "Salmo 23", version: "RVR1960" } } });
    const texto = escena().textContent;
    expect(texto).toContain("Salmo 23");
    expect(texto).toContain("Jehová es mi pastor");
    expect(texto).toContain("Salmo 23:1");
    expect(texto).toContain("Reina-Valera 1960");
  });

  it("la cita se omite si Estilos y colores lo dice", () => {
    const estilos = { ...ESTILOS_POR_DEFECTO, versiculo: { ...ESTILOS_POR_DEFECTO.versiculo, mostrarCita: false } };
    dibujar({ estilos, centro: { tipo: "versiculo", contenido: { texto: "x", cita: "Juan 3:16", titulo: "", version: "RVR1960" } } });
    expect(escena().textContent).not.toContain("Juan 3:16");
  });

  it("el título y el ticker salen solo si llegan", () => {
    dibujar({ centro: null });
    expect(document.querySelector("[data-escena-titulo]")).toBeNull();
    expect(document.querySelector("[data-escena-ticker]")).toBeNull();
    cleanup();
    dibujar({ centro: null, titulo: "La fe", ticker: "Reunión el viernes" });
    expect(document.querySelector("[data-escena-titulo]").textContent).toBe("La fe");
    expect(document.querySelector("[data-escena-ticker]").textContent).toBe("Reunión el viernes");
  });

  it("usa los colores de Estilos y colores", () => {
    const estilos = { ...ESTILOS_POR_DEFECTO, ticker: { ...ESTILOS_POR_DEFECTO.ticker, colorFondo: "#ff0000" } };
    dibujar({ estilos, centro: null, ticker: "Anuncio" });
    expect(document.querySelector("[data-escena-ticker]").style.backgroundColor).toBe("rgb(255, 0, 0)");
  });

  it("una imagen se muestra entera", () => {
    dibujar({ centro: { tipo: "imagen", contenido: { url: "https://x.test/f.jpg", nombre: "Foto" } } });
    const img = escena().querySelector("img");
    expect(img.getAttribute("src")).toBe("https://x.test/f.jpg");
    expect(img.className).toContain("object-contain");
  });

  it("avisa de la cabida al dibujar; sin diseño real (jsdom) todo está bien", () => {
    const alMedir = vi.fn();
    dibujar({ centro: { tipo: "mensaje", contenido: "Hola" }, alMedir });
    expect(alMedir).toHaveBeenCalledWith("bien", expect.any(Object));
  });

  it("junto con el veredicto avisa cuánto se llenó el espacio del centro (sin diseño real, 0)", () => {
    const alMedir = vi.fn();
    dibujar({ centro: { tipo: "mensaje", contenido: "Hola" }, alMedir });
    expect(alMedir).toHaveBeenCalledWith("bien", { llenado: 0 });
  });

  it("NO vuelve a medir ni a avisar al redibujarse con lo mismo, aunque lleguen objetos y funciones nuevos (así no hay bucle de avisos)", () => {
    const alMedir = vi.fn();
    const { rerender } = dibujar({ centro: { tipo: "mensaje", contenido: "Hola" }, alMedir });
    const veces = alMedir.mock.calls.length;
    for (let i = 0; i < 5; i++) {
      // El que lo usa pasa en cada dibujo un `centro`, unos `estilos` y un `alMedir` nuevos, con el mismo contenido
      rerender(
        <EscenaGuia
          estilos={{ ...ESTILOS_POR_DEFECTO }}
          medidas={{ ...medidas }}
          titulo=""
          ticker=""
          centro={{ tipo: "mensaje", contenido: "Hola" }}
          alMedir={(estado) => alMedir(estado)}
        />
      );
    }
    expect(alMedir.mock.calls.length).toBe(veces);
  });

  it("vuelve a medir cuando cambia lo dibujado (el texto, el título, las medidas) y avisa al último alMedir recibido", () => {
    const primero = vi.fn();
    const segundo = vi.fn();
    const { rerender } = dibujar({ centro: { tipo: "mensaje", contenido: "Hola" }, alMedir: primero });
    expect(primero).toHaveBeenCalledTimes(1);
    rerender(<EscenaGuia estilos={ESTILOS_POR_DEFECTO} medidas={medidas} titulo="" ticker="" centro={{ tipo: "mensaje", contenido: "Hola, hermanos" }} alMedir={segundo} />);
    expect(segundo).toHaveBeenCalledTimes(1);
    rerender(<EscenaGuia estilos={ESTILOS_POR_DEFECTO} medidas={medidas} titulo="La fe" ticker="" centro={{ tipo: "mensaje", contenido: "Hola, hermanos" }} alMedir={segundo} />);
    expect(segundo).toHaveBeenCalledTimes(2);
    rerender(<EscenaGuia estilos={ESTILOS_POR_DEFECTO} medidas={{ ancho: 1280, alto: 720, tipo: "desktop" }} titulo="La fe" ticker="" centro={{ tipo: "mensaje", contenido: "Hola, hermanos" }} alMedir={segundo} />);
    expect(segundo).toHaveBeenCalledTimes(3);
  });
});
