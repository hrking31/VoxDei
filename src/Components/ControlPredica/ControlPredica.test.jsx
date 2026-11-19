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
// El medidor del semáforo dibuja escenas ocultas a tamaño real, y su texto se repetiría en
// la pantalla: aquí es un medidor falso al que la prueba le dice qué ítems no caben
// (`medidor.decidir`). Las pruebas del verdadero están en MedidorCabida.test.jsx.
const medidor = vi.hoisted(() => ({ ultimo: null, decidir: () => ({}) }));
vi.mock("../Predica/MedidorCabida.jsx", async () => {
  const { useEffect } = await import("react");
  return {
    default: function MedidorFalso({ elementos, titulo, alMedir }) {
      medidor.ultimo = { elementos, titulo };
      useEffect(() => {
        alMedir(medidor.decidir(elementos));
      }, [elementos, alMedir]);
      return null;
    },
  };
});
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
  medidor.ultimo = null;
  medidor.decidir = () => ({});
});
afterEach(() => vi.clearAllMocks());

const boton = (nombre) => screen.getByRole("button", { name: nombre });
// Entrar al púlpito (18-11-2026): en el computador son los botones «Pruebas» y
// «Predicar» de la columna de la derecha; en el celular y la tableta, el menú
// «Púlpito» → «Predicar» / «Pruebas».
function entrarAlPulpito(cual) {
  const menu = document.querySelector("[data-menu-pulpito]");
  if (menu) fireEvent.click(menu);
  fireEvent.click(document.querySelector(cual === "pruebas" ? "[data-ir-pruebas]" : "[data-ir-predicar]"));
}
const irAPredicar = () => entrarAlPulpito("predicar");
const irAProbar = () => entrarAlPulpito("pruebas");
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

  it("en el computador no hay «Nueva» ni «Predicar» arriba de la lista (van en la columna de la derecha)", () => {
    abrir();
    const lista = screen.getByRole("complementary", { name: "Mis prédicas" });
    expect(within(lista).queryByRole("button", { name: /Nueva/ })).toBeNull();
    expect(within(lista).queryByRole("button", { name: /Predicar/ })).toBeNull();
  });

  it("celular: ya no hay botón flotante «Nueva prédica»; se crea desde un día del calendario", async () => {
    abrir({ isDesktop: false });
    expect(screen.queryByRole("button", { name: "Nueva prédica" })).toBeNull();
    fireEvent.click(document.querySelector('[data-fecha="2026-11-21"]'));
    fireEvent.click(within(document.querySelector("[data-dia-elegido]")).getByRole("button", { name: "Crear para este día" }));
    // Abre el bosquejo vacío; no crea nada hasta que se escribe (14-11-2026).
    const titulo = screen.getByLabelText("Título de la prédica");
    expect(fb.creados).toHaveLength(0);
    fireEvent.change(titulo, { target: { value: "Mi prédica" } });
    await waitFor(() => expect(fb.creados).toHaveLength(1));
    const { ruta, datos } = fb.creados[0];
    expect(ruta).toBe("iglesias/g1/predicas");
    expect(datos).toMatchObject({ titulo: "Mi prédica", estado: "borrador", fecha: "2026-11-21" });
  });

  it("«N prédicas guardadas» al pie, sin línea en ningún tamaño; en el celular, con letra más pequeña y menos alto", () => {
    abrir({ isDesktop: false });
    const pie = document.querySelector("[data-contador-predicas]");
    expect(pie.textContent).toContain("guardad");
    expect(pie.className).toContain("text-pie");
    expect(pie.className).toContain("leading-none");
    expect(pie.className).not.toContain("border-t");
    cleanup();
    abrir({ isDesktop: true });
    const pieAncho = document.querySelector("[data-contador-predicas]");
    expect(pieAncho.className).toContain("text-xs");
    expect(pieAncho.className).not.toContain("border-t");
    expect(pieAncho.className).not.toContain("text-pie");
  });

  it("celular: la fila «Mis prédicas» + Predicar es compacta (título sin interlineado extra, botón h-9)", () => {
    abrir({ isDesktop: false });
    const titulo = screen.getByRole("heading", { name: "Mis prédicas" });
    expect(titulo.className).toContain("leading-none");
    expect(document.querySelector("[data-nueva-predica]").className).toContain("h-9");
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
    // Abre el bosquejo vacío con ese día; se crea al escribir (14-11-2026).
    expect(fb.creados).toHaveLength(0);
    fireEvent.change(screen.getByLabelText("Título de la prédica"), { target: { value: "Sábado" } });
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

  it("celular: los dos botones van en la barra de abajo, al final (ya no arriba)", () => {
    abrir({ isDesktop: false });
    // En el celular se abre tocándola en la lista.
    fireEvent.click(screen.getByText("La fe que se atreve"));
    const abajo = screen.getByRole("group", { name: "Agregar al bosquejo" });
    const botones = within(abajo).getAllByRole("button").map((b) => b.getAttribute("aria-label"));
    expect(botones.slice(-2)).toEqual(["Deshacer", "Rehacer"]);
    const arriba = screen.getByRole("button", { name: "Volver a mis prédicas" }).parentElement;
    expect(within(arriba).queryByRole("button", { name: "Deshacer" })).toBeNull();
    expect(within(arriba).queryByRole("button", { name: "Rehacer" })).toBeNull();
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
    fireEvent.click(screen.getByText("La fe que se atreve"));
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

  it("el título se ve como campo y, al abrir una nueva en el celular, queda vacío y listo para escribir el nombre", async () => {
    abrir({ isDesktop: false });
    fireEvent.click(document.querySelector('[data-fecha="2026-11-21"]'));
    fireEvent.click(within(document.querySelector("[data-dia-elegido]")).getByRole("button", { name: "Crear para este día" }));
    const titulo = screen.getByLabelText("Título de la prédica");
    await waitFor(() => expect(document.activeElement).toBe(titulo));
    expect(titulo.value).toBe("");
    expect(titulo.className).toContain("border-dashed");
    expect(fb.creados).toHaveLength(0);
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

  it("abajo: el selector y WhatsApp, Duplicar y Borrar; «Pruebas» y «Predicar» a la derecha, no en la lista ni en el bosquejo", () => {
    abrir();
    fireEvent.click(screen.getByText("La fe que se atreve"));
    const derecha = screen.getByRole("complementary", { name: "Púlpito y versículos" });
    const lista = screen.getByRole("complementary", { name: "Mis prédicas" });
    const bosquejo = screen.getByRole("main");
    const barra = screen.getByRole("group", { name: "Agregar al bosquejo" }).parentElement;
    // Los dos botones, uno al lado del otro, arriba de la columna derecha
    const botonesPulpito = derecha.querySelector("[data-botones-pulpito]");
    expect([...botonesPulpito.querySelectorAll("button")].map((b) => b.textContent)).toEqual(["Pruebas", "Predicar"]);
    expect(derecha.firstElementChild).toBe(botonesPulpito);
    expect(within(bosquejo).queryByRole("button", { name: /Predicar|Pruebas/ })).toBeNull();
    expect(within(lista).queryByRole("button", { name: /Predicar|Pruebas/ })).toBeNull();
    expect(within(barra).getByRole("button", { name: "Duplicar" })).toBeTruthy();
    expect(within(barra).getByRole("button", { name: "Borrar" })).toBeTruthy();
    expect(within(barra).getByTitle("Compartir por WhatsApp")).toBeTruthy();
    expect(within(derecha).queryByRole("button", { name: "Borrar" })).toBeNull();
  });

  it("Preparar ya no lleva la pantalla de muestra: ni en la columna, ni «Toca un ítem para verlo aquí»", () => {
    abrir();
    fireEvent.click(screen.getByText("La fe que se atreve"));
    const derecha = screen.getByRole("complementary", { name: "Púlpito y versículos" });
    expect(within(derecha).queryByRole("figure")).toBeNull();
    expect(document.querySelector("[data-pantalla-previa]")).toBeNull();
    expect(screen.queryByText("Toca un ítem para verlo aquí")).toBeNull();
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
    const derecha = screen.getByRole("complementary", { name: "Púlpito y versículos" });
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
    const derecha = screen.getByRole("complementary", { name: "Púlpito y versículos" });
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
    irAPredicar();
  };

  it("la franja del turno sale solo al predicar, no en Mis prédicas ni en Preparar", () => {
    const franja = () => document.querySelector("[data-franja-turno]");
    abrir();
    expect(franja()).toBeNull();
    fireEvent.click(screen.getByText("La fe que se atreve"));
    expect(franja()).toBeNull();
    irAPredicar();
    expect(franja()).not.toBeNull();
    // En el computador, solo en la columna derecha del púlpito, con su diseño de siempre.
    expect(document.querySelectorAll("[data-franja-turno]")).toHaveLength(1);
    const derecha = franja().closest("aside");
    expect(derecha).not.toBeNull();
    expect(derecha.querySelector("[data-reloj]")).not.toBeNull();
    expect(franja().className).toContain("border-b");
    expect(franja().className).not.toContain("rounded");
  });

  it("celular: ya no hay franja del turno al predicar (va en la barra de arriba de la app)", () => {
    abrir({ isDesktop: false });
    fireEvent.click(screen.getByText("La fe que se atreve"));
    irAPredicar();
    expect(screen.getByRole("button", { name: "Volver a preparar" })).toBeTruthy();
    expect(document.querySelector("[data-franja-turno]")).toBeNull();
    // Ya no hay etiqueta con el estado de la pantalla debajo del nombre (pedido del usuario):
    // solo el contador de ítems, pequeño, al lado del nombre.
    expect(document.querySelector("[data-punto-vivo]")).toBeNull();
    expect(document.querySelector("[data-etiqueta-aire]")).toBeNull();
    expect(document.body.textContent).not.toMatch(/en vivo/i);
    const contador = document.querySelector("[data-contador-items]");
    expect(contador.textContent).toMatch(/ítem|de/);
    expect(contador.className).toContain("text-pie");
    expect(contador.previousElementSibling.textContent).toBe("La fe que se atreve");
  });

  it("celular: el bosquejo entero está en la pantalla, sin «Luego», y se mueve solo al avanzar", () => {
    abrir({ isDesktop: false });
    fireEvent.click(screen.getByText("La fe que se atreve"));
    irAPredicar();
    expect(screen.queryByText("Luego")).toBeNull();
    const recuadro = document.querySelector("[data-bosquejo-vivo]");
    expect(recuadro.className).toContain("overflow-y-auto");
    // Toda la lista: el nombre de la prédica y cada ítem y «Terminar» al final.
    expect(within(recuadro).getByText("La fe que se atreve")).toBeTruthy();
    expect(within(recuadro).getByText("La fe ve lo invisible")).toBeTruthy();
    expect(recuadro.lastElementChild.textContent).toMatch(/Terminar y marcar como predicada/);
    // Al avanzar, se centra el ítem que está al aire (scrollTo sobre el recuadro).
    const scrollTo = vi.fn();
    recuadro.scrollTo = scrollTo;
    fireEvent.click(boton(/Empezar$/));
    fireEvent.click(boton(/Siguiente/));
    expect(scrollTo).toHaveBeenCalled();
    expect(recuadro.querySelector('[aria-current="true"]')).not.toBeNull();
  });

  it("celular: con todo oculto no hay etiqueta; la mini pantalla dice «No se ve en el templo»", () => {
    abrir({ isDesktop: false, app: { visibleTitulo: false, visibleTexto: false, visibleTicker: false, visibleImagen: false } });
    fireEvent.click(screen.getByText("La fe que se atreve"));
    irAPredicar();
    expect(document.querySelector("[data-etiqueta-aire]")).toBeNull();
    const mini = screen.getByRole("figure", { name: "En el templo ahora" });
    expect(mini.querySelector("[data-aviso-oculta]").textContent).toBe("No se ve en el templo");
  });

  it("sin la barra de arriba: se entra y se sale con los botones del bosquejo y del púlpito", () => {
    abrir();
    expect(screen.queryByRole("group", { name: "Modo" })).toBeNull();
    fireEvent.click(screen.getByText("La fe que se atreve"));
    irAPredicar();
    expect(boton(/Terminar y marcar como predicada/)).toBeTruthy();
    fireEvent.click(boton("Volver a preparar"));
    expect(screen.getByLabelText("Título de la prédica").value).toBe("La fe que se atreve");
  });

  it("en el púlpito: «ítems» en vez de «piezas», el reloj centrado y grande, y botones que parecen botones", async () => {
    abrir();
    fireEvent.click(screen.getByText("La fe que se atreve"));
    irAPredicar();
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
    // Ya no hay etiqueta bajo el nombre (pedido del usuario).
    expect(screen.queryByText(/Título de la prédica ·/)).toBeNull();
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
    irAPredicar();
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

  const botonesPunto = () => [...screen.getByRole("region", { name: "Resumen de puntos" }).querySelectorAll("[data-punto-resumen]")];

  it("resumen de puntos: muestra TODOS los puntos como botones y al tocar uno lo proyecta como mensaje", async () => {
    const DOS_PUNTOS = [
      { id: "p1", tipo: "titulo", contenido: "La fe ve" },
      { id: "p2", tipo: "mensaje", contenido: "Hola" },
      { id: "p3", tipo: "titulo", contenido: "La fe obedece" },
    ];
    fb.docs = [{ ...LA_FE, data: { ...LA_FE.data, piezas: DOS_PUNTOS } }];
    empezar();
    // Desde antes de empezar: están todos, aunque no haya pasado ninguno.
    const resumen = screen.getByRole("region", { name: "Resumen de puntos" });
    expect(within(resumen).getByText(/Resumen de puntos · en pantalla 0 de 6/)).toBeTruthy();
    // La marca de agua ▶ en el centro del recuadro, como en la tarjeta del versículo.
    expect(resumen.querySelector("[data-marca-agua=\"proyectar\"]").getAttribute("class")).toContain("m-auto");
    expect(botonesPunto().map((b) => b.textContent)).toEqual(["I. La fe ve", "II. La fe obedece"]);
    // Tocar el segundo primero: se proyecta ese, numerado como «I.» (cada pantalla empieza de nuevo).
    fb.proyectado = [];
    fireEvent.click(botonesPunto()[1]);
    await waitFor(() => expect(fb.proyectado).toHaveLength(1));
    expect(fb.proyectado[0]).toMatchObject({ ruta: "displayMessage/g1", datos: { text: "I. La fe obedece", display: "mensajePredica", alineacion: "izquierda" } });
    // Después el primero: se suma debajo, en el orden en que se tocaron.
    fb.proyectado = [];
    fireEvent.click(botonesPunto()[0]);
    await waitFor(() => expect(fb.proyectado).toHaveLength(1));
    expect(fb.proyectado[0].datos.text).toBe("I. La fe obedece\nII. La fe ve");
    expect(within(resumen).getByText(/en pantalla 2 de 6/)).toBeTruthy();
    expect(screen.queryByText(/Resumen ·/)).toBeNull();
    // La mini pantalla: la misma lista del templo, con sangría francesa.
    const lista = screen.getByRole("figure", { name: "En el templo ahora" }).querySelector("[data-lista-resumen]");
    expect(lista.className).toContain("lista-resumen");
    expect([...lista.querySelectorAll("[data-renglon='punto']")].map((r) => r.textContent)).toEqual(["I.La fe obedece", "II.La fe ve"]);
    expect(lista.className).not.toContain("text-center");
    // Los tocados llevan su marca; tocar uno que ya está en la pantalla la vuelve a enviar igual (no suma otro).
    expect(botonesPunto().every((b) => b.getAttribute("aria-pressed") === "true")).toBe(true);
    fb.proyectado = [];
    fireEvent.click(botonesPunto()[0]);
    await waitFor(() => expect(fb.proyectado).toHaveLength(1));
    expect(fb.proyectado[0].datos.text).toBe("I. La fe obedece\nII. La fe ve");
  });

  it("aunque ya hayan salido todos, se puede volver a proyectar cualquiera: empieza una pantalla nueva con él", async () => {
    const OCHO = Array.from({ length: 8 }, (_, i) => ({ id: `p${i}`, tipo: "titulo", contenido: `Punto ${i + 1}` }));
    fb.docs = [{ ...LA_FE, data: { ...LA_FE.data, piezas: OCHO } }];
    empezar();
    // Se puede empezar por el que se quiera: el 3.º.
    fireEvent.click(botonesPunto()[2]);
    await waitFor(() => expect(fb.proyectado.at(-1)?.datos.text).toBe("I. Punto 3"));
    for (let i = 0; i < 8; i++) if (i !== 2) fireEvent.click(botonesPunto()[i]);
    await waitFor(() => expect(botonesPunto().every((b) => b.getAttribute("aria-pressed") === "true")).toBe(true));
    // Ya salieron los 8: tocar el 1.º no se bloquea y sale solo, como el primero de una pantalla nueva.
    fireEvent.click(botonesPunto()[0]);
    await waitFor(() => expect(fb.proyectado.at(-1).datos.text).toBe("I. Punto 1"));
    expect(within(screen.getByRole("region", { name: "Resumen de puntos" })).getByText(/en pantalla 1 de 6/)).toBeTruthy();
    // Y sigue: tocar otro, el 7.º, suma debajo.
    fireEvent.click(botonesPunto()[6]);
    await waitFor(() => expect(fb.proyectado.at(-1).datos.text).toBe("I. Punto 1\nII. Punto 7"));
  });

  it("la pantalla muestra 6 puntos como máximo: el séptimo abre una pantalla nueva y sale como el primero", async () => {
    const OCHO = Array.from({ length: 8 }, (_, i) => ({ id: `p${i}`, tipo: "titulo", contenido: `Punto ${i + 1}` }));
    fb.docs = [{ ...LA_FE, data: { ...LA_FE.data, piezas: OCHO } }];
    empezar();
    expect(botonesPunto()).toHaveLength(8);
    for (let i = 0; i < 6; i++) fireEvent.click(botonesPunto()[i]);
    await waitFor(() => expect(fb.proyectado.at(-1).datos.text.split("\n")).toHaveLength(6));
    expect(fb.proyectado.at(-1).datos.text.split("\n").at(-1)).toBe("VI. Punto 6");
    // El séptimo: pantalla nueva, solo él, como «I.».
    fireEvent.click(botonesPunto()[6]);
    await waitFor(() => expect(fb.proyectado.at(-1).datos.text).toBe("I. Punto 7"));
    expect(within(screen.getByRole("region", { name: "Resumen de puntos" })).getByText(/en pantalla 1 de 6/)).toBeTruthy();
    // El octavo se suma debajo.
    fireEvent.click(botonesPunto()[7]);
    await waitFor(() => expect(fb.proyectado.at(-1).datos.text).toBe("I. Punto 7\nII. Punto 8"));
    // Solo los dos de la pantalla actual van marcados en dorado.
    expect(botonesPunto().filter((b) => b.getAttribute("aria-current") === "true").map((b) => b.textContent)).toEqual(["VII. Punto 7", "VIII. Punto 8"]);
  });

  it("el resumen va debajo de «Luego»", () => {
    empezar();
    fireEvent.click(boton(/Empezar$/));
    fireEvent.click(boton(/Siguiente/)); // versículo
    fireEvent.click(boton(/Siguiente/)); // punto I (luego queda el mensaje)
    const luego = screen.getByText("Luego").parentElement;
    const resumen = screen.getByRole("region", { name: "Resumen de puntos" });
    expect(luego.compareDocumentPosition(resumen) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("un subpunto se proyecta con su letra y se ve con sangría en la lista del púlpito y en el resumen", async () => {
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
    // En el resumen, cada punto es un botón y el subpunto va con sangría.
    expect(botonesPunto().map((b) => b.textContent)).toEqual(["I. La fe ve", "a) Ve lo invisible"]);
    expect(botonesPunto()[1].closest("li").className).toContain("ml-4");
  });

  it("la mini pantalla copia el templo: el título en pequeño arriba y el anuncio pasando abajo", () => {
    fb.rtdb = {
      "displayTitulo/g1": { text: "La fe que se atreve", display: "mensajePredica" },
      "displayTicker/g1": { text: "Culto de jóvenes el sábado" },
    };
    abrir({ app: { visibleTitulo: true, visibleTicker: true } });
    fireEvent.click(screen.getByText("La fe que se atreve"));
    irAPredicar();
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
    irAPredicar();
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
    irAPredicar();
    for (const clave of ["titulo", "texto", "ticker"]) {
      expect(chip(clave).className).toContain("text-app-muted");
      expect(chip(clave).querySelector("svg")).not.toBeNull();
    }
    cleanup();
    // Encendidos: Título coral, Texto dorado, Anuncio verde.
    abrir({ app: { visibleTitulo: true, visibleTexto: true, visibleTicker: true } });
    fireEvent.click(screen.getByText("La fe que se atreve"));
    irAPredicar();
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
    irAPredicar();
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
    irAPredicar();
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
    irAPredicar();
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
    irAPredicar();
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
    irAPredicar();
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
  it("sin recuadro destacado: se abre desde la lista en una pantalla propia, con volver", () => {
    abrir({ isDesktop: false });
    // Ya no hay recuadro «Hoy» / «La próxima» con Preparar y Predicar (13-11-2026).
    expect(screen.queryByText(/La próxima/)).toBeNull();
    expect(screen.queryByText(/^Hoy ·/)).toBeNull();
    fireEvent.click(screen.getByText("La fe que se atreve"));
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

// ---------- Por pantalla (12-11-2026, propuesta aprobada por el usuario) ----------

describe("celular: Predicar con el muelle al alcance del pulgar", () => {
  const alPulpito = () => {
    const montado = abrir({ isDesktop: false });
    fireEvent.click(screen.getByText("La fe que se atreve"));
    irAPredicar();
    return montado;
  };

  it("abajo, fijo: una fila de 3 botones (íconos y «Puntos») y, debajo, Anterior y Siguiente; arriba, los 4 interruptores", () => {
    alPulpito();
    const muelle = document.querySelector("[data-muelle]");
    const fila = within(muelle).getByRole("group", { name: "Herramientas" });
    const botones = within(fila).getAllByRole("button");
    // Íconos (volver y versículos) y la palabra «Puntos», todos de h-7 (más baja que la de Preparar).
    expect(botones.map((b) => b.getAttribute("aria-label") || b.textContent)).toEqual(["Volver a preparar", "Versículos", "Puntos"]);
    expect(botones[2].querySelector("svg")).toBeNull();
    botones.slice(0, 2).forEach((b) => expect(b.querySelector("svg")).not.toBeNull());
    botones.forEach((b) => expect(b.className).toContain("h-7"));
    // «Terminar» ya no está en la fila: va al final del bosquejo.
    expect(within(fila).queryByRole("button", { name: /Terminar/ })).toBeNull();
    expect(within(muelle).getByRole("button", { name: /Empezar/ })).toBeTruthy();
    expect(within(muelle).getByRole("button", { name: /Anterior/ })).toBeTruthy();
    const interruptores = screen.getByRole("group", { name: "Qué se ve en el templo" });
    expect(interruptores.className).toContain("grid-cols-4");
    expect(interruptores.querySelectorAll("button")).toHaveLength(4);
  });

  it("Volver a preparar sale del púlpito", () => {
    alPulpito();
    fireEvent.click(screen.getByRole("button", { name: "Volver a preparar" }));
    expect(document.querySelector("[data-muelle]")).toBeNull();
  });

  it("Terminar pregunta antes: si dice que no, no guarda; si dice que sí, la marca predicada", async () => {
    const { app } = alPulpito();
    app.confirmAction.mockResolvedValueOnce(false);
    fireEvent.click(screen.getByRole("button", { name: "Terminar y marcar como predicada" }));
    await waitFor(() => expect(app.confirmAction).toHaveBeenCalledWith("¿Terminar y marcar como predicada?"));
    expect(fb.guardados.at(-1)?.datos?.estado).not.toBe("predicada");
    fireEvent.click(screen.getByRole("button", { name: "Terminar y marcar como predicada" }));
    await waitFor(() => expect(fb.guardados.at(-1)?.datos.estado).toBe("predicada"), { timeout: 3000 });
  });

  it("Versículos abre el diálogo de pantalla completa de Preparar (con las Biblias) y proyecta", async () => {
    alPulpito();
    fireEvent.click(screen.getByRole("button", { name: "Versículos" }));
    const dialogo = screen.getByRole("dialog", { name: "Versículos" });
    expect(dialogo.className).toContain("h-full");
    expect(dialogo.parentElement.className).toContain("inset-0");
    // El muelle queda debajo, fuera del diálogo.
    expect(dialogo.contains(document.querySelector("[data-muelle]"))).toBe(false);
    expect(within(dialogo).getByRole("group", { name: "Testamento" })).toBeTruthy();
    expect(within(dialogo).getByRole("group", { name: "Biblia" })).toBeTruthy();
    fireEvent.change(within(dialogo).getByLabelText("Buscar versículo"), { target: { value: "Juan 3 16" } });
    fireEvent.click(await within(dialogo).findByRole("button", { name: "Proyectar Juan 3:16" }));
    await waitFor(() => expect(fb.proyectado.some((p) => p.ruta === "displayVersiculo/g1")).toBe(true));
    expect(screen.queryByRole("dialog", { name: "Versículos" })).toBeNull();
  });

  it("Puntos sin puntos en la prédica avisa en vez de abrir un diálogo vacío", () => {
    fb.docs = [{ ...LA_FE, data: { ...LA_FE.data, piezas: [{ id: "m", tipo: "mensaje", contenido: "Hola" }] } }];
    const { app } = alPulpito();
    fireEvent.click(screen.getByRole("button", { name: "Puntos" }));
    expect(app.showNotif).toHaveBeenCalledWith("info", "Esta prédica aún no tiene puntos.");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("Puntos abre un diálogo hasta el borde de abajo, bajo la mini pantalla, con todos los puntos como botones", async () => {
    const DOCE = Array.from({ length: 12 }, (_, i) => ({ id: `p${i + 1}`, tipo: "titulo", contenido: `Punto ${i + 1}` }));
    fb.docs = [{ ...LA_FE, data: { ...LA_FE.data, piezas: DOCE } }];
    alPulpito();
    const vivo = () => document.querySelector("[data-resumen-vivo]");
    // No sale solo.
    expect(vivo()).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Puntos" }));
    expect(vivo().getAttribute("role")).toBe("dialog");
    // Del final de la mini pantalla hasta el borde de abajo de la pantalla (también sobre el muelle).
    expect(vivo().className).toContain("fixed");
    expect(vivo().className).toContain("bottom-0");
    expect(vivo().className).toContain("inset-x-0");
    expect(vivo().style.top).not.toBe("");
    expect(vivo().querySelector(".overflow-y-auto")).not.toBeNull();
    // La mini pantalla queda fuera del diálogo (a la vista).
    const mini = document.querySelector("[data-pantalla-previa]");
    expect(mini.contains(vivo())).toBe(false);
    // Todos los puntos, cada uno un botón; tocar uno lo proyecta y el diálogo sigue abierto.
    const botones = () => [...vivo().querySelectorAll("[data-punto-resumen]")];
    expect(botones()).toHaveLength(12);
    fireEvent.click(botones()[0]);
    await waitFor(() => expect(fb.proyectado.at(-1)?.datos.text).toBe("I. Punto 1"));
    expect(vivo()).not.toBeNull();
    // Se cierra solo con la X.
    fireEvent.click(within(vivo()).getByRole("button", { name: "Cerrar" }));
    expect(vivo()).toBeNull();
  });

  it("tocar un ítem del bosquejo de la pantalla lo proyecta", async () => {
    alPulpito();
    fireEvent.click(within(document.querySelector("[data-bosquejo-vivo]")).getByText("La fe ve lo invisible"));
    await waitFor(() => expect(fb.proyectado.at(-1)?.datos.text).toBe("I. La fe ve lo invisible"));
  });
});

describe("celular: sin el botón de las Biblias (13-11-2026, pendiente de ubicar)", () => {
  it("Mis prédicas no lo trae, y en el computador sigue en su sitio", () => {
    abrir({ isDesktop: false });
    expect(screen.queryByRole("group", { name: "Biblia" })).toBeNull();
    cleanup();
    abrir({ isDesktop: true });
    expect(screen.getByRole("group", { name: "Biblia" })).toBeTruthy();
  });
});

describe("celular: el buscador de Mis prédicas", () => {
  const campo = () => screen.getByLabelText("Buscar prédica").closest("label");

  it("mide un poco más de alto en el celular (h-12) y sigue en h-10 en el computador", () => {
    abrir({ isDesktop: false });
    expect(campo().className).toContain("h-12");
    cleanup();
    abrir({ isDesktop: true });
    expect(campo().className).toContain("h-10");
    expect(campo().className).not.toContain("h-12");
  });
});

describe("los filtros de Mis prédicas (iguales en todos los tamaños)", () => {
  const grupo = () => screen.getByRole("group", { name: "Filtrar" });
  const chips = () => [...grupo().querySelectorAll("button")];

  it("en el celular son cuatro botones en una fila, con ícono y el nombre debajo", () => {
    abrir({ isDesktop: false });
    expect(grupo().className).toContain("grid-cols-4");
    expect(chips().map((c) => c.textContent)).toEqual(["Todas", "Borradores", "Terminadas", "Predicadas"]);
    for (const c of chips()) {
      expect(c.className).toContain("flex-col");
      expect(c.className).toContain("h-11");
      expect(c.querySelector("svg")).not.toBeNull();
    }
  });

  it("el botón elegido queda marcado y filtra; con el mismo color de su estado", () => {
    abrir({ isDesktop: false });
    const terminadas = chips()[2];
    expect(terminadas.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(terminadas);
    expect(terminadas.getAttribute("aria-pressed")).toBe("true");
    expect(chips()[0].getAttribute("aria-pressed")).toBe("false");
  });

  it("en el computador son los mismos cuatro botones con ícono, en una fila", () => {
    abrir({ isDesktop: true });
    expect(grupo().className).toContain("grid-cols-4");
    expect(chips().map((c) => c.textContent)).toEqual(["Todas", "Borradores", "Terminadas", "Predicadas"]);
    for (const c of chips()) {
      expect(c.className).toContain("h-11");
      expect(c.className).toContain("flex-col");
      expect(c.querySelector("svg")).not.toBeNull();
    }
  });
});

describe("celular: «Nueva» a la derecha de «Mis prédicas»", () => {
  it("va en la fila del título, solo en el celular, y abre una vacía que se crea al escribir, con la fecha del próximo domingo", async () => {
    abrir({ isDesktop: false });
    const nueva = document.querySelector("[data-nueva-predica]");
    expect(nueva.textContent).toContain("Nueva");
    expect(document.querySelector("[data-predicar-proxima]")).toBeNull();
    // Misma fila que el texto «Mis prédicas», a su derecha.
    const titulo = screen.getByRole("heading", { name: "Mis prédicas" });
    expect(nueva.parentElement).toBe(titulo.parentElement);
    expect(titulo.compareDocumentPosition(nueva) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    fireEvent.click(nueva);

    // Abre el bosquejo vacío; todavía no hay documento ni punto en la línea de tiempo.
    const campoTitulo = screen.getByLabelText("Título de la prédica");
    expect(campoTitulo.value).toBe("");
    expect(fb.creados).toHaveLength(0);

    fireEvent.change(campoTitulo, { target: { value: "Mi prédica" } });
    await waitFor(() => expect(fb.creados).toHaveLength(1));
    const { ruta, datos } = fb.creados[0];
    expect(ruta).toBe("iglesias/g1/predicas");
    expect(datos).toMatchObject({ titulo: "Mi prédica", estado: "borrador" });
    expect(new Date(`${datos.fecha}T12:00`).getDay()).toBe(0);
  });

  it("si se vuelve sin escribir nada, no se crea ninguna y la lista queda como estaba", () => {
    abrir({ isDesktop: false });
    fireEvent.click(document.querySelector("[data-nueva-predica]"));
    expect(screen.getByLabelText("Título de la prédica")).toBeTruthy();
    fireEvent.click(boton("Volver a mis prédicas"));
    expect(fb.creados).toHaveLength(0);
    expect(screen.queryByLabelText("Título de la prédica")).toBeNull();
    expect(screen.getByText("La fe que se atreve")).toBeTruthy();
    expect(screen.getByText(/prédicas guardadas/).textContent).toContain("2");
  });

  it("en el computador no está este botón (ahí «Pruebas» y «Predicar» van a la derecha)", () => {
    abrir({ isDesktop: true });
    expect(document.querySelector("[data-nueva-predica]")).toBeNull();
    expect(within(screen.getByRole("complementary", { name: "Mis prédicas" })).queryByRole("button", { name: /Predicar/ })).toBeNull();
    expect(document.querySelector("[data-botones-pulpito]")).not.toBeNull();
  });
});

describe("celular: el día del calendario sale en un diálogo", () => {
  const abrirDia = (fecha = "2026-11-21") => {
    abrir({ isDesktop: false });
    fireEvent.click(document.querySelector(`[data-fecha="${fecha}"]`));
    return screen.getByRole("dialog");
  };

  it("es un diálogo modal con el día como título, no un recuadro debajo", () => {
    const dialogo = abrirDia();
    expect(dialogo.getAttribute("aria-modal")).toBe("true");
    expect(within(dialogo).getByRole("heading").textContent).toContain("Sábado 21 de noviembre");
    expect(dialogo.hasAttribute("data-dia-elegido")).toBe(true);
    // Flota sobre un velo que cubre la pantalla.
    expect(dialogo.parentElement.className).toContain("fixed");
    expect(dialogo.parentElement.className).toContain("inset-0");
  });

  it("se cierra con la X, con Escape y tocando fuera; tocar dentro no lo cierra", () => {
    let dialogo = abrirDia();
    fireEvent.click(dialogo);
    expect(screen.queryByRole("dialog")).not.toBeNull();

    fireEvent.click(within(dialogo).getByRole("button", { name: "Cerrar" }));
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(document.querySelector('[data-fecha="2026-11-21"]'));
    expect(screen.queryByRole("dialog")).not.toBeNull();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(document.querySelector('[data-fecha="2026-11-21"]'));
    dialogo = screen.getByRole("dialog");
    fireEvent.click(dialogo.parentElement);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("un día con prédica ofrece Preparar y Predicar en el diálogo", () => {
    fb.docs = [{ ...LA_FE, data: { ...LA_FE.data, fecha: "2026-11-22" } }];
    const dialogo = abrirDia("2026-11-22");
    expect(within(dialogo).getByText("La fe que se atreve")).toBeTruthy();
    expect(within(dialogo).getByRole("button", { name: "Predicar" })).toBeTruthy();
    fireEvent.click(within(dialogo).getByRole("button", { name: "Preparar" }));
    expect(screen.getByLabelText("Título de la prédica").value).toBe("La fe que se atreve");
  });

  it("en el computador no hay diálogo: tocar un día con prédica la abre", () => {
    fb.docs = [{ ...LA_FE, data: { ...LA_FE.data, fecha: "2026-11-22" } }];
    abrir({ isDesktop: true });
    fireEvent.click(document.querySelector('[data-fecha="2026-11-22"]'));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("celular: el calendario compacto", () => {
  const dia = () => document.querySelector("[data-fecha]");
  const calendario = () => screen.getByRole("region", { name: "Calendario de prédicas" });

  it("en el celular los días miden 24 px (h-6) y el calendario lleva menos relleno; en PC, como antes", () => {
    abrir({ isDesktop: false });
    expect(dia().className).toContain("h-6");
    expect(dia().className).not.toContain("h-7");
    expect(calendario().className).toContain("p-1.5");
    cleanup();
    abrir({ isDesktop: true });
    expect(dia().className).toContain("h-7");
    expect(dia().className).not.toContain("h-6");
    expect(calendario().className).toContain("p-2.5");
  });
});

describe("celular: Preparar con todo a mano", () => {
  const alBosquejo = () => {
    abrir({ isDesktop: false });
    fireEvent.click(screen.getByText("La fe que se atreve"));
  };

  it("la barra de arriba: atrás, WhatsApp, Duplicar, Eliminar y Púlpito, sin el nombre de la prédica, del alto de la de abajo", () => {
    alBosquejo();
    const arriba = screen.getByRole("button", { name: "Volver a mis prédicas" }).parentElement;
    expect(arriba.className).toContain("h-11"); // el alto de la barra de abajo (h-9 + py-1)
    expect(arriba.textContent).toBe("Púlpito"); // ni el nombre ni textos sueltos
    expect(arriba.textContent).not.toContain("La fe que se atreve");
    // El orden: atrás, Duplicar, Eliminar, WhatsApp y Púlpito, repartidos en todo el ancho.
    expect(arriba.className).toContain("justify-between");
    expect([...arriba.children].map((el) => el.getAttribute("aria-label") || el.getAttribute("title") || el.textContent)).toEqual([
      "Volver a mis prédicas",
      "Duplicar",
      "Eliminar",
      "Compartir por WhatsApp",
      "Púlpito",
    ]);
    // Sin el menú ⋯: WhatsApp a la vista.
    expect(screen.queryByRole("button", { name: "Más: WhatsApp" })).toBeNull();
    expect(within(arriba).getByTitle("Compartir por WhatsApp")).toBeTruthy();
    // Duplicar y Eliminar pasaron de la barra de abajo a esta.
    expect(within(arriba).getByRole("button", { name: "Duplicar" })).toBeTruthy();
    expect(within(arriba).getByRole("button", { name: "Eliminar" })).toBeTruthy();
    expect(within(arriba).getByRole("button", { name: /Púlpito/ })).toBeTruthy();
    // Íconos de 36 px de alto, como los de abajo.
    for (const b of within(arriba).getAllByRole("button")) expect(b.className).toContain("h-9");
  });

  it("la barra de abajo: seis botones solo con ícono, de 36 px, sin recuadro ni línea divisoria y sin campo de texto", () => {
    alBosquejo();
    const barra = screen.getByRole("group", { name: "Agregar al bosquejo" });
    const nombres = within(barra).getAllByRole("button").map((b) => b.getAttribute("aria-label"));
    expect(nombres).toEqual(["Punto", "Mensaje", "Imagen", "Versículo", "Deshacer", "Rehacer"]);
    for (const b of within(barra).getAllByRole("button")) {
      expect(b.className).toContain("h-9");
      expect(b.classList.contains("border")).toBe(false);
      expect(b.textContent).toBe("");
      expect(b.querySelector("svg")).not.toBeNull();
    }
    expect(barra.querySelector(".w-px")).toBeNull(); // sin línea divisoria
    // El campo de texto de abajo ya no existe: se escribe dentro de cada ítem.
    expect(screen.queryByPlaceholderText(/Juan 3:16/)).toBeNull();
  });

  it("los botones del ítem elegido van apilados en vertical, con su número arriba de la columna; en el computador, en fila", () => {
    alBosquejo();
    fireEvent.click(document.querySelector('[data-pieza="mensaje"] button'));
    const mensaje = document.querySelector('[data-pieza="mensaje"]');
    const columna = within(mensaje).getByRole("button", { name: "Quitar" }).parentElement;
    expect(columna.className).toContain("flex-col");
    expect(columna.firstElementChild.hasAttribute("data-numero")).toBe(true);
    // Un solo número por ítem.
    expect(mensaje.querySelectorAll("[data-numero]")).toHaveLength(1);
    cleanup();
    abrir({ isDesktop: true });
    fireEvent.click(screen.getByText("La fe que se atreve"));
    fireEvent.click(document.querySelector('[data-pieza="mensaje"] button'));
    const fila = within(document.querySelector('[data-pieza="mensaje"]')).getByRole("button", { name: "Quitar" }).parentElement;
    expect(fila.className).not.toContain("flex-col");
  });

  it("recuadro de arriba: el chip del estado va a la derecha, al nivel del nombre, más pequeño, sin ícono y sin ancho fijo", () => {
    fb.docs = [LA_FE, { id: "lista", data: { ...LA_FE.data, titulo: "Ya preparada", estado: "predicada" } }];
    abrir({ isDesktop: false });
    fireEvent.click(screen.getByText("Ya preparada"));
    const chip = document.querySelector("[data-estado-predica]");
    expect(chip.textContent).toBe("Predicada"); // el estado más largo
    expect(chip.querySelector("svg")).toBeNull(); // sin el ✓ en el celular
    expect(chip.className).toContain("h-6");
    expect(chip.className).toContain("text-pie");
    expect(chip.className).toContain("shrink-0");
    expect(chip.className).not.toMatch(/(^|\s)w-\d/); // sin ancho fijo: cabe cualquier texto
    // Misma fila que el nombre, el chip a su derecha.
    const titulo = screen.getByLabelText("Título de la prédica");
    const filaTitulo = document.querySelector("[data-fila-titulo]");
    expect(filaTitulo.contains(titulo)).toBe(true);
    expect(filaTitulo.lastElementChild).toBe(chip);
    cleanup();
    // En el computador conserva su ✓.
    fb.docs = [LA_FE, { id: "lista", data: { ...LA_FE.data, titulo: "Ya preparada", estado: "predicada" } }];
    abrir({ isDesktop: true });
    fireEvent.click(screen.getByText("Ya preparada"));
    expect(document.querySelector("[data-estado-predica]").querySelector("svg")).not.toBeNull();
  });

  it("recuadro de arriba: nombre de lado a lado y, después, la fecha │ serie y versículo uno encima del otro, cada uno con su lápiz", () => {
    alBosquejo();
    const titulo = screen.getByLabelText("Título de la prédica");
    // El nombre ocupa todo el ancho que deja el lápiz y el chip, en su misma fila.
    expect(titulo.className).toContain("w-full");
    // Sin ancho propio (size 1): mide lo que su texto, para que el lápiz quede pegado.
    expect(titulo.getAttribute("size")).toBe("1");
    // El nombre mide 22 px de alto: 2 px menos que el chip de al lado (24 px).
    expect(titulo.className).toContain("h-5.5");
    expect(document.querySelector("[data-estado-predica]").className).toContain("h-6");
    const filaTitulo = titulo.closest("[data-fila-titulo]");
    expect(within(filaTitulo).getByRole("button", { name: "Editar el nombre" })).toBeTruthy();
    // Después: la fecha y, a su derecha, la serie y el versículo base.
    const fila = filaTitulo.nextElementSibling;
    expect(fila.hasAttribute("data-fila-fecha")).toBe(true);
    expect(fila.firstElementChild.querySelector("[data-hoja-fecha]")).not.toBeNull();
    // Ya no hay botón de editar general.
    expect(document.querySelector("[data-editar-datos]")).toBeNull();
    // La fecha se puede tocar siempre (sin botón de editar).
    expect(fila.querySelector("[data-hoja-fecha]").className).toContain("cursor-pointer");
    // Serie y versículo base: uno encima del otro, sin el punto «·», cada uno con su lápiz al final.
    const lapizSerie = fila.querySelector('[data-editar-campo="serie"]');
    const lapizBase = fila.querySelector('[data-editar-campo="base"]');
    expect(lapizSerie).not.toBeNull();
    expect(lapizBase).not.toBeNull();
    expect(lapizSerie.parentElement.parentElement).toBe(lapizBase.parentElement.parentElement);
    expect(lapizSerie.parentElement.parentElement.className).toContain("flex-col");
    expect(lapizSerie.parentElement.lastElementChild).toBe(lapizSerie);
    // El lápiz va justo después del texto (no pegado al borde): el texto no se estira.
    for (const lapiz of [lapizSerie, lapizBase]) expect(lapiz.previousElementSibling.className).not.toContain("flex-1");
    const lapizNombre = filaTitulo.querySelector('[data-editar-campo="titulo"]');
    expect(lapizNombre.previousElementSibling.contains(titulo)).toBe(true);
    expect(lapizNombre.previousElementSibling.className).not.toContain("flex-1");
    expect([...fila.querySelectorAll("span")].some((s) => s.textContent === "·")).toBe(false);
    expect(fila.textContent).toContain("Serie · Héroes de la fe");
    expect(fila.querySelector("[data-texto-base]").textContent).toBe("Hebreos 11:1");
    // El resumen cierra el recuadro.
    expect(fila.nextElementSibling.textContent).toMatch(/punto/i);
    // Misma letra que el texto de los ítems.
    expect(titulo.className).toContain("text-sm");
    expect(titulo.className).not.toMatch(/text-(lg|xl|2xl|3xl)/);
    expect(document.querySelector('[data-pieza="mensaje"] button > span:last-child').className).toContain("text-sm");
    cleanup();
    // En el computador, dentro del bloque del centro y grande, como siempre.
    abrir({ isDesktop: true });
    fireEvent.click(screen.getByText("La fe que se atreve"));
    const tituloAncho = screen.getByLabelText("Título de la prédica");
    expect(tituloAncho.className).toContain("text-3xl");
    expect(tituloAncho.parentElement.textContent).toMatch(/punto/i); // el resumen está en el mismo bloque
  });

  it("en una prédica nueva, la serie y el versículo base vacíos lo dicen, para que su lápiz tenga dónde estar", () => {
    abrir({ isDesktop: false });
    fireEvent.click(document.querySelector("[data-nueva-predica]"));
    const fila = document.querySelector("[data-fila-fecha]");
    expect(fila.textContent).toContain("Sin serie");
    expect(fila.textContent).toContain("Sin versículo base");
    // Una nueva arranca editando el nombre.
    expect(screen.getByLabelText("Título de la prédica").readOnly).toBe(false);
  });

  it("cada lápiz edita solo su texto: el nombre, la serie y el versículo base", async () => {
    alBosquejo();
    const titulo = screen.getByLabelText("Título de la prédica");
    expect(titulo.readOnly).toBe(true);
    // El nombre.
    fireEvent.click(document.querySelector('[data-editar-campo="titulo"]'));
    await waitFor(() => expect(titulo.readOnly).toBe(false));
    expect(titulo.className).toContain("border-dashed");
    expect(screen.queryByLabelText("Serie")).toBeNull(); // los otros siguen quietos
    fireEvent.keyDown(titulo, { key: "Enter" });
    expect(titulo.readOnly).toBe(true);
    // La serie.
    fireEvent.click(document.querySelector('[data-editar-campo="serie"]'));
    const serie = screen.getByLabelText("Serie");
    expect(titulo.readOnly).toBe(true);
    expect(screen.queryByLabelText("Versículo base")).toBeNull();
    fireEvent.change(serie, { target: { value: "Héroes" } });
    fireEvent.keyDown(serie, { key: "Enter" });
    fireEvent.blur(serie);
    expect(screen.queryByLabelText("Serie")).toBeNull();
    // El versículo base: se reconoce al salir.
    fireEvent.click(document.querySelector('[data-editar-campo="base"]'));
    const base = screen.getByLabelText("Versículo base");
    fireEvent.change(base, { target: { value: "juan 3 16" } });
    fireEvent.blur(base);
    expect(screen.queryByLabelText("Versículo base")).toBeNull();
    expect(document.querySelector("[data-texto-base]").textContent).toBe("Juan 3:16");
    await waitFor(() => expect(fb.guardados.at(-1)?.datos).toMatchObject({ serie: "Héroes", base: "Juan 3:16" }), { timeout: 3000 });
  });

  it("las reglas del tapete son más angostas en el celular (arriba h-4, lateral w-5); en el computador, como siempre", () => {
    alBosquejo();
    const arriba = () => document.querySelector('[data-regla="arriba"]');
    const izquierda = () => document.querySelector('[data-regla="izquierda"]');
    expect(arriba().className).toContain("h-4");
    expect(izquierda().className).toContain("w-5");
    // La esquina de la regla de arriba mide lo mismo que la lateral.
    expect(arriba().firstElementChild.className).toContain("w-5");
    cleanup();
    abrir({ isDesktop: true });
    fireEvent.click(screen.getByText("La fe que se atreve"));
    expect(arriba().className).toContain("h-5");
    expect(izquierda().className).toContain("w-6");
    expect(arriba().firstElementChild.className).toContain("w-6");
  });

  it("los textos de los ítems van al mismo tamaño en el celular (text-sm); el punto solo se distingue por la negrita", () => {
    alBosquejo();
    const punto = document.querySelector('[data-pieza="titulo"]');
    const textoPunto = punto.querySelector("b");
    const numeroPunto = punto.querySelector("button > span");
    const textoMensaje = document.querySelector('[data-pieza="mensaje"] button > span:last-child');
    const textoVersiculo = document.querySelector('[data-pieza="versiculo"] button > span:last-child > span:last-child');
    for (const el of [textoPunto, numeroPunto, textoMensaje, textoVersiculo]) {
      expect(el.className).toContain("text-sm");
      expect(el.className).not.toMatch(/text-(lg|xl)/);
    }
    expect(textoPunto.className).toContain("leading-snug");
    cleanup();
    // En el computador, el punto sigue más grande.
    abrir({ isDesktop: true });
    fireEvent.click(screen.getByText("La fe que se atreve"));
    const puntoAncho = document.querySelector('[data-pieza="titulo"]');
    expect(puntoAncho.querySelector("b").className).toContain("text-lg");
    expect(puntoAncho.querySelector("button > span").className).toContain("text-xl");
  });

  it("Punto: la primera vez pregunta la numeración, crea el punto al escoger y después crea sin preguntar", async () => {
    // Firestore avisa de la nueva antes de que addDoc termine; el falso solo si se le dice.
    fb.docs = [LA_FE, ANTIGUA, { id: "nueva", data: { titulo: "Nueva prédica", fecha: "", serie: "", estado: "borrador", piezas: [] } }];
    abrir({ isDesktop: false });
    fireEvent.click(document.querySelector("[data-nueva-predica]"));
    fireEvent.click(boton("Punto"));
    const hoja = screen.getByRole("dialog", { name: "Numeración de los puntos" });
    expect(fb.creados).toHaveLength(0);
    fireEvent.click(within(hoja).getAllByRole("menuitemradio")[0]);
    expect(screen.queryByRole("dialog", { name: "Numeración de los puntos" })).toBeNull();
    // El punto nace en blanco, listo para escribir adentro.
    fireEvent.change(screen.getByPlaceholderText("Escribe el punto…"), { target: { value: "La fe" } });
    fireEvent.click(boton("Guardar"));
    await waitFor(() => expect(fb.creados).toHaveLength(1));
    // Elegida la numeración, otro toque crea otro punto sin preguntar.
    fireEvent.click(boton("Punto"));
    expect(screen.queryByRole("dialog", { name: "Numeración de los puntos" })).toBeNull();
    expect(screen.getByPlaceholderText("Escribe el punto…")).toBeTruthy();
  });

  it("Punto en una prédica que ya tiene puntos crea directo, sin preguntar", () => {
    alBosquejo();
    fireEvent.click(boton("Punto"));
    expect(screen.queryByRole("dialog", { name: "Numeración de los puntos" })).toBeNull();
    expect(screen.getByPlaceholderText("Escribe el punto…")).toBeTruthy();
  });

  it("Mensaje: el texto se escribe dentro del ítem; Enter es salto de línea y ✓ lo guarda", async () => {
    alBosquejo();
    fireEvent.click(boton("Mensaje"));
    const campo = screen.getByPlaceholderText("Escribe el mensaje…");
    fireEvent.change(campo, { target: { value: "Dios es fiel" } });
    fireEvent.keyDown(campo, { key: "Enter" });
    expect(screen.getByPlaceholderText("Escribe el mensaje…")).toBeTruthy(); // sigue escribiendo
    const guardar = boton("Guardar");
    expect(guardar.textContent).toBe("");
    fireEvent.click(guardar);
    expect(screen.queryByPlaceholderText("Escribe el mensaje…")).toBeNull();
    expect(screen.getByText("Dios es fiel")).toBeTruthy();
    await waitFor(() => expect(fb.guardados.at(-1)?.datos.piezas.at(-1)).toMatchObject({ tipo: "mensaje", contenido: "Dios es fiel" }), { timeout: 3000 });
  });

  it("Imagen crea el recuadro con «Subir imagen» y «Mis imágenes» adentro, solo con ícono en el celular", () => {
    alBosquejo();
    fireEvent.click(boton("Imagen"));
    const recuadro = document.querySelector("[data-sin-foto]");
    expect(recuadro).not.toBeNull();
    for (const nombre of ["Subir imagen", "Mis imágenes"]) {
      const b = within(recuadro).getByRole("button", { name: nombre });
      expect(b.textContent).toBe("");
      expect(b.querySelector("svg")).not.toBeNull();
      expect(b.getAttribute("title")).toBe(nombre);
    }
    cleanup();
    // En el computador, con su texto.
    abrir({ isDesktop: true });
    fireEvent.click(screen.getByText("La fe que se atreve"));
    fireEvent.click(boton("Imagen"));
    const ancho = document.querySelector("[data-sin-foto]");
    expect(within(ancho).getByRole("button", { name: "Subir imagen" }).textContent).toBe("Subir imagen");
    expect(within(ancho).getByRole("button", { name: "Mis imágenes" }).textContent).toBe("Mis imágenes");
  });

  it("Duplicar crea una copia y Eliminar borra la prédica abierta", async () => {
    alBosquejo();
    fireEvent.click(boton("Duplicar"));
    await waitFor(() => expect(fb.creados).toHaveLength(1));
    expect(fb.creados[0].datos.titulo).toContain("(copia)");
    cleanup();
    alBosquejo();
    fireEvent.click(boton("Eliminar"));
    await waitFor(() => expect(fb.borrados).toHaveLength(1));
    expect(fb.borrados[0]).toContain("fe");
  });

  it("ya no hay «Ver en la mini pantalla»: la pantalla de muestra se quitó de Preparar", () => {
    alBosquejo();
    fireEvent.click(document.querySelector('[data-pieza="titulo"] button'));
    expect(screen.queryByRole("button", { name: "Ver en la mini pantalla" })).toBeNull();
    expect(document.querySelector("[data-pantalla-previa]")).toBeNull();
  });

  it("abajo, Versículo abre el buscador (como antes) y agrega al final", async () => {
    alBosquejo();
    fireEvent.click(document.querySelector("[data-abrir-versiculos]"));
    const hoja = screen.getByRole("dialog", { name: "Versículos" });
    // A pantalla completa: ocupa todo el alto y no es una hoja a medias.
    expect(hoja.className).toContain("h-full");
    expect(hoja.className).not.toContain("rounded-t-3xl");
    expect(hoja.className).not.toContain("max-h-4/5");
    expect(hoja.parentElement.className).toContain("inset-0");
    // Dos grupos que se reparten la fila: Antiguo | Nuevo y RVR1960 | DHH.
    const biblia = within(hoja).getByRole("group", { name: "Biblia" });
    const testamento = within(hoja).getByRole("group", { name: "Testamento" });
    expect(biblia.parentElement).toBe(testamento.parentElement);
    expect(biblia.className).toContain("flex-1");
    expect(testamento.className).toContain("flex-1");
    expect(within(biblia).getByRole("button", { name: "RVR1960", pressed: true })).toBeTruthy();
    expect(within(biblia).getByRole("button", { name: "DHH", pressed: false })).toBeTruthy();
    fireEvent.change(within(hoja).getByLabelText("Buscar versículo"), { target: { value: "Juan 3 16" } });
    fireEvent.click(await within(hoja).findByRole("button", { name: "Agregar Juan 3:16" }));
    expect(screen.queryByRole("dialog", { name: "Versículos" })).toBeNull();
    await waitFor(() => expect(fb.guardados.at(-1)?.datos.piezas.at(-1)).toMatchObject({ tipo: "versiculo", contenido: { cita: "Juan 3:16" } }), { timeout: 3000 });
  });
});

describe("tableta (iPad mini de pie)", () => {
  const tableta = () => abrir({ isDesktop: false, app: { formatoPantalla: "tableta" } });

  it("arranca con el bosquejo vacío a todo el ancho; Mis prédicas en un cajón; los versículos en un panel", () => {
    tableta();
    expect(screen.getByLabelText("Título de la prédica").value).toBe("");
    expect(screen.queryByRole("complementary", { name: "Mis prédicas" })).toBeNull();
    fireEvent.click(document.querySelector("[data-abrir-cajon]"));
    const cajon = screen.getByRole("complementary", { name: "Mis prédicas" });
    fireEvent.click(within(cajon).getByText("La fe que se atreve"));
    expect(screen.queryByRole("complementary", { name: "Mis prédicas" })).toBeNull();
    expect(screen.getByLabelText("Título de la prédica").value).toBe("La fe que se atreve");
    fireEvent.click(document.querySelector("[data-abrir-versiculos]"));
    const panel = screen.getByRole("complementary", { name: "Versículos" });
    expect(within(panel).getByLabelText("Buscar versículo")).toBeTruthy();
    expect(within(panel).queryByRole("figure")).toBeNull(); // sin pantalla de muestra
    // La barra de abajo completa, como en el computador.
    expect(screen.getByRole("group", { name: "Agregar al bosquejo" })).toBeTruthy();
    expect(screen.getByRole("group", { name: "Cambios" })).toBeTruthy();
  });

  it("Predicar: la mini pantalla grande, el bosquejo y al lado el versículo y Terminar; el muelle abajo", () => {
    tableta();
    fireEvent.click(document.querySelector("[data-abrir-cajon]"));
    fireEvent.click(within(screen.getByRole("complementary", { name: "Mis prédicas" })).getByText("La fe que se atreve"));
    irAPredicar();
    expect(screen.getByRole("complementary", { name: "Bosquejo" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Versículo espontáneo" })).toBeTruthy();
    expect(document.querySelector("[data-terminar-predicada]")).not.toBeNull();
    expect(within(document.querySelector("[data-muelle]")).getByRole("button", { name: /Empezar/ })).toBeTruthy();
    expect(document.querySelector("[data-franja-turno]")).not.toBeNull();
  });
});

describe("computador con pantalla baja (1280×720)", () => {
  const bajo = () => abrir({ app: { pantallaBaja: true } });

  it("Mis prédicas no se pliega: está siempre a la vista y sin botón de plegar", () => {
    bajo();
    const lista = screen.getByRole("complementary", { name: "Mis prédicas" });
    expect(document.querySelector("[data-mis-plegada]")).toBeNull();
    expect(within(lista).getByText("La fe que se atreve")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Plegar Mis prédicas" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Abrir Mis prédicas" })).toBeNull();
  });

  it("la cuadrícula de libros arranca plegada tras «Buscar por libro»", () => {
    bajo();
    const derecha = screen.getByRole("complementary", { name: "Púlpito y versículos" });
    expect(derecha.querySelector("[data-cuadricula-biblia]")).toBeNull();
    fireEvent.click(derecha.querySelector("[data-plegar-libros]"));
    expect(derecha.querySelector("[data-cuadricula-biblia]")).not.toBeNull();
  });

  it("al predicar, Luego y el resumen van al lado de la mini pantalla para que todo quepa", () => {
    bajo();
    fireEvent.click(screen.getByText("La fe que se atreve"));
    irAPredicar();
    fireEvent.click(boton(/Empezar$/));
    const escenario = document.querySelector("[data-escenario-bajo]");
    expect(escenario.querySelector("[data-pantalla-previa]")).not.toBeNull();
    expect(escenario.textContent).toContain("Luego");
  });

  it("con pantalla alta, la cuadrícula de libros no se pliega", () => {
    abrir();
    expect(document.querySelector("[data-plegar-libros]")).toBeNull();
  });
});

describe("Predicar: el estado de la pantalla del templo", () => {
  const predicar = (opciones) => {
    abrir(opciones);
    fireEvent.click(screen.getByText("La fe que se atreve"));
    irAPredicar();
  };
  const mini = () => screen.getByRole("figure", { name: "En el templo ahora" });

  it("no hay etiqueta con el estado bajo el nombre, en ningún estado ni tamaño", () => {
    for (const isDesktop of [false, true]) {
      for (const pantallaTemplo of ["apagada", "oculta", "encendida"]) {
        predicar({ isDesktop, app: { pantallaTemplo } });
        expect(document.querySelector("[data-etiqueta-aire]"), pantallaTemplo).toBeNull();
        expect(document.querySelector("[data-punto-vivo]"), pantallaTemplo).toBeNull();
        expect(screen.queryByText(/Pantalla apagada ·|Pantalla oculta ·|En el templo ahora ·/), pantallaTemplo).toBeNull();
        cleanup();
      }
    }
  });

  it("celular: el contador de ítems va pequeño al lado del nombre", () => {
    predicar({ isDesktop: false, app: { pantallaTemplo: "encendida" } });
    const contador = document.querySelector("[data-contador-items]");
    expect(contador.previousElementSibling.textContent).toBe("La fe que se atreve");
    expect(contador.className).toContain("text-pie");
    expect(contador.className).toContain("text-app-muted");
  });

  it("el contador pasa de «N ítems» a «1 de N» al empezar a predicar", () => {
    predicar({ isDesktop: false, app: { pantallaTemplo: "encendida" } });
    const antes = document.querySelector("[data-contador-items]").textContent;
    expect(antes).toMatch(/ítem/);
    fireEvent.click(boton(/Empezar$/));
    fireEvent.click(boton(/Siguiente/));
    expect(document.querySelector("[data-contador-items]").textContent).toMatch(/^1 de \d+$/);
  });

  it("celular, pantalla apagada: la mini pantalla se apaga y lo dice", () => {
    predicar({ isDesktop: false, app: { pantallaTemplo: "apagada" } });
    expect(mini().dataset.estado).toBe("apagada");
    expect(mini().querySelector("[data-aviso-oculta]").textContent).toBe("Pantalla apagada");
  });

  it("celular, pantalla oculta: lo dice, en rojo", () => {
    predicar({ isDesktop: false, app: { pantallaTemplo: "oculta" } });
    expect(mini().querySelector("[data-aviso-oculta]").textContent).toBe("Pantalla oculta");
    expect(mini().querySelector("[data-aviso-oculta]").className).toContain("text-app-error");
  });

  it("computador: el marco toma el estado de la pantalla (ventana, maximizada, completa)", () => {
    for (const estado of ["ventana", "maximizada", "encendida"]) {
      abrir({ app: { pantallaTemplo: estado } });
      fireEvent.click(screen.getByText("La fe que se atreve"));
      irAPredicar();
      expect(mini().dataset.estado).toBe(estado);
      expect(mini().querySelector("[data-aviso-oculta]")).toBeNull();
      cleanup();
    }
  });
});

describe("Predicar (celular): ocultar la pantalla y los botones (a prueba)", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  const predicar = (opciones = {}) => {
    const resultado = abrir({ isDesktop: false, ...opciones });
    fireEvent.click(screen.getByText("La fe que se atreve"));
    irAPredicar();
    return resultado;
  };
  const pantalla = () => screen.queryByRole("figure", { name: "En el templo ahora" });
  const botones = () => document.querySelector('[role="group"][aria-label="Qué se ve en el templo"]');

  it("a la derecha del nombre hay dos interruptores, y todo se ve de entrada", () => {
    predicar();
    expect(screen.getByRole("button", { name: "Ocultar la pantalla" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Ocultar los botones" })).toBeTruthy();
    expect(pantalla()).not.toBeNull();
    expect(botones()).not.toBeNull();
    const contador = document.querySelector("[data-contador-items]");
    expect(contador.parentElement.nextElementSibling.getAttribute("aria-label")).toBe("Qué mostrar en esta vista");
  });

  it("uno oculta la mini pantalla (los botones se quedan) y el otro los botones (el bosquejo se queda)", () => {
    predicar();
    fireEvent.click(screen.getByRole("button", { name: "Ocultar la pantalla" }));
    expect(pantalla()).toBeNull();
    expect(botones()).not.toBeNull();
    const volver = screen.getByRole("button", { name: "Mostrar la pantalla" });
    expect(volver.getAttribute("aria-pressed")).toBe("true");
    expect(volver.className).toContain("text-app-main");
    fireEvent.click(screen.getByRole("button", { name: "Ocultar los botones" }));
    expect(botones()).toBeNull();
    expect(document.querySelector("[data-bosquejo-vivo]")).not.toBeNull();
    expect(document.querySelector("[data-muelle]")).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Mostrar la pantalla" }));
    fireEvent.click(screen.getByRole("button", { name: "Mostrar los botones" }));
    expect(pantalla()).not.toBeNull();
    expect(botones()).not.toBeNull();
  });

  it("se acuerdan en este dispositivo, con claves propias de Predicar", () => {
    const primera = predicar();
    fireEvent.click(screen.getByRole("button", { name: "Ocultar la pantalla" }));
    fireEvent.click(screen.getByRole("button", { name: "Ocultar los botones" }));
    expect(localStorage.getItem("voxdei.predica.sinPantalla")).toBe("1");
    expect(localStorage.getItem("voxdei.predica.sinBotones")).toBe("1");
    expect(localStorage.getItem("voxdei.biblia.sinPantalla")).toBeNull();
    primera.unmount();
    predicar();
    expect(pantalla()).toBeNull();
    expect(botones()).toBeNull();
  });

  it("con todo oculto se sigue predicando: Siguiente proyecta", async () => {
    localStorage.setItem("voxdei.predica.sinPantalla", "1");
    localStorage.setItem("voxdei.predica.sinBotones", "1");
    predicar();
    fireEvent.click(boton(/Empezar$/));
    await waitFor(() => expect(fb.proyectado.length).toBeGreaterThan(0));
  });

  it("el diálogo «Puntos» se abre aunque la mini pantalla esté oculta", () => {
    localStorage.setItem("voxdei.predica.sinPantalla", "1");
    predicar();
    fireEvent.click(boton("Puntos"));
    expect(document.querySelector("[data-resumen-vivo]")).not.toBeNull();
  });

  it("el computador no lleva estos interruptores", () => {
    abrir({});
    fireEvent.click(screen.getByText("La fe que se atreve"));
    irAPredicar();
    expect(screen.queryByRole("button", { name: "Ocultar la pantalla" })).toBeNull();
  });

  it("celular: el bosquejo y el área se desplazan sin barra visible", () => {
    predicar();
    expect(document.querySelector("[data-bosquejo-vivo]").className).toContain("scrollbar-oculta");
    expect(document.querySelector("[data-bosquejo-vivo]").className).not.toContain("scrollbar-custom");
    expect(document.querySelector("[data-muelle]").previousElementSibling.querySelector(".overflow-y-auto").className).toContain("scrollbar-oculta");
  });
});

describe("Pruebas: el púlpito en ensayo, sin proyectar", () => {
  it("en el computador, «Pruebas» abre el púlpito con el aviso, sin turno ni «Terminar»", () => {
    abrir();
    fireEvent.click(screen.getByText("La fe que se atreve"));
    irAProbar();
    expect(document.querySelector("[data-modo-prueba]").textContent).toContain("no se envía nada al templo");
    expect(document.querySelector("[data-franja-turno]")).toBeNull();
    expect(document.querySelector("[data-terminar-predicada]")).toBeNull();
    expect(document.querySelector("[data-reloj]").textContent).toContain("probando");
    expect(boton("Volver a preparar")).toBeTruthy();
  });

  it("no manda NADA al templo: ni la portada, ni los ítems, ni los interruptores", () => {
    abrir();
    fireEvent.click(screen.getByText("La fe que se atreve"));
    irAProbar();
    fb.proyectado = [];
    fireEvent.click(boton(/Empezar$/));
    fireEvent.click(boton("Siguiente"));
    fireEvent.click(boton("Siguiente"));
    fireEvent.click(boton("Ocultar"));
    expect(fb.proyectado).toEqual([]);
    // Pero sí se ve en la mini pantalla de la prueba
    expect(screen.getByRole("figure", { name: "En el templo ahora" }).textContent).not.toContain("Toca un ítem");
  });

  it("en cambio, «Predicar» sí manda al templo", () => {
    abrir();
    fireEvent.click(screen.getByText("La fe que se atreve"));
    irAPredicar();
    fb.proyectado = [];
    fireEvent.click(boton(/Empezar$/));
    expect(fb.proyectado.length).toBeGreaterThan(0);
    expect(document.querySelector("[data-modo-prueba]")).toBeNull();
    expect(document.querySelector("[data-terminar-predicada]")).not.toBeNull();
  });

  it("en la prueba lo que se ve vive en el púlpito: el título sube solo al pasar al primer ítem y «Ocultar» lo apaga, sin tocar el contexto de la app", () => {
    const { app } = abrir({ app: { visibleTitulo: false, visibleTexto: true } });
    fireEvent.click(screen.getByText("La fe que se atreve"));
    irAProbar();
    fireEvent.click(boton(/Empezar$/));
    fireEvent.click(boton("Siguiente"));
    // El nombre de la prédica sube a la franja de título de la mini pantalla
    expect(document.querySelector("[data-mini-titulo]")?.textContent).toBe("La fe que se atreve");
    fireEvent.click(boton("Ocultar"));
    expect(document.querySelector("[data-mini-titulo]")).toBeNull();
    expect(app.setVisibleTitulo).not.toHaveBeenCalled();
    expect(app.setVisibleTexto).not.toHaveBeenCalled();
  });

  it("la mini pantalla de la prueba no refleja el estado real de la pantalla del templo", () => {
    abrir({ app: { pantallaTemplo: "apagada" } });
    fireEvent.click(screen.getByText("La fe que se atreve"));
    irAProbar();
    expect(screen.getByRole("figure", { name: "En el templo ahora" }).getAttribute("data-estado")).toBe("encendida");
    expect(document.querySelector("[data-aviso-oculta]")).toBeNull();
  });

  it("«Volver a preparar» regresa al bosquejo", () => {
    abrir();
    fireEvent.click(screen.getByText("La fe que se atreve"));
    irAProbar();
    fireEvent.click(boton("Volver a preparar"));
    expect(document.querySelector("[data-modo-prueba]")).toBeNull();
    expect(screen.getByLabelText("Título de la prédica")).toBeTruthy();
  });

  it("sin nada que pasar, «Pruebas» avisa en vez de abrir un púlpito vacío", () => {
    abrir();
    fireEvent.click(document.querySelector("[data-ir-pruebas]"));
    expect(document.querySelector("[data-modo-prueba]")).toBeNull();
  });

  it("en el celular, «Púlpito» abre un menú con Pruebas y Predicar, y Pruebas entra en ensayo", () => {
    abrir({ isDesktop: false });
    fireEvent.click(screen.getByText("La fe que se atreve"));
    expect(screen.queryByRole("button", { name: "Predicar" })).toBeNull();
    fireEvent.click(document.querySelector("[data-menu-pulpito]"));
    const menu = screen.getByRole("menu", { name: "Púlpito" });
    expect([...menu.querySelectorAll('[role="menuitem"]')].map((o) => o.querySelector("b").textContent)).toEqual(["Pruebas", "Predicar"]);
    fireEvent.click(within(menu).getByRole("menuitem", { name: /Pruebas/ }));
    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.querySelector("[data-modo-prueba]")).not.toBeNull();
    fb.proyectado = [];
    fireEvent.click(boton(/Empezar$/));
    expect(fb.proyectado).toEqual([]);
  });

  it("el menú se cierra con Escape y tocando fuera, sin elegir nada", () => {
    abrir({ isDesktop: false });
    fireEvent.click(screen.getByText("La fe que se atreve"));
    fireEvent.click(document.querySelector("[data-menu-pulpito]"));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
    fireEvent.click(document.querySelector("[data-menu-pulpito]"));
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.querySelector("[data-modo-prueba]")).toBeNull();
  });

  it("en la tableta también es el menú «Púlpito»", () => {
    abrir({ isDesktop: false, app: { formatoPantalla: "tableta" } });
    fireEvent.click(document.querySelector("[data-abrir-cajon]"));
    fireEvent.click(within(screen.getByRole("complementary", { name: "Mis prédicas" })).getByText("La fe que se atreve"));
    expect(screen.queryByRole("button", { name: "Predicar" })).toBeNull();
    irAProbar();
    expect(document.querySelector("[data-modo-prueba]")).not.toBeNull();
  });
});

describe("Semáforo de cabida: qué ítems no caben en la pantalla del templo", () => {
  const fila = (id) => document.querySelector(`[data-id="${id}"]`);

  it("mide cada ítem con texto, tal como se proyecta, con el nombre de la prédica en la franja de título", () => {
    abrir();
    fireEvent.click(screen.getByText("La fe que se atreve"));
    expect(medidor.ultimo.titulo).toBe("La fe que se atreve");
    expect(medidor.ultimo.elementos).toEqual([
      { id: "p1", centro: { tipo: "versiculo", contenido: { cita: "Hebreos 11:1", texto: "Es, pues, la fe la certeza…", titulo: "", version: "RVR1960" } } },
      { id: "p2", centro: { tipo: "mensaje", contenido: "I. La fe ve lo invisible" } }, // el punto, con su número
      { id: "p3", centro: { tipo: "mensaje", contenido: "La fe no es adivinar el futuro." } },
    ]);
  });

  it("un ítem que no cabe lleva un aviso rojo y uno que va justo, uno amarillo; el que cabe no lleva nada", () => {
    medidor.decidir = () => ({ p1: "no-cabe", p2: "justo", p3: "bien" });
    abrir();
    fireEvent.click(screen.getByText("La fe que se atreve"));
    const rojo = fila("p1").querySelector("[data-cabida]");
    expect(rojo.getAttribute("data-cabida")).toBe("no-cabe");
    expect(rojo.getAttribute("aria-label")).toBe("No cabe en la pantalla del templo: se cortaría");
    expect(rojo.className).toContain("text-app-error");
    const amarillo = fila("p2").querySelector("[data-cabida]");
    expect(amarillo.getAttribute("data-cabida")).toBe("justo");
    expect(amarillo.getAttribute("aria-label")).toBe("Va muy justo en la pantalla del templo");
    expect(amarillo.className).toContain("text-app-main");
    expect(fila("p3").querySelector("[data-cabida]")).toBeNull();
  });

  it("sin avisos del medidor, ningún ítem lleva marca", () => {
    abrir();
    fireEvent.click(screen.getByText("La fe que se atreve"));
    expect(document.querySelector("[data-cabida]")).toBeNull();
  });

  it("también se ve en el celular, con el ítem sin elegir", () => {
    medidor.decidir = () => ({ p3: "no-cabe" });
    abrir({ isDesktop: false });
    fireEvent.click(screen.getByText("La fe que se atreve"));
    expect(fila("p3").querySelector('[data-cabida="no-cabe"]')).not.toBeNull();
  });

  it("al agregar un ítem se vuelve a medir con él", async () => {
    abrir();
    fireEvent.click(screen.getByText("La fe que se atreve"));
    expect(medidor.ultimo.elementos).toHaveLength(3);
    fireEvent.click(boton("Mensaje"));
    fireEvent.change(document.querySelector("textarea"), { target: { value: "Un mensaje nuevo" } });
    fireEvent.blur(document.querySelector("textarea"));
    await waitFor(() => expect(medidor.ultimo.elementos).toHaveLength(4));
    expect(medidor.ultimo.elementos.at(-1).centro.contenido).toBe("Un mensaje nuevo");
  });

  it("una imagen no se mide: ocupa todo el centro y no lleva texto", () => {
    fb.docs = [
      {
        id: "con-imagen",
        data: { titulo: "Con foto", fecha: "2099-11-15", estado: "borrador", piezas: [{ id: "i1", tipo: "imagen", contenido: { url: "https://img/a.jpg", nombre: "a" } }, { id: "m1", tipo: "mensaje", contenido: "Hola" }] },
      },
    ];
    abrir();
    fireEvent.click(screen.getByText("Con foto"));
    expect(medidor.ultimo.elementos.map((e) => e.id)).toEqual(["m1"]);
  });
});
