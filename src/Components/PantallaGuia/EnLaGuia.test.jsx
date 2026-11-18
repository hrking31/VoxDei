import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import EnLaGuia from "./EnLaGuia.jsx";
import { AccionesGuiaContext } from "./AccionesGuia.js";
import { montar } from "../Navegacion/pruebas.utils.jsx";

describe("EnLaGuia", () => {
  it("con ranura, pinta a sus hijos dentro de ella y no donde se montó", () => {
    const ranura = document.createElement("div");
    document.body.appendChild(ranura);
    const { container } = montar(
      <AccionesGuiaContext.Provider value={ranura}>
        <section data-origen>
          <EnLaGuia>
            <button>Antiguo</button>
          </EnLaGuia>
        </section>
      </AccionesGuiaContext.Provider>
    );
    expect(ranura.querySelector("button").textContent).toBe("Antiguo");
    expect(container.querySelector("[data-origen] button")).toBeNull();
    ranura.remove();
  });

  it("sin ranura (celular, o sección sin guía) no pinta nada", () => {
    montar(
      <EnLaGuia>
        <button>Antiguo</button>
      </EnLaGuia>
    );
    expect(screen.queryByRole("button", { name: "Antiguo" })).toBeNull();
  });
});
