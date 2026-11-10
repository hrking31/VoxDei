import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";

const guardar = vi.hoisted(() => vi.fn(async () => ({})));
vi.mock("./accionesIglesia.js", () => ({ guardarDatosIglesia: guardar }));

import DatosIglesia from "./DatosIglesia.jsx";
import { montar } from "../Navegacion/pruebas.utils.jsx";

const pastor = { userData: { name: "Ana", role: "Pastor", groupId: "g1", churchName: "Camino de Paz" } };

describe("DatosIglesia", () => {
  it("parte de los datos que ya tiene la iglesia", () => {
    montar(<DatosIglesia />, { auth: pastor, app: { iglesia: null } });
    expect(screen.getByLabelText("Nombre de la iglesia").value).toBe("Camino de Paz");
    expect(screen.getByLabelText("Nombre corto o sigla").value).toBe("");
  });

  it("la sigla se escribe en mayúsculas, sin puntos ni espacios", () => {
    montar(<DatosIglesia />, { auth: pastor });
    fireEvent.change(screen.getByLabelText("Nombre corto o sigla"), { target: { value: "c.d.p" } });
    expect(screen.getByLabelText("Nombre corto o sigla").value).toBe("CDP");
  });

  it("guarda nombre y sigla de su iglesia", async () => {
    const { app } = montar(<DatosIglesia />, { auth: pastor });
    fireEvent.change(screen.getByLabelText("Nombre corto o sigla"), { target: { value: "cdp" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(guardar).toHaveBeenCalledWith("g1", { nombre: "Camino de Paz", sigla: "CDP", logoArchivo: null }));
    expect(app.showNotif).toHaveBeenCalledWith("success", "Datos de la iglesia guardados");
  });

  it("sin nombre no guarda", () => {
    guardar.mockClear();
    const { app } = montar(<DatosIglesia />, { auth: pastor });
    fireEvent.change(screen.getByLabelText("Nombre de la iglesia"), { target: { value: "  " } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(guardar).not.toHaveBeenCalled();
    expect(app.showNotif).toHaveBeenCalledWith("warning", "Escribe el nombre de la iglesia.");
  });
});
