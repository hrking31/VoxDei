// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import {
  ROL_OPERADOR,
  ROL_PASTOR,
  ROL_PASTORA,
  ROL_POR_DEFECTO,
  ROLES,
  ROLES_PASTORES,
  ROLES_PROYECCION,
  esDuenoDeLaIglesia,
  esPastor,
  normalizarRol,
  rolDeLaPareja,
  tieneRol,
} from "./Roles.js";

// El espejo de las Cloud Functions: si los roles cambian en un lado y no en
// el otro, el servidor rechazaría lo que la pantalla ofrece (o al revés).
const servidor = createRequire(import.meta.url)("../../../functions/roles.js");

describe("Roles", () => {
  it("normaliza mayúsculas y espacios sobrantes", () => {
    expect(normalizarRol("  pastor ")).toBe(ROL_PASTOR);
    expect(normalizarRol("PASTORA")).toBe(ROL_PASTORA);
    expect(normalizarRol("operador")).toBe(ROL_OPERADOR);
    expect(normalizarRol("Otro")).toBe("Otro");
    expect(normalizarRol(undefined)).toBe("");
    expect(normalizarRol(3)).toBe("");
  });

  it("sin datos o sin rol nunca concede acceso", () => {
    expect(tieneRol(null, ROLES)).toBe(false);
    expect(tieneRol(undefined, ROLES)).toBe(false);
    expect(tieneRol({}, ROLES)).toBe(false);
    expect(tieneRol({ role: "   " }, ROLES)).toBe(false);
    expect(tieneRol({ role: ROL_PASTOR })).toBe(false);
  });

  it("reconoce el rol aunque esté escrito distinto", () => {
    expect(tieneRol({ role: "pastor" }, ROLES_PASTORES)).toBe(true);
    expect(tieneRol({ role: "Operador " }, ROLES_PROYECCION)).toBe(true);
    expect(tieneRol({ role: "Operador" }, ROLES_PASTORES)).toBe(false);
    expect(tieneRol({ role: "Administrador" }, ROLES_PROYECCION)).toBe(false);
  });

  it("pastor y pastora son pastores; el operador no", () => {
    expect(esPastor({ role: ROL_PASTOR })).toBe(true);
    expect(esPastor({ role: ROL_PASTORA })).toBe(true);
    expect(esPastor({ role: ROL_OPERADOR })).toBe(false);
    expect(esPastor(null)).toBe(false);
  });

  it("el dueño es quien tiene su uid como groupId", () => {
    expect(esDuenoDeLaIglesia({ uid: "a", groupId: "a" })).toBe(true);
    expect(esDuenoDeLaIglesia({ uid: "b", groupId: "a" })).toBe(false);
    expect(esDuenoDeLaIglesia({ uid: "", groupId: "" })).toBe(false);
    expect(esDuenoDeLaIglesia(null)).toBe(false);
  });

  it("la pareja del pastor es la pastora, y al revés", () => {
    expect(rolDeLaPareja("Pastor")).toBe(ROL_PASTORA);
    expect(rolDeLaPareja("pastor")).toBe(ROL_PASTORA);
    expect(rolDeLaPareja("Pastora")).toBe(ROL_PASTOR);
  });

  it("todo usuario nuevo nace operador", () => {
    expect(ROL_POR_DEFECTO).toBe(ROL_OPERADOR);
  });

  it("el servidor tiene los mismos roles que la app", () => {
    expect(servidor.ROLES).toEqual(ROLES);
    expect(servidor.ROLES_PASTORES).toEqual(ROLES_PASTORES);
    expect(servidor.ROL_POR_DEFECTO).toBe(ROL_POR_DEFECTO);
    for (const rol of ["pastor", " PASTORA ", "Operador", "otro", ""]) {
      expect(servidor.normalizarRol(rol)).toBe(normalizarRol(rol));
      expect(servidor.esPastor(rol)).toBe(esPastor({ role: rol }));
    }
  });
});
