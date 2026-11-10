import { describe, expect, it } from "vitest";
import {
  INICIO,
  avanzar,
  descripcionPaso,
  esElUltimo,
  escriturasDePaso,
  mover,
  parsearCita,
  quitar,
  retroceder,
} from "./utilesOrden.js";

describe("parsearCita", () => {
  it("entiende la forma habitual y sus variantes", () => {
    for (const texto of ["Juan 3:16", "juan 3 16", "San Juan 3.16", "S. Juan 3:16", "  JUAN 3:16 "]) {
      expect(parsearCita(texto), texto).toMatchObject({
        sigla: "JHN",
        libro: "Juan",
        capitulo: 3,
        versiculo: 16,
        cita: "Juan 3:16",
      });
    }
  });

  it("acepta tildes o no, y libros con número", () => {
    expect(parsearCita("Genesis 1:1")?.sigla).toBe("GEN");
    expect(parsearCita("1 Corintios 13:4")?.cita).toBe("1 Corintios 13:4");
    expect(parsearCita("1 Juan 4:8")?.libro).toBe("1 Juan");
  });

  it("acepta el comienzo del nombre si no hay dos libros que empiecen igual", () => {
    expect(parsearCita("sal 23:1")?.libro).toBe("Salmos");
    expect(parsearCita("1 cor 13:4")?.libro).toBe("1 Corintios");
    // «Jo» empieza Josué, Job, Joel, Jonás y Juan: no se adivina.
    expect(parsearCita("jo 1:1")).toBeNull();
  });

  it("rechaza capítulos y versículos que no existen", () => {
    expect(parsearCita("Juan 22:1")).toBeNull(); // Juan tiene 21 capítulos
    expect(parsearCita("Juan 3:37")).toBeNull(); // Juan 3 tiene 36 versículos
    expect(parsearCita("Juan 0:1")).toBeNull();
  });

  it("rechaza lo que no es una cita", () => {
    for (const texto of ["", "Juan", "Juan 3", "Libro Falso 1:1", null]) {
      expect(parsearCita(texto), String(texto)).toBeNull();
    }
  });
});

const pasos = [
  { id: "a", tipo: "mensaje", texto: "Bienvenidos" },
  { id: "b", tipo: "cancion", titulo: "Santo", laminas: ["L1", "L2", "L3"] },
  { id: "c", tipo: "versiculo", cita: "Juan 3:16", texto: "Porque de tal manera…" },
];

describe("avanzar y retroceder", () => {
  it("empieza por el primer paso", () => {
    expect(avanzar(pasos, INICIO)).toEqual({ paso: 0, lamina: 0 });
  });

  it("recorre la canción lámina por lámina antes de seguir", () => {
    let pos = { paso: 0, lamina: 0 };
    const recorrido = [];
    while ((pos = avanzar(pasos, pos))) recorrido.push(`${pos.paso}.${pos.lamina}`);
    expect(recorrido).toEqual(["1.0", "1.1", "1.2", "2.0"]);
  });

  it("al final no avanza más, y lo dice", () => {
    expect(avanzar(pasos, { paso: 2, lamina: 0 })).toBeNull();
    expect(esElUltimo(pasos, { paso: 2, lamina: 0 })).toBe(true);
    expect(esElUltimo(pasos, { paso: 1, lamina: 2 })).toBe(false);
    expect(esElUltimo(pasos, INICIO)).toBe(false);
  });

  it("retrocede entrando por la última lámina de la canción", () => {
    expect(retroceder(pasos, { paso: 2, lamina: 0 })).toEqual({ paso: 1, lamina: 2 });
    expect(retroceder(pasos, { paso: 1, lamina: 1 })).toEqual({ paso: 1, lamina: 0 });
    expect(retroceder(pasos, { paso: 0, lamina: 0 })).toBeNull();
    expect(retroceder(pasos, INICIO)).toBeNull();
  });

  it("sin pasos no hay nada que hacer", () => {
    expect(avanzar([], INICIO)).toBeNull();
  });
});

describe("descripcionPaso", () => {
  it("dice qué hay en pantalla", () => {
    expect(descripcionPaso(pasos[0])).toBe("Bienvenidos");
    expect(descripcionPaso(pasos[1], 1)).toBe("«Santo» · lámina 2 de 3");
    expect(descripcionPaso(pasos[2])).toBe("Juan 3:16 — Porque de tal manera…");
  });
});

describe("escriturasDePaso", () => {
  const nodos = (escrituras) => escrituras.map((e) => e.nodo);

  it("una lámina de canción va como mensaje, como en la sección Canciones", () => {
    const [mensaje] = escriturasDePaso(pasos[1], 2, 123);
    expect(mensaje).toEqual({
      nodo: "displayMessage",
      modo: "set",
      datos: { text: "L3", display: "mensaje", timestamp: 123 },
    });
  });

  it("un versículo no manda campos vacíos (RTDB rechaza undefined)", () => {
    const [versiculo] = escriturasDePaso(pasos[2], 0, 1);
    expect(versiculo.nodo).toBe("displayVersiculo");
    expect(Object.values(versiculo.datos).every((v) => v !== undefined)).toBe(true);
  });

  it("enciende lo que hace falta para que se vea y quita la pantalla de espera", () => {
    expect(nodos(escriturasDePaso(pasos[0], 0, 1))).toEqual(["displayMessage", "displayVisibleTexto", "displayEspera"]);
    expect(nodos(escriturasDePaso({ tipo: "titulo", texto: "La fe" }, 0, 1))).toEqual(["displayTitulo", "displayVisibleTitulo", "displayEspera"]);
    expect(escriturasDePaso(pasos[0], 0, 1).at(-1).datos).toEqual({ activa: false });
  });

  it("un anuncio va al ticker y lo enciende, sin tocar el centro", () => {
    expect(nodos(escriturasDePaso({ tipo: "ticker", texto: "Ayuno el viernes" }, 0, 1))).toEqual(["displayTicker", "displayVisibleTicker"]);
  });
});

describe("editar la lista", () => {
  it("mueve un paso arriba o abajo, sin salirse", () => {
    expect(mover(pasos, 1, -1).map((p) => p.id)).toEqual(["b", "a", "c"]);
    expect(mover(pasos, 2, 1)).toBe(pasos);
  });

  it("quita un paso por su id", () => {
    expect(quitar(pasos, "b").map((p) => p.id)).toEqual(["a", "c"]);
  });
});
