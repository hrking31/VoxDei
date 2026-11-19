import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { waitFor, cleanup, fireEvent, screen, within } from "@testing-library/react";
import { set } from "firebase/database";

vi.mock("../Firebase/Firebase", () => ({ database: {}, db: {}, auth: {}, storage: {}, functions: {} }));
vi.mock("firebase/database", () => ({ ref: vi.fn(), set: vi.fn(), update: vi.fn(), onValue: vi.fn(() => () => {}) }));
vi.mock("../FuncionesControlPredica/FuncionesControlPredica", () => ({ obtenerVersiculo: vi.fn() }));
vi.mock("../Biblia/elegirBiblia", () => ({ guardarVersionBiblia: vi.fn() }));

import ControlVersiculo from "./ControlVersiculo.jsx";
import { obtenerVersiculo } from "../FuncionesControlPredica/FuncionesControlPredica";
import { AccionesGuiaContext } from "../PantallaGuia/AccionesGuia.js";
import { montar } from "../Navegacion/pruebas.utils.jsx";

const sesion = { userData: { name: "Ana", role: "Pastor", groupId: "g1" } };
const ranuras = [];

function abrir({ ranura, isDesktop = true, app = {} } = {}) {
  const resultado = montar(
    <AccionesGuiaContext.Provider value={ranura ?? null}>
      <ControlVersiculo />
    </AccionesGuiaContext.Provider>,
    {
      auth: sesion,
      app: {
        isDesktop,
        versionBiblia: "RVR1960",
        visibleTicker: false,
        visibleTitulo: false,
        visibleTexto: true,
        setVisibleTicker: vi.fn(),
        setVisibleTitulo: vi.fn(),
        setVisibleTexto: vi.fn(),
        setVisibleImagen: vi.fn(),
        visibleImagen: false,
        ...app,
      },
    }
  );
  return resultado;
}

function nuevaRanura() {
  const ranura = document.createElement("div");
  document.body.appendChild(ranura);
  ranuras.push(ranura);
  return ranura;
}

// jsdom no trae el desplazamiento: la vista centra el capítulo elegido en su fila.
beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
  window.scrollTo = vi.fn();
  Element.prototype.scrollTo = vi.fn();
  localStorage.clear();
});

afterEach(() => {
  ranuras.splice(0).forEach((r) => r.remove());
});

