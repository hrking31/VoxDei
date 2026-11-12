import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { EyeSlashIcon, TrashIcon } from "@heroicons/react/24/solid";

// Firebase de mentira: las prédicas llegan por onSnapshot; lo que se guarda,
// crea y proyecta queda anotado.
const fb = vi.hoisted(() => ({
  docs: [],
  guardados: [],
  creados: [],
  borrados: [],
  proyectado: [],
  rtdb: {}, // lo que hay en los nodos de la pantalla, para onValue
}));

vi.mock("../Firebase/Firebase", () => ({ db: {}, database: {}, auth: {}, storage: {}, functions: {} }));
vi.mock("firebase/firestore", () => ({
  collection: (_db, ...partes) => partes.join("/"),
  doc: (_db, ...partes) => partes.join("/"),
  onSnapshot: (_ruta, alCambiar) => {
    alCambiar({ docs: fb.docs.map((d) => ({ id: d.id, data: () => d.data })) });
    return () => {};
  },
  addDoc: vi.fn(async (ruta, datos) => {
    fb.creados.push({ ruta, datos });
    return { id: "nueva" };
  }),
  setDoc: vi.fn(async (ruta, datos) => fb.guardados.push({ ruta, datos })),
  deleteDoc: vi.fn(async (ruta) => fb.borrados.push(ruta)),
  serverTimestamp: () => "ahora",
  getDoc: vi.fn(),
}));
vi.mock("firebase/database", () => ({
  ref: (_db, ruta) => ruta,
  onValue: (ruta, alCambiar) => {
    alCambiar({ val: () => fb.rtdb[ruta] ?? null });
    return () => {};
  },
  set: vi.fn(async (ruta, datos) => fb.proyectado.push({ ruta, datos })),
  update: vi.fn(async () => {}),
  remove: vi.fn(async () => {}),
  serverTimestamp: () => "ahora",
}));
vi.mock("../FuncionesControlPredica/FuncionesControlPredica", () => ({
  obtenerVersiculo: vi.fn(async (sigla, capitulo, numero) => ({
    texto: "Porque de tal manera amó Dios al mundo…",
    libro: "S. Juan",
    capitulo,
    numero,
  })),
}));

// Las imágenes de la iglesia: subir y listar sin Storage ni Firestore.
const img = vi.hoisted(() => ({
  lista: [],
  subir: vi.fn(async () => ({ url: "https://img/foto.jpg", nombre: "foto.jpg" })),
}));
vi.mock("../Imagenes/imagenesIglesia.js", () => ({
  subirImagen: img.subir,
  useImagenesIglesia: (_g, activo) => (activo ? img.lista : null),
}));

import ControlPredica from "./ControlPredica.jsx";
import { obtenerVersiculo } from "../FuncionesControlPredica/FuncionesControlPredica";
import { montar } from "../Navegacion/pruebas.utils.jsx";

const pastor = { userData: { name: "Ana", role: "Pastor", groupId: "g1" } };

const LA_FE = {
  id: "fe",
  data: {
    titulo: "La fe que se atreve",
    fecha: "2099-11-15",
    serie: "Héroes de la fe",
    estado: "borrador",
    piezas: [
      { id: "p1", tipo: "versiculo", contenido: { cita: "Hebreos 11:1", texto: "Es, pues, la fe la certeza…" } },
      { id: "p2", tipo: "titulo", contenido: "La fe ve lo invisible" },
      { id: "p3", tipo: "mensaje", contenido: "La fe no es adivinar el futuro." },
    ],
  },
};
// Una de los 5 slots de antes: sin título y con `items`.
const ANTIGUA = { id: "predica2", data: { items: [{ tipo: "mensaje", contenido: "Hola iglesia", timestamp: 5 }] } };

function abrir({ isDesktop = true, versionBiblia, app: extra = {} } = {}) {
  // Lo que pase la prueba en `app` manda sobre los valores de fábrica.
  const app = {
    isDesktop,
    versionBiblia,
    setVersionBiblia: vi.fn(),
    visibleTitulo: false,
    setVisibleTitulo: vi.fn(),
    visibleTexto: true,
    setVisibleTexto: vi.fn(),
    visibleTicker: false,
    setVisibleTicker: vi.fn(),
    ...extra,
  };
  return montar(<ControlPredica />, { ruta: "/ViewPredica", auth: pastor, app });
}

beforeEach(() => {
  fb.docs = [LA_FE, ANTIGUA];
  fb.guardados = [];
  fb.creados = [];
  fb.borrados = [];
  fb.proyectado = [];
  fb.rtdb = {};
});
afterEach(() => vi.clearAllMocks());

const boton = (nombre) => screen.getByRole("button", { name: nombre });
// El estado se ve en el chip (`data-estado-predica`) y se marca terminada con
// el botón del final del tapete (solo de borrador a terminada).
const cambiarEst = () => document.querySelector("[data-marcar-terminada]");

describe("Mis prédicas", () => {
  it("lista todas, también las de los slots de antes, y cuenta sin límite", () => {
    abrir();
    expect(screen.getByText("La fe que se atreve")).toBeTruthy();
    expect(screen.getByText("Prédica guardada 2")).toBeTruthy();
    expect(screen.getByText(/prédicas guardadas/).textContent).toContain("2");
    expect(screen.getByText("Sin límite")).toBeTruthy();
  });

  it("en el computador no hay «Nueva»: arriba de la lista va «Predicar»", () => {
    abrir();
    const lista = screen.getByRole("complementary", { name: "Mis prédicas" });
    expect(within(lista).queryByRole("button", { name: /Nueva/ })).toBeNull();
    expect(within(lista).getByRole("button", { name: "Predicar" })).toBeTruthy();
  });

  it("«Nueva prédica» (celular) crea una con la fecha del próximo domingo", async () => {
    abrir({ isDesktop: false });
    fireEvent.click(boton("Nueva prédica"));
    await waitFor(() => expect(fb.creados).toHaveLength(1));
    const { ruta, datos } = fb.creados[0];
    expect(ruta).toBe("iglesias/g1/predicas");
    expect(datos).toMatchObject({ titulo: "Nueva prédica", estado: "borrador", piezas: [] });
    expect(new Date(`${datos.fecha}T12:00`).getDay()).toBe(0);
  });

  it("cada prédica y cada filtro llevan el color de su estado, con su etiqueta", () => {
    fb.docs = [
      LA_FE,
      { id: "lista", data: { ...LA_FE.data, titulo: "Ya preparada", estado: "terminada" } },
      { id: "hecha", data: { ...LA_FE.data, titulo: "Ya la prediqué", estado: "predicada" } },
      { id: "vieja", data: { ...LA_FE.data, titulo: "Se me pasó", fecha: "2020-01-05" } },
    ];
    abrir();
    const fila = (titulo) => screen.getByText(titulo).closest("button");
    // Línea de tiempo: el punto y la etiqueta llevan el color del estado.
    // El punto lleva el color; la palabra solo se ve en «Sin predicar» (en
    // las demás queda para el lector de pantalla, sin pintarse).
    const color = (titulo, etiqueta, clase) => {
      expect(fila(titulo).closest("li").querySelector("[data-punto]").className).toContain(`bg-${clase}`);
      const palabra = within(fila(titulo)).getByText(etiqueta);
      if (etiqueta === "Sin predicar") expect(palabra.className).toContain(`text-${clase}`);
      else expect(palabra.className).toBe("sr-only");
    };
    color("La fe que se atreve", "Borrador", "app-naranja");
    color("Ya preparada", "Terminada", "app-azul");
    color("Ya la prediqué", "Predicada", "app-success");
    color("Se me pasó", "Sin predicar", "app-error");
    fireEvent.click(boton("Terminadas"));
    expect(boton("Terminadas").className).toContain("bg-app-azul/10");
    expect(screen.queryByText("La fe que se atreve")).toBeNull();
    expect(boton("Todas").className).toContain("text-app-texto");
  });

  it("en la lista, la palabra del estado solo se ve en «Sin predicar», y se cuentan «ítems»", () => {
    fb.docs = [LA_FE, { id: "vieja", data: { ...LA_FE.data, titulo: "Se me pasó", fecha: "2020-01-05" } }];
    abrir();
    const fila = screen.getByText("La fe que se atreve").closest("button");
    expect(within(fila).getByText("Borrador").className).toBe("sr-only");
    const pasada = within(screen.getByText("Se me pasó").closest("button")).getByText("Sin predicar");
    expect(pasada.className).toContain("text-app-error");
    expect(pasada.className).not.toContain("sr-only");
    expect(fila.textContent).toContain("3 ítems");
    expect(fila.textContent).not.toContain("piezas");
  });

  it("en la lista, el versículo base va junto a la serie y no en la línea de arriba", () => {
    abrir();
    const fila = screen.getByText("La fe que se atreve").closest("button");
    const arriba = fila.firstElementChild;
    expect(arriba.textContent).toContain("3 ítems");
    expect(arriba.textContent).not.toContain("Hebreos 11:1");
    const abajo = fila.querySelector("[data-serie-y-base]");
    expect(abajo.textContent).toBe("Serie · Héroes de la fe · Hebreos 11:1");
  });

  it("la lista es una línea de tiempo agrupada por mes, y la abierta se marca con su color", () => {
    fb.docs = [
      LA_FE,
      { id: "dic", data: { ...LA_FE.data, titulo: "Emanuel", fecha: "2099-12-20" } },
    ];
    abrir();
    const meses = [...document.querySelectorAll("[data-mes]")].map((s) => s.getAttribute("aria-label"));
    expect(meses).toEqual(["Noviembre 2099", "Diciembre 2099"]);
    // El nombre del mes va en dorado (12-11-2026).
    expect(document.querySelector("[data-mes] h4").className).toContain("text-app-main");
    fireEvent.click(screen.getByText("La fe que se atreve"));
    const abierta = screen.getByText("La fe que se atreve").closest("button");
    expect(abierta.getAttribute("aria-current")).toBe("true");
    expect(abierta.className).toContain("bg-app-naranja/15");
    expect(abierta.closest("li").querySelector("[data-punto]").className).toContain("ring-4");
    // El punto queda fuera del recuadro de la abierta, para que no se pegue.
    expect(abierta.querySelector("[data-punto]")).toBeNull();
  });

  it("el calendario marca los días con prédica y tocar uno la abre", () => {
    fb.docs = [{ ...LA_FE, data: { ...LA_FE.data, fecha: todayPlus(0) } }];
    abrir();
    const dia = document.querySelector(`[data-fecha="${todayPlus(0)}"]`);
    expect(dia.getAttribute("aria-label")).toContain("La fe que se atreve");
    fireEvent.click(dia);
    expect(screen.getByLabelText("Título de la prédica").value).toBe("La fe que se atreve");
  });
});

