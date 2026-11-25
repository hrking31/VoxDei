import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { montar } from "../Navegacion/pruebas.utils.jsx";

vi.mock("../Firebase/Firebase", () => ({ auth: {}, db: {}, database: {}, functions: {}, storage: {} }));
vi.mock("firebase/auth", () => ({
  sendPasswordResetEmail: async () => {},
  EmailAuthProvider: {},
  reauthenticateWithCredential: async () => {},
}));
vi.mock("firebase/functions", () => ({ httpsCallable: () => async () => ({}) }));

import ViewLogin from "../../Views/ViewLogin/ViewLogin.jsx";
import ViewResetPassword from "../../Views/ViewResetPassword/ViewResetPassword.jsx";
import ViewEliminarCuenta from "../../Views/ViewEliminarCuenta/ViewEliminarCuenta.jsx";
import VerificarCorreo from "../VerificarCorreo/VerificarCorreo.jsx";
import PerfilNoDisponible from "../PerfilNoDisponible/PerfilNoDisponible.jsx";

// Las pantallas que quedan FUERA de `MarcoPanel` (el marco es quien pone el espacio de la
// nieve en las del panel) deben llevar su propio `EspacioNieve`, dentro de la raíz.
const PANTALLAS = [
  ["ViewLogin", <ViewLogin />, "/ViewLogin", { user: null, userData: null }],
  ["ViewResetPassword", <ViewResetPassword />, "/ResetPassword", {}],
  ["ViewEliminarCuenta", <ViewEliminarCuenta />, "/EliminarCuenta", {}],
  ["VerificarCorreo", <VerificarCorreo />, "/ViewSelector", {}],
  ["PerfilNoDisponible", <PerfilNoDisponible />, "/ViewSelector", { errorPerfil: true }],
];

function fijarFecha(anio, mes, dia) {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(anio, mes, dia, 12));
}

beforeEach(() => fijarFecha(2026, 11, 25));
afterEach(() => vi.useRealTimers());

describe("Espacio de la nieve fuera del marco del panel", () => {
  for (const [nombre, pantalla, ruta, auth] of PANTALLAS) {
    it(`${nombre}: en temporada termina con el espacio, dentro de la raíz y sin franja`, () => {
      const { container } = montar(pantalla, { ruta, auth });
      const espacio = container.querySelector("[data-espacio-nieve]");
      expect(espacio).not.toBeNull();
      expect(espacio.className).toContain("bg-transparent");
      expect(espacio.parentElement).toBe(container.firstElementChild);
      expect(container.firstElementChild.lastElementChild).toBe(espacio);
    });

    it(`${nombre}: fuera de temporada no reserva nada`, () => {
      fijarFecha(2027, 5, 15);
      const { container } = montar(pantalla, { ruta, auth });
      expect(container.querySelector("[data-espacio-nieve]")).toBeNull();
    });
  }
});
