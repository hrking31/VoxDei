import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import ResumenPuntos from "./ResumenPuntos.jsx";

afterEach(cleanup);

describe("ResumenPuntos: el resumen con sangría francesa", () => {
  it("el número va en su columna y el texto en la suya, así lo que se parte sigue alineado con el texto", () => {
    const { container } = render(<ResumenPuntos texto={"I. La fe ve lo que todavía no existe\n    a) Ve lo invisible\nII. La fe obedece"} />);
    const lista = container.querySelector("[data-lista-resumen]");
    expect(lista.className).toContain("lista-resumen");
    const [punto, sub, punto2] = lista.querySelectorAll("[data-renglon]");
    // Punto: número en la columna 1 y texto desde la 2.
    expect(punto.getAttribute("data-renglon")).toBe("punto");
    expect(punto.children[0].textContent).toBe("I.");
    expect(punto.children[0].className).toContain("col-start-1");
    expect(punto.children[1].textContent).toBe("La fe ve lo que todavía no existe");
    expect(punto.children[1].className).toContain("col-start-2");
    expect(punto.children[1].className).toContain("col-span-3");
    // Subpunto: letra en la columna 2 y texto en la 3 (más adentro).
    expect(sub.getAttribute("data-renglon")).toBe("subpunto");
    expect(sub.children[0].className).toContain("col-start-2");
    expect(sub.children[1].className).toContain("col-start-3");
    expect(punto2.children[0].textContent).toBe("II.");
  });

  it("un renglón sin número va a todo el ancho", () => {
    const { container } = render(<ResumenPuntos texto="Solo texto" />);
    const renglon = container.querySelector("[data-renglon]");
    expect(renglon.getAttribute("data-renglon")).toBe("texto");
    expect(renglon.className).toContain("col-span-4");
  });

  it("el sub-subpunto pone su número en la columna 3 y el texto en la 4", () => {
    const { container } = render(<ResumenPuntos texto={"I. La fe ve\n    a) Ve lo invisible\n        1. Como Moisés"} />);
    const tercero = container.querySelector("[data-renglon='subsubpunto']");
    expect(tercero.children[0].textContent).toBe("1.");
    expect(tercero.children[0].className).toContain("col-start-3");
    expect(tercero.children[1].className).toContain("col-start-4");
  });
});