describe("ControlVersiculo: dónde van los botones", () => {
  it("en el computador, con la guía, van a la columna de la derecha y no en el encabezado", () => {
    const ranura = nuevaRanura();
    const { container } = abrir({ ranura });
    const derecha = within(ranura);
    expect(derecha.getByRole("button", { name: "Antiguo" })).toBeTruthy();
    expect(derecha.getByRole("button", { name: "Nuevo" })).toBeTruthy();
    expect(derecha.getByRole("button", { name: "RVR1960" })).toBeTruthy();
    // El buscador de libros y los cuatro de visibilidad también
    const botones = ranura.querySelector("[data-botones-biblia]").querySelectorAll("button");
    expect(botones.length).toBeGreaterThanOrEqual(9);
    // En el encabezado y en el resto de la vista ya no están
    expect(within(container).queryByRole("button", { name: "Antiguo" })).toBeNull();
    expect(within(container).queryByRole("button", { name: "Nuevo" })).toBeNull();
    expect(within(container).queryByRole("button", { name: "RVR1960" })).toBeNull();
  });

  it("sin guía (sin ranura), se quedan en el encabezado de siempre", () => {
    const { container } = abrir({ ranura: null });
    expect(within(container).getByRole("button", { name: "Antiguo" })).toBeTruthy();
    expect(within(container).getByRole("button", { name: "Nuevo" })).toBeTruthy();
    expect(within(container).getByRole("button", { name: "RVR1960" })).toBeTruthy();
    expect(document.querySelector("[data-botones-biblia]")).toBeNull();
  });

  it("en el celular o la tableta no se usa la columna aunque exista una ranura: es la vista del celular", () => {
    const ranura = nuevaRanura();
    const { container } = abrir({ ranura, isDesktop: false, app: { formatoPantalla: "tableta" } });
    expect(ranura.querySelector("[data-botones-biblia]")).toBeNull();
    // Los libros se abren con el nombre de arriba, en una ventana; no hay cuadrícula a la vista
    expect(screen.queryByRole("button", { name: "Antiguo" })).toBeNull();
    expect(container.querySelector("[data-abrir-libros]")).not.toBeNull();
  });

  it("debajo de la pantalla van primero los de visibilidad, luego la Biblia y los libros", () => {
    const ranura = nuevaRanura();
    abrir({ ranura });
    const bloque = ranura.querySelector("[data-botones-biblia]");
    const [visibilidad, biblia, libros] = [...bloque.children];
    expect(visibilidad.hasAttribute("data-botones-visibilidad")).toBe(true);
    expect(visibilidad.querySelectorAll("button")).toHaveLength(4);
    expect(within(biblia).getByRole("button", { name: "RVR1960" })).toBeTruthy();
    expect(libros.hasAttribute("data-selector-libros")).toBe(true);
  });

  it("los de visibilidad son como en Predicar: el ícono pequeño y el nombre", () => {
    const ranura = nuevaRanura();
    abrir({ ranura });
    const botones = [...ranura.querySelectorAll("[data-botones-visibilidad] button")];
    expect(botones.map((b) => b.textContent)).toEqual(["Título", "Texto", "Ticker", "Ocultar"]);
    for (const boton of botones) {
      expect(boton.querySelector("svg.h-4.w-4")).not.toBeNull();
      expect(boton.className).toContain("rounded-xl");
      expect(boton.className).toContain("flex-col");
      // Poco altos (h-10), no los h-12 de antes
      expect(boton.className).toContain("h-10");
      expect(boton.className).not.toContain("h-12");
    }
    // Texto está encendido (visibleTexto: true) y los otros no
    const estado = (clave) => ranura.querySelector(`[data-visible="${clave}"]`);
    expect(estado("texto").getAttribute("aria-pressed")).toBe("true");
    expect(estado("texto").className).toContain("text-app-main");
    expect(estado("titulo").getAttribute("aria-pressed")).toBe("false");
    expect(estado("titulo").className).toContain("text-app-muted");
    expect(estado("ticker").getAttribute("aria-pressed")).toBe("false");
  });

  it("tocar uno cambia su visibilidad", () => {
    const ranura = nuevaRanura();
    const { app } = abrir({ ranura });
    fireEvent.click(ranura.querySelector('[data-visible="titulo"]'));
    expect(app.setVisibleTitulo).toHaveBeenCalledWith(true);
    fireEvent.click(ranura.querySelector('[data-visible="texto"]'));
    expect(app.setVisibleTexto).toHaveBeenCalledWith(false);
    fireEvent.click(ranura.querySelector('[data-visible="ticker"]'));
    expect(app.setVisibleTicker).toHaveBeenCalledWith(true);
  });

  it("los libros están listos para escoger, sin ventanas", () => {
    const ranura = nuevaRanura();
    const { container } = abrir({ ranura });
    expect(within(ranura).getByRole("button", { name: "Génesis" })).toBeTruthy();
    expect(within(container).queryByRole("button", { name: "Génesis" })).toBeNull();
  });

  it("elegir libro y capítulo en la cuadrícula lee ese capítulo", () => {
    obtenerVersiculo.mockClear();
    obtenerVersiculo.mockResolvedValue(null);
    const ranura = nuevaRanura();
    abrir({ ranura });
    fireEvent.click(within(ranura).getByRole("button", { name: "Génesis" }));
    fireEvent.click(within(ranura).getByRole("button", { name: "Capítulo 2" }));
    expect(obtenerVersiculo).toHaveBeenCalledWith("GEN", 2, 1, "capitulo", expect.any(Function), "RVR1960");
    fireEvent.click(within(ranura).getByRole("button", { name: "Versículo 5" }));
    expect(obtenerVersiculo).toHaveBeenLastCalledWith("GEN", 2, 5, "capitulo", expect.any(Function), "RVR1960");
    // Ya elegido, la cuadrícula vuelve a la lista de libros
    expect(within(ranura).queryByRole("button", { name: "Versículo 5" })).toBeNull();
    expect(within(ranura).getByRole("button", { name: "Génesis" })).toBeTruthy();
  });

  it("Ocultar apaga título, texto, ticker e imagen", () => {
    const ranura = nuevaRanura();
    const { app } = abrir({ ranura, app: { visibleTitulo: true, visibleTexto: true, visibleTicker: true, visibleImagen: true } });
    const boton = ranura.querySelector("[data-ocultar]");
    expect(boton.dataset.ocultar).toBe("ocultar");
    expect(boton.textContent).toBe("Ocultar");
    fireEvent.click(boton);
    expect(app.setVisibleTitulo).toHaveBeenCalledWith(false);
    expect(app.setVisibleTexto).toHaveBeenCalledWith(false);
    expect(app.setVisibleTicker).toHaveBeenCalledWith(false);
    expect(app.setVisibleImagen).toHaveBeenCalledWith(false);
  });

  it("con todo apagado dice Mostrar, en rojo, y vuelve a encender el texto", () => {
    const ranura = nuevaRanura();
    const { app } = abrir({ ranura, app: { visibleTitulo: false, visibleTexto: false, visibleTicker: false, visibleImagen: false } });
    const boton = ranura.querySelector("[data-ocultar]");
    expect(boton.dataset.ocultar).toBe("mostrar");
    expect(boton.textContent).toBe("Mostrar");
    expect(boton.className).toContain("text-app-error");
    fireEvent.click(boton);
    expect(app.setVisibleTexto).toHaveBeenCalledWith(true);
    expect(app.setVisibleTitulo).not.toHaveBeenCalled();
  });

  it("ya no hay botón «Solo texto» en la columna", () => {
    const ranura = nuevaRanura();
    abrir({ ranura });
    expect(ranura.querySelector("[data-solo-texto]")).toBeNull();
    expect(within(ranura).queryByRole("button", { name: "Solo texto" })).toBeNull();
  });

  it("los cuatro caben en el ancho de la columna: cuatro columnas iguales, sin desplazamiento horizontal", () => {
    const ranura = nuevaRanura();
    abrir({ ranura });
    const grupo = ranura.querySelector("[data-botones-visibilidad] [role=group]");
    expect(grupo.className).toContain("grid-cols-4");
    expect(grupo.className).not.toContain("overflow-x-auto");
    for (const boton of grupo.querySelectorAll("button")) expect(boton.className).toContain("min-w-0");
  });

  it("en el computador, con guía, no hay encabezado arriba: la barra de capítulos y los botones van a la derecha", () => {
    const ranura = nuevaRanura();
    const { container } = abrir({ ranura });
    expect(container.querySelector(".sticky")).toBeNull();
    expect(ranura.querySelector("[data-selector-libros]")).not.toBeNull();
  });

  it("sin guía, el encabezado conserva su línea dorada", () => {
    const { container } = abrir({ ranura: null });
    expect(container.querySelector(".sticky").className).toContain("border-app-main");
  });

  it("«Escudriñad las Escrituras…» va centrado en el espacio libre, a lo ancho y a lo alto", () => {
    const ranura = nuevaRanura();
    const { container } = abrir({ ranura });
    const mensaje = container.querySelector("[data-sin-capitulo]");
    expect(mensaje.textContent).toContain("Escudriñad las Escrituras");
    expect(mensaje.className).toContain("m-auto");
    expect(mensaje.className).toContain("text-center");
    // El contenedor se estira para ocupar lo que queda de la pantalla
    expect(mensaje.parentElement.className).toContain("h-full");
    expect(mensaje.parentElement.className).toContain("flex-col");
    expect(container.firstElementChild.className).toContain("flex-col");
  });

  it("la barra de capítulos va en la parte de abajo de la columna, solo con un capítulo abierto", () => {
    obtenerVersiculo.mockClear();
    obtenerVersiculo.mockResolvedValue(null);
    const ranura = nuevaRanura();
    abrir({ ranura });
    const bloque = ranura.querySelector("[data-botones-biblia]");
    // Sin capítulo abierto no hay barra
    expect(bloque.querySelector("[data-barra-capitulos]")).toBeNull();
    fireEvent.click(within(ranura).getByRole("button", { name: "Génesis" }));
    fireEvent.click(within(ranura).getByRole("button", { name: "Capítulo 2" }));
    const barra = bloque.querySelector("[data-barra-capitulos]");
    expect(barra).not.toBeNull();
    // Es lo último de la columna, pegada abajo
    expect(bloque.lastElementChild).toBe(barra);
    expect(barra.className).toContain("sticky");
    expect(barra.className).toContain("bottom-0");
    expect(barra.className).toContain("mt-auto");
    // Pegada al borde de abajo: sin el relleno de 20 px que dejaba un hueco en blanco
    expect(barra.className).toContain("pb-1.5");
    expect(barra.className).not.toContain("pb-5");
    // Llega al borde sin margen negativo: es la columna la que pierde su relleno de abajo
    expect(barra.className).not.toContain("-mb-5");
    // Con todos los capítulos del libro, y el abierto marcado
    expect(within(barra).getByText("Génesis 1")).toBeTruthy();
    expect(within(barra).getByText("Génesis 2").className).toContain("font-semibold");
    expect(within(barra).getByText("Génesis 3").className).not.toContain("font-semibold");
  });

  it("tocar un capítulo de la barra de abajo lo lee", () => {
    obtenerVersiculo.mockClear();
    obtenerVersiculo.mockResolvedValue(null);
    const ranura = nuevaRanura();
    abrir({ ranura });
    fireEvent.click(within(ranura).getByRole("button", { name: "Génesis" }));
    fireEvent.click(within(ranura).getByRole("button", { name: "Capítulo 2" }));
    fireEvent.click(within(ranura).getByText("Génesis 4"));
    expect(obtenerVersiculo).toHaveBeenLastCalledWith("GEN", 4, 1, "capitulo", expect.any(Function), "RVR1960");
  });

  it("en el computador solo se desplaza el texto de los versículos, no la página", () => {
    const ranura = nuevaRanura();
    const { container } = abrir({ ranura });
    const raiz = container.firstElementChild;
    expect(raiz.className).toContain("h-svh");
    expect(raiz.className).toContain("overflow-hidden");
    expect(raiz.className).not.toContain("min-h-dvh");
    const zona = container.querySelector("[data-sin-capitulo]").parentElement.parentElement;
    expect(zona.className).toContain("overflow-y-auto");
    expect(zona.className).toContain("flex-1");
    expect(zona.className).toContain("min-h-0");
  });

  it("sin guía (ni celular ni tableta) la página se desplaza como siempre", () => {
    const { container } = abrir({ ranura: null });
    const raiz = container.firstElementChild;
    expect(raiz.className).toContain("min-h-dvh");
    expect(raiz.className).not.toContain("overflow-hidden");
    const zona = container.querySelector("[data-sin-capitulo]").parentElement.parentElement;
    expect(zona.className).toContain("contents");
    expect(zona.className).not.toContain("overflow-y-auto");
  });
});

