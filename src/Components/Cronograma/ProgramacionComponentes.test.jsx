import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";

// Firestore de mentira: lo que se escribe o se borra queda anotado en `llamadas`.
const estado = vi.hoisted(() => ({ llamadas: [] }));

vi.mock("../Firebase/Firebase", () => ({ db: {} }));
vi.mock("firebase/firestore", () => ({
  doc: (...partes) => partes.slice(1).join("/"),
  collection: (...partes) => partes.slice(1).join("/"),
  setDoc: vi.fn(async (ruta, datos) =>
    estado.llamadas.push({ accion: "setDoc", ruta, datos }),
  ),
  addDoc: vi.fn(async (ruta, datos) =>
    estado.llamadas.push({ accion: "addDoc", ruta, datos }),
  ),
  deleteDoc: vi.fn(async (ruta) =>
    estado.llamadas.push({ accion: "deleteDoc", ruta }),
  ),
  serverTimestamp: () => "ahora",
}));

import AdministrarCargos from "./AdministrarCargos.jsx";
import EditorProgramacion from "./EditorProgramacion.jsx";
import ListaProgramacion from "./ListaProgramacion.jsx";
import { montar } from "../Navegacion/pruebas.utils.jsx";

const lider = { userData: { name: "Marta", role: "Líder", groupId: "g1" } };
const ms = (a, m, d, h = 0) => new Date(a, m - 1, d, h).getTime();

const CARGOS = [
  { id: "conductor", nombre: "Conductor", orden: 0, proyecta: true },
  { id: "alabanza", nombre: "Alabanza", orden: 1, proyecta: false },
  { id: "proyeccion", nombre: "Proyección", orden: 2, proyecta: true },
];
const EQUIPO = [
  { uid: "d1", nombre: "Ana", rol: "Pastor" },
  { uid: "m1", nombre: "Marta", rol: "Líder" },
  { uid: "o1", nombre: "Luis", rol: "Operador" },
];
const SERVICIO = {
  id: "s1",
  nombre: "Dominical",
  inicio: "10:00",
  fin: "12:00",
  dias: [0],
  activo: true,
};
const OCURRENCIA = {
  id: "s1_2026-11-29",
  servicio: SERVICIO,
  fecha: "2026-11-29",
  inicio: ms(2026, 11, 29, 10),
  fin: ms(2026, 11, 29, 12),
};

beforeEach(() => {
  estado.llamadas = [];
});
afterEach(() => vi.clearAllMocks());

