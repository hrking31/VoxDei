import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";

const estado = vi.hoisted(() => ({
  equipo: [
    { uid: "o1", nombre: "Luis", rol: "Operador" },
    { uid: "m1", nombre: "Marta", rol: "Líder" },
    { uid: "d1", nombre: "Ana", rol: "Pastor" },
  ],
  existente: null,
}));

vi.mock("../../Components/Firebase/Firebase", () => ({ db: {}, database: {} }));
vi.mock("firebase/firestore", () => ({
  doc: (...partes) => partes.slice(1).join("/"),
  collection: (...partes) => partes.slice(1).join("/"),
  addDoc: vi.fn(async () => {}),
  setDoc: vi.fn(async () => {}),
  deleteDoc: vi.fn(async () => {}),
  getDoc: vi.fn(async () => ({
    exists: () => Boolean(estado.existente),
    data: () => estado.existente,
  })),
  serverTimestamp: () => "ahora",
}));
vi.mock("firebase/database", () => ({
  ref: (_db, ruta) => ruta,
  set: vi.fn(async () => {}),
  update: vi.fn(),
  remove: vi.fn(async () => {}),
  serverTimestamp: () => "ahora",
}));
vi.mock("../../Components/Cronograma/useEquipo.js", () => ({
  useEquipo: () => estado.equipo,
}));

import { setDoc } from "firebase/firestore";
import ViewCronograma from "./ViewCronograma.jsx";
import { montar } from "../../Components/Navegacion/pruebas.utils.jsx";

const SERVICIO = {
  id: "s1",
  nombre: "Dominical",
  inicio: "10:00",
  fin: "12:00",
  dias: [0],
  fecha: null,
  operadorUid: "o1",
  operadorNombre: "Luis",
  activo: true,
};
const pastor = { userData: { name: "Ana", role: "Pastor", groupId: "g1" } };
const operador = {
  user: { uid: "o2" },
  userData: { name: "Luis", role: "Operador", groupId: "g1" },
};

beforeEach(() => {
  estado.existente = { ...SERVICIO };
});
afterEach(() => vi.clearAllMocks());

const entrar = (app = {}, auth = pastor) =>
  montar(<ViewCronograma />, {
    ruta: "/ViewCronograma",
    auth,
    app: { servicios: [SERVICIO], isDesktop: true, ...app },
  });
const columna = () => document.querySelector("[data-columna-servicio]");
const tarjetaDe = (id) => document.querySelector(`[data-servicio="${id}"]`);
const franjaDeColumna = () => document.querySelector("[data-titulo-columna]");
const botonFranja = (nombre) =>
  within(franjaDeColumna()).getByRole("button", { name: nombre });
const botonServicio = () => screen.queryByRole("button", { name: "Servicio" });