describe("ControlVersiculo en el celular: como Predicar", () => {
  const capitulo = {
    libro: "Juan",
    capitulo: 3,
    numero: "1",
    texto: "<h2>Nicodemo</h2><p><b>1</b> Había un hombre.</p><p><b>2</b> Este vino a Jesús.</p><p><b>3</b> Respondió Jesús.</p>",
  };
  const raiz = (container) => container.firstElementChild;
  // El nombre de arriba abre los libros (o, sin capítulo, el botón grande «Elegir libro»).
  const abrirLibros = () => fireEvent.click(document.querySelector("[data-abrir-libros]"));
  const proyectado = () => set.mock.calls.filter(([, datos]) => datos?.display === "versiculo").at(-1)?.[1];

  // Abre el capítulo 3 de S. Juan por la ventana de libros.
  async function conCapitulo() {
    obtenerVersiculo.mockResolvedValue(capitulo);
    const resultado = abrir({ isDesktop: false });
    abrirLibros();
    const dialogo = screen.getByRole("dialog", { name: "Libros" });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Nuevo" }));
    fireEvent.click(within(dialogo).getByRole("button", { name: "S. Juan" }));
    fireEvent.click(within(dialogo).getByRole("button", { name: "Capítulo 3" }));
    fireEvent.click(within(dialogo).getByRole("button", { name: "Versículo 1" }));
    await screen.findByText(/Había un hombre/);
    return resultado;
  }

  it("la vista mide la pantalla y solo se desplaza el texto del capítulo", () => {
    const { container } = abrir({ isDesktop: false });
    expect(raiz(container).className).toContain("h-pantalla");
    expect(raiz(container).className).toContain("overflow-hidden");
    const texto = container.querySelector("[data-texto-biblia]");
    expect(texto.className).toContain("overflow-y-auto");
    expect(texto.className).toContain("flex-1");
    expect(container.querySelector(".sticky")).toBeNull();
  });

  it("el texto no va en un recuadro: sin borde, fondo ni relleno, para ganar espacio", () => {
    const { container } = abrir({ isDesktop: false });
    const texto = container.querySelector("[data-texto-biblia]");
    for (const clase of ["border", "bg-app-light", "rounded-xl", "p-2.5"]) {
      expect(texto.className, clase).not.toContain(clase);
    }
  });

  it("arriba, la mini pantalla del templo y los cuatro botones; abajo, el muelle fijo", () => {
    const { container } = abrir({ isDesktop: false });
    expect(screen.getByRole("figure", { name: "En el templo ahora" })).toBeTruthy();
    const botones = [...container.querySelectorAll('[role="group"][aria-label="Qué se ve en el templo"] button')];
    expect(botones.map((b) => b.textContent)).toEqual(["Título", "Texto", "Ticker", "Ocultar"]);
    const muelle = container.querySelector("[data-muelle]");
    // «Libros» ya no es una fila del muelle: el nombre de arriba abre los libros
    expect(within(muelle).queryByRole("button", { name: "Libros" })).toBeNull();
    expect(container.querySelector('[role="group"][aria-label="Herramientas"]')).toBeNull();
    expect(container.querySelector("[data-abrir-libros]")).not.toBeNull();
    expect(within(muelle).getByRole("button", { name: "Anterior" })).toBeTruthy();
    expect(within(muelle).getByRole("button", { name: "Siguiente" })).toBeTruthy();
  });

  it("sin capítulo abierto: se llama «Libro», el mensaje va centrado y Anterior y Siguiente no se pueden usar", () => {
    const { container } = abrir({ isDesktop: false });
    expect(container.querySelector("[data-titulo-biblia]").textContent).toBe("Libro");
    expect(container.querySelector("[data-contador-items]")).toBeNull();
    expect(container.querySelector("[data-sin-capitulo]").className).toContain("m-auto");
    expect(screen.getByRole("button", { name: "Anterior" }).disabled).toBe(true);
    expect(screen.getByRole("button", { name: "Siguiente" }).disabled).toBe(true);
    expect(container.querySelector("[data-barra-capitulos]")).toBeNull();
  });

  it("el nombre abre la ventana de libros a pantalla completa, y se cierra con la X y con Escape", () => {
    abrir({ isDesktop: false });
    abrirLibros();
    const dialogo = screen.getByRole("dialog", { name: "Libros" });
    expect(dialogo.className).toContain("fixed");
    // Lleva la Biblia y los libros listos para escoger
    expect(within(dialogo).getByRole("button", { name: "RVR1960" })).toBeTruthy();
    expect(within(dialogo).getByRole("button", { name: "Génesis" })).toBeTruthy();
    fireEvent.click(within(dialogo).getByRole("button", { name: "Cerrar" }));
    expect(screen.queryByRole("dialog", { name: "Libros" })).toBeNull();
    abrirLibros();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Libros" })).toBeNull();
  });

  it("elegir el versículo cierra la ventana y deja el texto a la vista, con su nombre y su contador", async () => {
    const { container } = await conCapitulo();
    expect(screen.queryByRole("dialog", { name: "Libros" })).toBeNull();
    expect(container.querySelector("[data-titulo-biblia]").textContent).toBe("Juan 3");
    const contador = container.querySelector("[data-contador-items]");
    expect(contador.textContent).toBe("3 versículos");
    expect(contador.className).toContain("text-pie");
    expect(contador.previousElementSibling.textContent).toBe("Juan 3");
    expect(obtenerVersiculo).toHaveBeenLastCalledWith("JHN", 3, 1, "capitulo", expect.any(Function), "RVR1960");
    // La barra de capítulos va en el muelle
    expect(container.querySelector("[data-muelle] [data-barra-capitulos]")).not.toBeNull();
  });

  it("elegir un capítulo NO cierra la ventana: muestra sus versículos para escoger uno, y el versículo la cierra", async () => {
    obtenerVersiculo.mockResolvedValue(capitulo);
    abrir({ isDesktop: false });
    abrirLibros();
    const dialogo = screen.getByRole("dialog", { name: "Libros" });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Nuevo" }));
    fireEvent.click(within(dialogo).getByRole("button", { name: "S. Juan" }));
    fireEvent.click(within(dialogo).getByRole("button", { name: "Capítulo 3" }));
    // El capítulo se lee, pero la ventana sigue abierta con los versículos
    await screen.findByText(/Había un hombre/);
    expect(screen.getByRole("dialog", { name: "Libros" })).toBeTruthy();
    expect(within(dialogo).getAllByRole("button", { name: /^Versículo \d+$/ }).length).toBeGreaterThan(0);
    obtenerVersiculo.mockClear();
    fireEvent.click(within(dialogo).getByRole("button", { name: "Versículo 2" }));
    expect(obtenerVersiculo).toHaveBeenLastCalledWith("JHN", 3, 2, "capitulo", expect.any(Function), "RVR1960");
    expect(screen.queryByRole("dialog", { name: "Libros" })).toBeNull();
  });

  it("Siguiente pasa de versículo en versículo y los proyecta", async () => {
    set.mockClear();
    const { container } = await conCapitulo();
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(proyectado()).toMatchObject({ text: "Había un hombre.", cita: "Juan 3:1", titulo: "Nicodemo", display: "versiculo" });
    expect(container.querySelector("[data-contador-items]").textContent).toBe("1 de 3");
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(proyectado()).toMatchObject({ text: "Este vino a Jesús.", cita: "Juan 3:2" });
    expect(container.querySelector("[data-contador-items]").textContent).toBe("2 de 3");
  });

  it("Anterior vuelve al versículo de antes; en el primero no se puede, y Siguiente se apaga en el último", async () => {
    const { container } = await conCapitulo();
    const anterior = () => screen.getByRole("button", { name: "Anterior" });
    const siguiente = () => screen.getByRole("button", { name: "Siguiente" });
    expect(anterior().disabled).toBe(true);
    fireEvent.click(siguiente());
    expect(anterior().disabled).toBe(true);
    fireEvent.click(siguiente());
    fireEvent.click(siguiente());
    expect(container.querySelector("[data-contador-items]").textContent).toBe("3 de 3");
    expect(siguiente().disabled).toBe(true);
    fireEvent.click(anterior());
    expect(proyectado()).toMatchObject({ text: "Este vino a Jesús.", cita: "Juan 3:2" });
    expect(container.querySelector("[data-contador-items]").textContent).toBe("2 de 3");
    expect(siguiente().disabled).toBe(false);
  });

  it("tocar un versículo del texto lo proyecta y Siguiente sigue desde ahí", async () => {
    set.mockClear();
    const { container } = await conCapitulo();
    fireEvent.click(screen.getByText("Este vino a Jesús."));
    expect(proyectado()).toMatchObject({ text: "Este vino a Jesús.", cita: "Juan 3:2" });
    expect(container.querySelector("[data-contador-items]").textContent).toBe("2 de 3");
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(proyectado()).toMatchObject({ text: "Respondió Jesús.", cita: "Juan 3:3" });
  });

  it("el versículo al aire se centra en el recuadro del texto", async () => {
    await conCapitulo();
    Element.prototype.scrollTo.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(Element.prototype.scrollTo).toHaveBeenCalledWith(expect.objectContaining({ behavior: "smooth" }));
  });

  it("tocar un capítulo de la barra del muelle lo lee", async () => {
    await conCapitulo();
    obtenerVersiculo.mockClear();
    fireEvent.click(screen.getByText("S. Juan 5"));
    expect(obtenerVersiculo).toHaveBeenLastCalledWith("JHN", 5, 1, "capitulo", expect.any(Function), "RVR1960");
  });

  it("el muelle lleva la barra de capítulos y no hay cinta de versículos", async () => {
    const { container } = await conCapitulo();
    expect(container.querySelector("[data-cinta-versiculos]")).toBeNull();
    expect(container.querySelector("[data-muelle] [data-barra-capitulos]")).not.toBeNull();
  });

  it("el versículo elegido en el celular también sobresale, con los demás atenuados", async () => {
    const { container } = await conCapitulo();
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    const verso = (n) => container.querySelector(`[data-versiculo="${n}"]`);
    expect(verso(2).hasAttribute("data-elegido")).toBe(true);
    expect(verso(2).className).toContain("drop-shadow-elegido");
    expect(verso(1).className).toContain("opacity-60");
  });

  it("Ocultar apaga lo que se ve, igual que en el computador", () => {
    const { app } = abrir({ isDesktop: false, app: { visibleTexto: true } });
    fireEvent.click(screen.getByRole("button", { name: "Ocultar" }));
    expect(app.setVisibleTexto).toHaveBeenCalledWith(false);
  });

  it("dos interruptores (a prueba): uno oculta la pantalla del templo y otro los cuatro botones", () => {
    const { container } = abrir({ isDesktop: false });
    const pantalla = () => screen.queryByRole("figure", { name: "En el templo ahora" });
    const botones = () => container.querySelector('[role="group"][aria-label="Qué se ve en el templo"]');
    expect(pantalla()).not.toBeNull();
    expect(botones()).not.toBeNull();

    // Ocultar la pantalla: los botones se quedan
    fireEvent.click(screen.getByRole("button", { name: "Ocultar la pantalla" }));
    expect(pantalla()).toBeNull();
    expect(botones()).not.toBeNull();
    const volver = screen.getByRole("button", { name: "Mostrar la pantalla" });
    expect(volver.getAttribute("aria-pressed")).toBe("true");
    expect(volver.className).toContain("text-app-main");

    // Ocultar los botones: el texto sigue
    fireEvent.click(screen.getByRole("button", { name: "Ocultar los botones" }));
    expect(botones()).toBeNull();
    expect(container.querySelector("[data-texto-biblia]")).not.toBeNull();
    expect(container.querySelector("[data-muelle]")).not.toBeNull();

    // Los interruptores siguen a la vista para volver a mostrar
    fireEvent.click(screen.getByRole("button", { name: "Mostrar la pantalla" }));
    fireEvent.click(screen.getByRole("button", { name: "Mostrar los botones" }));
    expect(pantalla()).not.toBeNull();
    expect(botones()).not.toBeNull();
  });

  it("los interruptores se acuerdan en este dispositivo", () => {
    const primera = abrir({ isDesktop: false });
    fireEvent.click(screen.getByRole("button", { name: "Ocultar la pantalla" }));
    fireEvent.click(screen.getByRole("button", { name: "Ocultar los botones" }));
    expect(localStorage.getItem("voxdei.biblia.sinPantalla")).toBe("1");
    expect(localStorage.getItem("voxdei.biblia.sinBotones")).toBe("1");
    primera.unmount();

    const segunda = abrir({ isDesktop: false });
    expect(screen.queryByRole("figure", { name: "En el templo ahora" })).toBeNull();
    expect(segunda.container.querySelector('[role="group"][aria-label="Qué se ve en el templo"]')).toBeNull();
    expect(screen.getByRole("button", { name: "Mostrar la pantalla" })).toBeTruthy();
  });

  it("con la pantalla y los botones ocultos, lo que importa sigue: el texto, Anterior y Siguiente", async () => {
    localStorage.setItem("voxdei.biblia.sinPantalla", "1");
    localStorage.setItem("voxdei.biblia.sinBotones", "1");
    obtenerVersiculo.mockResolvedValue({ libro: "Juan", capitulo: 3, numero: "1", texto: "<p><b>1</b> Había un hombre.</p><p><b>2</b> Este vino a Jesús.</p>" });
    abrir({ isDesktop: false });
    abrirLibros();
    const dialogo = screen.getByRole("dialog", { name: "Libros" });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Nuevo" }));
    fireEvent.click(within(dialogo).getByRole("button", { name: "S. Juan" }));
    fireEvent.click(within(dialogo).getByRole("button", { name: "Capítulo 3" }));
    fireEvent.click(within(dialogo).getByRole("button", { name: "Versículo 1" }));
    await screen.findByText(/Había un hombre/);
    set.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(set.mock.calls.at(-1)[1]).toMatchObject({ text: "Había un hombre.", display: "versiculo" });
  });

  it("el computador no lleva estos interruptores", () => {
    abrir({ isDesktop: true, ranura: null });
    expect(screen.queryByRole("button", { name: "Ocultar la pantalla" })).toBeNull();
  });

  it("la tableta (iPad mini) usa esta misma vista del celular, con sus interruptores", () => {
    const { container } = abrir({ isDesktop: false, app: { formatoPantalla: "tableta" } });
    expect(raiz(container).className).toContain("h-pantalla");
    expect(raiz(container).className).toContain("overflow-hidden");
    expect(container.querySelector("[data-muelle]")).not.toBeNull();
    expect(container.querySelector("[data-abrir-libros]")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Ocultar la pantalla" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Siguiente" })).toBeTruthy();
  });

  it("el nombre es el botón de los libros: lleva una flechita y dice qué libro hay", async () => {
    const { container } = abrir({ isDesktop: false });
    const nombre = container.querySelector("[data-abrir-libros]");
    expect(nombre.getAttribute("aria-label")).toBe("Abrir los libros");
    // Con una lupa delante (dice que ahí se busca) y una flechita detrás
    expect(nombre.querySelector("[data-icono-buscar]")).not.toBeNull();
    expect(nombre.querySelectorAll("svg")).toHaveLength(2);
    expect(nombre.firstElementChild.hasAttribute("data-icono-buscar")).toBe(true);
    expect(nombre.textContent).toBe("Libro");
    cleanup();

    obtenerVersiculo.mockResolvedValue(capitulo);
    const otra = abrir({ isDesktop: false });
    abrirLibros();
    const dialogo = screen.getByRole("dialog", { name: "Libros" });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Nuevo" }));
    fireEvent.click(within(dialogo).getByRole("button", { name: "S. Juan" }));
    fireEvent.click(within(dialogo).getByRole("button", { name: "Capítulo 3" }));
    fireEvent.click(within(dialogo).getByRole("button", { name: "Versículo 1" }));
    await screen.findByText(/Había un hombre/);
    expect(otra.container.querySelector("[data-abrir-libros]").getAttribute("aria-label")).toBe("Abrir los libros (ahora: Juan 3)");
  });

  it("sin capítulo abierto no hay botón grande «Elegir libro»: los libros se abren solo con el nombre de arriba", () => {
    const { container } = abrir({ isDesktop: false });
    expect(container.querySelector("[data-elegir-libro]")).toBeNull();
    expect(screen.queryByRole("button", { name: "Elegir libro" })).toBeNull();
    expect(container.querySelector("[data-sin-capitulo]").textContent).toContain("Escudriñad las Escrituras");
    expect(container.querySelector("[data-sin-capitulo] button")).toBeNull();
    // El nombre sí abre los libros
    abrirLibros();
    expect(screen.getByRole("dialog", { name: "Libros" })).toBeTruthy();
  });

  it("con un capítulo abierto el mensaje de vacío ya no está", async () => {
    const { container } = await conCapitulo();
    expect(container.querySelector("[data-sin-capitulo]")).toBeNull();
  });

  it("en la ventana de libros del celular los botones son más grandes que en la columna del computador", () => {
    abrir({ isDesktop: false });
    abrirLibros();
    const dialogo = screen.getByRole("dialog", { name: "Libros" });
    const libro = within(dialogo).getByRole("button", { name: "Génesis" });
    expect(libro.className).toContain("h-11");
    expect(libro.className).toContain("text-sm");
    cleanup();

    const ranura = nuevaRanura();
    abrir({ ranura });
    expect(within(ranura).getByRole("button", { name: "Génesis" }).className).toContain("h-8");
  });

  it("en el celular nada se desplaza con barra visible: ni el texto, ni la ventana de libros, ni la barra de capítulos", async () => {
    const { container } = await conCapitulo();
    expect(container.querySelector("[data-texto-biblia]").className).toContain("scrollbar-oculta");
    expect(container.querySelector("[data-texto-biblia]").className).not.toContain("scrollbar-custom");
    expect(container.querySelector("[data-barra-capitulos]").className).toContain("[scrollbar-width:none]");
    abrirLibros();
    const dialogo = screen.getByRole("dialog", { name: "Libros" });
    expect(dialogo.querySelector("[data-cuadricula-biblia]").className).toContain("scrollbar-oculta");
    expect(dialogo.querySelector(".overflow-y-auto").className).toContain("scrollbar-oculta");
  });

  it("en el computador sí conserva su barra fina", () => {
    const ranura = nuevaRanura();
    abrir({ ranura });
    expect(ranura.querySelector("[data-cuadricula-biblia]").className).toContain("scrollbar-custom");
  });
});

