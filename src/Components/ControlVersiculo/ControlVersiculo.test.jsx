import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, screen, within } from "@testing-library/react";
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

  it("en el celular o la tableta se quedan en el encabezado aunque exista una ranura", () => {
    const ranura = nuevaRanura();
    const { container } = abrir({ ranura, isDesktop: false, app: { formatoPantalla: "tableta" } });
    expect(within(container).getByRole("button", { name: "Antiguo" })).toBeTruthy();
    expect(ranura.querySelector("[data-botones-biblia]")).toBeNull();
    expect(screen.getAllByRole("button", { name: "Antiguo" })).toHaveLength(1);
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

  it("en el celular o sin guía, el encabezado conserva su línea dorada", () => {
    const { container } = abrir({ ranura: null });
    expect(container.querySelector(".sticky").className).toContain("border-app-main");
    const otra = nuevaRanura();
    const celular = abrir({ ranura: otra, isDesktop: false, app: { formatoPantalla: "tableta" } });
    expect(celular.container.querySelector(".sticky").className).toContain("border-app-main");
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

  it("en el celular y la tableta la página se desplaza como siempre", () => {
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

  it("elegir un capítulo cierra la ventana y deja el texto a la vista, con su nombre y su contador", async () => {
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
    await screen.findByText(/Había un hombre/);
    set.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(set.mock.calls.at(-1)[1]).toMatchObject({ text: "Había un hombre.", display: "versiculo" });
  });

  it("la tableta y el computador no llevan estos interruptores", () => {
    abrir({ isDesktop: false, app: { formatoPantalla: "tableta" } });
    expect(screen.queryByRole("button", { name: "Ocultar la pantalla" })).toBeNull();
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
    await screen.findByText(/Había un hombre/);
    expect(otra.container.querySelector("[data-abrir-libros]").getAttribute("aria-label")).toBe("Abrir los libros (ahora: Juan 3)");
  });

  it("sin capítulo abierto, el mensaje trae un botón grande «Elegir libro» que abre los libros", () => {
    const { container } = abrir({ isDesktop: false });
    const grande = container.querySelector("[data-elegir-libro]");
    expect(grande.textContent).toBe("Elegir libro");
    expect(grande.className).toContain("h-12");
    expect(container.querySelector("[data-sin-capitulo]").contains(grande)).toBe(true);
    fireEvent.click(grande);
    expect(screen.getByRole("dialog", { name: "Libros" })).toBeTruthy();
  });

  it("con un capítulo abierto el botón grande ya no está", async () => {
    const { container } = await conCapitulo();
    expect(container.querySelector("[data-elegir-libro]")).toBeNull();
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
