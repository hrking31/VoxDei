import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import PantallaPrevia from "./PantallaPrevia.jsx";

afterEach(cleanup);

const pieza = { tipo: "mensaje", contenido: "Bienvenidos" };
const figura = () => document.querySelector("[data-pantalla-previa]");
const aviso = () => document.querySelector("[data-aviso-oculta]");

describe("PantallaPrevia: televisor de los 80", () => {
  it("lleva el marco curvo con viñeta y líneas de barrido (utilidad crt), sin la sombra de antes", () => {
    render(<PantallaPrevia pieza={pieza} />);
    expect(figura().className).toContain("crt");
    expect(figura().className).toContain("rounded-crt");
    expect(figura().className).not.toContain("shadow-xl");
    expect(figura().className).not.toContain("border-app-aviso");
  });

  it("grande o pequeña, conserva el grosor del marco", () => {
    render(<PantallaPrevia pieza={pieza} grande />);
    expect(figura().className).toContain("border-8");
    cleanup();
    render(<PantallaPrevia pieza={pieza} />);
    expect(figura().className).toContain("border-4");
  });
});

describe("PantallaPrevia: el marco toma el estado de la pantalla del templo", () => {
  it("sin estado (la vista previa de Preparar) no marca ninguno", () => {
    render(<PantallaPrevia pieza={pieza} />);
    expect(figura().hasAttribute("data-estado")).toBe(false);
    expect(aviso()).toBeNull();
  });

  it("anota el estado en el marco para que el CSS lo pinte", () => {
    for (const estado of ["apagada", "oculta", "ventana", "maximizada", "encendida"]) {
      render(<PantallaPrevia pieza={pieza} estadoPantalla={estado} />);
      expect(figura().dataset.estado, estado).toBe(estado);
      cleanup();
    }
  });

  it("abierta (ventana, maximizada, completa) y con algo que ver: sin aviso", () => {
    for (const estado of ["ventana", "maximizada", "encendida"]) {
      render(<PantallaPrevia pieza={pieza} estadoPantalla={estado} />);
      expect(aviso(), estado).toBeNull();
      cleanup();
    }
  });

  it("apagada: dice «Pantalla apagada», en gris", () => {
    render(<PantallaPrevia pieza={pieza} estadoPantalla="apagada" />);
    expect(aviso().textContent).toBe("Pantalla apagada");
    expect(aviso().className).toContain("text-app-muted");
    expect(figura().hasAttribute("data-oculta")).toBe(true);
  });

  it("oculta: dice «Pantalla oculta», en rojo", () => {
    render(<PantallaPrevia pieza={pieza} estadoPantalla="oculta" />);
    expect(aviso().textContent).toBe("Pantalla oculta");
    expect(aviso().className).toContain("text-app-error");
  });

  it("abierta pero sin nada que ver, dice «No se ve en el templo»", () => {
    render(<PantallaPrevia pieza={pieza} estadoPantalla="encendida" oculta />);
    expect(aviso().textContent).toBe("No se ve en el templo");
    expect(aviso().className).toContain("text-app-error");
  });

  it("apagada manda sobre «no se ve»: la pantalla no está, aunque haya algo enviado", () => {
    render(<PantallaPrevia pieza={pieza} estadoPantalla="apagada" oculta />);
    expect(aviso().textContent).toBe("Pantalla apagada");
  });

  it("sin dato todavía no afirma que esté apagada", () => {
    render(<PantallaPrevia pieza={pieza} estadoPantalla={null} />);
    expect(aviso()).toBeNull();
  });

  it("sin nada que mostrar, el texto de «vacío» sale solo si no hay un aviso encima", () => {
    render(<PantallaPrevia pieza={null} textoVacio="Sin texto en pantalla" estadoPantalla="encendida" />);
    expect(figura().textContent).toContain("Sin texto en pantalla");
    cleanup();
    render(<PantallaPrevia pieza={null} textoVacio="Sin texto en pantalla" />);
    expect(figura().textContent).toContain("Sin texto en pantalla");
  });

  it("con la pantalla apagada u oculta no sale «Sin texto en pantalla»: solo el aviso", () => {
    for (const estado of ["apagada", "oculta"]) {
      render(<PantallaPrevia pieza={null} textoVacio="Sin texto en pantalla" estadoPantalla={estado} />);
      expect(figura().textContent, estado).not.toContain("Sin texto en pantalla");
      expect(aviso(), estado).not.toBeNull();
      cleanup();
    }
  });

  it("si nada se ve en el templo (aviso «No se ve en el templo») tampoco se pisan los dos textos", () => {
    render(<PantallaPrevia pieza={null} textoVacio="Sin texto en pantalla" estadoPantalla="encendida" oculta />);
    expect(figura().textContent).not.toContain("Sin texto en pantalla");
    expect(aviso().textContent).toBe("No se ve en el templo");
  });

  it("REGLA: con la pantalla apagada no muestra nada de lo enviado, solo el aviso", () => {
    const versiculo = { tipo: "versiculo", contenido: { texto: "Porque de tal manera amó Dios", cita: "Juan 3:16" } };
    render(<PantallaPrevia pieza={versiculo} titulo="La fe" ticker="Reunión el viernes" estadoPantalla="apagada" />);
    const texto = figura().textContent;
    expect(texto).not.toContain("Porque de tal manera");
    expect(texto).not.toContain("Juan 3:16");
    expect(texto).not.toContain("La fe");
    expect(texto).not.toContain("Reunión el viernes");
    expect(figura().querySelector("[data-mini-titulo]")).toBeNull();
    expect(figura().querySelector("[data-mini-ticker]")).toBeNull();
    expect(aviso().textContent).toBe("Pantalla apagada");
    // El aviso es opaco: no deja ver nada detrás
    expect(aviso().className).toContain("bg-app-aviso");
    expect(aviso().className).not.toContain("bg-app-velo");
  });

  it("apagada: tampoco una imagen ni un mensaje del resumen", () => {
    render(<PantallaPrevia pieza={{ tipo: "imagen", contenido: { url: "https://x.test/f.jpg", nombre: "Foto" } }} estadoPantalla="apagada" />);
    expect(figura().querySelector("img")).toBeNull();
    cleanup();
    render(<PantallaPrevia pieza={{ tipo: "mensaje", contenido: "I. La fe", alineacion: "izquierda" }} estadoPantalla="apagada" />);
    expect(figura().textContent).not.toContain("La fe");
  });

  it("la regla es solo de «apagada»: con la pantalla oculta lo enviado se sigue viendo, atenuado", () => {
    render(<PantallaPrevia pieza={pieza} titulo="La fe" ticker="Reunión el viernes" estadoPantalla="oculta" />);
    expect(figura().textContent).toContain("Bienvenidos");
    expect(figura().querySelector("[data-mini-titulo]")).not.toBeNull();
    expect(aviso().className).toContain("bg-app-velo");
  });

  it("con la pantalla abierta todo se ve", () => {
    render(<PantallaPrevia pieza={pieza} titulo="La fe" ticker="Reunión el viernes" estadoPantalla="encendida" />);
    expect(figura().textContent).toContain("Bienvenidos");
    expect(figura().querySelector("[data-mini-ticker]")).not.toBeNull();
    expect(aviso()).toBeNull();
  });
});
