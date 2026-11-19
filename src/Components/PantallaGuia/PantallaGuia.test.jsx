import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, screen } from "@testing-library/react";

// Un RTDB falso: cada ruta guarda su oyente para poder «enviarle» datos.
const rtdb = vi.hoisted(() => ({ oyentes: {} }));
vi.mock("../Firebase/Firebase", () => ({ database: {} }));
vi.mock("firebase/database", () => ({
  ref: (_db, ruta) => ruta,
  onValue: (ruta, alRecibir) => {
    rtdb.oyentes[ruta] = alRecibir;
    return () => {
      delete rtdb.oyentes[ruta];
    };
  },
}));

import PantallaGuia from "./PantallaGuia.jsx";
import { montar } from "../Navegacion/pruebas.utils.jsx";

const sesion = { userData: { name: "Ana", role: "Pastor", groupId: "g1" } };
const enviar = (nodo, datos) => act(() => rtdb.oyentes[`${nodo}/g1`]({ val: () => datos }));
const abrir = (app = {}) => montar(<PantallaGuia />, { auth: sesion, app });
const guia = () => document.querySelector("[data-guia-templo]");
const estado = () => document.querySelector("[data-estado-guia]").dataset.estadoGuia;

beforeEach(() => {
  rtdb.oyentes = {};
});

