import { describe, expect, it } from "vitest";
import {
  agruparPorMes,
  citaDeLibro,
  diasDelMes,
  estadoDelDia,
  estadoVisible,
  siguienteEstado,
  documentoDePredica,
  fechaCorta,
  filtrarPredicas,
  insertarDespues,
  interpretarEntrada,
  mover,
  nombreCorto,
  normalizarPredica,
  numerosDePuntos,
  ordenarPredicas,
  piezaCompleta,
  predicasPorFecha,
  proximoDomingo,
  quitar,
  relojDesde,
  resumenPiezas,
  romano,
  textoBase,
  textoDePieza,
  TIPOS_PIEZA,
} from "./utilesPredica.js";

const PIEZAS = [
  { id: "a", tipo: "versiculo", contenido: { cita: "Hebreos 11:1", texto: "Es, pues, la fe…" } },
  { id: "b", tipo: "titulo", contenido: "La fe ve lo invisible" },
  { id: "c", tipo: "mensaje", contenido: "La fe no es adivinar el futuro." },
  { id: "d", tipo: "titulo", contenido: "La fe agrada a Dios" },
];

describe("prédicas antiguas y nuevas", () => {
  it("una de los 5 slots se lee con nombre y con sus piezas", () => {
    const p = normalizarPredica("predica3", {
      items: [{ tipo: "titulo", contenido: "Gracia", timestamp: 111 }, { tipo: "mensaje", contenido: "Hola", timestamp: 222 }],
    });
    expect(p).toMatchObject({ id: "predica3", titulo: "Prédica guardada 3", estado: "borrador", antigua: true, fecha: "" });
    expect(p.piezas).toEqual([
      { id: "111", tipo: "titulo", contenido: "Gracia" },
      { id: "222", tipo: "mensaje", contenido: "Hola" },
    ]);
  });

  it("una nueva se lee tal cual", () => {
    const p = normalizarPredica("x1", { titulo: "La fe", fecha: "2026-11-15", serie: "Héroes", estado: "predicada", piezas: PIEZAS });
    expect(p).toMatchObject({ titulo: "La fe", fecha: "2026-11-15", serie: "Héroes", estado: "predicada", antigua: false });
    expect(p.piezas).toBe(PIEZAS);
  });

  it("al guardar queda la forma nueva, sin campos de más", () => {
    const doc = documentoDePredica({ titulo: "  ", fecha: "", serie: " Navidad ", estado: "otro", piezas: [{ ...PIEZAS[1], extra: 1 }] });
    expect(doc).toEqual({ titulo: "Sin título", fecha: "", serie: "Navidad", estado: "borrador", piezas: [PIEZAS[1]] });
  });
});

describe("bosquejo", () => {
  it("los puntos se numeran I, II, III…", () => {
    expect(numerosDePuntos(PIEZAS)).toEqual({ b: "I", d: "II" });
    expect([1, 4, 9, 14, 40].map(romano)).toEqual(["I", "IV", "IX", "XIV", "XL"]);
  });

  it("cuenta puntos, versículos y mensajes, y el texto base es el primer versículo", () => {
    expect(resumenPiezas(PIEZAS)).toEqual({ puntos: 2, versiculos: 1, mensajes: 1, imagenes: 0 });
    expect(resumenPiezas([{ tipo: "imagen", contenido: { url: "u" } }]).imagenes).toBe(1);
    expect(textoBase(PIEZAS)).toBe("Hebreos 11:1");
    expect(textoBase([])).toBe("");
  });

  it("subir, bajar y quitar", () => {
    expect(mover(PIEZAS, 1, -1).map((p) => p.id)).toEqual(["b", "a", "c", "d"]);
    expect(mover(PIEZAS, 3, 1)).toBe(PIEZAS);
    expect(quitar(PIEZAS, "c").map((p) => p.id)).toEqual(["a", "b", "d"]);
  });
});

describe("el campo único", () => {
  it("una cita escrita es un versículo, aunque el tipo elegido sea otro", () => {
    expect(interpretarEntrada("Juan 3:16", "mensaje")).toMatchObject({ tipo: "versiculo", cita: { sigla: "JHN", capitulo: 3, versiculo: 16 } });
    expect(interpretarEntrada("mar 9 23", "titulo")).toMatchObject({ tipo: "versiculo", cita: { cita: "Marcos 9:23" } });
  });

  it("texto normal: punto o mensaje según lo elegido", () => {
    expect(interpretarEntrada("La fe ve lo invisible", "titulo")).toEqual({ tipo: "titulo" });
    expect(interpretarEntrada("Dios no busca gente perfecta", "mensaje")).toEqual({ tipo: "mensaje" });
  });

  it("con «Versículo» elegido y algo que no es cita, o vacío, no agrega nada", () => {
    expect(interpretarEntrada("hola", "versiculo")).toBeNull();
    expect(interpretarEntrada("   ", "mensaje")).toBeNull();
  });

  // TEMPORAL DHH (11-11-2026)
  it("con el catálogo de la DHH, un libro deuterocanónico también es cita", async () => {
    const librosDHH = await import("../LibrosBiblia/LibrosBibliaDHH.js");
    expect(interpretarEntrada("Tobit 4 7", "mensaje")).toEqual({ tipo: "mensaje" });
    expect(interpretarEntrada("Tobit 4 7", "mensaje", librosDHH)).toMatchObject({ tipo: "versiculo", cita: { sigla: "TOB", cita: "Tobit 4:7" } });
  });
});

