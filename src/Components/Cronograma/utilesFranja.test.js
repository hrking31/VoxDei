import { describe, expect, it } from "vitest";
import { estadoFranja } from "./utilesFranja.js";

const pastor = { uid: "p", userData: { role: "Pastor" } };
const pastora = { uid: "pa", userData: { role: "Pastora" } };
const laura = { uid: "laura", userData: { role: "Operador" } };
const luis = { uid: "luis", userData: { role: "Operador" } };

const servicioLaura = { tipo: "servicio", uid: "laura", nombre: "Laura", servicio: { inicio: "14:00", fin: "16:00" } };
const libre = { tipo: "libre" };
const ensayoLuis = { tipo: "ensayo", uid: "luis", nombre: "Luis", hasta: new Date(2026, 10, 15, 17, 30).getTime() };

const para = (turno, persona) => estadoFranja(turno, persona.userData, persona.uid);

describe("estadoFranja: el color va de acuerdo a quien mira", () => {
  it("servicio de Laura: el pastor y Laura en verde, otro operador en rojo", () => {
    expect(para(servicioLaura, pastor)).toMatchObject({ puedo: true, titulo: "Turno de Laura · 14:00 – 16:00", botones: [] });
    expect(para(servicioLaura, pastor).explicacion).toBe("Puedes proyectar como pastor.");
    expect(para(servicioLaura, laura)).toMatchObject({ puedo: true, explicacion: "Puedes proyectar." });
    expect(para(servicioLaura, laura).titulo).toMatch(/^Tu turno/);
    expect(para(servicioLaura, luis)).toMatchObject({ puedo: false, explicacion: "No puedes proyectar ahora.", botones: [] });
  });

  it("no trae texto de detalle: solo el título se ve", () => {
    expect(para(servicioLaura, pastor)).not.toHaveProperty("detalle");
  });

  it("la pastora, para el lector, «como pastora»", () => {
    expect(para(libre, pastora).explicacion).toBe("Puedes proyectar como pastora.");
  });

  it("sin servicio: el pastor puede; el operador, en rojo, con «Iniciar ensayo»", () => {
    expect(para(libre, pastor)).toMatchObject({ puedo: true, titulo: "Sin servicio", botones: [] });
    expect(para(libre, luis)).toMatchObject({ puedo: false, titulo: "Sin servicio", botones: ["iniciar"] });
    expect(para(libre, luis).completo).toBe("Sin servicio. Inicia un ensayo para poder proyectar.");
  });

  it("ensayo de Luis: Luis lo termina, otro operador lo toma, el pastor también lo termina", () => {
    expect(para(ensayoLuis, luis)).toMatchObject({ puedo: true, botones: ["terminar"] });
    expect(para(ensayoLuis, luis).titulo).toMatch(/^Tu ensayo · hasta 17:30/);
    expect(para(ensayoLuis, laura)).toMatchObject({ puedo: false, botones: ["tomar"] });
    expect(para(ensayoLuis, laura).titulo).toMatch(/^Ensayo de Luis/);
    expect(para(ensayoLuis, pastor)).toMatchObject({ puedo: true, explicacion: "Puedes proyectar como pastor.", botones: ["terminar"] });
  });

  it("la frase completa sigue en el title para quien la busque", () => {
    expect(para(servicioLaura, luis).completo).toMatch(/No puedes proyectar ahora\.$/);
    expect(para(servicioLaura, pastor).completo).toBe("Turno de Laura · 14:00 – 16:00. Puedes proyectar como pastor.");
  });
});
