import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import BarraLateral from "./BarraLateral.jsx";
import { montar } from "./pruebas.utils.jsx";

const barra = () => screen.getByRole("navigation", { name: "Secciones del panel" });
const boton = (nombre) => within(barra()).getByRole("button", { name: nombre });
const interruptor = () =>
  within(barra()).getByRole("button", { name: /Mostrar los nombres|Encoger la barra/ });
const ruta = () => screen.getByTestId("ruta").textContent;

describe("BarraLateral", () => {
  afterEach(() => vi.restoreAllMocks());

  it("muestra Inicio, las secciones de proyectar y las de organizar", () => {
    montar(<BarraLateral />);
    for (const nombre of ["Inicio", "Biblia", "Canciones", "Mensajes", "Ticker", "Imágenes", "Video", "Prédica", "Cronograma", "Usuarios", "Estilos y colores"]) {
      expect(boton(nombre)).toBeTruthy();
    }
    expect(within(barra()).getByRole("group", { name: "Proyectar" })).toBeTruthy();
    expect(within(barra()).getByRole("group", { name: "Organizar" })).toBeTruthy();
  });

  it("lleva a la Ayuda desde abajo, y la marca cuando se está en ella", () => {
    montar(<BarraLateral />);
    fireEvent.click(boton("Ayuda"));
    expect(ruta()).toBe("/ViewAyuda");
    expect(boton("Ayuda").getAttribute("aria-current")).toBe("page");
  });

  it("al operador no le muestra Prédica", () => {
    montar(<BarraLateral />, { auth: { userData: { name: "Luis", role: "Operador" } } });
    expect(within(barra()).queryByRole("button", { name: "Prédica" })).toBeNull();
    expect(boton("Biblia")).toBeTruthy();
  });

  it("marca la sección actual, también dentro de una canción", () => {
    montar(<BarraLateral />, { ruta: "/ViewCancion/abc" });
    expect(boton("Canciones").getAttribute("aria-current")).toBe("page");
    expect(boton("Biblia").getAttribute("aria-current")).toBeNull();
  });

  it("empieza encogida y al pulsar el símbolo muestra los nombres", () => {
    montar(<BarraLateral />);
    expect(interruptor().getAttribute("aria-expanded")).toBe("false");
    // Encogida, el nombre solo existe en la etiqueta flotante (oculta al
    // lector de pantalla) y en el aria-label del botón.
    const visible = { ignore: '[aria-hidden="true"], script, style' };
    expect(within(barra()).queryByText("Biblia", visible)).toBeNull();

    fireEvent.click(interruptor());

    expect(interruptor().getAttribute("aria-expanded")).toBe("true");
    expect(within(barra()).getByText("Biblia")).toBeTruthy();
  });

  it("al elegir una sección navega a su dirección y se vuelve a encoger", () => {
    montar(<BarraLateral />);
    fireEvent.click(interruptor());
    fireEvent.click(boton("Biblia"));

    expect(ruta()).toBe("/ViewVersiculo");
    expect(interruptor().getAttribute("aria-expanded")).toBe("false");
  });

  it("encogida también navega con un solo clic", () => {
    montar(<BarraLateral />);
    fireEvent.click(boton("Cronograma"));
    expect(ruta()).toBe("/ViewCronograma");
  });

  it("se encoge con Escape y al tocar fuera", () => {
    montar(<BarraLateral />);
    fireEvent.click(interruptor());
    fireEvent.keyDown(document, { key: "Escape" });
    expect(interruptor().getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(interruptor());
    fireEvent.click(screen.getByTestId("velo-barra"));
    expect(interruptor().getAttribute("aria-expanded")).toBe("false");
  });

  it("no ofrece abrir la pantalla del templo: eso se hace en la entrada", () => {
    montar(<BarraLateral />);
    expect(within(barra()).queryByRole("button", { name: /pantalla del templo/ })).toBeNull();
    expect(within(barra()).queryByRole("group", { name: "Pantalla del templo" })).toBeNull();
  });

  it("pide confirmación antes de cerrar sesión", async () => {
    const { auth, app } = montar(<BarraLateral />, {
      app: { confirmAction: vi.fn().mockResolvedValue(false) },
    });
    fireEvent.click(boton("Cerrar sesión"));
    await waitFor(() => expect(app.confirmAction).toHaveBeenCalled());
    expect(auth.logout).not.toHaveBeenCalled();
  });

  it("cierra la sesión si se confirma", async () => {
    const { auth } = montar(<BarraLateral />);
    fireEvent.click(boton("Cerrar sesión"));
    await waitFor(() => expect(auth.logout).toHaveBeenCalledTimes(1));
  });
});
