import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";

const guardar = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("./elegirBiblia", () => ({ guardarVersionBiblia: guardar }));

import SelectorBiblia from "./SelectorBiblia.jsx";
import { montar } from "../Navegacion/pruebas.utils.jsx";

const operador = { userData: { name: "Luis", role: "Operador", groupId: "g1" } };

function abrir(versionBiblia = "RVR1960") {
  const setVersionBiblia = vi.fn();
  const resultado = montar(<SelectorBiblia />, { auth: operador, app: { versionBiblia, setVersionBiblia } });
  return { ...resultado, setVersionBiblia };
}

describe("SelectorBiblia", () => {
  it("muestra las dos Biblias, marca la elegida y su aviso de derechos", () => {
    abrir("RVR1960");
    expect(screen.getByRole("button", { name: "RVR1960" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "DHH" }).getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByText(/Reina-Valera 1960® ©/)).toBeTruthy();
  });

  it("al elegir la DHH la guarda para toda la iglesia", async () => {
    guardar.mockClear();
    const { setVersionBiblia } = abrir("RVR1960");
    fireEvent.click(screen.getByRole("button", { name: "DHH" }));
    expect(setVersionBiblia).toHaveBeenCalledWith("DHHS94");
    await waitFor(() => expect(guardar).toHaveBeenCalledWith("g1", "DHHS94"));
  });

  it("tocar la que ya está elegida no guarda nada", () => {
    guardar.mockClear();
    abrir("DHHS94");
    expect(screen.getByText(/Dios Habla Hoy, Tercera edición/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "DHH" }));
    expect(guardar).not.toHaveBeenCalled();
  });

  it("si no se puede guardar, vuelve a la anterior y avisa", async () => {
    guardar.mockRejectedValueOnce(new Error("sin internet"));
    const { setVersionBiblia, app } = abrir("RVR1960");
    fireEvent.click(screen.getByRole("button", { name: "DHH" }));
    await waitFor(() => expect(setVersionBiblia).toHaveBeenLastCalledWith("RVR1960"));
    expect(app.showNotif).toHaveBeenCalledWith("error", "No se pudo cambiar la Biblia. Inténtalo de nuevo.");
  });
});
