import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import RequisitosClave from "./RequisitosClave.jsx";

afterEach(cleanup);

const filas = (container) => [...container.querySelectorAll("li")];

describe("RequisitosClave", () => {
  it("muestra los cinco requisitos con el texto completo", () => {
    const { container } = render(<RequisitosClave clave="" />);
    expect(filas(container).map((li) => li.textContent)).toEqual([
      "Al menos 12 caracteres",
      "Una mayúscula (A-Z)",
      "Una minúscula (a-z)",
      "Un número (0-9)",
      "Un símbolo",
    ]);
  });

  it("marca en verde solo los que la contraseña cumple", () => {
    const { container } = render(<RequisitosClave clave="abc" />);
    const verdes = filas(container).filter((li) => li.className.includes("text-app-success"));
    expect(verdes.map((li) => li.textContent)).toEqual(["Una minúscula (a-z)"]);
  });
});