describe("ControlVersiculo en el computador: el versículo elegido", () => {
  const capitulo = {
    libro: "Juan",
    capitulo: 3,
    numero: "1",
    texto: "<p><b>1</b> Había un hombre.</p><p><b>2</b> Este vino a Jesús.</p><p><b>3</b> Respondió Jesús.</p>",
  };

  // Abre S. Juan 3 con la cuadrícula de la columna derecha.
  async function conCapituloEnColumna(datos = capitulo) {
    obtenerVersiculo.mockResolvedValue(datos);
    const ranura = nuevaRanura();
    const resultado = abrir({ ranura });
    fireEvent.click(within(ranura).getByRole("button", { name: "Nuevo" }));
    fireEvent.click(within(ranura).getByRole("button", { name: "S. Juan" }));
    fireEvent.click(within(ranura).getByRole("button", { name: "Capítulo 3" }));
    await screen.findByText(/Había un hombre/);
    return { ranura, ...resultado };
  }
  const verso = (container, n) => container.querySelector(`[data-versiculo="${n}"]`);

  it("sin cinta de versículos: ni abajo ni al lado; abajo va la barra de capítulos", async () => {
    const { ranura } = await conCapituloEnColumna();
    expect(document.querySelector("[data-cinta-versiculos]")).toBeNull();
    const bar = ranura.querySelector("[data-barra-capitulos]");
    expect(within(bar).getByText("S. Juan 5")).toBeTruthy();
  });

  it("elegir un versículo en la cuadrícula lleva ahí y la cuadrícula vuelve a la lista de libros", async () => {
    const { ranura } = await conCapituloEnColumna();
    obtenerVersiculo.mockClear();
    fireEvent.click(within(ranura).getByRole("button", { name: "Versículo 2" }));
    expect(obtenerVersiculo).toHaveBeenLastCalledWith("JHN", 3, 2, "capitulo", expect.any(Function), "RVR1960");
    expect(within(ranura).queryByRole("button", { name: /^Versículo \d+$/ })).toBeNull();
    expect(within(ranura).queryByRole("button", { name: /^Capítulo \d+$/ })).toBeNull();
    expect(within(ranura).getByRole("button", { name: "S. Juan" })).toBeTruthy();
  });

  // Posiciones de mentira: el versículo n está a n × 100 px de arriba.
  const conPosiciones = () =>
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function () {
      const n = this.dataset?.versiculo;
      return { top: n ? Number(n) * 100 : 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 };
    });

  it("el versículo elegido queda de SEGUNDO en la pantalla: el anterior arriba, para dar contexto", async () => {
    const { ranura } = await conCapituloEnColumna();
    obtenerVersiculo.mockResolvedValue({ ...capitulo, numero: "3" });
    const posiciones = conPosiciones();
    try {
      Element.prototype.scrollTo.mockClear();
      fireEvent.click(within(ranura).getByRole("button", { name: "Versículo 3" }));
      // Arriba va el 2 (a 200 px, menos 8 de aire), y el 3 queda de segundo
      await waitFor(() => expect(Element.prototype.scrollTo).toHaveBeenCalledWith({ top: 192, behavior: "auto" }));
    } finally {
      posiciones.mockRestore();
    }
  });

  it("el versículo elegido sobresale como por encima de los demás: proyecta sombra y los otros se atenúan, sin cambiar el tamaño de la letra", async () => {
    const { container } = await conCapituloEnColumna();
    const uno = verso(container, 1);
    const dos = verso(container, 2);
    expect(uno.hasAttribute("data-elegido")).toBe(true);
    for (const clase of ["relative", "z-10", "drop-shadow-elegido"]) {
      expect(uno.className, clase).toContain(clase);
    }
    // Nada que cambie el ancho: ni crece ni engrosa la letra (en el celular se salía por los lados)
    expect(uno.className).not.toMatch(/scale|origin|translate/);
    expect(uno.querySelectorAll("span")[1].className).not.toMatch(/font-(medium|bold|semibold)|text-(lg|xl|base)/);
    expect(uno.querySelectorAll("span")[1].className).toContain("text-app-texto");
    expect(dos.hasAttribute("data-elegido")).toBe(false);
    expect(dos.className).toContain("opacity-60");
    expect(dos.className).not.toContain("drop-shadow-elegido");
    expect(dos.querySelectorAll("span")[1].className).toContain("text-app-muted");
  });

  it("el elegido no lleva recuadros ni colores de resalte: ni fondo, ni borde, ni pastilla", async () => {
    const { container } = await conCapituloEnColumna();
    for (const n of [1, 2, 3]) {
      const v = verso(container, n);
      expect(v.className, String(n)).not.toMatch(/\bborder(-l)?(-|\b)/);
      expect(v.className, String(n)).not.toMatch(/bg-app-(main|success)/);
      expect(v.className, String(n)).not.toContain("bg-yellow");
      expect(v.querySelectorAll("span")[0].className, String(n)).not.toContain("bg-app-main");
    }
  });

  it("al elegir el versículo en la cuadrícula también sobresale", async () => {
    const { container, ranura } = await conCapituloEnColumna();
    obtenerVersiculo.mockResolvedValue({ ...capitulo, numero: "2" });
    fireEvent.click(within(ranura).getByRole("button", { name: "Versículo 2" }));
    await waitFor(() => expect(verso(container, 2).hasAttribute("data-elegido")).toBe(true));
    expect(verso(container, 1).hasAttribute("data-elegido")).toBe(false);
  });

  it("tocar un versículo en el texto lo proyecta y es el que sobresale", async () => {
    const { container } = await conCapituloEnColumna();
    fireEvent.click(screen.getByText("Respondió Jesús."));
    expect(verso(container, 3).hasAttribute("data-elegido")).toBe(true);
    expect(verso(container, 1).hasAttribute("data-elegido")).toBe(false);
  });

  it("el que se proyecta al tocarlo conserva su marca de siempre: fondo amarillo claro y sombra, sin ícono", async () => {
    const { container } = await conCapituloEnColumna();
    fireEvent.click(screen.getByText("Este vino a Jesús."));
    const dos = verso(container, 2);
    expect(dos.hasAttribute("data-al-aire")).toBe(true);
    expect(dos.className).toContain("bg-yellow-100");
    expect(dos.className).toContain("shadow-md");
    expect(dos.querySelector("[data-icono-al-aire]")).toBeNull();
    // Con fondo claro la letra sigue oscura (la de siempre), no blanca
    expect(dos.querySelectorAll("span")[1].className).toContain("text-app-muted");
    // Al tocar otro, la marca pasa a ese y el anterior vuelve a atenuarse
    fireEvent.click(screen.getByText("Respondió Jesús."));
    expect(verso(container, 3).className).toContain("bg-yellow-100");
    expect(verso(container, 2).className).not.toContain("bg-yellow-100");
    expect(verso(container, 2).className).toContain("opacity-60");
  });

  it("uno que no se proyectó no lleva fondo amarillo", async () => {
    const { container } = await conCapituloEnColumna();
    for (const n of [1, 2, 3]) expect(verso(container, n).className, String(n)).not.toContain("bg-yellow-100");
  });
});