// Tocar el calendario no crea nada (12-11-2026, pedido del usuario). Se fija
// el jueves 12 de noviembre de 2026: noviembre termina un lunes, así que del
// 1 al 5 de diciembre salen en gris.
describe("Calendario", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 10, 12, 10));
  });
  afterEach(() => vi.useRealTimers());

  const dia = (fecha) => document.querySelector(`[data-fecha="${fecha}"]`);
  const fechaVacia = () => document.querySelector('input[type="date"]').value;

  it("computador: un día libre pone su fecha en la vacía, sin crear; escribir la crea con esa fecha", async () => {
    // La creada ya viene en la lista (Firestore avisa antes de que addDoc
    // termine); sin fecha, para no ocupar el 21 antes de tiempo.
    fb.docs = [LA_FE, { id: "nueva", data: { titulo: "Cristo Rey", fecha: "", serie: "", estado: "borrador", piezas: [] } }];
    abrir();
    expect(fechaVacia()).toBe("2026-11-15");
    fireEvent.click(dia("2026-11-21"));
    expect(fechaVacia()).toBe("2026-11-21");
    expect(dia("2026-11-21").hasAttribute("data-marcada")).toBe(true);
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText("Título de la prédica")));
    expect(fb.creados).toHaveLength(0);

    fireEvent.change(screen.getByLabelText("Título de la prédica"), { target: { value: "Cristo Rey" } });
    await waitFor(() => expect(fb.creados).toHaveLength(1));
    expect(fb.creados[0].datos).toMatchObject({ titulo: "Cristo Rey", fecha: "2026-11-21" });
  });

  it("computador: con otra abierta, un día libre la cierra y muestra la vacía con esa fecha", () => {
    fb.docs = [{ ...LA_FE, data: { ...LA_FE.data, fecha: "2026-11-15" } }];
    abrir();
    fireEvent.click(dia("2026-11-15"));
    expect(screen.getByLabelText("Título de la prédica").value).toBe("La fe que se atreve");
    fireEvent.click(dia("2026-11-28"));
    expect(screen.getByLabelText("Título de la prédica").value).toBe("");
    expect(fechaVacia()).toBe("2026-11-28");
    expect(fb.creados).toHaveLength(0);
  });

  it("los días con prédica llevan un círculo punteado de su color; el elegido, uno dorado continuo; hoy, violeta", () => {
    fb.docs = [
      { ...LA_FE, data: { ...LA_FE.data, fecha: "2026-11-22" } },
      { id: "t", data: { ...LA_FE.data, titulo: "El buen pastor", fecha: "2026-11-29", estado: "terminada" } },
      { id: "s", data: { ...LA_FE.data, titulo: "Se me pasó", fecha: "2026-11-04" } },
    ];
    abrir();
    const clase = (fecha) => dia(fecha).className;
    expect(clase("2026-11-22")).toContain("border-dashed");
    expect(clase("2026-11-22")).toContain("border-app-naranja");
    expect(clase("2026-11-29")).toContain("border-app-azul");
    expect(clase("2026-11-04")).toContain("border-app-error");
    expect(dia("2026-11-22").querySelector("[data-punto]")).toBeNull();
    // La vacía arranca el domingo 15: elegido, dorado continuo.
    expect(clase("2026-11-15")).toContain("border-app-main");
    expect(clase("2026-11-15")).not.toContain("border-dashed");
    expect(dia("2026-11-12").hasAttribute("data-hoy")).toBe(true);
    expect(clase("2026-11-12")).toContain("text-app-violeta");
    expect(clase("2026-11-12")).not.toContain("ring-app-muted");
  });

  it("cambiar solo la fecha de la vacía no la crea", () => {
    abrir();
    fireEvent.change(document.querySelector('input[type="date"]'), { target: { value: "2026-12-20" } });
    expect(fb.creados).toHaveLength(0);
  });

  it("un día gris pasa a su mes sin crear nada, y «Hoy» vuelve al actual", () => {
    abrir();
    const calendario = screen.getByRole("region", { name: "Calendario de prédicas" });
    expect(within(calendario).queryByRole("button", { name: "Hoy" })).toBeNull();
    fireEvent.click(dia("2026-12-05"));
    expect(within(calendario).getByText("Diciembre 2026")).toBeTruthy();
    expect(fechaVacia()).toBe("2026-11-15");
    expect(fb.creados).toHaveLength(0);
    fireEvent.click(within(calendario).getByRole("button", { name: "Hoy" }));
    expect(within(calendario).getByText("Noviembre 2026")).toBeTruthy();
    expect(within(calendario).queryByRole("button", { name: "Hoy" })).toBeNull();
  });

  it("celular: un día libre solo se marca; se crea al pulsar «Crear para este día»", async () => {
    abrir({ isDesktop: false });
    fireEvent.click(dia("2026-11-21"));
    expect(dia("2026-11-21").hasAttribute("data-marcada")).toBe(true);
    const elegido = document.querySelector("[data-dia-elegido]");
    expect(elegido.textContent).toContain("Sábado 21 de noviembre");
    expect(elegido.textContent).toContain("Sin prédica");
    expect(fb.creados).toHaveLength(0);
    fireEvent.click(within(elegido).getByRole("button", { name: "Crear para este día" }));
    await waitFor(() => expect(fb.creados).toHaveLength(1));
    expect(fb.creados[0].datos.fecha).toBe("2026-11-21");
  });

  it("celular: un día con prédica la muestra con Preparar y Predicar", () => {
    fb.docs = [{ ...LA_FE, data: { ...LA_FE.data, fecha: "2026-11-22" } }];
    abrir({ isDesktop: false });
    fireEvent.click(dia("2026-11-22"));
    const elegido = document.querySelector("[data-dia-elegido]");
    expect(elegido.textContent).toContain("La fe que se atreve");
    fireEvent.click(within(elegido).getByRole("button", { name: "Preparar" }));
    expect(screen.getByLabelText("Título de la prédica").value).toBe("La fe que se atreve");
  });
});

// Deshacer y Rehacer (12-11-2026, pedido del usuario, en vez de «Cancelar»).
describe("Deshacer y Rehacer", () => {
  const titulo = () => screen.getByLabelText("Título de la prédica");
  const fecha = () => document.querySelector('input[type="date"]');

  it("abajo, tres tramos: Punto Mensaje Imagen │ Deshacer Rehacer Borrar Duplicar │ WhatsApp", () => {
    abrir();
    fireEvent.click(screen.getByText("La fe que se atreve"));
    const barra = screen.getByRole("group", { name: "Agregar al bosquejo" }).parentElement;
    // WhatsApp es un enlace, no un botón.
    const nombres = [...barra.querySelectorAll("button, a")].map(
      (b) => b.getAttribute("aria-label") || b.getAttribute("title") || b.textContent.trim()
    );
    expect(nombres).toEqual(["Punto", "Numeración de los puntos: Romanos", "Mensaje", "Imagen", "Deshacer", "Rehacer", "Borrar", "Duplicar", "Compartir por WhatsApp"]);
    expect(barra.querySelectorAll(":scope > span[aria-hidden='true']")).toHaveLength(2);
  });

  it("sin cambios están apagados; lo tecleado seguido se deshace de una vez y se puede rehacer", async () => {
    abrir();
    fireEvent.click(screen.getByText("La fe que se atreve"));
    expect(boton("Deshacer").disabled).toBe(true);
    expect(boton("Rehacer").disabled).toBe(true);

    fireEvent.change(titulo(), { target: { value: "La fe que se" } });
    fireEvent.change(titulo(), { target: { value: "La fe que vence" } });
    fireEvent.change(fecha(), { target: { value: "2099-12-27" } });

    fireEvent.click(boton("Deshacer"));
    expect(fecha().value).toBe("2099-11-15");
    expect(titulo().value).toBe("La fe que vence");
    fireEvent.click(boton("Deshacer"));
    expect(titulo().value).toBe("La fe que se atreve");
    expect(boton("Deshacer").disabled).toBe(true);

    fireEvent.click(boton("Rehacer"));
    expect(titulo().value).toBe("La fe que vence");
    await waitFor(() => expect(fb.guardados.at(-1)?.datos.titulo).toBe("La fe que vence"), { timeout: 3000 });
    fireEvent.click(boton("Rehacer"));
    expect(fecha().value).toBe("2099-12-27");
    expect(boton("Rehacer").disabled).toBe(true);
  });

  it("«Quitar» de cada ítem lleva la caneca, no la X", () => {
    abrir();
    fireEvent.click(screen.getByText("La fe que se atreve"));
    fireEvent.click(document.querySelector('[data-pieza="mensaje"] button'));
    const { container } = render(<TrashIcon />);
    const caneca = container.querySelector("path").getAttribute("d");
    expect(boton("Quitar").querySelector("path").getAttribute("d")).toBe(caneca);
  });

  it("deshacer devuelve un ítem quitado", () => {
    abrir();
    fireEvent.click(screen.getByText("La fe que se atreve"));
    fireEvent.click(document.querySelector('[data-pieza="mensaje"] button'));
    fireEvent.click(boton("Quitar"));
    expect(document.querySelector('[data-pieza="mensaje"]')).toBeNull();
    fireEvent.click(boton("Deshacer"));
    expect(document.querySelector('[data-pieza="mensaje"]')).not.toBeNull();
  });

  it("Ctrl+Z deshace y Ctrl+Y rehace, salvo dentro de un campo de texto", () => {
    abrir();
    fireEvent.click(screen.getByText("La fe que se atreve"));
    fireEvent.change(fecha(), { target: { value: "2099-12-27" } });
    fireEvent.keyDown(titulo(), { key: "z", ctrlKey: true });
    expect(fecha().value).toBe("2099-12-27");
    fireEvent.keyDown(document.body, { key: "z", ctrlKey: true });
    expect(fecha().value).toBe("2099-11-15");
    fireEvent.keyDown(document.body, { key: "y", ctrlKey: true });
    expect(fecha().value).toBe("2099-12-27");
  });

  it("al abrir otra prédica, el historial empieza de cero", () => {
    fb.docs = [LA_FE, { id: "otra", data: { ...LA_FE.data, titulo: "Otra" } }];
    abrir();
    fireEvent.click(screen.getByText("La fe que se atreve"));
    fireEvent.change(fecha(), { target: { value: "2099-12-27" } });
    expect(boton("Deshacer").disabled).toBe(false);
    fireEvent.click(screen.getByText("Otra"));
    expect(boton("Deshacer").disabled).toBe(true);
  });

  it("celular: los dos botones van en la barra de arriba", () => {
    abrir({ isDesktop: false });
    // En el celular sale como la próxima, con su «Preparar».
    fireEvent.click(boton("Preparar"));
    const arriba = screen.getByRole("button", { name: "Volver a mis prédicas" }).parentElement;
    expect(within(arriba).getByRole("button", { name: "Deshacer" })).toBeTruthy();
    expect(within(arriba).getByRole("button", { name: "Rehacer" })).toBeTruthy();
  });
});