describe("PantallaGuia", () => {
  it("sin nada en el templo, oscurece la mini pantalla", () => {
    abrir();
    expect(estado()).toBe("oculto");
    expect(guia().querySelector("[data-aviso-oculta]").textContent).toBe("No se ve en el templo");
  });

  it("lee de los nodos de su iglesia", () => {
    abrir();
    expect(Object.keys(rtdb.oyentes).sort()).toEqual(
      ["displayImage/g1", "displayMessage/g1", "displayTicker/g1", "displayTitulo/g1", "displayVersiculo/g1", "displayVideo/g1"]
    );
  });

  it("copia un mensaje cuando el texto está encendido", () => {
    abrir({ visibleTexto: true });
    enviar("displayMessage", { text: "Bienvenidos", display: "mensaje" });
    expect(estado()).toBe("vivo");
    expect(guia().textContent).toContain("Bienvenidos");
    expect(guia().querySelector("[data-aviso-oculta]")).toBeNull();
  });

  it("si el texto está apagado, lo enviado no se ve", () => {
    abrir({ visibleTexto: false });
    enviar("displayMessage", { text: "Bienvenidos", display: "mensaje" });
    expect(estado()).toBe("oculto");
    expect(guia().querySelector("[data-aviso-oculta]")).not.toBeNull();
  });

  it("un versículo lleva su cita", () => {
    abrir({ visibleTexto: true });
    enviar("displayVersiculo", { text: "Porque de tal manera amó Dios", cita: "Juan 3:16", display: "versiculo" });
    expect(guia().textContent).toContain("Porque de tal manera amó Dios");
    expect(guia().textContent).toContain("Juan 3:16");
  });

  it("copia la franja de título y el ticker solo si están encendidos", () => {
    const { unmount } = abrir({ visibleTitulo: true, visibleTicker: true });
    enviar("displayTitulo", { text: "La fe que se atreve", display: "titulo" });
    enviar("displayTicker", { text: "Reunión de jóvenes el viernes" });
    expect(guia().querySelector("[data-mini-titulo]").textContent).toBe("La fe que se atreve");
    expect(guia().querySelector("[data-mini-ticker]").textContent).toBe("Reunión de jóvenes el viernes");
    expect(estado()).toBe("vivo");
    unmount();

    abrir({ visibleTitulo: false, visibleTicker: false });
    enviar("displayTitulo", { text: "La fe que se atreve", display: "titulo" });
    enviar("displayTicker", { text: "Reunión de jóvenes el viernes" });
    expect(guia().querySelector("[data-mini-titulo]")).toBeNull();
    expect(guia().querySelector("[data-mini-ticker]")).toBeNull();
  });

  it("muestra la imagen que va al aire", () => {
    abrir({ visibleImagen: true });
    enviar("displayImage", { type: "single", image: "https://x.test/foto.jpg" });
    expect(guia().querySelector("img").getAttribute("src")).toBe("https://x.test/foto.jpg");
  });

  it("el video aparece como su miniatura", () => {
    abrir({ visibleVideo: true });
    enviar("displayVideo", { videoId: "abc123", titulo: "Alabanza" });
    expect(guia().querySelector("img").getAttribute("src")).toContain("abc123");
  });

  it("dice qué capas están visibles", () => {
    abrir({ visibleTitulo: true, visibleTexto: false, visibleTicker: true });
    const activa = (c) => document.querySelector(`[data-capa-guia="${c}"]`).dataset.activa;
    expect([activa("titulo"), activa("texto"), activa("ticker")]).toEqual(["true", "false", "true"]);
  });

  it("lleva la franja del servicio y la pantalla arriba, de borde a borde", () => {
    abrir();
    const arriba = guia().firstElementChild;
    expect(arriba.className).toContain("-mx-5");
    expect(arriba.className).toContain("-mt-5");
    expect(arriba.querySelector("[data-franja-turno]")).not.toBeNull();
  });

  it("deja una ranura debajo para los botones de cada sección", () => {
    abrir();
    const ranura = guia().querySelector("[data-acciones-guia]");
    expect(ranura).not.toBeNull();
    expect(guia().lastElementChild).toBe(ranura);
  });

  it("mide lo mismo que la columna derecha de Prédica y no se pliega", () => {
    abrir();
    expect(guia().className).toContain("w-90");
    expect(guia().className).toContain("p-5");
    expect(screen.queryByRole("button", { name: /plegar|mostrar la guía/i })).toBeNull();
    expect(guia().hasAttribute("data-plegada")).toBe(false);
  });

  it("es fija y mide el alto de la pantalla: no se desplaza con el centro", () => {
    abrir();
    const clases = guia().className;
    expect(clases).toContain("sticky");
    expect(clases).toContain("h-svh");
    expect(clases).toContain("overflow-x-clip");
    // Lo de debajo se encoge para caber, en vez de empujar la columna
    expect(guia().querySelector("[data-acciones-guia]").className).toContain("min-h-0");
  });

  it("pierde su relleno de abajo mientras lleve una barra pegada al borde (data-barra-capitulos)", () => {
    abrir();
    const clases = guia().className;
    expect(clases).toContain("p-5");
    expect(clases).toContain("has-[[data-barra-capitulos]]:pb-0");
  });

  it("no lleva la etiqueta «En vivo» / «Oculto» arriba", () => {
    abrir({ visibleTexto: true });
    enviar("displayMessage", { text: "Bienvenidos", display: "mensaje" });
    expect(guia().textContent).not.toMatch(/En vivo/i);
    expect(guia().textContent).not.toMatch(/^\s*Oculto/i);
    // El estado sigue disponible, pero sin verse
    expect(estado()).toBe("vivo");
  });

  it("el marco toma el estado de la pantalla del templo", () => {
    abrir({ visibleTexto: true, pantallaTemplo: "encendida" });
    enviar("displayMessage", { text: "Bienvenidos", display: "mensaje" });
    expect(guia().querySelector("[data-pantalla-previa]").dataset.estado).toBe("encendida");
    expect(guia().querySelector("[data-aviso-oculta]")).toBeNull();
    expect(estado()).toBe("vivo");
  });

  it("con la pantalla apagada lo dice, aunque haya algo enviado y visible", () => {
    abrir({ visibleTexto: true, pantallaTemplo: "apagada" });
    enviar("displayMessage", { text: "Bienvenidos", display: "mensaje" });
    expect(guia().querySelector("[data-pantalla-previa]").dataset.estado).toBe("apagada");
    expect(guia().querySelector("[data-aviso-oculta]").textContent).toBe("Pantalla apagada");
    expect(estado()).toBe("oculto");
  });

  it("con la pantalla oculta lo dice", () => {
    abrir({ visibleTexto: true, pantallaTemplo: "oculta" });
    enviar("displayMessage", { text: "Bienvenidos", display: "mensaje" });
    expect(guia().querySelector("[data-aviso-oculta]").textContent).toBe("Pantalla oculta");
  });

  it("con la pantalla apagada u oculta, la guía no dice «Sin texto en pantalla»", () => {
    for (const pantallaTemplo of ["apagada", "oculta"]) {
      abrir({ visibleTexto: true, pantallaTemplo });
      expect(guia().textContent, pantallaTemplo).not.toContain("Sin texto en pantalla");
      cleanup();
    }
  });

  it("con la pantalla abierta y solo el título en el templo, el centro dice «Sin texto en pantalla»", () => {
    abrir({ visibleTexto: true, visibleTitulo: true, pantallaTemplo: "encendida" });
    enviar("displayTitulo", { text: "La fe que se atreve", display: "titulo" });
    expect(guia().textContent).toContain("Sin texto en pantalla");
    expect(guia().querySelector("[data-aviso-oculta]")).toBeNull();
  });

  it("con la pantalla abierta y nada que ver, solo sale «No se ve en el templo», sin el texto de vacío encima", () => {
    abrir({ visibleTexto: true, pantallaTemplo: "encendida" });
    expect(guia().querySelector("[data-aviso-oculta]").textContent).toBe("No se ve en el templo");
    expect(guia().textContent).not.toContain("Sin texto en pantalla");
  });

  it("REGLA: con la pantalla apagada la guía no muestra nada de lo enviado (mensaje, título ni ticker)", () => {
    abrir({ visibleTexto: true, visibleTitulo: true, visibleTicker: true, pantallaTemplo: "apagada" });
    enviar("displayMessage", { text: "Bienvenidos a casa", display: "mensaje" });
    enviar("displayTitulo", { text: "La fe que se atreve", display: "mensaje" });
    enviar("displayTicker", { text: "Culto de jóvenes el sábado" });
    const texto = guia().querySelector("[data-pantalla-previa]").textContent;
    expect(texto).not.toContain("Bienvenidos a casa");
    expect(texto).not.toContain("La fe que se atreve");
    expect(texto).not.toContain("Culto de jóvenes");
    expect(guia().querySelector("[data-aviso-oculta]").textContent).toBe("Pantalla apagada");
  });

  it("con la pantalla abierta, los mismos datos sí se ven", () => {
    abrir({ visibleTexto: true, visibleTitulo: true, visibleTicker: true, pantallaTemplo: "encendida" });
    enviar("displayMessage", { text: "Bienvenidos a casa", display: "mensaje" });
    enviar("displayTitulo", { text: "La fe que se atreve", display: "mensaje" });
    enviar("displayTicker", { text: "Culto de jóvenes el sábado" });
    const texto = guia().querySelector("[data-pantalla-previa]").textContent;
    expect(texto).toContain("La fe que se atreve");
    expect(texto).toContain("Culto de jóvenes");
  });
});