describe("ViewCronograma · columna del servicio en el computador", () => {
  it("el pastor la ve siempre, con el formulario para crear, y ya no lleva el botón «Servicio» del encabezado", () => {
    entrar();
    expect(columna()).not.toBeNull();
    expect(screen.getByRole("button", { name: "Guardar" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Nuevo" })).toBeNull();
    expect(screen.getByLabelText("Nombre")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Guardar" })).toBeTruthy();
    expect(botonServicio()).toBeNull();
  });

  it("el formulario de la columna tiene más aire: 24 px entre campos y 20 px de margen", () => {
    entrar();
    expect(columna().querySelector("form").className).toContain("gap-6");
    expect(
      columna().querySelector("form").parentElement.parentElement.className,
    ).toContain("p-5");
  });

  it("tocar un servicio lo carga en la columna para corregirlo, y «Nuevo» vuelve a crear", async () => {
    entrar();
    fireEvent.click(tarjetaDe("s1"));
    expect(screen.getByRole("button", { name: "Nuevo" })).toBeTruthy();
    await waitFor(() =>
      expect(screen.getByLabelText("Nombre").value).toBe("Dominical"),
    );
    expect(
      screen.getByRole("button", { name: "Eliminar servicio" }),
    ).toBeTruthy();
    expect(screen.getByTestId("ruta").textContent).toBe("/ViewCronograma");

    fireEvent.click(screen.getByRole("button", { name: "Nuevo" }));
    expect(screen.getByRole("button", { name: "Guardar" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Nuevo" })).toBeNull();
    expect(screen.getByLabelText("Nombre").value).toBe("");
    expect(
      screen.queryByRole("button", { name: "Eliminar servicio" }),
    ).toBeNull();
  });

  it("al guardar un servicio nuevo, el formulario se limpia y se queda en el Cronograma", async () => {
    const { app } = entrar();
    fireEvent.change(screen.getByLabelText("Nombre"), {
      target: { value: "Oración" },
    });
    fireEvent.click(screen.getByTitle("Martes"));
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() =>
      expect(app.showNotif).toHaveBeenCalledWith(
        "success",
        "Servicio guardado.",
      ),
    );
    await waitFor(() => expect(screen.getByLabelText("Nombre").value).toBe(""));
    expect(screen.getByTestId("ruta").textContent).toBe("/ViewCronograma");
  });
});

describe("ViewCronograma · título de la columna y pantalla de espera", () => {
  it("la franja de la columna es de borde a borde y de color dorado tonal, sin flechas ni íconos", () => {
    entrar();
    const franja = franjaDeColumna();
    expect(franja.className).toContain("bg-app-main/10");
    expect(franja.className).toContain("border-b");
    expect(franja.className).toContain("h-12");
    expect(franja.className).not.toContain("p-1");
    expect(franja.className).not.toContain("text-app-agua");
    expect(franja.querySelector("svg")).toBeNull();
  });

  it("el formulario ya no lleva subtítulo («Nuevo servicio») ni «(opcional)» en el nombre", () => {
    entrar();
    expect(
      screen.queryByRole("heading", { name: "Nuevo servicio" }),
    ).toBeNull();
    expect(
      screen.queryByRole("heading", { name: "Editar servicio" }),
    ).toBeNull();
    expect(screen.queryByText(/opcional/i)).toBeNull();
    expect(screen.getByLabelText("Nombre")).toBeTruthy();
  });

  it("el Cronograma ya no lleva la tarjeta de la pantalla de espera (se maneja desde Inicio)", () => {
    entrar();
    expect(screen.queryByText("Pantalla de espera")).toBeNull();
    expect(screen.queryByRole("button", { name: "Mostrar" })).toBeNull();
  });
});

describe("ViewCronograma · barra de arriba del centro", () => {
  it("en el computador no lleva la barra que dice dónde estamos; el título queda solo para los lectores de pantalla", () => {
    entrar();
    const titulo = screen.getByRole("heading", {
      level: 1,
      name: "Cronograma",
    });
    expect(titulo.className).toContain("sr-only");
    expect(
      document.querySelector("header, .border-app-main.bg-app-light.px-2"),
    ).toBeNull();
  });

  it("tampoco la ve el operador en el computador", () => {
    entrar({}, operador);
    expect(
      screen.getByRole("heading", { level: 1, name: "Cronograma" }).className,
    ).toContain("sr-only");
  });

  it("en el celular y la tableta sigue, con el botón «Servicio»", () => {
    entrar({ isDesktop: false });
    expect(
      document.querySelector(".border-app-main.bg-app-light.px-2"),
    ).not.toBeNull();
    expect(botonServicio()).not.toBeNull();
  });
});

describe("ViewCronograma · sin tarjeta de ensayo", () => {
  it("los ensayos se programan como un servicio más: ya no hay tarjeta ni botones de ensayo en el Cronograma", () => {
    entrar({ ensayo: { uid: "o1", nombre: "Luis", inicio: Date.now() } });
    expect(document.querySelector("[data-tarjeta-ensayo]")).toBeNull();
    expect(screen.queryByRole("button", { name: "Ensayar" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Terminar ensayo" }),
    ).toBeNull();
    expect(screen.queryByText(/Ensayo de Luis/)).toBeNull();
  });

  it("tampoco para el operador ni en el celular", () => {
    const operadorVista = entrar({}, operador);
    expect(document.querySelector("[data-tarjeta-ensayo]")).toBeNull();
    operadorVista.unmount();
    entrar({ isDesktop: false });
    expect(document.querySelector("[data-tarjeta-ensayo]")).toBeNull();
  });
});

describe("ViewCronograma · pestañas Servicios y Programación", () => {
  // Un miércoles a las 15:00: el próximo servicio es el del domingo 29
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 10, 25, 15));
  });
  afterEach(() => vi.useRealTimers());

  const CARGOS = [
    { id: "conductor", nombre: "Conductor", orden: 0, proyecta: true },
    { id: "alabanza", nombre: "Alabanza", orden: 1, proyecta: false },
    { id: "proyeccion", nombre: "Proyección", orden: 2, proyecta: true },
  ];
  const lider = {
    userData: { name: "Marta", role: "Líder", groupId: "g1" },
    user: { uid: "m1" },
  };
  const irAProgramacion = () =>
    fireEvent.click(
      franjaDeColumna()
        ? botonFranja("Programación")
        : screen.getByRole("tab", { name: "Programación" }),
    );
  const conCargos = (app = {}) => ({
    cargos: CARGOS,
    programacion: {},
    ...app,
  });

  it("arranca en «Servicios» (la pastilla dorada ahí) y el servicio ya no muestra operador", () => {
    entrar(conCargos());
    expect(botonFranja("Servicios").getAttribute("aria-pressed")).toBe("true");
    expect(botonFranja("Programación").getAttribute("aria-pressed")).toBe(
      "false",
    );
    expect(
      franjaDeColumna()
        .querySelector("[data-pastilla]")
        .getAttribute("data-en"),
    ).toBe("servicios");
    expect(screen.queryByText(/Sin operador asignado/)).toBeNull();
    expect(columna()).not.toBeNull();
  });

  it("tocar en el calendario un día que ya pasó muestra su tarjeta arriba, marcada «Pasado» y en solo lectura", () => {
    entrar(
      conCargos({
        programacion: {
          "s1_2026-11-22": {
            asignaciones: {
              conductor: [{ uid: "o1", nombre: "Luis", estado: "confirmado" }],
            },
          },
        },
      }),
    );
    irAProgramacion();
    // Antes de tocarlo, el domingo 22 no está en la lista de próximas
    expect(
      document.querySelector('[data-fecha-programada="s1_2026-11-22"]'),
    ).toBeNull();
    fireEvent.click(document.querySelector('[data-fecha="2026-11-22"]'));
    const tarjeta = document.querySelector(
      '[data-fecha-programada="s1_2026-11-22"]',
    );
    expect(tarjeta).not.toBeNull();
    expect(tarjeta.querySelector("[data-pasada]").textContent).toBe("Pasado");
    expect(tarjeta.textContent).toContain("Luis");
    // Es la primera de la lista y el editor no se ofrece: solo se ve
    expect(
      document.querySelector("[data-lista-programacion]").firstElementChild,
    ).toBe(tarjeta);
    expect(document.querySelector("[data-fecha-pasada]")).not.toBeNull();
    expect(screen.queryByLabelText("Agregar a Conductor")).toBeNull();
    // Tocar un día próximo vuelve a ofrecer el editor y la tarjeta pasada sale de la lista
    fireEvent.click(document.querySelector('[data-fecha="2026-11-29"]'));
    expect(
      document.querySelector('[data-fecha-programada="s1_2026-11-22"]'),
    ).toBeNull();
    expect(document.querySelector("[data-fecha-pasada]")).toBeNull();
    expect(screen.getByLabelText("Agregar a Conductor")).toBeTruthy();
  });

  it("«Programación» muestra las próximas fechas, y la columna cambia a los cargos de la primera", () => {
    entrar(conCargos());
    irAProgramacion();
    expect(columna()).toBeNull();
    expect(
      document.querySelector("[data-columna-programacion]"),
    ).not.toBeNull();
    expect(
      document.querySelector('[data-fecha-programada="s1_2026-11-29"]'),
    ).not.toBeNull();
    expect(botonFranja("Programación").getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(screen.getByRole("region", { name: "Proyección" })).toBeTruthy();
    expect(screen.getByText("Administrar cargos")).toBeTruthy();
  });

  it("asignar a alguien en un cargo escribe la programación de esa fecha", async () => {
    entrar(conCargos());
    irAProgramacion();
    fireEvent.change(screen.getByLabelText("Agregar a Proyección"), {
      target: { value: "o1" },
    });
    await waitFor(() => expect(setDoc).toHaveBeenCalled());
    const [ruta, datos] = setDoc.mock.calls.at(-1);
    expect(ruta).toContain("programacion/s1_2026-11-29");
    expect(datos.asignaciones.proyeccion[0]).toMatchObject({
      uid: "o1",
      nombre: "Luis",
    });
  });

  it("tocar otra fecha cambia la fecha de la columna", () => {
    const otro = {
      ...SERVICIO,
      id: "s2",
      nombre: "Oración",
      inicio: "19:00",
      fin: "20:30",
      dias: [3],
    };
    entrar(conCargos({ servicios: [SERVICIO, otro] }));
    irAProgramacion();
    expect(screen.getByText(/Oración · /)).toBeTruthy(); // hoy miércoles 19:00 va primero
    fireEvent.click(
      document.querySelector('[data-fecha-programada="s1_2026-11-29"] button'),
    );
    expect(
      document.querySelector("[data-columna-programacion]").textContent,
    ).toContain("Dominical");
  });

  it("el líder ve la columna con el calendario y el cambio de pestañas, pero sin el formulario de servicios", () => {
    entrar(conCargos(), lider);
    expect(columna()).not.toBeNull();
    expect(columna().querySelector("form")).toBeNull();
    expect(screen.queryByRole("button", { name: "Guardar" })).toBeNull();
    expect(
      within(columna()).getByText(/Solo el pastor o la pastora crean/),
    ).toBeTruthy();
    expect(
      within(columna()).getByLabelText("Calendario de servicios"),
    ).toBeTruthy();
    irAProgramacion();
    expect(
      document.querySelector("[data-columna-programacion]"),
    ).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Servicio" })).toBeNull();
  });

  it("el operador ve la programación sin poder cambiarla y se ve a sí mismo como «Tú»", () => {
    const programacion = {
      "s1_2026-11-29": {
        asignaciones: {
          proyeccion: [{ uid: "o2", nombre: "Luis", estado: "pendiente" }],
        },
      },
    };
    entrar(conCargos({ programacion }), operador);
    irAProgramacion();
    expect(document.querySelector("[data-columna-programacion]")).toBeNull();
    expect(
      document.querySelector('[data-fecha-programada="s1_2026-11-29"] button'),
    ).toBeNull();
    expect(
      document.querySelector('[data-fecha-programada="s1_2026-11-29"] dd')
        .textContent,
    ).toBe("Tú");
    expect(screen.queryByText("Administrar cargos")).toBeNull();
  });

  it("en el celular el pastor elige una fecha y el editor aparece bajo ella, con «Administrar cargos» al final", () => {
    entrar(conCargos({ isDesktop: false }));
    irAProgramacion();
    expect(document.querySelector("[data-columna-programacion]")).toBeNull();
    expect(document.querySelector("[data-editor-programacion]")).toBeNull();
    fireEvent.click(
      document.querySelector('[data-fecha-programada="s1_2026-11-29"] button'),
    );
    expect(
      within(
        document.querySelector('[data-fecha-programada="s1_2026-11-29"]'),
      ).getByRole("region", { name: "Proyección" }),
    ).toBeTruthy();
    expect(screen.getByText("Administrar cargos")).toBeTruthy();
  });

  it("sin servicios lo dice y no queda columna vacía con errores", () => {
    entrar(conCargos({ servicios: [] }));
    irAProgramacion();
    expect(
      screen.getAllByText(/No hay servicios próximos/).length,
    ).toBeGreaterThan(0);
  });

  it("en el celular, al abrir «Administrar cargos» se expande y sube hasta quedar a la vista", () => {
    const subir = vi.fn();
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = subir;
    const marco = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((f) => {
        f();
        return 1;
      });
    try {
      entrar(conCargos({ isDesktop: false }));
      irAProgramacion();
      const plegable = document.querySelector("[data-cargos]");
      expect(plegable.open).toBe(false);
      plegable.open = true;
      fireEvent(plegable, new Event("toggle"));
      expect(subir).toHaveBeenCalledTimes(1);
      expect(subir.mock.instances[0]).toBe(plegable);
      expect(subir).toHaveBeenCalledWith({
        behavior: "smooth",
        block: "start",
      });
      // Al cerrarlo no se mueve nada
      plegable.open = false;
      fireEvent(plegable, new Event("toggle"));
      expect(subir).toHaveBeenCalledTimes(1);
    } finally {
      Element.prototype.scrollIntoView = original;
      marco.mockRestore();
    }
  });

  it("en el computador «Administrar cargos» está FIJO al pie de la columna, a la vista desde el principio, fuera de lo que se desplaza", () => {
    entrar(conCargos());
    irAProgramacion();
    const pie = document.querySelector("[data-cargos-pie]");
    expect(pie).not.toBeNull();
    // Es hijo directo de la columna, no del área que se desplaza
    expect(pie.parentElement).toBe(
      document.querySelector("[data-columna-programacion]"),
    );
    expect(pie.closest(".overflow-y-auto")).toBeNull();
    const boton = within(pie).getByRole("button", {
      name: "Administrar cargos",
    });
    expect(boton.getAttribute("aria-expanded")).toBe("false");
    expect(document.querySelector("[data-panel-cargos]")).toBeNull();
    // Y es lo último de la columna: nada queda debajo
    expect(
      document.querySelector("[data-columna-programacion]").lastElementChild,
    ).toBe(pie);
  });

  it("al pulsarlo el panel se expande hacia ARRIBA del botón, y al volver a pulsarlo se cierra", () => {
    entrar(conCargos());
    irAProgramacion();
    const pie = document.querySelector("[data-cargos-pie]");
    const boton = within(pie).getByRole("button", {
      name: "Administrar cargos",
    });
    fireEvent.click(boton);
    const panel = document.querySelector("[data-panel-cargos]");
    expect(panel).not.toBeNull();
    expect(boton.getAttribute("aria-expanded")).toBe("true");
    expect(
      panel.compareDocumentPosition(boton) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(within(panel).getByLabelText("Nombre del cargo nuevo")).toBeTruthy();
    expect(panel.className).toContain("min-h-0");
    expect(panel.className).toContain("overflow-y-auto");
    // Ocupa toda la columna, desde la franja de arriba hasta el botón
    expect(pie.className).toContain("flex-1");
    expect(panel.className).toContain("flex-1");
    expect(document.querySelector("[data-area-columna]").className).toContain(
      "hidden",
    );
    fireEvent.click(boton);
    expect(document.querySelector("[data-panel-cargos]")).toBeNull();
    expect(boton.getAttribute("aria-expanded")).toBe("false");
  });

  it("el pie de cargos solo está en «Programación» y solo para quien programa", () => {
    const pastorVista = entrar(conCargos());
    expect(document.querySelector("[data-cargos-pie]")).toBeNull();
    pastorVista.unmount();
    const liderVista = entrar(conCargos(), lider);
    irAProgramacion();
    expect(document.querySelector("[data-cargos-pie]")).not.toBeNull();
    liderVista.unmount();
    const operadorVista = entrar(conCargos(), operador);
    irAProgramacion();
    expect(document.querySelector("[data-cargos-pie]")).toBeNull();
    expect(screen.queryByText("Administrar cargos")).toBeNull();
    operadorVista.unmount();
  });

  it("volver a «Servicios» devuelve el formulario", () => {
    entrar(conCargos());
    irAProgramacion();
    fireEvent.click(botonFranja("Servicios"));
    expect(columna()).not.toBeNull();
    expect(document.querySelector("[data-columna-programacion]")).toBeNull();
  });
});

describe("ViewCronograma · diseño de «Servicios»: se repiten, especiales, filtros y calendario", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 10, 25, 15)); // miércoles
  });
  afterEach(() => vi.useRealTimers());

  const ORACION = {
    id: "s2",
    nombre: "Oración",
    inicio: "19:00",
    fin: "20:30",
    dias: [3],
    fecha: null,
    activo: true,
  };
  const RETIRO = {
    id: "s3",
    nombre: "Retiro",
    inicio: "08:00",
    fin: "17:00",
    dias: [],
    fecha: "2026-12-05",
    activo: true,
  };
  const todos = { servicios: [SERVICIO, ORACION, RETIRO] };

  it("las fechas especiales van ARRIBA y la semana que se repite debajo", () => {
    entrar(todos);
    const repiten = document.querySelector("[data-columna-repiten]");
    const especiales = document.querySelector("[data-columna-especiales]");
    expect(
      especiales.compareDocumentPosition(repiten) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(repiten.querySelector('[data-servicio="s1"]')).not.toBeNull();
    expect(repiten.querySelector('[data-servicio="s2"]')).not.toBeNull();
    expect(repiten.querySelector('[data-servicio="s3"]')).toBeNull();
    expect(especiales.querySelector('[data-servicio="s3"]')).not.toBeNull();
    expect(especiales.textContent).toContain("en 10 días");
  });

  it("la semana es un tablero de siete columnas, de lunes a domingo, con «libre» en los días vacíos", () => {
    entrar(todos);
    const dias = [...document.querySelectorAll("[data-dia-semana]")];
    expect(dias.map((d) => d.getAttribute("data-dia-semana"))).toEqual([
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "0",
    ]);
    expect(
      document.querySelector('[data-dia-semana="1"]').textContent,
    ).toContain("Lun");
    expect(
      document.querySelector('[data-dia-semana="1"]').textContent,
    ).toContain("libre");
    expect(
      document.querySelector('[data-dia-semana="0"]').textContent,
    ).toContain("Dom");
  });

  it("las que se repiten lo dicen y las especiales llevan el bloque de fecha", () => {
    entrar(todos);
    expect(tarjetaDe("s1").textContent).toContain("Cada semana");
    expect(tarjetaDe("s2").textContent).toContain("Cada semana");
    expect(tarjetaDe("s1").querySelector("[title]").getAttribute("title")).toBe(
      "Cada domingo",
    );
    expect(tarjetaDe("s2").querySelector("[title]").getAttribute("title")).toBe(
      "Cada miércoles",
    );
    expect(
      tarjetaDe("s3")
        .querySelector("[data-bloque-fecha]")
        .getAttribute("title"),
    ).toBe("Una sola vez");
    expect(
      tarjetaDe("s3").querySelector("[data-bloque-fecha]").textContent,
    ).toContain("DIC");
    expect(tarjetaDe("s1").querySelector("[data-bloque-fecha]")).toBeNull();
  });

  it("marca «hoy» en el encabezado del día que toca", () => {
    entrar(todos);
    expect(document.querySelector('[data-dia-semana="3"] h3').textContent).toBe(
      "Mié · hoy",
    );
    expect(document.querySelector('[data-dia-semana="0"] h3').textContent).toBe(
      "Dom",
    );
  });

  it("un domingo con muchos servicios: cada uno con su propia tarjeta, la cuenta en el encabezado y el día se desplaza solo", () => {
    const muchos = Array.from({ length: 12 }, (_, i) => ({
      id: `d${i}`,
      nombre: `Servicio ${i + 1}`,
      inicio: `${String(6 + i).padStart(2, "0")}:00`,
      fin: `${String(6 + i).padStart(2, "0")}:50`,
      dias: [0],
      fecha: null,
      activo: true,
    }));
    entrar({ servicios: [...muchos, RETIRO] });
    const domingo = document.querySelector('[data-dia-semana="0"]');
    expect(domingo.querySelectorAll("[data-servicio]")).toHaveLength(12);
    expect(domingo.querySelector("h3").textContent).toBe("Dom · 12");
    expect(domingo.querySelector("[data-dia-lista]").className).toContain(
      "overflow-y-auto",
    );
    expect(domingo.querySelector("[data-dia-lista]").className).toContain(
      "max-h-",
    );
    // Las fechas especiales siguen arriba y a la vista
    expect(
      document.querySelector("[data-columna-especiales] [data-servicio]"),
    ).not.toBeNull();
    expect(
      document
        .querySelector("[data-columna-especiales]")
        .compareDocumentPosition(domingo) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("los filtros dejan solo una de las dos columnas y cuentan cada clase", () => {
    entrar(todos);
    const filtro = (nombre) =>
      screen.getByRole("button", { name: new RegExp(`^${nombre} ·`) });
    expect(filtro("Todos").textContent).toBe("Todos · 3");
    expect(filtro("Se repiten").textContent).toBe("Se repiten · 2");
    expect(filtro("Especiales").textContent).toBe("Especiales · 1");
    fireEvent.click(filtro("Especiales"));
    expect(document.querySelector("[data-columna-repiten]")).toBeNull();
    expect(document.querySelector("[data-columna-especiales]")).not.toBeNull();
    fireEvent.click(filtro("Se repiten"));
    expect(document.querySelector("[data-columna-especiales]")).toBeNull();
    expect(document.querySelector("[data-columna-repiten]")).not.toBeNull();
    fireEvent.click(filtro("Todos"));
    expect(document.querySelector("[data-columna-repiten]")).not.toBeNull();
    expect(document.querySelector("[data-columna-especiales]")).not.toBeNull();
  });

  it("arriba lleva el título «Servicios» en el dorado de la app, con cuántos hay de cada clase", () => {
    entrar(todos);
    const titulo = document.querySelector("[data-titulo-servicios]");
    const encabezado = within(titulo).getByRole("heading", {
      name: "Servicios",
    });
    expect(encabezado.className).toContain("text-app-main");
    expect(titulo.textContent).toContain("2 se repiten · 1 fecha especial");
    expect(
      titulo.compareDocumentPosition(
        document.querySelector(
          '[role="group"][aria-label="Filtrar servicios"]',
        ),
      ) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("sin servicios el título también está, con la invitación a crear el primero", () => {
    entrar({ servicios: [] });
    expect(
      document.querySelector("[data-titulo-servicios]").textContent,
    ).toContain("0 se repiten · 0 fechas especiales");
    expect(screen.getByText(/Aún no hay servicios/)).toBeTruthy();
  });

  it("un servicio que se repite sale en UNA tarjeta, no en una por semana", () => {
    entrar(todos);
    expect(document.querySelectorAll('[data-servicio="s1"]')).toHaveLength(1);
  });

  it("pastor y líder cambian de pestaña con la franja de la columna; el operador y el celular, con las pestañas del centro", () => {
    const pastorVista = entrar(todos);
    expect(franjaDeColumna()).not.toBeNull();
    expect(document.querySelectorAll('[role="tablist"]')).toHaveLength(0);
    pastorVista.unmount();
    const operadorVista = entrar(todos, operador);
    expect(document.querySelector("[data-columna-cronograma]")).toBeNull();
    expect(screen.getByRole("tab", { name: "Programación" })).toBeTruthy();
    operadorVista.unmount();
    entrar({ ...todos, isDesktop: false });
    expect(document.querySelector("[data-columna-cronograma]")).toBeNull();
    expect(screen.getByRole("tab", { name: "Servicios" })).toBeTruthy();
  });

  it("la franja es UN solo control de borde a borde: la pastilla dorada ocupa todo el alto, se desliza a la opción tocada y la otra queda apagada", () => {
    entrar(todos);
    const servicios = botonFranja("Servicios");
    const programacion = botonFranja("Programación");
    const pastilla = () => franjaDeColumna().querySelector("[data-pastilla]");
    expect(servicios.parentElement).toBe(programacion.parentElement);
    expect(servicios.getAttribute("aria-pressed")).toBe("true");
    expect(servicios.className).toContain("text-app-dark");
    expect(programacion.className).toContain("text-app-muted");
    expect(pastilla().className).toContain("inset-y-0");
    expect(pastilla().className).toContain("w-1/2");
    expect(pastilla().className).toContain("translate-x-0");
    expect(pastilla().className).toContain("transition-transform");
    expect(pastilla().className).not.toContain("rounded");
    // Sin flechas ni íconos de cambio
    expect(franjaDeColumna().querySelector("svg")).toBeNull();
    fireEvent.click(programacion);
    expect(
      document.querySelector("[data-columna-programacion]"),
    ).not.toBeNull();
    expect(pastilla().className).toContain("translate-x-full");
    expect(pastilla().getAttribute("data-en")).toBe("programacion");
    expect(botonFranja("Programación").className).toContain("text-app-dark");
    expect(botonFranja("Servicios").className).toContain("text-app-muted");
    expect(document.querySelectorAll("[data-titulo-columna]")).toHaveLength(1);
  });

  it("al corregir un servicio, «Nuevo» queda arriba del contenido de la columna y no en la franja", () => {
    entrar(todos);
    fireEvent.click(tarjetaDe("s1"));
    const franja = columna().querySelector("[data-titulo-columna]");
    expect(within(franja).queryByRole("button", { name: "Nuevo" })).toBeNull();
    expect(screen.getByRole("button", { name: "Nuevo" })).toBeTruthy();
    expect(
      within(columna()).getByRole("button", { name: "Nuevo" }),
    ).toBeTruthy();
  });

  it("el calendario está en la columna y marca los días: dorado si se repite, azul si es de una sola vez", () => {
    entrar(todos);
    const calendario = within(columna()).getByLabelText(
      "Calendario de servicios",
    );
    expect(calendario.textContent).toContain("Noviembre 2026");
    expect(
      calendario
        .querySelector('[data-fecha="2026-11-29"]')
        .getAttribute("data-clase-dia"),
    ).toBe("repite");
    expect(
      calendario
        .querySelector('[data-fecha="2026-11-30"]')
        .getAttribute("data-clase-dia"),
    ).toBeNull();
    fireEvent.click(
      within(calendario).getByRole("button", { name: "Mes siguiente" }),
    );
    expect(
      calendario
        .querySelector('[data-fecha="2026-12-05"]')
        .getAttribute("data-clase-dia"),
    ).toBe("unico");
  });

  it("tocar en el calendario un día con servicio carga ese servicio para corregirlo", async () => {
    entrar(todos);
    fireEvent.click(columna().querySelector('[data-fecha="2026-11-29"]'));
    expect(screen.getByRole("button", { name: "Nuevo" })).toBeTruthy();
    await waitFor(() =>
      expect(screen.getByLabelText("Nombre").value).toBe("Dominical"),
    );
    expect(
      columna()
        .querySelector('[data-fecha="2026-11-29"]')
        .getAttribute("aria-current"),
    ).toBe("date");
  });

  it("tocar un día libre deja esa fecha en el formulario de un servicio nuevo", () => {
    entrar(todos);
    fireEvent.click(columna().querySelector('[data-fecha="2026-11-30"]'));
    expect(screen.getByRole("button", { name: "Guardar" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Nuevo" })).toBeNull();
    expect(screen.getByLabelText("Fecha").value).toBe("2026-11-30");
    expect(
      document
        .querySelector('[data-fecha="2026-11-30"]')
        .getAttribute("aria-current"),
    ).toBe("date");
  });

  it("en «Programación», tocar un día del calendario elige esa fecha para asignar los cargos", () => {
    entrar({
      ...todos,
      cargos: [
        { id: "conductor", nombre: "Conductor", orden: 0, proyecta: true },
      ],
    });
    fireEvent.click(botonFranja("Programación"));
    // Hoy (miércoles) la primera fecha es la oración de las 19:00
    expect(
      document.querySelector(
        "[data-columna-programacion] [data-editor-programacion]",
      ).textContent,
    ).toContain("Oración");
    fireEvent.click(
      document.querySelector(
        '[data-columna-programacion] [data-fecha="2026-11-29"]',
      ),
    );
    expect(
      document.querySelector(
        "[data-columna-programacion] [data-editor-programacion]",
      ).textContent,
    ).toContain("Dominical");
  });
});

describe("ViewCronograma · franja del turno", () => {
  const franja = () => document.querySelector("[data-franja-turno]");

  it("en el computador no lleva la franja verde del turno y de la pantalla, ni el pastor ni el operador", () => {
    entrar();
    expect(franja()).toBeNull();
  });

  it("en el celular y la tableta sí la lleva, porque ahí se gestiona el ensayo", () => {
    entrar({ isDesktop: false });
    expect(franja()).not.toBeNull();
  });

  it("el operador en el computador tampoco la ve", () => {
    entrar({}, operador);
    expect(franja()).toBeNull();
  });
});

describe("ViewCronograma · sin la columna", () => {
  it("en el celular y la tableta no hay columna: el botón «Servicio» abre la página, igual que tocar un servicio", () => {
    entrar({ isDesktop: false });
    expect(columna()).toBeNull();
    fireEvent.click(botonServicio());
    expect(screen.getByTestId("ruta").textContent).toBe("/ViewServicioEditar");
  });

  it("en el celular, tocar un servicio abre su página de edición", () => {
    entrar({ isDesktop: false });
    fireEvent.click(tarjetaDe("s1"));
    expect(screen.getByTestId("ruta").textContent).toBe(
      "/ViewServicioEditar/s1",
    );
  });

  it("el operador no ve la columna ni el botón, aunque esté en el computador", () => {
    entrar({}, operador);
    expect(columna()).toBeNull();
    expect(botonServicio()).toBeNull();
    expect(screen.getByText(/Dominical/)).toBeTruthy();
  });
});