describe("biblioteca", () => {
  const predicas = [
    normalizarPredica("a", { titulo: "Raíces profundas", fecha: "2026-11-08", estado: "predicada", piezas: [] }),
    normalizarPredica("b", { titulo: "La fe que se atreve", fecha: "2026-11-15", serie: "Héroes de la fe", piezas: PIEZAS }),
    normalizarPredica("c", { titulo: "Emanuel", fecha: "2026-12-20", serie: "Navidad", piezas: [] }),
    normalizarPredica("d", { titulo: "Sin fecha", piezas: [] }),
  ];

  it("busca por título, serie o cita, sin importar tildes", () => {
    expect(filtrarPredicas(predicas, "raices").map((p) => p.id)).toEqual(["a"]);
    expect(filtrarPredicas(predicas, "navidad").map((p) => p.id)).toEqual(["c"]);
    expect(filtrarPredicas(predicas, "hebreos 11").map((p) => p.id)).toEqual(["b"]);
    expect(filtrarPredicas(predicas, "", "predicada").map((p) => p.id)).toEqual(["a"]);
  });

  it("primero las próximas (la más cercana arriba) y luego las anteriores", () => {
    const { proximas, anteriores } = ordenarPredicas(predicas, "2026-11-10");
    expect(proximas.map((p) => p.id)).toEqual(["b", "c"]);
    expect(anteriores.map((p) => p.id)).toEqual(["a", "d"]);
  });

  it("fechas cortas, próximo domingo y reloj", () => {
    expect(fechaCorta("2026-11-15")).toBe("Dom 15 nov");
    expect(fechaCorta("")).toBe("");
    expect(proximoDomingo(new Date(2026, 10, 10))).toBe("2026-11-15");
    expect(proximoDomingo(new Date(2026, 10, 15))).toBe("2026-11-15");
    expect(relojDesde(18 * 60000 + 42000)).toBe("18:42");
    expect(relojDesde(3600000 + 5000)).toBe("1:00:05");
  });
});

describe("calendario", () => {
  it("noviembre de 2026 empieza en domingo y se completa hasta el sábado", () => {
    const dias = diasDelMes(2026, 10);
    expect(dias).toHaveLength(35);
    expect(dias[0]).toEqual({ fecha: "2026-11-01", dia: 1, delMes: true, domingo: true });
    expect(dias[34]).toMatchObject({ fecha: "2026-12-05", delMes: false });
    expect(dias.filter((d) => d.domingo && d.delMes).map((d) => d.dia)).toEqual([1, 8, 15, 22, 29]);
  });

  it("un mes que no empieza en domingo trae días del anterior", () => {
    const dias = diasDelMes(2026, 11); // diciembre: martes 1
    expect(dias[0]).toMatchObject({ fecha: "2026-11-29", delMes: false, domingo: true });
    expect(dias[2]).toMatchObject({ fecha: "2026-12-01", delMes: true });
  });

  it("agrupa las prédicas por fecha", () => {
    const porFecha = predicasPorFecha([{ id: "a", fecha: "2026-11-15" }, { id: "b", fecha: "" }, { id: "c", fecha: "2026-11-15" }]);
    expect(Object.keys(porFecha)).toEqual(["2026-11-15"]);
    expect(porFecha["2026-11-15"].map((p) => p.id)).toEqual(["a", "c"]);
  });
});

describe("estados: borrador, terminada, predicada (y «sin predicar»)", () => {
  const hoy = "2026-11-11";
  const p = (estado, fecha = "") => ({ estado, fecha });

  it("se guarda «terminada»; lo desconocido vuelve a borrador", () => {
    expect(normalizarPredica("x", { estado: "terminada", piezas: [] }).estado).toBe("terminada");
    expect(documentoDePredica({ titulo: "a", fecha: "", serie: "", estado: "terminada", piezas: [] }).estado).toBe("terminada");
    expect(documentoDePredica({ titulo: "a", fecha: "", serie: "", estado: "sin-predicar", piezas: [] }).estado).toBe("borrador");
  });

  it("el botón: borrador ↔ terminada; una predicada vuelve a terminada", () => {
    expect(siguienteEstado("borrador")).toBe("terminada");
    expect(siguienteEstado("terminada")).toBe("borrador");
    expect(siguienteEstado("predicada")).toBe("terminada");
  });

  it("«sin predicar» si pasó la fecha y no se predicó", () => {
    expect(estadoVisible(p("borrador", "2026-11-08"), hoy)).toBe("sin-predicar");
    expect(estadoVisible(p("terminada", "2026-11-08"), hoy)).toBe("sin-predicar");
    expect(estadoVisible(p("predicada", "2026-11-08"), hoy)).toBe("predicada");
    expect(estadoVisible(p("terminada", "2026-11-15"), hoy)).toBe("terminada");
    expect(estadoVisible(p("borrador", hoy), hoy)).toBe("borrador");
    expect(estadoVisible(p("borrador"), hoy)).toBe("borrador");
  });

  it("en el calendario, el día muestra el que más pide atención", () => {
    expect(estadoDelDia([p("predicada"), p("terminada")], hoy)).toBe("terminada");
    expect(estadoDelDia([p("terminada"), p("borrador")], hoy)).toBe("borrador");
    expect(estadoDelDia([p("predicada", "2026-11-01"), p("borrador", "2026-11-01")], hoy)).toBe("sin-predicar");
    expect(estadoDelDia([p("predicada")], hoy)).toBe("predicada");
    expect(estadoDelDia([], hoy)).toBeNull();
  });

  it("el filtro «Terminadas»", () => {
    const lista = [{ id: "a", estado: "terminada", titulo: "A", serie: "", piezas: [] }, { id: "b", estado: "borrador", titulo: "B", serie: "", piezas: [] }];
    expect(filtrarPredicas(lista, "", "terminada").map((x) => x.id)).toEqual(["a"]);
  });
});