describe("EditorProgramacion", () => {
  const mostrar = (programacion, cargos = CARGOS) =>
    montar(
      <EditorProgramacion
        ocurrencia={OCURRENCIA}
        cargos={cargos}
        equipo={EQUIPO}
        programacion={programacion}
      />,
      { auth: lider },
    );

  it("dice qué fecha se asigna y lista cada cargo en el orden del catálogo, marcando los que proyectan", () => {
    mostrar();
    expect(
      screen.getByText(
        /Dominical · domingo, 29 de noviembre|Dominical · domingo 29 de noviembre/,
      ),
    ).toBeTruthy();
    expect(
      screen
        .getAllByRole("heading", { level: 3 })
        .map((h) => h.textContent.replace("proyecta", "").trim()),
    ).toEqual(["Conductor", "Alabanza", "Proyección"]);
    expect(
      within(screen.getByRole("region", { name: "Conductor" })).getByText(
        "proyecta",
      ),
    ).toBeTruthy();
    expect(
      within(screen.getByRole("region", { name: "Alabanza" })).queryByText(
        "proyecta",
      ),
    ).toBeNull();
  });

  it("elegir a alguien lo agrega al cargo en la fecha, como pendiente, y lo guarda en la iglesia", async () => {
    mostrar();
    fireEvent.change(screen.getByLabelText("Agregar a Proyección"), {
      target: { value: "o1" },
    });
    await waitFor(() => expect(estado.llamadas).toHaveLength(1));
    const [escrito] = estado.llamadas;
    expect(escrito.accion).toBe("setDoc");
    expect(escrito.ruta).toContain("g1");
    expect(escrito.ruta).toContain("s1_2026-11-29");
    expect(escrito.datos).toMatchObject({
      servicioId: "s1",
      fecha: "2026-11-29",
      asignaciones: {
        proyeccion: [{ uid: "o1", nombre: "Luis", estado: "pendiente" }],
      },
    });
  });

  it("muestra a quienes ya están, y no los vuelve a ofrecer en ese cargo", () => {
    mostrar({
      asignaciones: {
        conductor: [{ uid: "d1", nombre: "Ana", estado: "confirmado" }],
      },
    });
    const conductor = screen.getByRole("region", { name: "Conductor" });
    expect(within(conductor).getByText("Ana")).toBeTruthy();
    expect(within(conductor).queryByRole("option", { name: "Ana" })).toBeNull();
    expect(
      within(conductor).getByRole("option", { name: "Luis" }),
    ).toBeTruthy();
    // En otro cargo sí se puede asignar a la misma persona
    expect(
      within(screen.getByRole("region", { name: "Alabanza" })).getByRole(
        "option",
        { name: "Ana" },
      ),
    ).toBeTruthy();
  });

  it("quitar a alguien lo saca de su cargo y deja a los demás", async () => {
    mostrar({
      asignaciones: {
        proyeccion: [
          { uid: "o1", nombre: "Luis", estado: "pendiente" },
          { uid: "m1", nombre: "Marta", estado: "pendiente" },
        ],
      },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Quitar a Luis de Proyección" }),
    );
    await waitFor(() => expect(estado.llamadas).toHaveLength(1));
    expect(estado.llamadas[0].datos.asignaciones).toEqual({
      proyeccion: [{ uid: "m1", nombre: "Marta", estado: "pendiente" }],
    });
  });

  it("marca distinto al que confirmó y al que dijo «no puedo»", () => {
    mostrar({
      asignaciones: {
        conductor: [
          { uid: "d1", nombre: "Ana", estado: "confirmado" },
          { uid: "o1", nombre: "Luis", estado: "no_puede" },
        ],
      },
    });
    const personas = within(
      screen.getByRole("region", { name: "Conductor" }),
    ).getAllByRole("listitem");
    expect(personas[0].textContent).toContain("Ana");
    expect(personas[0].className).toContain("text-app-success");
    expect(personas[1].textContent).toContain("Luis");
    expect(personas[1].className).toContain("line-through");
  });

  it("sin cargos no hay nada que asignar: manda a crearlos", () => {
    mostrar(undefined, []);
    expect(
      screen.getByText(/Primero crea los cargos del servicio/),
    ).toBeTruthy();
    expect(screen.queryByRole("combobox")).toBeNull();
  });

  it("si no se puede guardar, avisa", async () => {
    const { setDoc } = await import("firebase/firestore");
    setDoc.mockRejectedValueOnce(new Error("sin red"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { app } = mostrar();
    fireEvent.change(screen.getByLabelText("Agregar a Conductor"), {
      target: { value: "d1" },
    });
    await waitFor(() =>
      expect(app.showNotif).toHaveBeenCalledWith(
        "error",
        "No se pudo guardar la programación. Revisa tu conexión.",
      ),
    );
  });
});

describe("AdministrarCargos", () => {
  const mostrar = (cargos, app = {}) =>
    montar(<AdministrarCargos cargos={cargos} />, { auth: lider, app });

  it("sin cargos ofrece crear los básicos, todos con su id fijo", async () => {
    mostrar([]);
    fireEvent.click(
      screen.getByRole("button", { name: "Usar los cargos básicos" }),
    );
    await waitFor(() => expect(estado.llamadas).toHaveLength(9));
    expect(
      estado.llamadas.every(
        (c) => c.accion === "setDoc" && c.ruta.includes("g1/cargos/"),
      ),
    ).toBe(true);
    const conductor = estado.llamadas.find((c) =>
      c.ruta.endsWith("/conductor"),
    );
    expect(conductor.datos).toEqual({
      nombre: "Conductor",
      proyecta: true,
      orden: 0,
    });
    expect(
      estado.llamadas
        .filter((c) => c.datos.proyecta)
        .map((c) => c.ruta.split("/").pop())
        .sort(),
    ).toEqual(["conductor", "proyeccion"]);
  });

  it("agrega un cargo nuevo al final del orden, sin permiso de proyectar (se da en su fila)", async () => {
    mostrar(CARGOS);
    fireEvent.change(screen.getByLabelText("Nombre del cargo nuevo"), {
      target: { value: "  Cámara " },
    });
    expect(
      screen.queryByLabelText("Quien lo tenga ese día puede proyectar"),
    ).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Agregar cargo" }));
    await waitFor(() => expect(estado.llamadas).toHaveLength(1));
    expect(estado.llamadas[0]).toMatchObject({
      accion: "addDoc",
      datos: { nombre: "Cámara", orden: 3, proyecta: false },
    });
    expect(estado.llamadas[0].ruta).toContain("g1/cargos");
  });

  it("el nombre del cargo se puede escoger de una lista con el estilo de la app (también los que ya hay, por si se borró uno) o escribir uno nuevo", () => {
    mostrar([{ id: "c1", nombre: "Sonido", proyecta: false, orden: 0 }]);
    const campo = screen.getByLabelText("Nombre del cargo nuevo");
    expect(campo.getAttribute("role")).toBe("combobox");
    fireEvent.focus(campo);
    const lista = screen.getByRole("listbox");
    const opciones = within(lista)
      .getAllByRole("option")
      .map((o) => o.textContent);
    expect(opciones).toContain("Conductor");
    expect(opciones).toContain("Cámara");
    expect(opciones).toContain("Sonido");
    fireEvent.mouseDown(within(lista).getByRole("option", { name: "Cámara" }));
    expect(campo.value).toBe("Cámara");
    fireEvent.change(campo, { target: { value: "Fotografía" } });
    expect(campo.value).toBe("Fotografía");
  });

  it("no agrega un cargo vacío ni repetido", () => {
    const { app } = mostrar(CARGOS);
    fireEvent.click(screen.getByRole("button", { name: "Agregar cargo" }));
    expect(app.showNotif).toHaveBeenLastCalledWith(
      "warning",
      "Escribe el nombre del cargo.",
    );
    fireEvent.change(screen.getByLabelText("Nombre del cargo nuevo"), {
      target: { value: "alabanza" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Agregar cargo" }));
    expect(app.showNotif).toHaveBeenLastCalledWith(
      "warning",
      "Ya hay un cargo con ese nombre.",
    );
    expect(estado.llamadas).toEqual([]);
  });

  it("cambia si un cargo proyecta, conservando lo demás y sin guardar su id dentro", async () => {
    mostrar(CARGOS);
    fireEvent.click(screen.getByLabelText("Proyecta: Alabanza"));
    await waitFor(() => expect(estado.llamadas).toHaveLength(1));
    expect(estado.llamadas[0].ruta.endsWith("/alabanza")).toBe(true);
    expect(estado.llamadas[0].datos).toEqual({
      nombre: "Alabanza",
      orden: 1,
      proyecta: true,
    });
  });

  it("eliminar un cargo pide confirmación; si no se confirma, no se borra", async () => {
    const { app } = mostrar(CARGOS);
    fireEvent.click(
      screen.getByRole("button", { name: "Eliminar el cargo Alabanza" }),
    );
    await waitFor(() => expect(estado.llamadas).toHaveLength(1));
    expect(app.confirmAction).toHaveBeenCalledWith(
      "¿Eliminar el cargo «Alabanza»? Las personas ya asignadas a él dejan de verse.",
    );
    expect(estado.llamadas[0]).toMatchObject({ accion: "deleteDoc" });
    estado.llamadas = [];
    const { app: otra } = mostrar(CARGOS, {
      confirmAction: vi.fn().mockResolvedValue(false),
    });
    fireEvent.click(
      screen
        .getAllByRole("button", { name: "Eliminar el cargo Alabanza" })
        .at(-1),
    );
    await waitFor(() => expect(otra.confirmAction).toHaveBeenCalled());
    expect(estado.llamadas).toEqual([]);
  });
});

describe("ListaProgramacion", () => {
  const OTRA = {
    ...OCURRENCIA,
    id: "s1_2026-12-06",
    fecha: "2026-12-06",
    inicio: ms(2026, 12, 6, 10),
    fin: ms(2026, 12, 6, 12),
  };
  const PROG = {
    "s1_2026-11-29": {
      asignaciones: {
        conductor: [{ uid: "o1", nombre: "Luis", estado: "pendiente" }],
        alabanza: [{ uid: "m1", nombre: "Marta", estado: "confirmado" }],
      },
    },
  };
  const mostrar = (props = {}) =>
    montar(
      <ListaProgramacion
        ocurrencias={[OCURRENCIA, OTRA]}
        cargos={CARGOS}
        programacion={PROG}
        {...props}
      />,
      { auth: lider },
    );

  it("cada fecha muestra quién tiene cada cargo, y «Sin asignar» si nadie", () => {
    mostrar();
    const primera = document.querySelector(
      '[data-fecha-programada="s1_2026-11-29"]',
    );
    expect(primera.textContent).toContain("Conductor:Luis");
    expect(primera.textContent).toContain("Alabanza:Marta");
    expect(primera.textContent).not.toContain("Proyección:");
    expect(
      document.querySelector('[data-fecha-programada="s1_2026-12-06"]')
        .textContent,
    ).toContain("Sin asignar");
  });

  it("avisa solo en la fecha donde nadie tiene un cargo que proyecta", () => {
    mostrar();
    // La primera tiene a Luis de Conductor (que proyecta); la segunda no tiene a nadie
    expect(
      document.querySelector('[data-fecha-programada="s1_2026-11-29"]')
        .textContent,
    ).not.toContain("Sin proyección asignada");
    expect(
      document.querySelector('[data-fecha-programada="s1_2026-12-06"]')
        .textContent,
    ).toContain("Sin proyección asignada");
    expect(screen.getAllByText("Sin proyección asignada")).toHaveLength(1);
  });

  it("si el catálogo no tiene ningún cargo que proyecte, no avisa de nada", () => {
    mostrar({ cargos: CARGOS.map((c) => ({ ...c, proyecta: false })) });
    expect(screen.queryByText("Sin proyección asignada")).toBeNull();
  });

  it("quien tiene el cargo se ve como «Tú»", () => {
    mostrar({ miUid: "o1" });
    expect(
      document.querySelector('[data-fecha-programada="s1_2026-11-29"] dd')
        .textContent,
    ).toBe("Tú");
  });

  it("cada fecha lleva su hoja de calendario (día de la semana, número y mes) y el avance de cargos cubiertos", () => {
    mostrar();
    const primera = document.querySelector(
      '[data-fecha-programada="s1_2026-11-29"]',
    );
    const hoja = primera.querySelector("[data-hoja]");
    expect(hoja.getAttribute("aria-hidden")).toBe("true");
    expect(hoja.textContent).toContain("29");
    // Mide siempre lo mismo, aunque la tarjeta crezca con más cargos
    expect(hoja.className).toContain("self-start");
    expect(hoja.className).toContain("w-14");
    expect(hoja.textContent.toLowerCase()).toContain("nov");
    const avance = primera.querySelector("[data-avance]");
    expect(avance.textContent).toBe("2/3");
    expect(avance.getAttribute("title")).toBe("2 de 3 cargos con alguien");
    expect(
      document.querySelector(
        '[data-fecha-programada="s1_2026-12-06"] [data-avance]',
      ).textContent,
    ).toBe("0/3");
  });

  it("cada persona lleva el estado de su respuesta: sin responder, confirmado o no puede", () => {
    mostrar({
      programacion: {
        "s1_2026-11-29": {
          asignaciones: {
            conductor: [
              { uid: "o1", nombre: "Luis", estado: "confirmado" },
              { uid: "o2", nombre: "Pedro", estado: "no_puede" },
            ],
            alabanza: [{ uid: "o3", nombre: "Marta", estado: "pendiente" }],
          },
        },
      },
    });
    const ficha = (nombre) => screen.getByText(nombre).closest("[data-estado]");
    expect(ficha("Luis").getAttribute("title")).toBe("Confirmado");
    expect(ficha("Pedro").getAttribute("data-estado")).toBe("no_puede");
    expect(ficha("Pedro").className).toContain("line-through");
    expect(ficha("Marta").getAttribute("title")).toBe("Sin responder");
  });

  it("los cargos que proyectan llevan una cámara, y los demás no", () => {
    mostrar();
    const primera = document.querySelector(
      '[data-fecha-programada="s1_2026-11-29"]',
    );
    const filas = [...primera.querySelectorAll("dt")];
    const de = (nombre) => filas.find((f) => f.textContent.includes(nombre));
    expect(de("Conductor").querySelector("svg")).not.toBeNull();
    expect(de("Alabanza").querySelector("svg")).toBeNull();
  });

  it("las tarjetas se acomodan en dos columnas cuando el espacio alcanza, y la elegida con su editor ocupa las dos", () => {
    mostrar({
      alElegir: vi.fn(),
      elegida: "s1_2026-11-29",
      renderEditor: () => <p>Editor</p>,
    });
    const lista = document.querySelector("[data-lista-programacion]");
    expect(lista.parentElement.className).toContain("@container");
    expect(lista.className).toContain("grid-cols-1");
    expect(lista.className).toContain("@2xl:grid-cols-2");
    expect(lista.className).toContain("items-start");
    expect(
      document.querySelector('[data-fecha-programada="s1_2026-11-29"]')
        .className,
    ).toContain("@2xl:col-span-2");
    expect(
      document.querySelector('[data-fecha-programada="s1_2026-12-06"]')
        .className,
    ).not.toContain("col-span-2");
  });

  it("sin permiso de programar (sin alElegir) las fechas no son botones", () => {
    mostrar({ alElegir: null });
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("con permiso, tocar una fecha la elige y marca la elegida", () => {
    const alElegir = vi.fn();
    mostrar({ alElegir, elegida: "s1_2026-12-06" });
    fireEvent.click(
      document.querySelector('[data-fecha-programada="s1_2026-11-29"] button'),
    );
    expect(alElegir).toHaveBeenCalledWith("s1_2026-11-29");
    expect(
      document
        .querySelector('[data-fecha-programada="s1_2026-12-06"] button')
        .getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("en el celular el editor se pinta bajo la fecha elegida", () => {
    mostrar({
      alElegir: vi.fn(),
      elegida: "s1_2026-11-29",
      renderEditor: (o) => <p>Editor de {o.fecha}</p>,
    });
    expect(
      within(
        document.querySelector('[data-fecha-programada="s1_2026-11-29"]'),
      ).getByText("Editor de 2026-11-29"),
    ).toBeTruthy();
    expect(screen.queryByText("Editor de 2026-12-06")).toBeNull();
  });

  it("sin fechas lo dice", () => {
    mostrar({ ocurrencias: [] });
    expect(screen.getByText(/No hay servicios próximos/)).toBeTruthy();
  });
});