describe("ControlVersiculo: versículos recientes", () => {
  const capitulo = {
    libro: "Juan",
    capitulo: 3,
    numero: "1",
    texto: "<p><b>1</b> Había un hombre.</p><p><b>2</b> Este vino a Jesús.</p><p><b>3</b> Respondió Jesús.</p>",
  };

  async function conCapituloEnColumna() {
    obtenerVersiculo.mockResolvedValue(capitulo);
    const ranura = nuevaRanura();
    const resultado = abrir({ ranura });
    fireEvent.click(within(ranura).getByRole("button", { name: "Nuevo" }));
    fireEvent.click(within(ranura).getByRole("button", { name: "S. Juan" }));
    fireEvent.click(within(ranura).getByRole("button", { name: "Capítulo 3" }));
    await screen.findByText(/Había un hombre/);
    return { ranura, ...resultado };
  }
  const abrirRecientes = (ranura) => fireEvent.click(within(ranura).getByRole("button", { name: "Recientes" }));

  it("cada versículo que se proyecta queda en Recientes, el último arriba", async () => {
    const { ranura } = await conCapituloEnColumna();
    fireEvent.click(screen.getByText("Este vino a Jesús."));
    fireEvent.click(screen.getByText("Respondió Jesús."));
    abrirRecientes(ranura);
    const filas = within(ranura).getAllByRole("button", { name: /^Ir a / });
    expect(filas.map((f) => f.getAttribute("aria-label"))).toEqual(["Ir a Juan 3:3", "Ir a Juan 3:2"]);
    expect(filas[0].textContent).toContain("Respondió Jesús.");
  });

  it("lo que solo se lee o se elige no entra: únicamente lo proyectado", async () => {
    const { ranura } = await conCapituloEnColumna();
    abrirRecientes(ranura);
    expect(within(ranura).getByText("Aún no has proyectado versículos.")).toBeTruthy();
  });

  it("volver a uno ya proyectado no lo duplica: sube al primer lugar", async () => {
    const { ranura } = await conCapituloEnColumna();
    fireEvent.click(screen.getByText("Este vino a Jesús."));
    fireEvent.click(screen.getByText("Respondió Jesús."));
    fireEvent.click(screen.getByText("Este vino a Jesús."));
    abrirRecientes(ranura);
    expect(within(ranura).getAllByRole("button", { name: /^Ir a / }).map((f) => f.getAttribute("aria-label"))).toEqual(["Ir a Juan 3:2", "Ir a Juan 3:3"]);
  });

  it("tocar uno lee su capítulo y lo lleva ahí, SIN proyectarlo", async () => {
    const { ranura } = await conCapituloEnColumna();
    fireEvent.click(screen.getByText("Este vino a Jesús."));
    abrirRecientes(ranura);
    obtenerVersiculo.mockClear();
    set.mockClear();
    fireEvent.click(within(ranura).getByRole("button", { name: "Ir a Juan 3:2" }));
    expect(obtenerVersiculo).toHaveBeenLastCalledWith("JHN", 3, 2, "capitulo", expect.any(Function), "RVR1960");
    expect(set).not.toHaveBeenCalled();
  });

  it("al volver a uno ya abierto, el texto se lleva otra vez a ese versículo", async () => {
    const { ranura } = await conCapituloEnColumna();
    obtenerVersiculo.mockResolvedValue({ ...capitulo, numero: "2" });
    fireEvent.click(screen.getByText("Este vino a Jesús."));
    abrirRecientes(ranura);
    await waitFor(() => expect(Element.prototype.scrollTo).toBeDefined());
    Element.prototype.scrollTo.mockClear();
    fireEvent.click(within(ranura).getByRole("button", { name: "Ir a Juan 3:2" }));
    await waitFor(() => expect(Element.prototype.scrollTo).toHaveBeenCalled());
  });

  it("el versículo al que se vuelve queda elegido (sobresale) pero no al aire", async () => {
    const { container, ranura } = await conCapituloEnColumna();
    fireEvent.click(screen.getByText("Este vino a Jesús."));
    fireEvent.click(screen.getByText("Respondió Jesús."));
    abrirRecientes(ranura);
    obtenerVersiculo.mockResolvedValue({ ...capitulo, numero: "2" });
    fireEvent.click(within(ranura).getByRole("button", { name: "Ir a Juan 3:2" }));
    await waitFor(() => expect(container.querySelector('[data-versiculo="2"]').hasAttribute("data-elegido")).toBe(true));
  });

  it("se recuerda en este dispositivo, y «Limpiar recientes» la vacía", async () => {
    const { ranura } = await conCapituloEnColumna();
    fireEvent.click(screen.getByText("Este vino a Jesús."));
    expect(JSON.parse(localStorage.getItem("voxdei.biblia.recientes.g1"))).toHaveLength(1);
    abrirRecientes(ranura);
    fireEvent.click(within(ranura).getByRole("button", { name: "Limpiar recientes" }));
    expect(within(ranura).getByText("Aún no has proyectado versículos.")).toBeTruthy();
    expect(JSON.parse(localStorage.getItem("voxdei.biblia.recientes.g1"))).toEqual([]);
  });

  it("Anterior y Siguiente del celular también los registran, y la ventana se cierra al elegir uno", async () => {
    obtenerVersiculo.mockResolvedValue(capitulo);
    abrir({ isDesktop: false });
    fireEvent.click(document.querySelector("[data-abrir-libros]"));
    let dialogo = screen.getByRole("dialog", { name: "Libros" });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Nuevo" }));
    fireEvent.click(within(dialogo).getByRole("button", { name: "S. Juan" }));
    fireEvent.click(within(dialogo).getByRole("button", { name: "Capítulo 3" }));
    fireEvent.click(within(dialogo).getByRole("button", { name: "Versículo 1" }));
    await screen.findByText(/Había un hombre/);
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    fireEvent.click(document.querySelector("[data-abrir-libros]"));
    dialogo = screen.getByRole("dialog", { name: "Libros" });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Recientes" }));
    expect(within(dialogo).getAllByRole("button", { name: /^Ir a / }).map((f) => f.getAttribute("aria-label"))).toEqual(["Ir a Juan 3:2", "Ir a Juan 3:1"]);
    obtenerVersiculo.mockClear();
    fireEvent.click(within(dialogo).getByRole("button", { name: "Ir a Juan 3:1" }));
    expect(screen.queryByRole("dialog", { name: "Libros" })).toBeNull();
    expect(obtenerVersiculo).toHaveBeenLastCalledWith("JHN", 3, 1, "capitulo", expect.any(Function), "RVR1960");
  });
});