describe("agruparPorMes: la línea de tiempo", () => {
  it("agrupa sin cambiar el orden; el año solo si no es el de hoy", () => {
    const lista = [
      { id: "a", fecha: "2026-11-15" },
      { id: "b", fecha: "2026-11-01" },
      { id: "c", fecha: "2025-12-25" },
      { id: "d", fecha: "" },
    ];
    const grupos = agruparPorMes(lista, "2026-11-11");
    expect(grupos.map((g) => g.nombre)).toEqual(["Noviembre", "Diciembre 2025", "Sin fecha"]);
    expect(grupos[0].predicas.map((p) => p.id)).toEqual(["a", "b"]);
  });
});

describe("la pieza imagen (en lugar del botón Versículo)", () => {
  it("los tipos para elegir son Punto, Mensaje e Imagen", () => {
    expect(TIPOS_PIEZA.map((t) => t.nombre)).toEqual(["Punto", "Mensaje", "Imagen"]);
  });

  it("con Imagen elegida no se escribe; sin ella, una cita sigue siendo versículo", () => {
    expect(interpretarEntrada("Juan 3:16", "imagen")).toBeNull();
    expect(interpretarEntrada("Juan 3:16", "mensaje")?.tipo).toBe("versiculo");
  });

  it("su texto corto para listas", () => {
    expect(textoDePieza({ tipo: "imagen", contenido: { url: "u", nombre: "bautismo.jpg" } })).toBe("Imagen · bautismo.jpg");
    expect(textoDePieza({ tipo: "imagen", contenido: { url: "u" } })).toBe("Imagen");
  });
});

describe("recuadros nuevos (computador)", () => {
  const a = { id: "a", tipo: "titulo", contenido: "Uno" };
  const b = { id: "b", tipo: "mensaje", contenido: "Dos" };
  const n = { id: "n", tipo: "mensaje", contenido: "" };

  it("lo nuevo va debajo del elegido; sin elegido, al final", () => {
    expect(insertarDespues([a, b], "a", n).map((p) => p.id)).toEqual(["a", "n", "b"]);
    expect(insertarDespues([a, b], null, n).map((p) => p.id)).toEqual(["a", "b", "n"]);
    expect(insertarDespues([a, b], "no-existe", n).map((p) => p.id)).toEqual(["a", "b", "n"]);
  });

  it("vacío o imagen sin foto no está completo y no se guarda", () => {
    expect(piezaCompleta(n)).toBe(false);
    expect(piezaCompleta({ id: "i", tipo: "imagen", contenido: null })).toBe(false);
    expect(piezaCompleta({ id: "i", tipo: "imagen", contenido: { url: "u" } })).toBe(true);
    expect(piezaCompleta(a)).toBe(true);
    const doc = documentoDePredica({ titulo: "x", fecha: "", serie: "", estado: "borrador", piezas: [a, n, { id: "i", tipo: "imagen", contenido: null }] });
    expect(doc.piezas.map((p) => p.id)).toEqual(["a"]);
  });
});

describe("cuadrícula de libros", () => {
  it("nombres cortos que no se repiten", () => {
    expect(nombreCorto("Génesis")).toBe("Géne");
    expect(nombreCorto("Filipenses")).toBe("Fili");
    expect(nombreCorto("Filemón")).toBe("File");
    expect(nombreCorto("1 Samuel")).toBe("1 Sam");
    expect(nombreCorto("S. Juan")).toBe("Juan");
    expect(nombreCorto("Ester (dc)")).toBe("Este dc");
  });

  it("la cita sin el «S.» de los evangelios", () => {
    expect(citaDeLibro({ nombre: "S. Juan" }, 3, 16)).toBe("Juan 3:16");
    expect(citaDeLibro({ nombre: "Salmos" }, 23, 1)).toBe("Salmos 23:1");
  });
});
