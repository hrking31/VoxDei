import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";

// Firebase de mentira: las prédicas llegan por onSnapshot; lo que se guarda,
// crea y proyecta queda anotado.
const fb = vi.hoisted(() => ({
  docs: [],
  guardados: [],
  creados: [],
  borrados: [],
  proyectado: [],
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
  const app = {
    ...extra,
    isDesktop,
    versionBiblia,
    setVersionBiblia: vi.fn(),
    visibleTitulo: false,
    setVisibleTitulo: vi.fn(),
    visibleTexto: true,
    setVisibleTexto: vi.fn(),
    visibleTicker: false,
    setVisibleTicker: vi.fn(),
  };
  return montar(<ControlPredica />, { ruta: "/ViewPredica", auth: pastor, app });
}

beforeEach(() => {
  fb.docs = [LA_FE, ANTIGUA];
  fb.guardados = [];
  fb.creados = [];
  fb.borrados = [];
  fb.proyectado = [];
});
afterEach(() => vi.clearAllMocks());

const boton = (nombre) => screen.getByRole("button", { name: nombre });

describe("Mis prédicas", () => {
  it("lista todas, también las de los slots de antes, y cuenta sin límite", () => {
    abrir();
    expect(screen.getByText("La fe que se atreve")).toBeTruthy();
    expect(screen.getByText("Prédica guardada 2")).toBeTruthy();
    expect(screen.getByText(/prédicas guardadas/).textContent).toContain("2");
    expect(screen.getByText("Sin límite")).toBeTruthy();
  });

  it("«Nueva» crea una prédica con la fecha del próximo domingo", async () => {
    abrir();
    fireEvent.click(boton("Nueva"));
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
    const color = (titulo, etiqueta, clase) => {
      expect(fila(titulo).closest("li").querySelector("[data-punto]").className).toContain(`bg-${clase}`);
      expect(within(fila(titulo)).getByText(etiqueta).className).toContain(`text-${clase}`);
    };
    color("La fe que se atreve", "Borrador", "app-main");
    color("Ya preparada", "Terminada", "app-azul");
    color("Ya la prediqué", "Predicada", "app-success");
    color("Se me pasó", "Sin predicar", "app-error");
    fireEvent.click(boton("Terminadas"));
    expect(boton("Terminadas").className).toContain("bg-app-azul/10");
    expect(screen.queryByText("La fe que se atreve")).toBeNull();
    expect(boton("Todas").className).toContain("text-app-texto");
  });

  it("en la lista, el estado es solo texto de color y se cuentan «ítems»", () => {
    abrir();
    const fila = screen.getByText("La fe que se atreve").closest("button");
    const estado = within(fila).getByText("Borrador");
    expect(estado.className).toContain("text-app-main");
    expect(estado.className).not.toContain("border");
    expect(fila.textContent).toContain("3 ítems");
    expect(fila.textContent).not.toContain("piezas");
  });

  it("la lista es una línea de tiempo agrupada por mes, y la abierta se marca con su color", () => {
    fb.docs = [
      LA_FE,
      { id: "dic", data: { ...LA_FE.data, titulo: "Emanuel", fecha: "2099-12-20" } },
    ];
    abrir();
    const meses = [...document.querySelectorAll("[data-mes]")].map((s) => s.getAttribute("aria-label"));
    expect(meses).toEqual(["Noviembre 2099", "Diciembre 2099"]);
    fireEvent.click(screen.getByText("La fe que se atreve"));
    const abierta = screen.getByText("La fe que se atreve").closest("button");
    expect(abierta.getAttribute("aria-current")).toBe("true");
    expect(abierta.className).toContain("bg-app-main/15");
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

describe("Preparar", () => {
  it("el botón de arriba pasa la prédica de Borrador a Terminada y la guarda", async () => {
    abrir();
    fireEvent.click(screen.getByText("La fe que se atreve"));
    const estado = () => document.querySelector("[data-estado-predica]");
    expect(estado().textContent).toBe("Borrador");
    fireEvent.click(estado());
    expect(estado().textContent).toBe("Terminada");
    expect(estado().className).toContain("text-app-azul");
    await waitFor(() => expect(fb.guardados.at(-1)?.datos.estado).toBe("terminada"), { timeout: 3000 });
    fireEvent.click(estado());
    expect(estado().textContent).toBe("Borrador");
  });

  it("el título se ve como campo y, al crear una nueva, queda listo para escribir el nombre", async () => {
    fb.docs = [LA_FE, { id: "nueva", data: { titulo: "Nueva prédica", fecha: "", serie: "", estado: "borrador", piezas: [] } }];
    abrir();
    fireEvent.click(boton("Nueva"));
    // Antes de abrirse, el centro muestra la vacía: se espera a la creada.
    await waitFor(() => expect(screen.getByLabelText("Título de la prédica").value).toBe("Nueva prédica"));
    const titulo = screen.getByLabelText("Título de la prédica");
    await waitFor(() => expect(document.activeElement).toBe(titulo));
    expect(titulo.value).toBe("Nueva prédica");
    expect([titulo.selectionStart, titulo.selectionEnd]).toEqual([0, "Nueva prédica".length]);
    expect(titulo.closest("label").className).toContain("border-dashed");
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
    expect(screen.getByText("Se guarda al escribir")).toBeTruthy();
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
    const tipos = within(screen.getByRole("group", { name: "Agregar al bosquejo" })).getAllByRole("button").map((b) => b.textContent);
    expect(tipos).toEqual(["Punto", "Mensaje", "Imagen"]);
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

  it("abajo: el selector y WhatsApp, Duplicar y Borrar; «Predicar» arriba del bosquejo y no a la derecha", () => {
    abrir();
    fireEvent.click(screen.getByText("La fe que se atreve"));
    const derecha = screen.getByRole("complementary", { name: "Así se verá en el templo" });
    const barra = screen.getByRole("group", { name: "Agregar al bosquejo" }).parentElement;
    expect(within(derecha).queryByRole("button", { name: /Predicar/ })).toBeNull();
    expect(boton("Predicar")).toBeTruthy();
    expect(within(barra).getByRole("button", { name: "Duplicar" })).toBeTruthy();
    expect(within(barra).getByRole("button", { name: "Borrar" })).toBeTruthy();
    expect(within(barra).getByTitle("Compartir por WhatsApp")).toBeTruthy();
    expect(within(derecha).queryByRole("button", { name: "Borrar" })).toBeNull();
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
    expect(within(punto).getByText("I")).toBeTruthy();
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

  it("el recuadro nuevo va debajo del elegido y se guarda también con el botón «Guardar»", async () => {
    abrir();
    fireEvent.click(screen.getByText("La fe que se atreve"));
    fireEvent.click(document.querySelector('[data-pieza="versiculo"] button')); // elige el primero
    fireEvent.click(boton("Punto"));
    fireEvent.change(screen.getByLabelText("Escribe el punto"), { target: { value: "Dios ve tu fe" } });
    fireEvent.click(boton("Guardar"));
    await waitFor(() => expect(fb.guardados.at(-1)?.datos.piezas.map((p) => p.contenido?.cita ?? p.contenido)).toEqual(
      ["Hebreos 11:1", "Dios ve tu fe", "La fe ve lo invisible", "La fe no es adivinar el futuro."]
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

  it("el calendario va debajo de la lista", () => {
    abrir();
    const lista = screen.getByText("Próximas");
    const calendario = document.querySelector("[data-fecha]");
    expect(lista.compareDocumentPosition(calendario) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("«Empezar» y «Siguiente» proyectan pieza por pieza, por el mismo canal de siempre", async () => {
    empezar();
    fireEvent.click(boton(/Empezar$/));
    await waitFor(() => expect(fb.proyectado).toHaveLength(1));
    expect(fb.proyectado[0]).toMatchObject({ ruta: "displayVersiculo/g1", datos: { cita: "Hebreos 11:1", display: "versiculo", version: "RVR1960" } });
    fireEvent.click(boton(/Siguiente/));
    await waitFor(() => expect(fb.proyectado).toHaveLength(2));
    expect(fb.proyectado[1]).toMatchObject({ ruta: "displayTitulo/g1", datos: { text: "La fe ve lo invisible", display: "titulo" } });
  });

  it("con el teclado: flecha derecha avanza y flecha izquierda vuelve", async () => {
    empezar();
    act(() => {
      fireEvent.keyDown(window, { key: "ArrowRight" });
    });
    act(() => {
      fireEvent.keyDown(window, { key: "ArrowRight" });
    });
    act(() => {
      fireEvent.keyDown(window, { key: "ArrowLeft" });
    });
    await waitFor(() => expect(fb.proyectado.map((p) => p.ruta)).toEqual(["displayVersiculo/g1", "displayTitulo/g1", "displayVersiculo/g1"]));
  });

  it("«En negro» apaga título, texto y anuncio", async () => {
    empezar();
    fireEvent.click(boton("En negro"));
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
    fireEvent.click(boton(/Empezar$/));
    await waitFor(() => expect(fb.proyectado).toHaveLength(2));
    expect(fb.proyectado[0]).toMatchObject({ ruta: "displayImage/g1", datos: { type: "single", images: ["https://img/f.jpg"] } });
    expect(fb.proyectado[1]).toMatchObject({ ruta: "displayVisibleImagen/g1", datos: { visibleImagen: true } });
    expect(document.querySelector("[data-pantalla-previa] img").getAttribute("src")).toBe("https://img/f.jpg");
    fireEvent.click(boton(/Siguiente/));
    await waitFor(() => expect(fb.proyectado).toHaveLength(4));
    expect(fb.proyectado[2]).toMatchObject({ ruta: "displayVisibleImagen/g1", datos: { visibleImagen: false } });
    expect(fb.proyectado[3]).toMatchObject({ ruta: "displayMessage/g1", datos: { text: "Hola iglesia" } });
  });

  it("«En negro» también apaga la imagen", async () => {
    abrir({ app: { visibleImagen: true } });
    fireEvent.click(screen.getByText("La fe que se atreve"));
    fireEvent.click(boton("Predicar"));
    fireEvent.click(boton("En negro"));
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