describe("Preparar", () => {
  it("«Marcar terminada» la guarda terminada, la cierra y deja el bosquejo vacío para una nueva", async () => {
    const { app } = abrir();
    fireEvent.click(screen.getByText("La fe que se atreve"));
    fireEvent.click(cambiarEst());
    await waitFor(() => expect(fb.guardados.at(-1)?.datos.estado).toBe("terminada"));
    expect(fb.guardados.at(-1).ruta).toBe("iglesias/g1/predicas/fe");
    expect(app.showNotif).toHaveBeenCalledWith("success", "«La fe que se atreve» quedó terminada");
    // El bosquejo vacío, listo para escribir una nueva; nada se creó todavía.
    expect(screen.getByLabelText("Título de la prédica").value).toBe("");
    expect(screen.getByLabelText("Título de la prédica").readOnly).toBe(false);
    expect(document.querySelector("[data-estado-predica]").textContent).toBe("Borrador");
    expect(document.querySelector("[data-tapete] [data-pieza]")).toBeNull();
    expect(fb.creados).toHaveLength(0);
    expect(screen.getByText("La fe que se atreve").closest("button").getAttribute("aria-current")).toBeNull();
  });

  it("en la vacía sin nada escrito, «Marcar terminada» avisa y no crea nada", () => {
    const { app } = abrir();
    fireEvent.click(cambiarEst());
    expect(app.showNotif).toHaveBeenCalledWith("warning", "Escribe algo antes de marcarla terminada.");
    expect(fb.creados).toHaveLength(0);
    expect(fb.guardados).toHaveLength(0);
  });

  it("celular: al marcarla terminada vuelve a la lista", async () => {
    abrir({ isDesktop: false });
    fireEvent.click(boton("Preparar"));
    fireEvent.click(cambiarEst());
    await waitFor(() => expect(fb.guardados.at(-1)?.datos.estado).toBe("terminada"));
    expect(screen.queryByLabelText("Título de la prédica")).toBeNull();
    expect(screen.getByText("Mis prédicas")).toBeTruthy();
  });

  // Recuadro de arriba (12-11-2026, opción D del lienzo).
  it("ya escrita se ve limpia: hoja de almanaque, serie y versículo como texto, sin línea punteada", () => {
    abrir();
    fireEvent.click(screen.getByText("La fe que se atreve"));
    const hoja = document.querySelector("[data-hoja-fecha]");
    expect(hoja.textContent).toBe("NOV15domingo");
    expect(hoja.className).not.toContain("border-dashed");
    const titulo = screen.getByLabelText("Título de la prédica");
    expect(titulo.readOnly).toBe(true);
    expect(titulo.className).not.toContain("border-dashed");
    // Sin lápiz junto al título: lo que sigue es la línea de la serie.
    expect(titulo.nextElementSibling.tagName).toBe("DIV");
    expect(titulo.previousElementSibling).toBeNull();
    expect(within(screen.getByRole("main")).getByText("Serie · Héroes de la fe")).toBeTruthy();
    expect(screen.queryByLabelText("Serie")).toBeNull();
    const base = document.querySelector("[data-texto-base]");
    expect(base.textContent).toBe("Hebreos 11:1");
    expect(base.className).toContain("text-app-agua");
    expect(base.querySelector("svg")).toBeNull(); // sin el ícono del libro
    // Sin textos de guardado (se guarda solo; si falla, avisa).
    const bosquejo = screen.getByRole("main");
    expect(within(bosquejo).queryByRole("status")).toBeNull();
    expect(within(bosquejo).queryByText(/guardado|Se guarda/i)).toBeNull();
  });

  it("a la derecha: el chip de siempre (solo muestra) centrado y el lápiz abajo; «Marcar terminada» va debajo del último ítem", () => {
    abrir();
    fireEvent.click(screen.getByText("La fe que se atreve"));
    const chip = document.querySelector("[data-estado-predica]");
    expect(chip.tagName).toBe("SPAN");
    expect(chip.className).toContain("h-7");
    expect(chip.className).toContain("text-chip");
    // El chip va en un hueco que crece y lo centra; el lápiz queda debajo.
    const hueco = chip.parentElement;
    expect(hueco.className).toContain("flex-1");
    expect(hueco.className).toContain("items-center");
    const columna = hueco.parentElement;
    expect(columna.className).toContain("self-stretch");
    const lapiz = columna.lastElementChild;
    expect(lapiz.getAttribute("aria-label")).toBe("Editar");
    expect(lapiz.textContent).toBe("");
    expect(lapiz.className).toContain("w-9");
    // Siempre un lápiz: al editar se pinta dorado, pero no cambia de dibujo.
    const dibujo = lapiz.querySelector("path").getAttribute("d");
    fireEvent.click(lapiz);
    expect(lapiz.querySelector("path").getAttribute("d")).toBe(dibujo);
    expect(lapiz.className).toContain("bg-app-main");
    // Al final del tapete: el espacio en blanco, con el botón a la derecha,
    // debajo del último ítem y sin flotar (no tapa al recién agregado).
    const tapete = document.querySelector("[data-tapete]");
    const ultimo = tapete.lastElementChild;
    expect(ultimo.hasAttribute("data-espacio-final")).toBe(true);
    expect(ultimo.className).not.toContain("sticky");
    expect(ultimo.previousElementSibling.hasAttribute("data-pieza")).toBe(true);
    expect(ultimo.querySelector("[data-marcar-terminada]").textContent).toBe("Marcar terminada");
    fireEvent.click(boton("Punto"));
    expect(tapete.lastElementChild.previousElementSibling.getAttribute("data-pieza")).toBe("titulo");
    fireEvent.keyDown(screen.getByLabelText("Escribe el punto"), { key: "Escape" });
    fireEvent.click(cambiarEst());
    expect(screen.getByLabelText("Título de la prédica").value).toBe("");
    expect(document.querySelector("[data-tapete]").lastElementChild.hasAttribute("data-espacio-final")).toBe(true);
  });

  it("para volver a borrador se duplica: la copia de una terminada nace borrador", async () => {
    fb.docs = [{ ...LA_FE, data: { ...LA_FE.data, estado: "terminada" } }];
    abrir();
    fireEvent.click(screen.getByText("La fe que se atreve"));
    fireEvent.click(boton("Duplicar"));
    await waitFor(() => expect(fb.creados).toHaveLength(1));
    expect(fb.creados[0].datos).toMatchObject({ titulo: "La fe que se atreve (copia)", estado: "borrador", fecha: "" });
  });

  it("cada ítem lleva su número adentro, al final, siempre a la vista; escribir otro lo mueve y los demás se corren", async () => {
    abrir();
    fireEvent.click(screen.getByText("La fe que se atreve"));
    const numeros = () => [...document.querySelectorAll("[data-numero]")];
    expect(numeros().map((n) => n.value)).toEqual(["1", "2", "3"]);
    // Dentro del recuadro, lo último; y se ve aunque el ítem no esté elegido.
    const primero = numeros()[0];
    expect(primero.parentElement.hasAttribute("data-pieza")).toBe(true);
    expect(primero.parentElement.lastElementChild).toBe(primero);
    // Elegido, va después de sus botones (subir, bajar, quitar).
    fireEvent.click(document.querySelector('[data-pieza="mensaje"] button'));
    const mensaje = document.querySelector('[data-pieza="mensaje"]');
    expect(mensaje.lastElementChild.hasAttribute("data-numero")).toBe(true);
    expect(within(mensaje).getByRole("button", { name: "Quitar" })).toBeTruthy();
    fireEvent.click(document.querySelector('[data-pieza="mensaje"] button'));
    // El 3 (el mensaje) pasa a ser el 1.
    fireEvent.change(numeros()[2], { target: { value: "1" } });
    fireEvent.keyDown(numeros()[2], { key: "Enter" });
    fireEvent.blur(numeros()[2]);
    const orden = () => [...document.querySelectorAll("[data-tapete] [data-pieza]")].map((p) => p.getAttribute("data-pieza"));
    expect(orden()).toEqual(["mensaje", "versiculo", "titulo"]);
    expect(numeros().map((n) => n.value)).toEqual(["1", "2", "3"]);
    await waitFor(() => expect(fb.guardados.at(-1)?.datos.piezas.map((p) => p.tipo)).toEqual(["mensaje", "versiculo", "titulo"]), { timeout: 3000 });
  });

  it("un número que no sirve (vacío, cero, mayor que el total) vuelve al que tenía; Escape también", () => {
    abrir();
    fireEvent.click(screen.getByText("La fe que se atreve"));
    const caja = () => document.querySelectorAll("[data-numero]")[1];
    for (const malo of ["", "0", "9"]) {
      fireEvent.change(caja(), { target: { value: malo } });
      fireEvent.blur(caja());
      expect(caja().value).toBe("2");
    }
    fireEvent.change(caja(), { target: { value: "3" } });
    fireEvent.keyDown(caja(), { key: "Escape" });
    expect(caja().value).toBe("2");
    expect([...document.querySelectorAll("[data-tapete] [data-pieza]")].map((p) => p.getAttribute("data-pieza"))).toEqual(["versiculo", "titulo", "mensaje"]);
    // Solo deja escribir números.
    fireEvent.change(caja(), { target: { value: "a1b" } });
    expect(caja().value).toBe("1");
  });

  it("el lápiz pone todo en línea punteada y, tocándolo otra vez, lo deja limpio; Enter en el título también", () => {
    abrir();
    fireEvent.click(screen.getByText("La fe que se atreve"));
    fireEvent.click(boton("Editar"));
    const titulo = screen.getByLabelText("Título de la prédica");
    expect(titulo.readOnly).toBe(false);
    expect(titulo.className).toContain("border-dashed");
    expect(screen.getByLabelText("Serie").className).toContain("border-dashed");
    expect(document.querySelector("[data-texto-base]").className).toContain("border-dashed");
    expect(document.querySelector("[data-hoja-fecha]").className).toContain("border-dashed");
    fireEvent.click(boton("Editar"));
    expect(titulo.readOnly).toBe(true);
    fireEvent.click(boton("Editar"));
    fireEvent.keyDown(titulo, { key: "Enter" });
    expect(titulo.readOnly).toBe(true);
  });

  it("la fecha solo se cambia al editar, salvo si no tiene: entonces la hoja dice «SIN FECHA» y se puede tocar", () => {
    fb.docs = [LA_FE, { id: "copia", data: { ...LA_FE.data, titulo: "La fe (copia)", fecha: "" } }];
    abrir();
    fireEvent.click(screen.getByText("La fe que se atreve"));
    const fecha = () => document.querySelector('input[type="date"]');
    fireEvent.click(document.querySelector("[data-hoja-fecha]"));
    expect(document.activeElement).not.toBe(fecha());
    fireEvent.click(screen.getByText("La fe (copia)"));
    const hoja = document.querySelector("[data-hoja-fecha]");
    expect(hoja.textContent).toBe("SIN FECHA?elige el día");
    expect(hoja.className).toContain("border-dashed");
    fireEvent.click(hoja);
    expect(document.activeElement).toBe(fecha());
  });

  it("una nueva arranca editando: serie y versículo base piden su texto con línea punteada", () => {
    abrir();
    const titulo = screen.getByLabelText("Título de la prédica");
    expect(titulo.readOnly).toBe(false);
    expect(screen.getByPlaceholderText("Escribe la serie (opcional)").className).toContain("border-dashed");
    const base = screen.getByLabelText("Versículo base");
    expect(base.value).toBe("");
    expect(base.placeholder).toBe("Escribe el versículo base (ej. Juan 3:16)");
    expect(base.className).toContain("border-dashed");
  });

  it("el versículo base se escribe arriba, se reconoce la cita y NO se agrega como ítem", async () => {
    fb.docs = [LA_FE, { id: "nueva", data: { titulo: "Sin título", fecha: "", serie: "", estado: "borrador", piezas: [] } }];
    abrir();
    const base = screen.getByLabelText("Versículo base");
    fireEvent.change(base, { target: { value: "juan 3 16" } });
    fireEvent.blur(base);
    expect(screen.getByLabelText("Versículo base").value).toBe("Juan 3:16");
    await waitFor(() => expect(fb.creados).toHaveLength(1));
    expect(fb.creados[0].datos).toMatchObject({ base: "Juan 3:16", piezas: [] });
    expect(document.querySelector("[data-tapete] [data-pieza]")).toBeNull();
  });

  it("en una que ya existe, el versículo base se cambia sin tocar los ítems; lo que no es cita avisa", async () => {
    const { app } = abrir();
    fireEvent.click(screen.getByText("La fe que se atreve"));
    fireEvent.click(boton("Editar"));
    const base = () => screen.getByLabelText("Versículo base");
    expect(base().value).toBe("Hebreos 11:1"); // la de antes toma el primer versículo
    fireEvent.change(base(), { target: { value: "la fe" } });
    fireEvent.blur(base());
    expect(app.showNotif).toHaveBeenCalledWith("warning", "No reconozco esa cita. Escríbela así: Juan 3:16");
    fireEvent.change(base(), { target: { value: "Romanos 10 17" } });
    fireEvent.keyDown(base(), { key: "Enter" });
    fireEvent.blur(base());
    await waitFor(() => expect(fb.guardados.at(-1)?.datos.base).toBe("Romanos 10:17"), { timeout: 3000 });
    expect(fb.guardados.at(-1).datos.piezas).toHaveLength(3);
    fireEvent.click(boton("Editar"));
    expect(document.querySelector("[data-texto-base]").textContent).toBe("Romanos 10:17");
    // En la lista también, junto a la serie.
    expect(screen.getByText("La fe que se atreve").closest("button").querySelector("[data-serie-y-base]").textContent).toBe("Serie · Héroes de la fe · Romanos 10:17");
  });

  it("sin fecha no pasa a Terminada: avisa, pone el cursor en la fecha y, al elegirla, la termina", async () => {
    fb.docs = [{ id: "copia", data: { ...LA_FE.data, titulo: "La fe (copia)", fecha: "" } }];
    const { app } = abrir();
    fireEvent.click(screen.getByText("La fe (copia)"));
    const estado = () => document.querySelector("[data-estado-predica]");
    const fecha = document.querySelector('input[type="date"]');
    fireEvent.click(cambiarEst());
    expect(estado().textContent).toBe("Borrador");
    expect(app.showNotif).toHaveBeenCalledWith("warning", "Ponle fecha antes de marcarla terminada.");
    expect(document.activeElement).toBe(fecha);
    fireEvent.change(fecha, { target: { value: "2099-12-27" } });
    await waitFor(() => expect(fb.guardados.at(-1)?.datos).toMatchObject({ fecha: "2099-12-27", estado: "terminada" }));
    expect(screen.getByLabelText("Título de la prédica").value).toBe("");
  });

  it("si se cierra la fecha sin elegir, la siguiente fecha que se ponga no la termina", () => {
    fb.docs = [{ id: "copia", data: { ...LA_FE.data, titulo: "La fe (copia)", fecha: "" } }];
    abrir();
    fireEvent.click(screen.getByText("La fe (copia)"));
    const fecha = document.querySelector('input[type="date"]');
    fireEvent.click(cambiarEst());
    fireEvent.blur(fecha);
    fireEvent.change(fecha, { target: { value: "2099-12-27" } });
    expect(document.querySelector("[data-estado-predica]").textContent).toBe("Borrador");
  });

  it("el título se ve como campo y, al crear una nueva, queda listo para escribir el nombre", async () => {
    fb.docs = [LA_FE, { id: "nueva", data: { titulo: "Nueva prédica", fecha: "", serie: "", estado: "borrador", piezas: [] } }];
    abrir({ isDesktop: false });
    fireEvent.click(boton("Nueva prédica"));
    // Se espera a que se abra la creada.
    await waitFor(() => expect(screen.getByLabelText("Título de la prédica").value).toBe("Nueva prédica"));
    const titulo = screen.getByLabelText("Título de la prédica");
    await waitFor(() => expect(document.activeElement).toBe(titulo));
    expect(titulo.value).toBe("Nueva prédica");
    expect([titulo.selectionStart, titulo.selectionEnd]).toEqual([0, "Nueva prédica".length]);
    expect(titulo.className).toContain("border-dashed");
  });

  it("las piezas van sobre el tapete; el título, los botones de abajo y el buscador, no", () => {
    abrir();
    fireEvent.click(screen.getByText("La fe que se atreve"));
    const tapete = document.querySelector("[data-tapete]");
    expect(tapete.className).toContain("tapete");
    expect(tapete.querySelectorAll("[data-pieza]")).toHaveLength(3);
    expect(tapete.contains(screen.getByLabelText("Título de la prédica"))).toBe(false);
    expect(tapete.contains(screen.getByRole("group", { name: "Agregar al bosquejo" }))).toBe(false);
    expect(tapete.contains(screen.getByLabelText("Buscar versículo"))).toBe(false);
  });

  it("en el tapete, cada ítem tiene su color: punto violeta, mensaje plata, versículo aguamarina con la Biblia; el texto igual en todos", () => {
    abrir();
    fireEvent.click(screen.getByText("La fe que se atreve"));
    const caja = (tipo) => document.querySelector(`[data-pieza="${tipo}"]`).className;
    expect(caja("titulo")).toContain("fondo-pieza-punto");
    expect(caja("titulo")).toContain("border-app-violeta/60");
    expect(caja("mensaje")).toContain("fondo-pieza-mensaje");
    expect(caja("mensaje")).toContain("border-app-plata/40");
    const iconoVersiculo = document.querySelector('[data-pieza="versiculo"] svg');
    expect(iconoVersiculo.parentElement.className).toContain("text-app-agua");
    // El texto del contenido va en el mismo blanco en todos los ítems.
    expect(screen.getByText("La fe no es adivinar el futuro.").className).toContain("text-app-texto");
    expect(caja("versiculo")).toContain("fondo-pieza-versiculo");
    expect(caja("versiculo")).toContain("border-app-agua/60");
    fireEvent.click(document.querySelector('[data-pieza="titulo"] button'));
    expect(caja("titulo")).toContain("ring-app-violeta/45");
    // El tipo elegido abajo se enciende con su color.
    fireEvent.click(boton("Imagen"));
    expect(boton("Imagen").className).toContain("bg-app-rojo-neon");
  });

  it("el tapete lleva su regla arriba y a la izquierda, con los números", () => {
    abrir();
    fireEvent.click(screen.getByText("La fe que se atreve"));
    const arriba = document.querySelector('[data-regla="arriba"]');
    const izquierda = document.querySelector('[data-regla="izquierda"]');
    expect(arriba.textContent.startsWith("0123")).toBe(true);
    expect(izquierda.textContent.startsWith("0123")).toBe(true);
    expect(arriba.getAttribute("aria-hidden")).toBe("true");
  });

  it("en el computador, sin prédica abierta, se ve una vacía que se crea sola al escribir", async () => {
    // Firestore avisa de la nueva antes de que addDoc termine; el falso solo
    // avisa una vez, así que la trae desde el principio.
    fb.docs = [LA_FE, { id: "nueva", data: { titulo: "E", fecha: "", serie: "", estado: "borrador", piezas: [] } }];
    abrir();
    const titulo = screen.getByLabelText("Título de la prédica");
    expect(titulo.value).toBe("");
    expect(document.querySelector("[data-tapete]")).not.toBeNull();
    expect(boton("Borrar").disabled).toBe(true);
    expect(fb.creados).toHaveLength(0);

    fireEvent.change(titulo, { target: { value: "E" } });
    fireEvent.change(titulo, { target: { value: "El buen pastor" } });
    await waitFor(() => expect(fb.creados).toHaveLength(1));
    expect(fb.creados[0].datos.titulo).toBe("E");
    // Lo escrito mientras se creaba se guarda después, sin crear otra.
    await waitFor(() => expect(fb.guardados.at(-1)?.datos.titulo).toBe("El buen pastor"), { timeout: 3000 });
    expect(fb.guardados.at(-1).ruta).toBe("iglesias/g1/predicas/nueva");
    expect(fb.creados).toHaveLength(1);
  });

  it("en la vacía, tocar «Punto» no crea la prédica hasta que se escribe algo", async () => {
    fb.docs = [LA_FE, { id: "nueva", data: { titulo: "Nueva prédica", fecha: "", serie: "", estado: "borrador", piezas: [] } }];
    abrir();
    fireEvent.click(boton("Punto"));
    expect(fb.creados).toHaveLength(0);
    fireEvent.change(screen.getByLabelText("Escribe el punto"), { target: { value: "La gracia" } });
    fireEvent.keyDown(screen.getByLabelText("Escribe el punto"), { key: "Enter" });
    await waitFor(() => expect(fb.creados).toHaveLength(1));
    expect(fb.creados[0].datos.piezas).toEqual([expect.objectContaining({ tipo: "titulo", contenido: "La gracia" })]);
  });

  it("en el celular no hay vacía: se entra por la lista", () => {
    abrir({ isDesktop: false });
    expect(screen.queryByLabelText("Título de la prédica")).toBeNull();
  });

  it("abajo solo hay Punto, Mensaje e Imagen; Imagen crea el recuadro con «Subir | Mis imágenes» adentro", async () => {
    abrir();
    fireEvent.click(screen.getByText("La fe que se atreve"));
    const tipos = within(screen.getByRole("group", { name: "Agregar al bosquejo" })).getAllByRole("button").map((b) => b.textContent || b.getAttribute("aria-label"));
    expect(tipos).toEqual(["Punto", "Numeración de los puntos: Romanos", "Mensaje", "Imagen"]);
    expect(screen.queryByLabelText("Nueva pieza")).toBeNull();
    fireEvent.click(boton("Imagen"));
    const recuadro = document.querySelector("[data-sin-foto]");
    expect(within(recuadro).getByRole("button", { name: /Subir imagen/ })).toBeTruthy();
    expect(within(recuadro).getByRole("button", { name: /Mis imágenes/ })).toBeTruthy();
    const foto = new File(["x"], "foto.jpg", { type: "image/jpeg" });
    fireEvent.change(screen.getByLabelText("Archivo de imagen"), { target: { files: [foto] } });
    await waitFor(() => expect(fb.guardados.at(-1)?.datos.piezas.at(-1)).toMatchObject({ tipo: "imagen", contenido: { url: "https://img/foto.jpg", nombre: "foto.jpg" } }), { timeout: 3000 });
    expect(img.subir).toHaveBeenCalledWith("g1", foto);
  });

  it("«Mis imágenes» muestra las de la iglesia y tocar una la agrega", async () => {
    img.lista = [{ id: "i1", url: "https://img/culto.jpg", name: "culto.jpg" }];
    abrir();
    fireEvent.click(screen.getByText("La fe que se atreve"));
    fireEvent.click(boton("Imagen"));
    fireEvent.click(boton("Mis imágenes"));
    const ventana = screen.getByRole("dialog", { name: "Mis imágenes" });
    fireEvent.click(within(ventana).getByRole("button", { name: "Agregar culto.jpg" }));
    expect(screen.queryByRole("dialog", { name: "Mis imágenes" })).toBeNull();
    const pieza = document.querySelector('[data-pieza="imagen"]');
    expect(pieza.querySelector("img").getAttribute("src")).toBe("https://img/culto.jpg");
    img.lista = [];
  });

  it("abajo: el selector y WhatsApp, Duplicar y Borrar; «Predicar» arriba de Mis prédicas, ni en el bosquejo ni a la derecha", () => {
    abrir();
    fireEvent.click(screen.getByText("La fe que se atreve"));
    const derecha = screen.getByRole("complementary", { name: "Así se verá en el templo" });
    const lista = screen.getByRole("complementary", { name: "Mis prédicas" });
    const bosquejo = screen.getByRole("main");
    const barra = screen.getByRole("group", { name: "Agregar al bosquejo" }).parentElement;
    expect(within(derecha).queryByRole("button", { name: /Predicar/ })).toBeNull();
    expect(within(bosquejo).queryByRole("button", { name: /Predicar/ })).toBeNull();
    expect(within(lista).getByRole("button", { name: "Predicar" })).toBeTruthy();
    expect(within(barra).getByRole("button", { name: "Duplicar" })).toBeTruthy();
    expect(within(barra).getByRole("button", { name: "Borrar" })).toBeTruthy();
    expect(within(barra).getByTitle("Compartir por WhatsApp")).toBeTruthy();
    expect(within(derecha).queryByRole("button", { name: "Borrar" })).toBeNull();
  });

  it("la vista previa, sin nada elegido, habla de «ítem» y no de «pieza»", () => {
    abrir();
    fireEvent.click(screen.getByText("La fe que se atreve"));
    expect(screen.getByText("Toca un ítem para verlo aquí")).toBeTruthy();
    expect(screen.queryByText(/Toca una pieza/)).toBeNull();
  });

  it("el desplegable de «Punto» ofrece combinaciones ya hechas para los tres niveles; elegir una cambia el bosquejo y se guarda", async () => {
    fb.docs = [{ ...LA_FE, data: { ...LA_FE.data, piezas: [...LA_FE.data.piezas, { id: "s1", tipo: "titulo", contenido: "Sub", nivel: 1 }] } }];
    abrir();
    fireEvent.click(screen.getByText("La fe que se atreve"));
    fireEvent.click(screen.getByRole("button", { name: "Numeración de los puntos: Romanos" }));
    const menu = screen.getByRole("menu", { name: "Numeración de los puntos" });
    const opciones = within(menu).getAllByRole("menuitemradio");
    expect(opciones).toHaveLength(6);
    // Cada una con su vista previa de tres renglones; la de fábrica, marcada.
    expect(opciones[1].getAttribute("aria-label")).toBe("Romanos y letras: I. → a) → 1.");
    expect(opciones[1].getAttribute("aria-checked")).toBe("true");
    expect(opciones[0].textContent).toBe("I.A.1.Esquema clásico");
    // Romanos, después números y después letras.
    fireEvent.click(within(menu).getByRole("menuitemradio", { name: "Romanos y números: I. → 1) → a." }));
    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.querySelector('[data-id="s1"]').textContent.startsWith("1)")).toBe(true);
    await waitFor(
      () => expect(fb.guardados.at(-1)?.datos).toMatchObject({ numeracion: "romanos", numeracionNiveles: ["numeros-parentesis", "minusculas"] }),
      { timeout: 3000 }
    );
    fireEvent.click(screen.getByRole("button", { name: "Numeración de los puntos: Romanos" }));
    expect(screen.getByRole("menuitemradio", { name: "Romanos y números: I. → 1) → a." }).getAttribute("aria-checked")).toBe("true");
  });

  it("una prédica guardada con «Sin número» (opción quitada) se numera con romanos; Escape cierra el desplegable", () => {
    fb.docs = [{ ...LA_FE, data: { ...LA_FE.data, numeracion: "ninguna" } }];
    abrir();
    fireEvent.click(screen.getByText("La fe que se atreve"));
    expect(document.querySelector('[data-pieza="titulo"] button').textContent.startsWith("I")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Numeración de los puntos: Romanos" }));
    expect(screen.getByRole("menu")).toBeTruthy();
    expect(screen.queryByRole("menuitemradio", { name: /Sin número/ })).toBeNull();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
  });
  it("subpuntos: «Hacer subpunto» lo mete con sangría y lo numera «a)»; «Volver a punto» lo saca; se guarda", async () => {
    fb.docs = [{ ...LA_FE, data: { ...LA_FE.data, piezas: [...LA_FE.data.piezas, { id: "p5", tipo: "titulo", contenido: "La fe espera" }] } }];
    abrir();
    fireEvent.click(screen.getByText("La fe que se atreve"));
    const segundo = () => document.querySelector('[data-id="p5"]');
    expect(segundo().textContent.startsWith("II.")).toBe(true);
    fireEvent.click(segundo().querySelector("button")); // lo elige
    // El botón muestra el número que tendrá: «a)» para hacerlo subpunto.
    expect(boton("Hacer subpunto").textContent).toBe("a)");
    expect(boton("Hacer subpunto").querySelector("svg")).toBeNull();
    fireEvent.click(boton("Hacer subpunto"));
    // Ya es subpunto: el botón ofrece volver a «II.».
    expect(boton("Volver a punto").textContent).toBe("II.");
    expect(segundo().hasAttribute("data-subpunto")).toBe(true);
    expect(segundo().className).toContain("ml-10");
    expect(segundo().textContent.startsWith("a)")).toBe(true);
    await waitFor(() => expect(fb.guardados.at(-1)?.datos.piezas.at(-1)).toEqual({ id: "p5", tipo: "titulo", contenido: "La fe espera", nivel: 1 }), { timeout: 3000 });
    fireEvent.click(boton("Volver a punto"));
    expect(segundo().hasAttribute("data-subpunto")).toBe(false);
    expect(segundo().textContent.startsWith("II.")).toBe(true);
  });

  it("tercer nivel: en un subpunto hay dos botones (sacarlo y meterlo más); el sub-subpunto se numera «1.»", async () => {
    const BOSQUEJO = [
      { id: "p1", tipo: "titulo", contenido: "La fe ve" },
      { id: "s1", tipo: "titulo", contenido: "Ve lo invisible", nivel: 1 },
      { id: "s2", tipo: "titulo", contenido: "Como Moisés", nivel: 1 },
    ];
    fb.docs = [{ ...LA_FE, data: { ...LA_FE.data, piezas: BOSQUEJO } }];
    abrir();
    fireEvent.click(screen.getByText("La fe que se atreve"));
    const s2 = () => document.querySelector('[data-id="s2"]');
    fireEvent.click(s2().querySelector("button")); // lo elige
    expect(boton("Volver a punto").textContent).toBe("II.");
    expect(boton("Hacer sub-subpunto").textContent).toBe("1.");
    fireEvent.click(boton("Hacer sub-subpunto"));
    expect(s2().getAttribute("data-nivel")).toBe("2");
    expect(s2().className).toContain("ml-20");
    expect(s2().textContent.startsWith("1.")).toBe(true);
    // En el tercer nivel ya no se puede meter más: solo sacarlo.
    expect(screen.queryByRole("button", { name: /Hacer sub/ })).toBeNull();
    expect(boton("Volver a subpunto").textContent).toBe("b)");
    await waitFor(() => expect(fb.guardados.at(-1)?.datos.piezas.at(-1)).toMatchObject({ id: "s2", nivel: 2 }), { timeout: 3000 });
  });

  it("al escribir, Tab mete el punto hasta el tercer nivel y Shift+Tab lo saca de a uno", () => {
    // Arriba hay un subpunto, así que el nuevo puede llegar al tercer nivel.
    fb.docs = [{ ...LA_FE, data: { ...LA_FE.data, piezas: [...LA_FE.data.piezas, { id: "s1", tipo: "titulo", contenido: "Sub", nivel: 1 }] } }];
    abrir();
    fireEvent.click(screen.getByText("La fe que se atreve"));
    fireEvent.click(boton("Punto"));
    const campo = screen.getByLabelText("Escribe el punto");
    const nuevo = () => campo.closest("[data-pieza]");
    fireEvent.keyDown(campo, { key: "Tab" });
    fireEvent.keyDown(campo, { key: "Tab" });
    fireEvent.keyDown(campo, { key: "Tab" }); // no pasa del tercero
    expect(nuevo().getAttribute("data-nivel")).toBe("2");
    fireEvent.keyDown(campo, { key: "Tab", shiftKey: true });
    expect(nuevo().getAttribute("data-nivel")).toBe("1");
  });

  it("regla del esquema: sin un subpunto arriba no se puede hacer sub-subpunto, ni con el botón ni con Tab", () => {
    // Arriba solo hay un punto: el nuevo puede ser subpunto, pero no más.
    abrir();
    fireEvent.click(screen.getByText("La fe que se atreve"));
    fireEvent.click(boton("Punto"));
    const campo = screen.getByLabelText("Escribe el punto");
    const nuevo = () => campo.closest("[data-pieza]");
    fireEvent.keyDown(campo, { key: "Tab" });
    fireEvent.keyDown(campo, { key: "Tab" });
    expect(nuevo().getAttribute("data-nivel")).toBe("1");
    fireEvent.change(campo, { target: { value: "Ve lo invisible" } });
    fireEvent.keyDown(campo, { key: "Enter" });
    // Sigue elegido: ofrece volver a punto, pero no meterse más.
    expect(screen.getByRole("button", { name: "Volver a punto" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Hacer sub-subpunto" })).toBeNull();
  });

  it("el primer punto del bosquejo siempre es punto: no ofrece hacerlo subpunto", () => {
    fb.docs = [{ ...LA_FE, data: { ...LA_FE.data, piezas: [{ id: "p1", tipo: "titulo", contenido: "Primero" }] } }];
    abrir();
    fireEvent.click(screen.getByText("La fe que se atreve"));
    fireEvent.click(document.querySelector('[data-id="p1"] button'));
    expect(screen.queryByRole("button", { name: "Hacer subpunto" })).toBeNull();
  });

  it("al escribir un punto, Tab lo hace subpunto y Shift+Tab lo devuelve", () => {
    abrir();
    fireEvent.click(screen.getByText("La fe que se atreve"));
    fireEvent.click(boton("Punto"));
    const campo = screen.getByLabelText("Escribe el punto");
    const nuevo = () => campo.closest("[data-pieza]");
    fireEvent.keyDown(campo, { key: "Tab" });
    expect(nuevo().hasAttribute("data-subpunto")).toBe(true);
    fireEvent.keyDown(campo, { key: "Tab", shiftKey: true });
    expect(nuevo().hasAttribute("data-subpunto")).toBe(false);
  });

  it("abrir una que ya existe no le roba el cursor", () => {
    abrir();
    fireEvent.click(screen.getByText("La fe que se atreve"));
    expect(document.activeElement).not.toBe(screen.getByLabelText("Título de la prédica"));
  });

  it("abre el bosquejo con los puntos numerados", () => {
    abrir();
    fireEvent.click(screen.getByText("La fe que se atreve"));
    expect(screen.getByLabelText("Título de la prédica").value).toBe("La fe que se atreve");
    const punto = document.querySelector('[data-pieza="titulo"]');
    expect(within(punto).getByText("I.")).toBeTruthy();
  });

  it("Mensaje crea el recuadro listo para escribir; Enter lo guarda", async () => {
    abrir();
    fireEvent.click(screen.getByText("La fe que se atreve"));
    fireEvent.click(boton("Mensaje"));
    const campo = screen.getByLabelText("Escribe el mensaje");
    expect(document.activeElement).toBe(campo);
    fireEvent.change(campo, { target: { value: "Dios no busca gente perfecta" } });
    fireEvent.keyDown(campo, { key: "Enter" });
    await waitFor(() => expect(fb.guardados).toHaveLength(1), { timeout: 3000 });
    const { ruta, datos } = fb.guardados[0];
    expect(ruta).toBe("iglesias/g1/predicas/fe");
    expect(datos.piezas.at(-1)).toMatchObject({ tipo: "mensaje", contenido: "Dios no busca gente perfecta" });
    expect(datos.titulo).toBe("La fe que se atreve");
  });

  it("el recuadro nuevo va siempre al final, aunque haya otro elegido, y se guarda con «Guardar»", async () => {
    abrir();
    fireEvent.click(screen.getByText("La fe que se atreve"));
    fireEvent.click(document.querySelector('[data-pieza="versiculo"] button')); // elige el primero
    fireEvent.click(boton("Punto"));
    fireEvent.change(screen.getByLabelText("Escribe el punto"), { target: { value: "Dios ve tu fe" } });
    fireEvent.click(boton("Guardar"));
    await waitFor(() => expect(fb.guardados.at(-1)?.datos.piezas.map((p) => p.contenido?.cita ?? p.contenido)).toEqual(
      ["Hebreos 11:1", "La fe ve lo invisible", "La fe no es adivinar el futuro.", "Dios ve tu fe"]
    ), { timeout: 3000 });
  });

  it("un recuadro nuevo que queda vacío se va solo y nunca se guarda vacío", async () => {
    abrir();
    fireEvent.click(screen.getByText("La fe que se atreve"));
    fireEvent.click(boton("Punto"));
    expect(document.querySelectorAll('[data-pieza="titulo"]')).toHaveLength(2);
    fireEvent.blur(screen.getByLabelText("Escribe el punto"));
    expect(document.querySelectorAll('[data-pieza="titulo"]')).toHaveLength(1);
    // Una imagen sin foto tampoco llega a guardarse.
    fireEvent.click(boton("Imagen"));
    fireEvent.change(screen.getByLabelText("Título de la prédica"), { target: { value: "La fe" } });
    await waitFor(() => expect(fb.guardados).toHaveLength(1), { timeout: 3000 });
    expect(fb.guardados[0].datos.piezas.some((p) => p.tipo === "imagen")).toBe(false);
  });

  it("el buscador de versículos está a la derecha: una cita se reconoce sola y se agrega", async () => {
    abrir();
    fireEvent.click(screen.getByText("La fe que se atreve"));
    const derecha = screen.getByRole("complementary", { name: "Así se verá en el templo" });
    const buscador = within(derecha).getByLabelText("Buscar versículo");
    fireEvent.change(buscador, { target: { value: "juan 3 16" } });
    await waitFor(() => expect(document.querySelector("[data-versiculo-elegido]")?.textContent).toContain("Juan 3:16"));
    fireEvent.submit(buscador.closest("form")); // Enter: ya no hay botón
    await waitFor(() => expect(fb.guardados).toHaveLength(1), { timeout: 3000 });
    expect(fb.guardados[0].datos.piezas.at(-1)).toMatchObject({
      tipo: "versiculo",
      contenido: { cita: "Juan 3:16", texto: "Porque de tal manera amó Dios al mundo…" },
    });
    expect(within(derecha).queryByRole("button", { name: "Agregar" })).toBeNull();
    expect(within(derecha).getByPlaceholderText("Escribe una cita: Juan 3 16")).toBeTruthy();
  });

  it("la cuadrícula: Nuevo → S. Juan → capítulo 3 → el 16 se ve abajo y un clic lo agrega", async () => {
    abrir();
    fireEvent.click(screen.getByText("La fe que se atreve"));
    const derecha = screen.getByRole("complementary", { name: "Así se verá en el templo" });
    expect(within(derecha).getByRole("button", { name: "Antiguo", pressed: true })).toBeTruthy();
    expect(within(derecha).getByRole("button", { name: "Génesis" }).textContent).toBe("Géne");
    expect(document.querySelector("[data-cuadricula-biblia]").className).toContain("h-94");
    fireEvent.click(within(derecha).getByRole("button", { name: "Nuevo" }));
    fireEvent.click(within(derecha).getByRole("button", { name: "S. Juan" }));
    fireEvent.click(within(derecha).getByRole("button", { name: "Capítulo 3" }));
    fireEvent.click(within(derecha).getByRole("button", { name: "Versículo 16" }));
    // Tocarlo no lo agrega: aparece abajo, con su texto y su Biblia.
    const tarjeta = await within(derecha).findByRole("button", { name: "Agregar Juan 3:16" });
    expect(tarjeta.textContent).toContain("Porque de tal manera amó Dios al mundo…");
    expect(tarjeta.textContent).toContain("RVR1960");
    // Sin el rótulo «Agregar»: una marca de agua + dentro del recuadro.
    expect(tarjeta.textContent).not.toContain("Agregar");
    expect(tarjeta.querySelector("[data-marca-agua=\"agregar\"]").getAttribute("stroke-width")).toBe("3"); // + grueso
    expect(fb.guardados).toHaveLength(0);
    expect(within(derecha).getByRole("button", { name: "Versículo 16" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(tarjeta);
    await waitFor(() => expect(fb.guardados.at(-1)?.datos.piezas.at(-1)).toMatchObject({
      tipo: "versiculo",
      contenido: { cita: "Juan 3:16", texto: "Porque de tal manera amó Dios al mundo…", version: "RVR1960" },
    }), { timeout: 3000 });
    expect(obtenerVersiculo).toHaveBeenCalledWith("JHN", 3, 16, "versiculo", expect.any(Function), "RVR1960");
    // Se queda en el capítulo para elegir otro; «‹ Juan 3» vuelve atrás.
    expect(within(derecha).getByRole("button", { name: "Versículo 17" })).toBeTruthy();
    fireEvent.click(within(derecha).getByRole("button", { name: /Juan 3$/ }));
    expect(within(derecha).getByRole("button", { name: "Capítulo 1" })).toBeTruthy();
  });

  // TEMPORAL DHH (11-11-2026): la Biblia elegida también vale en Prédica.
  it("con la DHH elegida reconoce Tobit y trae su texto de la DHH", async () => {
    abrir({ versionBiblia: "DHHS94" });
    fireEvent.click(screen.getByText("La fe que se atreve"));
    expect(screen.getByRole("button", { name: "DHH", pressed: true })).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Buscar versículo"), { target: { value: "Tobit 4 7" } });
    await waitFor(() => expect(document.querySelector("[data-versiculo-elegido]")?.textContent).toContain("Tobit 4:7"));
    expect(document.querySelector("[data-versiculo-elegido]").textContent).toContain("DHH");
    expect(obtenerVersiculo).toHaveBeenCalledWith("TOB", 4, 7, "versiculo", expect.any(Function), "DHHS94");
    // El versículo guarda su versión, para el aviso de derechos del templo.
    fireEvent.submit(screen.getByLabelText("Buscar versículo").closest("form"));
    await waitFor(() => expect(fb.guardados.at(-1)?.datos.piezas.at(-1)?.contenido).toMatchObject({ cita: "Tobit 4:7", version: "DHHS94" }), { timeout: 3000 });
    // En el tapete, al lado de la cita, sus iniciales; las de antes, RVR1960.
    const siglas = [...document.querySelectorAll("[data-sigla-biblia]")].map((s) => s.textContent);
    expect(siglas).toEqual([" · RVR1960", " · DHH"]);
  });

  it("con la RVR1960, Tobit no es una cita", async () => {
    abrir();
    fireEvent.click(screen.getByText("La fe que se atreve"));
    fireEvent.change(screen.getByLabelText("Buscar versículo"), { target: { value: "Tobit 4 7" } });
    await new Promise((r) => setTimeout(r, 400));
    expect(document.querySelector("[data-versiculo-elegido]")).toBeNull();
  });

  it("una de las antiguas se guarda con la forma nueva al editarla", async () => {
    abrir();
    fireEvent.click(screen.getByText("Prédica guardada 2"));
    fireEvent.change(screen.getByLabelText("Título de la prédica"), { target: { value: "Saludo" } });
    await waitFor(() => expect(fb.guardados).toHaveLength(1), { timeout: 3000 });
    expect(fb.guardados[0].ruta).toBe("iglesias/g1/predicas/predica2");
    expect(fb.guardados[0].datos).toMatchObject({ titulo: "Saludo", piezas: [{ id: "5", tipo: "mensaje", contenido: "Hola iglesia" }] });
    expect(fb.guardados[0].datos.items).toBeUndefined();
  });
});

describe("Predicar", () => {
  const empezar = () => {
    abrir();
    fireEvent.click(screen.getByText("La fe que se atreve"));
    fireEvent.click(boton("Predicar"));
  };

  it("la franja del turno sale solo al predicar, no en Mis prédicas ni en Preparar", () => {
    const franja = () => document.querySelector("[data-franja-turno]");
    abrir();
    expect(franja()).toBeNull();
    fireEvent.click(screen.getByText("La fe que se atreve"));
    expect(franja()).toBeNull();
    fireEvent.click(boton("Predicar"));
    expect(franja()).not.toBeNull();
    // En el computador, solo en la columna derecha del púlpito, con su diseño de siempre.
    expect(document.querySelectorAll("[data-franja-turno]")).toHaveLength(1);
    const derecha = franja().closest("aside");
    expect(derecha).not.toBeNull();
    expect(derecha.querySelector("[data-reloj]")).not.toBeNull();
    expect(franja().className).toContain("border-b");
    expect(franja().className).not.toContain("rounded");
  });

  it("celular: la franja del turno sigue arriba, de todo el ancho", () => {
    abrir({ isDesktop: false });
    fireEvent.click(boton("Predicar"));
    const franja = document.querySelector("[data-franja-turno]");
    expect(franja).not.toBeNull();
    expect(franja.closest("aside")).toBeNull();
    expect(franja.className).toContain("border-b");
  });

  it("sin la barra de arriba: se entra y se sale con los botones del bosquejo y del púlpito", () => {
    abrir();
    expect(screen.queryByRole("group", { name: "Modo" })).toBeNull();
    fireEvent.click(screen.getByText("La fe que se atreve"));
    fireEvent.click(boton("Predicar"));
    expect(boton(/Terminar y marcar como predicada/)).toBeTruthy();
    fireEvent.click(boton("Volver a preparar"));
    expect(screen.getByLabelText("Título de la prédica").value).toBe("La fe que se atreve");
  });

  it("en el púlpito: «ítems» en vez de «piezas», el reloj centrado y grande, y botones que parecen botones", async () => {
    abrir();
    fireEvent.click(screen.getByText("La fe que se atreve"));
    fireEvent.click(boton("Predicar"));
    const bosquejo = screen.getByRole("complementary", { name: "Bosquejo" });
    expect(bosquejo.textContent).toContain("3 ítems");
    expect(bosquejo.textContent).toContain("Toca uno para proyectarlo");
    expect(bosquejo.textContent).not.toMatch(/[Pp]ieza/);
    fireEvent.click(boton(/Empezar$/));
    fireEvent.click(boton(/Siguiente/));
    await waitFor(() => expect(bosquejo.textContent).toContain("Ítem 1 de 3"));
    const reloj = document.querySelector("[data-reloj]");
    expect(reloj.className).toContain("justify-center");
    expect(reloj.className).toContain("text-4xl");
    const terminar = document.querySelector("[data-terminar-predicada]");
    expect(terminar.className).toContain("border-app-success");
    expect(terminar.className).toContain("bg-app-success/10");
    const volver = document.querySelector("[data-volver-preparar]");
    expect(volver.className).toContain("border");
    expect(volver.className).toContain("bg-app-aviso");
    expect(volver.querySelector("svg")).not.toBeNull();
  });

  it("el calendario va debajo de la lista", () => {
    abrir();
    const lista = screen.getByText("Próximas");
    const calendario = document.querySelector("[data-fecha]");
    expect(lista.compareDocumentPosition(calendario) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("«Empezar» muestra el nombre de la prédica en el centro; con «Siguiente» sube a título y van los ítems", async () => {
    empezar();
    expect(document.querySelector("[data-portada]").textContent).toContain("La fe que se atreve");
    fireEvent.click(boton(/Empezar$/));
    await waitFor(() => expect(fb.proyectado).toHaveLength(1));
    expect(fb.proyectado[0]).toMatchObject({ ruta: "displayMessage/g1", datos: { text: "La fe que se atreve", display: "mensajePredica" } });
    expect(document.querySelector("[data-portada]").getAttribute("aria-current")).toBe("true");
    expect(screen.getByText(/Título de la prédica ·/)).toBeTruthy();
    // El primer ítem: se enciende el Título, el nombre sube (con el mismo
    // display del ítem, para no pisarlo) y va el versículo.
    fb.proyectado = [];
    fireEvent.click(boton(/Siguiente/));
    await waitFor(() => expect(fb.proyectado).toHaveLength(3));
    expect(fb.proyectado[0]).toMatchObject({ ruta: "displayVisibleTitulo/g1", datos: { visibleTitulo: true } });
    expect(fb.proyectado[1]).toMatchObject({ ruta: "displayTitulo/g1", datos: { text: "La fe que se atreve", display: "versiculo" } });
    expect(fb.proyectado[2]).toMatchObject({ ruta: "displayVersiculo/g1", datos: { cita: "Hebreos 11:1", display: "versiculo", version: "RVR1960" } });
    // El punto va como mensaje, con su número; el nombre ya no se vuelve a subir.
    fb.proyectado = [];
    fireEvent.click(boton(/Siguiente/));
    await waitFor(() => expect(fb.proyectado).toHaveLength(1));
    expect(fb.proyectado[0]).toMatchObject({ ruta: "displayMessage/g1", datos: { text: "I. La fe ve lo invisible", display: "mensajePredica" } });
    // Regla: solo el resumen va alineado; un punto suelto sigue Estilos y colores.
    expect("alineacion" in fb.proyectado[0].datos).toBe(false);
  });

  it("la primera vez el nombre sale solo como mensaje: si el Título estaba encendido se apaga, y después sube a título", async () => {
    abrir({ app: { visibleTitulo: true } });
    fireEvent.click(screen.getByText("La fe que se atreve"));
    fireEvent.click(boton("Predicar"));
    fireEvent.click(boton(/Empezar$/));
    await waitFor(() => expect(fb.proyectado).toHaveLength(2));
    expect(fb.proyectado[0]).toMatchObject({ ruta: "displayVisibleTitulo/g1", datos: { visibleTitulo: false } });
    expect(fb.proyectado[1]).toMatchObject({ ruta: "displayMessage/g1", datos: { text: "La fe que se atreve" } });
    fb.proyectado = [];
    fireEvent.click(boton(/Siguiente/));
    await waitFor(() => expect(fb.proyectado.map((p) => p.ruta)).toContain("displayVersiculo/g1"));
    expect(fb.proyectado.find((p) => p.ruta === "displayTitulo/g1").datos.text).toBe("La fe que se atreve");
  });

  it("«Anterior» desde el primer ítem vuelve a mostrar el nombre de la prédica", async () => {
    empezar();
    fireEvent.click(boton(/Empezar$/));
    fireEvent.click(boton(/Siguiente/));
    fb.proyectado = [];
    fireEvent.click(boton(/Anterior/));
    await waitFor(() => expect(fb.proyectado).toHaveLength(1));
    expect(fb.proyectado[0]).toMatchObject({ ruta: "displayMessage/g1", datos: { text: "La fe que se atreve" } });
    expect(document.querySelector("[data-portada]").getAttribute("aria-current")).toBe("true");
  });

  it("resumen de puntos vistos: aparece debajo de «Luego» y al tocarlo los proyecta como un mensaje", async () => {
    const DOS_PUNTOS = [
      { id: "p1", tipo: "titulo", contenido: "La fe ve" },
      { id: "p2", tipo: "mensaje", contenido: "Hola" },
      { id: "p3", tipo: "titulo", contenido: "La fe obedece" },
    ];
    fb.docs = [{ ...LA_FE, data: { ...LA_FE.data, piezas: DOS_PUNTOS } }];
    empezar();
    fireEvent.click(boton(/Empezar$/));
    expect(screen.queryByRole("region", { name: "Resumen de puntos vistos" })).toBeNull();
    fireEvent.click(boton(/Siguiente/)); // punto I
    fireEvent.click(boton(/Siguiente/)); // mensaje
    fireEvent.click(boton(/Siguiente/)); // punto II
    const resumen = screen.getByRole("region", { name: "Resumen de puntos vistos" });
    expect(within(resumen).getByText("Resumen de puntos vistos")).toBeTruthy();
    // La marca de agua ▶ en el centro del recuadro, como en la tarjeta del versículo.
    expect(resumen.querySelector("[data-marca-agua=\"proyectar\"]").getAttribute("class")).toContain("m-auto");
    expect([...resumen.querySelectorAll("li")].map((li) => li.textContent)).toEqual(["I. La fe ve", "II. La fe obedece"]);
    // Va debajo de «Luego» si lo hay; aquí ya no queda nada después.
    fb.proyectado = [];
    fireEvent.click(within(resumen).getByRole("button", { name: "Proyectar el resumen de puntos vistos" }));
    await waitFor(() => expect(fb.proyectado).toHaveLength(1));
    expect(fb.proyectado[0]).toMatchObject({ ruta: "displayMessage/g1", datos: { text: "I. La fe ve\nII. La fe obedece", display: "mensajePredica", alineacion: "izquierda" } });
    expect(screen.getByText(/Resumen ·/)).toBeTruthy();
    // La mini pantalla: la misma lista del templo, con sangría francesa
    // (número en su columna, texto en la suya), no un párrafo centrado.
    const lista = screen.getByRole("figure", { name: "En el templo ahora" }).querySelector("[data-lista-resumen]");
    expect(lista.className).toContain("lista-resumen");
    expect([...lista.querySelectorAll("[data-renglon='punto']")].map((r) => r.textContent)).toEqual(["I.La fe ve", "II.La fe obedece"]);
    expect(lista.className).not.toContain("text-center");
  });

  it("con muchos puntos, el resumen va por partes de 6 renglones; cada toque proyecta la siguiente", async () => {
    const OCHO = Array.from({ length: 8 }, (_, i) => ({ id: `p${i}`, tipo: "titulo", contenido: `Punto ${i + 1}` }));
    fb.docs = [{ ...LA_FE, data: { ...LA_FE.data, piezas: OCHO } }];
    empezar();
    fireEvent.click(boton(/Empezar$/));
    for (let i = 0; i < 8; i++) fireEvent.click(boton(/Siguiente/));
    const resumen = screen.getByRole("region", { name: "Resumen de puntos vistos" });
    const partes = () => [...resumen.querySelectorAll("[data-parte]")].map((ul) => ul.querySelectorAll("li").length);
    expect(partes()).toEqual([6, 2]);
    expect(resumen.querySelector("[data-parte=\"2\"]").className).toContain("border-app-muted/60");
    // Sin el texto «toca para la parte…» (el usuario pidió quitarlo).
    expect(resumen.textContent).not.toContain("toca para");
    // Primer toque: la parte 1 (6 renglones).
    fb.proyectado = [];
    fireEvent.click(within(resumen).getByRole("button", { name: /parte 1 de 2/ }));
    await waitFor(() => expect(fb.proyectado).toHaveLength(1));
    expect(fb.proyectado[0].datos.text.split("\n")).toHaveLength(6);
    expect(screen.getByText(/Resumen · parte 1 de 2/)).toBeTruthy();
    expect(resumen.querySelector("[data-parte=\"1\"]").getAttribute("aria-current")).toBe("true");
    // La línea entre partes no se pierde con el recuadro encendido: va dorada.
    expect(resumen.querySelector("[data-parte=\"2\"]").className).toContain("border-app-main/70");
    // Segundo toque: la parte 2; tercero: vuelve a la 1.
    fb.proyectado = [];
    fireEvent.click(within(resumen).getByRole("button", { name: /parte 2 de 2/ }));
    await waitFor(() => expect(fb.proyectado).toHaveLength(1));
    expect(fb.proyectado[0].datos.text).toBe("VII. Punto 7\nVIII. Punto 8");
    expect(within(resumen).getByRole("button", { name: /parte 1 de 2/ })).toBeTruthy();
  });

  it("el resumen va debajo de «Luego»", () => {
    empezar();
    fireEvent.click(boton(/Empezar$/));
    fireEvent.click(boton(/Siguiente/)); // versículo
    fireEvent.click(boton(/Siguiente/)); // punto I (luego queda el mensaje)
    const luego = screen.getByText("Luego").parentElement;
    const resumen = screen.getByRole("region", { name: "Resumen de puntos vistos" });
    expect(luego.compareDocumentPosition(resumen) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("un subpunto se proyecta con su letra y se ve con sangría en la lista del púlpito", async () => {
    const PIEZAS_SUB = [
      { id: "p1", tipo: "titulo", contenido: "La fe ve" },
      { id: "s1", tipo: "titulo", contenido: "Ve lo invisible", nivel: 1 },
    ];
    fb.docs = [{ ...LA_FE, data: { ...LA_FE.data, piezas: PIEZAS_SUB } }];
    empezar();
    fireEvent.click(boton(/Empezar$/));
    fireEvent.click(boton(/Siguiente/)); // I.
    fb.proyectado = [];
    fireEvent.click(boton(/Siguiente/)); // a)
    await waitFor(() => expect(fb.proyectado).toHaveLength(1));
    expect(fb.proyectado[0].datos.text).toBe("a) Ve lo invisible");
    const resumen = screen.getByRole("region", { name: "Resumen de puntos vistos" });
    expect([...resumen.querySelectorAll("li")].map((li) => li.textContent)).toEqual(["I. La fe ve", "    a) Ve lo invisible"]);
  });

  it("la mini pantalla copia el templo: el título en pequeño arriba y el anuncio pasando abajo", () => {
    fb.rtdb = {
      "displayTitulo/g1": { text: "La fe que se atreve", display: "mensajePredica" },
      "displayTicker/g1": { text: "Culto de jóvenes el sábado" },
    };
    abrir({ app: { visibleTitulo: true, visibleTicker: true } });
    fireEvent.click(screen.getByText("La fe que se atreve"));
    fireEvent.click(boton("Predicar"));
    const mini = screen.getByRole("figure", { name: "En el templo ahora" });
    expect(mini.querySelector("[data-mini-titulo]").textContent).toBe("La fe que se atreve");
    const ticker = mini.querySelector("[data-mini-ticker] span");
    expect(ticker.textContent).toBe("Culto de jóvenes el sábado");
    expect(ticker.className).toContain("motion-safe:animate-ticker-mini");
  });

  it("si el Título o el Anuncio están apagados, la mini pantalla tampoco los muestra", () => {
    fb.rtdb = {
      "displayTitulo/g1": { text: "La fe que se atreve", display: "mensajePredica" },
      "displayTicker/g1": { text: "Culto de jóvenes el sábado" },
    };
    abrir({ app: { visibleTitulo: false, visibleTicker: false } });
    fireEvent.click(screen.getByText("La fe que se atreve"));
    fireEvent.click(boton("Predicar"));
    const mini = screen.getByRole("figure", { name: "En el templo ahora" });
    expect(mini.querySelector("[data-mini-titulo]")).toBeNull();
    expect(mini.querySelector("[data-mini-ticker]")).toBeNull();
  });

  it("los puntos se numeran según la prédica: con «Números», el punto sale «1. …»", async () => {
    fb.docs = [{ ...LA_FE, data: { ...LA_FE.data, numeracion: "numeros" } }];
    empezar();
    fireEvent.click(boton(/Empezar$/));
    fireEvent.click(boton(/Siguiente/));
    fb.proyectado = [];
    fireEvent.click(boton(/Siguiente/));
    await waitFor(() => expect(fb.proyectado).toHaveLength(1));
    expect(fb.proyectado[0].datos.text).toBe("1. La fe ve lo invisible");
  });
  it("versículo espontáneo: el mismo bloque de Preparar (campo, cuadrícula y tarjeta); la tarjeta lo proyecta sin tocar el bosquejo", async () => {
    empezar();
    const bloque = screen.getByRole("region", { name: "Versículo espontáneo" });
    expect(within(bloque).getByRole("heading").textContent).toBe("Versículo espontáneo");
    // El botón de las Biblias, como en Preparar.
    expect(within(bloque).getByRole("group", { name: "Biblia" })).toBeTruthy();
    expect(within(bloque).getByRole("button", { name: "Antiguo" })).toBeTruthy();
    expect(within(bloque).getByRole("button", { name: "Nuevo" })).toBeTruthy();
    fireEvent.change(within(bloque).getByLabelText("Buscar versículo"), { target: { value: "Juan 3 16" } });
    const tarjeta = await within(bloque).findByRole("button", { name: "Proyectar Juan 3:16" });
    // Sin el rótulo de arriba: una marca de agua ▶ dentro del recuadro.
    expect(tarjeta.textContent).not.toContain("Proyectar");
    expect(tarjeta.querySelector("[data-marca-agua=\"proyectar\"]")).not.toBeNull();
    expect(tarjeta.textContent).toContain("Porque de tal manera amó Dios al mundo");
    expect(fb.proyectado).toHaveLength(0); // verlo no lo proyecta
    fireEvent.click(tarjeta);
    await waitFor(() => expect(fb.proyectado).toHaveLength(1));
    expect(fb.proyectado[0]).toMatchObject({ ruta: "displayVersiculo/g1", datos: { cita: "Juan 3:16", display: "versiculo" } });
    expect(fb.guardados).toHaveLength(0); // el bosquejo no cambió
  });

  it("con el teclado: flecha derecha avanza y flecha izquierda vuelve", async () => {
    empezar();
    const rutas = () => fb.proyectado.map((p) => p.ruta);
    act(() => {
      fireEvent.keyDown(window, { key: "ArrowRight" }); // el nombre
    });
    await waitFor(() => expect(rutas()).toEqual(["displayMessage/g1"]));
    act(() => {
      fireEvent.keyDown(window, { key: "ArrowRight" }); // el versículo (el nombre sube)
    });
    await waitFor(() => expect(rutas()).toEqual(["displayMessage/g1", "displayVisibleTitulo/g1", "displayTitulo/g1", "displayVersiculo/g1"]));
    act(() => {
      fireEvent.keyDown(window, { key: "ArrowLeft" }); // otra vez el nombre
    });
    await waitFor(() => expect(rutas().at(-1)).toBe("displayMessage/g1"));
    expect(rutas()).toHaveLength(5);
  });
  it("Título, Texto y Anuncio llevan el ícono y el color de las demás vistas", () => {
    const chip = (clave) => document.querySelector(`[data-visible="${clave}"]`);
    // Apagados: grises, cada uno con su ícono.
    abrir({ app: { visibleTitulo: false, visibleTexto: false, visibleTicker: false } });
    fireEvent.click(screen.getByText("La fe que se atreve"));
    fireEvent.click(boton("Predicar"));
    for (const clave of ["titulo", "texto", "ticker"]) {
      expect(chip(clave).className).toContain("text-app-muted");
      expect(chip(clave).querySelector("svg")).not.toBeNull();
    }
    cleanup();
    // Encendidos: Título coral, Texto dorado, Anuncio verde.
    abrir({ app: { visibleTitulo: true, visibleTexto: true, visibleTicker: true } });
    fireEvent.click(screen.getByText("La fe que se atreve"));
    fireEvent.click(boton("Predicar"));
    expect(chip("titulo").className).toContain("text-app-accent");
    expect(chip("texto").className).toContain("text-app-main");
    expect(chip("ticker").className).toContain("text-app-success");
  });

  it("«Ocultar» lleva el ojo tachado; las imágenes se ven en miniatura en la lista y en «Luego»", () => {
    const FOTO = { id: "p4", tipo: "imagen", contenido: { url: "https://img/culto.jpg", nombre: "culto.jpg" } };
    fb.docs = [{ ...LA_FE, data: { ...LA_FE.data, piezas: [FOTO, ...LA_FE.data.piezas] } }];
    empezar();
    expect(boton("Ocultar").querySelector("svg")).not.toBeNull();
    const bosquejo = screen.getByRole("complementary", { name: "Bosquejo" });
    const minis = bosquejo.querySelectorAll("[data-miniatura]");
    expect(minis).toHaveLength(1); // solo la imagen
    expect(minis[0].getAttribute("src")).toBe("https://img/culto.jpg");
    // Antes de empezar, «Luego» es el nombre de la prédica; tras «Empezar»,
    // la primera: la imagen, con su miniatura.
    const luego = () => screen.getByText("Luego").parentElement;
    expect(luego().textContent).toContain("La fe que se atreve");
    fireEvent.click(boton(/Empezar$/));
    expect(luego().querySelector("[data-miniatura]")).not.toBeNull();
  });

  it("con todo oculto, el botón dice «Mostrar» con el ojo abierto y enciende el texto", async () => {
    abrir({ app: { visibleTitulo: false, visibleTexto: false, visibleTicker: false, visibleImagen: false } });
    fireEvent.click(screen.getByText("La fe que se atreve"));
    fireEvent.click(boton("Predicar"));
    expect(screen.queryByRole("button", { name: "Ocultar" })).toBeNull();
    const mostrar = boton("Mostrar");
    expect(mostrar.getAttribute("data-ocultar")).toBe("mostrar");
    // El ojo abierto no es el tachado de «Ocultar».
    const { container } = render(<EyeSlashIcon />);
    expect(mostrar.querySelector("path").getAttribute("d")).not.toBe(container.querySelector("path").getAttribute("d"));
    fireEvent.click(mostrar);
    await waitFor(() => expect(fb.proyectado).toEqual([expect.objectContaining({ ruta: "displayVisibleTexto/g1", datos: expect.objectContaining({ visibleTexto: true }) })]));
  });

  it("«Mostrar» va en rojo y palpita; la mini pantalla dice «No se ve en el templo»", async () => {
    abrir({ app: { visibleTitulo: false, visibleTexto: false, visibleTicker: false, visibleImagen: false } });
    fireEvent.click(screen.getByText("La fe que se atreve"));
    fireEvent.click(boton("Predicar"));
    const mostrar = boton("Mostrar");
    expect(mostrar.className).toContain("text-app-error");
    expect(mostrar.className).toContain("motion-safe:animate-palpita");
    const mini = screen.getByRole("figure", { name: "En el templo ahora" });
    expect(mini.querySelector("[data-aviso-oculta]").textContent).toBe("No se ve en el templo");
  });

  it("la guía del predicador: si el texto está apagado, el versículo enviado no se ve y la mini pantalla lo avisa", async () => {
    // Título encendido (no está todo oculto), pero el texto apagado.
    abrir({ app: { visibleTitulo: true, visibleTexto: false, visibleTicker: false } });
    fireEvent.click(screen.getByText("La fe que se atreve"));
    fireEvent.click(boton("Predicar"));
    expect(boton("Ocultar").className).not.toContain("animate-palpita");
    fireEvent.click(boton(/Empezar$/)); // el nombre de la prédica
    fireEvent.click(boton(/Siguiente/)); // el primero es un versículo
    const mini = screen.getByRole("figure", { name: "En el templo ahora" });
    await waitFor(() => expect(mini.textContent).toContain("Hebreos 11:1"));
    expect(mini.querySelector("[data-aviso-oculta]")).not.toBeNull();
  });

  it("con el texto encendido, el versículo enviado se ve: la mini pantalla no avisa nada", async () => {
    empezar();
    fireEvent.click(boton(/Empezar$/));
    fireEvent.click(boton(/Siguiente/));
    const mini = screen.getByRole("figure", { name: "En el templo ahora" });
    await waitFor(() => expect(mini.textContent).toContain("Hebreos 11:1"));
    expect(mini.querySelector("[data-aviso-oculta]")).toBeNull();
  });

  it("la palabra «todo» ya no está: con algo visible, el botón dice solo «Ocultar»", () => {
    empezar();
    expect(boton("Ocultar").textContent).toBe("Ocultar");
    expect(boton("Ocultar").getAttribute("data-ocultar")).toBe("ocultar");
  });

  it("«Ocultar» (antes «En negro») apaga título, texto y anuncio", async () => {
    empezar();
    fireEvent.click(boton("Ocultar"));
    await waitFor(() => expect(fb.proyectado.map((p) => p.ruta).sort()).toEqual(["displayVisibleTexto/g1", "displayVisibleTicker/g1", "displayVisibleTitulo/g1"]));
    expect(fb.proyectado.every((p) => Object.values(p.datos).includes(false))).toBe(true);
  });

  it("una imagen va por el canal de Imágenes y se enciende; lo siguiente la apaga", async () => {
    fb.docs = [
      {
        id: "foto",
        data: {
          titulo: "Con foto",
          fecha: "2099-11-15",
          estado: "borrador",
          piezas: [
            { id: "a", tipo: "imagen", contenido: { url: "https://img/f.jpg", nombre: "f.jpg" } },
            { id: "b", tipo: "mensaje", contenido: "Hola iglesia" },
          ],
        },
      },
    ];
    abrir({ app: { visibleImagen: true } });
    fireEvent.click(screen.getByText("Con foto"));
    fireEvent.click(boton("Predicar"));
    fireEvent.click(boton(/Empezar$/)); // el nombre de la prédica
    await waitFor(() => expect(fb.proyectado.map((p) => p.ruta)).toContain("displayMessage/g1"));
    fb.proyectado = [];
    fireEvent.click(boton(/Siguiente/)); // la imagen (y el nombre sube a título)
    await waitFor(() => expect(fb.proyectado.map((p) => p.ruta)).toContain("displayVisibleImagen/g1"));
    const imagen = fb.proyectado.find((p) => p.ruta === "displayImage/g1");
    expect(imagen.datos).toMatchObject({ type: "single", images: ["https://img/f.jpg"] });
    expect(fb.proyectado.find((p) => p.ruta === "displayVisibleImagen/g1").datos).toMatchObject({ visibleImagen: true });
    expect(document.querySelector("[data-pantalla-previa] img").getAttribute("src")).toBe("https://img/f.jpg");
    fb.proyectado = [];
    fireEvent.click(boton(/Siguiente/));
    await waitFor(() => expect(fb.proyectado).toHaveLength(2));
    expect(fb.proyectado[0]).toMatchObject({ ruta: "displayVisibleImagen/g1", datos: { visibleImagen: false } });
    expect(fb.proyectado[1]).toMatchObject({ ruta: "displayMessage/g1", datos: { text: "Hola iglesia" } });
  });

  it("«Ocultar» también apaga la imagen", async () => {
    abrir({ app: { visibleImagen: true } });
    fireEvent.click(screen.getByText("La fe que se atreve"));
    fireEvent.click(boton("Predicar"));
    fireEvent.click(boton("Ocultar"));
    await waitFor(() => expect(fb.proyectado.map((p) => p.ruta)).toContain("displayVisibleImagen/g1"));
  });

  it("terminar la marca como predicada", async () => {
    empezar();
    fireEvent.click(boton(/Terminar y marcar como predicada/));
    await waitFor(() => expect(fb.guardados.at(-1)?.datos.estado).toBe("predicada"), { timeout: 3000 });
  });
});

describe("en el celular", () => {
  it("la próxima va al frente y se abre en una pantalla propia, con volver", () => {
    abrir({ isDesktop: false });
    expect(screen.getByText(/La próxima/)).toBeTruthy();
    fireEvent.click(boton("Preparar"));
    expect(screen.getByLabelText("Título de la prédica").value).toBe("La fe que se atreve");
    fireEvent.click(boton("Volver a mis prédicas"));
    expect(screen.getByText("Mis prédicas")).toBeTruthy();
  });
});

function todayPlus(dias) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
