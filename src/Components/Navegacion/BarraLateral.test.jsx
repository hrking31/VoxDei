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

  it("muestra Inicio y los grupos Organizar, Proyectar y Administrar, en ese orden y con sus secciones", () => {
    montar(<BarraLateral />);
    expect(boton("Inicio")).toBeTruthy();
    const grupos = within(barra()).getAllByRole("group");
    expect(grupos.map((g) => g.getAttribute("aria-label"))).toEqual(["Organizar", "Proyectar", "Administrar"]);
    const nombresDe = (grupo) =>
      within(grupo).getAllByRole("button").map((b) => b.getAttribute("aria-label") || b.textContent.trim());
    expect(nombresDe(grupos[0])).toEqual(["Orden del culto", "Cronograma"]);
    expect(nombresDe(grupos[1])).toEqual(["Biblia", "Canciones", "Mensajes", "Ticker", "Imágenes", "Video", "Prédica"]);
    expect(nombresDe(grupos[2])).toEqual(["Usuarios", "Estilos y colores"]);
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

  it("abajo, en orden: la persona, Ayuda, una línea, Cerrar sesión y la flecha al final", () => {
    montar(<BarraLateral />);
    const nav = barra();
    const ayuda = boton("Ayuda");
    const salir = boton("Cerrar sesión");
    const flecha = interruptor();
    const persona = nav.querySelector("[data-persona]");
    const linea = nav.querySelector("[data-divisoria]");
    expect(persona).toBeTruthy();
    expect(linea).toBeTruthy();
    const orden = (x, y) => x.compareDocumentPosition(y) & Node.DOCUMENT_POSITION_FOLLOWING;
    expect(orden(persona, ayuda)).toBeTruthy();
    expect(orden(ayuda, linea)).toBeTruthy();
    expect(orden(linea, salir)).toBeTruthy();
    expect(orden(salir, flecha)).toBeTruthy();
    expect(nav.lastElementChild).toBe(flecha);
  });

  it("el logo vuelve al menú inicial (la entrada)", () => {
    montar(<BarraLateral />);
    fireEvent.click(boton("Menú inicial"));
    expect(ruta()).toBe("/ViewSelector");
  });

  it("empieza encogida y la flecha muestra los nombres", () => {
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

  it("la flecha es «|›» encogida y «‹|» abierta", () => {
    montar(<BarraLateral />);
    const icono = () => interruptor().querySelector("[data-icono-encoger]");
    expect(icono().getAttribute("data-icono-encoger")).toBe("abrir");
    expect(icono().getAttribute("class")).toContain("-scale-x-100");

    fireEvent.click(interruptor());

    expect(icono().getAttribute("data-icono-encoger")).toBe("encoger");
    expect(icono().getAttribute("class")).not.toContain("-scale-x-100");
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

describe("BarraLateral en el celular", () => {
  const hayBarra = () => screen.queryByRole("navigation", { name: "Secciones del panel" }) !== null;

  it("cerrada no pinta nada ni ocupa sitio", () => {
    const { container } = montar(<BarraLateral movil abierta={false} onCerrar={() => {}} />);
    expect(hayBarra()).toBe(false);
    expect(container.querySelector(".w-barra")).toBeNull();
  });

  it("abierta muestra los nombres y las mismas secciones que en el computador", () => {
    montar(<BarraLateral movil abierta onCerrar={() => {}} />);
    expect(within(barra()).getByText("Biblia")).toBeTruthy();
    const grupos = within(barra()).getAllByRole("group");
    expect(grupos.map((g) => g.getAttribute("aria-label"))).toEqual(["Organizar", "Proyectar", "Administrar"]);
    expect(within(barra()).getByText("Ayuda")).toBeTruthy();
    expect(within(barra()).getByText("Cerrar sesión")).toBeTruthy();
  });

  it("al operador no le muestra Prédica", () => {
    montar(<BarraLateral movil abierta onCerrar={() => {}} />, {
      auth: { userData: { name: "Luis", role: "Operador" } },
    });
    expect(within(barra()).queryByText("Prédica")).toBeNull();
  });

  it("elegir una sección navega y pide cerrar el menú", () => {
    const alCerrar = vi.fn();
    montar(<BarraLateral movil abierta onCerrar={alCerrar} />);
    fireEvent.click(boton("Biblia"));
    expect(ruta()).toBe("/ViewVersiculo");
    expect(alCerrar).toHaveBeenCalledTimes(1);
  });

  it("el logo lleva al menú inicial y cierra el menú", () => {
    const alCerrar = vi.fn();
    montar(<BarraLateral movil abierta onCerrar={alCerrar} />);
    fireEvent.click(boton("Menú inicial"));
    expect(ruta()).toBe("/ViewSelector");
    expect(alCerrar).toHaveBeenCalledTimes(1);
  });

  it("no lleva flecha para cerrar: se cierra con Escape y al tocar fuera", () => {
    const alCerrar = vi.fn();
    montar(<BarraLateral movil abierta onCerrar={alCerrar} />);
    expect(within(barra()).queryByRole("button", { name: /Cerrar el menú|Encoger la barra|Mostrar los nombres/ })).toBeNull();

    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(screen.getByTestId("velo-barra"));

    expect(alCerrar).toHaveBeenCalledTimes(2);
  });

  it("pide confirmación antes de cerrar sesión y, si se confirma, cierra", async () => {
    const alCerrar = vi.fn();
    const { auth } = montar(<BarraLateral movil abierta onCerrar={alCerrar} />);
    fireEvent.click(boton("Cerrar sesión"));
    await waitFor(() => expect(auth.logout).toHaveBeenCalledTimes(1));
    expect(alCerrar).toHaveBeenCalled();
  });
});
