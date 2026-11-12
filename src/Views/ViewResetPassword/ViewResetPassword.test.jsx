import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";

vi.mock("../../Components/Firebase/Firebase", () => ({ auth: {} }));
vi.mock("firebase/auth", () => ({ sendPasswordResetEmail: async () => {} }));

import ViewResetPassword from "./ViewResetPassword.jsx";
import { montar } from "../../Components/Navegacion/pruebas.utils.jsx";

describe("ViewResetPassword", () => {
  it("sin logo arriba: VOXDEI va de marca de agua, detrás de todo", () => {
    const { container } = montar(<ViewResetPassword />, { ruta: "/ResetPassword" });
    expect(screen.getByRole("heading", { name: "Recuperar Contraseña" })).toBeTruthy();
    const marca = container.querySelector("[data-marca-agua]");
    expect(marca.getAttribute("aria-hidden")).toBe("true");
    const [rayos, polvo] = marca.querySelectorAll("img");
    // Los rayos parpadean y el polvo flota, salvo con «reducir movimiento».
    expect(rayos.className).toContain("haz-esquina");
    expect(rayos.className).toContain("motion-safe:animate-marca-haz");
    expect(polvo.className).toContain("haz-esquina");
    expect(polvo.className).toContain("motion-reduce:hidden");
    expect(container.querySelectorAll("img")).toHaveLength(2);
    expect(container.firstElementChild.className).toContain("isolate");
  });
});
