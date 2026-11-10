import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import BarraInferior, { BotonAnterior } from "./BarraInferior.jsx";
import { montar } from "./pruebas.utils.jsx";

const barra = () => document.querySelector("[data-barra-inferior]");
const enBarra = (nombre) => within(barra()).getByRole("button", { name: nombre });
const ruta = () => screen.getByTestId("ruta").textContent;
const celular = { app: { isDesktop: false } };

describe("BarraInferior", () => {
  it("tiene Biblia, Canciones, Culto en el centro, Mensajes y Más", () => {
    montar(<BarraInferior />, celular);
    const nombres = within(barra()).getAllByRole("button").map((b) => b.textContent);
    expect(nombres).toEqual(["Biblia", "Canciones", "Culto", "Mensajes", "Más"]);
  });

  it("un toque lleva a la sección", () => {
    montar(<BarraInferior />, { ...celular, ruta: "/ViewCanciones" });
    fireEvent.click(enBarra("Culto"));
    expect(ruta()).toBe("/ViewCulto");
    expect(enBarra("Culto").getAttribute("aria-current")).toBe("page");
  });

  it("dentro de una canción sigue encendida Canciones", () => {
    montar(<BarraInferior />, { ...celular, ruta: "/ViewCancion/abc" });
    expect(enBarra("Canciones").getAttribute("aria-current")).toBe("page");
  });

  it("«Más» abre el resto, con Inicio, y se cierra al elegir", () => {
    montar(<BarraInferior />, celular);
    fireEvent.click(enBarra("Más"));
    const hoja = screen.getByRole("dialog", { name: "Más secciones" });
    const nombres = within(hoja).getAllByRole("button").map((b) => b.textContent);
    expect(nombres).toEqual(["Inicio", "Ticker", "Imágenes", "Video", "Prédica", "Cronograma", "Usuarios", "Estilos y colores", "Ayuda", "Menú inicial", "Cerrar sesión"]);
    fireEvent.click(within(hoja).getByRole("button", { name: "Ticker" }));
    expect(ruta()).toBe("/ViewTicker");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("«Menú inicial» de «Más» vuelve a la entrada", () => {
    montar(<BarraInferior />, celular);
    fireEvent.click(enBarra("Más"));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Menú inicial" }));
    expect(ruta()).toBe("/ViewSelector");
  });

  it("«Cerrar sesión» de «Más» pide confirmación antes de salir", async () => {
    const { auth, app } = montar(<BarraInferior />, { ...celular, app: { isDesktop: false, confirmAction: vi.fn().mockResolvedValue(false) } });
    fireEvent.click(enBarra("Más"));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cerrar sesión" }));
    await waitFor(() => expect(app.confirmAction).toHaveBeenCalledWith("¿Cerrar sesión?"));
    expect(auth.logout).not.toHaveBeenCalled();
  });

  it("«Más» se ve encendido cuando la sección actual está dentro", () => {
    montar(<BarraInferior />, { ...celular, ruta: "/ViewCronograma" });
    expect(enBarra("Más").className).toContain("text-app-main");
  });

  it("al operador no le ofrece Prédica", () => {
    montar(<BarraInferior />, { ...celular, auth: { userData: { name: "Luis", role: "Operador" } } });
    fireEvent.click(enBarra("Más"));
    expect(within(screen.getByRole("dialog")).queryByRole("button", { name: "Prédica" })).toBeNull();
  });

  it("se cierra con Escape y tocando fuera", () => {
    montar(<BarraInferior />, celular);
    fireEvent.click(enBarra("Más"));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(enBarra("Más"));
    fireEvent.click(screen.getByTestId("velo-mas"));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("BotonAnterior", () => {
  const montarAmbos = (ruta) =>
    montar(
      <>
        <BarraInferior />
        <BotonAnterior />
      </>,
      { ...celular, ruta }
    );
  const volver = () => screen.queryByRole("button", { name: /^Volver a / });

  it("no aparece hasta haber pasado por otra sección", () => {
    montarAmbos("/ViewCanciones");
    expect(volver()).toBeNull();
  });

  it("lleva a la sección anterior justo donde se dejó (la canción abierta)", () => {
    montarAmbos("/ViewCancion/abc");
    fireEvent.click(enBarra("Biblia"));
    expect(volver().textContent).toBe("Canciones");
    fireEvent.click(volver());
    expect(ruta()).toBe("/ViewCancion/abc");
    // Y ahora ofrece volver a Biblia: un ir y venir de un toque.
    expect(volver().textContent).toBe("Biblia");
  });
});
