import { describe, expect, it } from "vitest";
import {
  agruparPorMes,
  citaDeLibro,
  diasDelMes,
  estadoDelDia,
  estadoVisible,
  citaBase,
  cambiarNivel,
  esSubpunto,
  estiloDeNivel,
  estilosDeNiveles,
  nivelesValidos,
  COMBINACIONES,
  combinacionDe,
  datosDeCombinacion,
  nivelDe,
  nivelPermitido,
  NIVEL_MAXIMO,
  SANGRIA_RESUMEN,
  partesDelResumen,
  RENGLONES_RESUMEN,
  etiquetaPunto,
  NUMERACIONES,
  numeracionValida,
  resumenDePuntos,
  textoDePunto,
  documentoDePredica,
  fechaCorta,
  fechaLarga,
  hojaDeFecha,
  filtrarPredicas,
  interpretarEntrada,
  mover,
  moverA,
  posicionEscrita,
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
    expect(doc).toEqual({ titulo: "Sin título", fecha: "", serie: "Navidad", base: "", numeracion: "romanos", numeracionNiveles: [null, null], estado: "borrador", piezas: [PIEZAS[1]] });
  });
});

describe("bosquejo", () => {
  it("los puntos se numeran I, II, III…", () => {
    expect(numerosDePuntos(PIEZAS)).toEqual({ b: "I.", d: "II." }); // con su signo, como en Word
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

  it("versículo base: dato propio; las de antes toman el primer versículo; se reconoce la cita", () => {
    expect(normalizarPredica("x", { piezas: PIEZAS }).base).toBe("Hebreos 11:1");
    expect(normalizarPredica("x", { base: "Juan 3:16", piezas: PIEZAS }).base).toBe("Juan 3:16");
    expect(normalizarPredica("x", { base: "", piezas: PIEZAS }).base).toBe("");
    expect(documentoDePredica({ titulo: "x", fecha: "", serie: "", base: " Juan 3:16 ", estado: "borrador", piezas: [] }).base).toBe("Juan 3:16");
    expect(citaBase("juan 3 16")).toBe("Juan 3:16");
    expect(citaBase("  ")).toBe("");
    expect(citaBase("la fe")).toBeNull();
    const lista = [normalizarPredica("a", { titulo: "Uno", base: "Juan 3:16", piezas: [] }), normalizarPredica("b", { titulo: "Dos", piezas: [] })];
    expect(filtrarPredicas(lista, "juan").map((p) => p.id)).toEqual(["a"]);
  });

  it("estilos de numeración de los puntos, el texto que se proyecta y el resumen de los vistos", () => {
    // Las opciones de Word, cada una con su signo.
    expect([1, 2, 4, 9].map((n) => etiquetaPunto(n))).toEqual(["I.", "II.", "IV.", "IX."]);
    expect(etiquetaPunto(3, "numeros")).toBe("3.");
    expect(etiquetaPunto(3, "numeros-parentesis")).toBe("3)");
    expect(etiquetaPunto(2, "letras")).toBe("B.");
    expect(etiquetaPunto(27, "letras")).toBe("AA.");
    expect(etiquetaPunto(3, "minusculas-parentesis")).toBe("c)");
    expect(etiquetaPunto(3, "minusculas")).toBe("c.");
    expect(etiquetaPunto(4, "romanos-minusculas")).toBe("iv.");
    expect(etiquetaPunto(3, "ninguna")).toBe("III."); // «Sin número» se quitó: vuelve a romanos
    expect(etiquetaPunto(3, "rara")).toBe("III."); // lo desconocido vuelve a romanos
    expect(numerosDePuntos(PIEZAS, "letras")).toEqual({ b: "A.", d: "B." });
    expect(textoDePunto("II.", "La fe obedece")).toBe("II. La fe obedece");
    expect(textoDePunto("b)", "La fe obedece")).toBe("b) La fe obedece");
    expect(textoDePunto("", "La fe obedece")).toBe("La fe obedece");
    // PIEZAS: a versículo, b punto, c mensaje, d punto.
    expect(resumenDePuntos(PIEZAS, 0)).toEqual([]);
    expect(resumenDePuntos(PIEZAS, 2).length).toBe(1);
    expect(resumenDePuntos(PIEZAS, 3, "numeros").map((t) => t.slice(0, 3))).toEqual(["1. ", "2. "]);
    expect(normalizarPredica("x", { piezas: [] }).numeracion).toBe("romanos");
    expect(normalizarPredica("x", { numeracion: "letras", piezas: [] }).numeracion).toBe("letras");
    expect(numeracionValida("otra")).toBe("romanos");
    expect(NUMERACIONES.map((n) => n.ejemplo)).toEqual(["1. 2. 3.", "1) 2) 3)", "I. II. III.", "A. B. C.", "a) b) c)", "a. b. c.", "i. ii. iii."]);
  });

  it("subpuntos: se numeran dentro de su punto, se guardan con nivel 1 y entran con sangría al resumen", () => {
    const BOSQUEJO = [
      { id: "p1", tipo: "titulo", contenido: "La fe ve" },
      { id: "s1", tipo: "titulo", contenido: "Ve lo invisible", nivel: 1 },
      { id: "s2", tipo: "titulo", contenido: "Ve lo que viene", nivel: 1 },
      { id: "m", tipo: "mensaje", contenido: "Hola" },
      { id: "p2", tipo: "titulo", contenido: "La fe obedece" },
      { id: "s3", tipo: "titulo", contenido: "Obedece sin ver", nivel: 1 },
    ];
    expect(numerosDePuntos(BOSQUEJO)).toEqual({ p1: "I.", s1: "a)", s2: "b)", p2: "II.", s3: "a)" });
    // Con puntos en letras, los subpuntos van con números.
    expect(numerosDePuntos(BOSQUEJO, "letras")).toEqual({ p1: "A.", s1: "1)", s2: "2)", p2: "B.", s3: "1)" });
    expect(esSubpunto(BOSQUEJO[1])).toBe(true);
    expect(esSubpunto({ tipo: "mensaje", nivel: 1 })).toBe(false); // solo los puntos
    // Poner en un nivel: como mucho, uno más adentro que el punto de arriba
    // (los demás ítems no cuentan); el primero siempre es punto.
    expect(cambiarNivel(BOSQUEJO, "p2", 1).find((p) => p.id === "p2").nivel).toBe(1);
    expect("nivel" in cambiarNivel(BOSQUEJO, "s1", 0).find((p) => p.id === "s1")).toBe(false);
    expect(cambiarNivel(BOSQUEJO, "s1", 2).find((p) => p.id === "s1").nivel).toBe(1); // arriba hay un punto: no salta a «1.»
    expect(cambiarNivel(BOSQUEJO, "s2", 2).find((p) => p.id === "s2").nivel).toBe(2); // arriba hay un subpunto: sí
    expect(cambiarNivel(BOSQUEJO, "s2", 5).find((p) => p.id === "s2").nivel).toBe(2);
    expect("nivel" in cambiarNivel(BOSQUEJO, "p1", 1).find((p) => p.id === "p1")).toBe(false); // el primero
    expect("nivel" in cambiarNivel(BOSQUEJO, "s1", -1).find((p) => p.id === "s1")).toBe(false);
    expect(cambiarNivel(BOSQUEJO, "m", 1)).toEqual(BOSQUEJO);
    expect([nivelPermitido(BOSQUEJO, "p1"), nivelPermitido(BOSQUEJO, "s1"), nivelPermitido(BOSQUEJO, "p2")]).toEqual([0, 1, 2]);
    // Se guarda el nivel solo en los subpuntos.
    const doc = documentoDePredica({ titulo: "x", fecha: "", serie: "", base: "", estado: "borrador", piezas: BOSQUEJO });
    expect(doc.piezas.find((p) => p.id === "s1")).toEqual({ id: "s1", tipo: "titulo", contenido: "Ve lo invisible", nivel: 1 });
    expect("nivel" in doc.piezas.find((p) => p.id === "p1")).toBe(false);
    // El resumen: los subpuntos con sangría bajo su punto.
    expect(resumenDePuntos(BOSQUEJO, 5)).toEqual([
      "I. La fe ve",
      SANGRIA_RESUMEN + "a) Ve lo invisible",
      SANGRIA_RESUMEN + "b) Ve lo que viene",
      "II. La fe obedece",
      SANGRIA_RESUMEN + "a) Obedece sin ver",
    ]);
  });

  it("tres niveles: punto, subpunto y sub-subpunto, cada uno numerado dentro del de arriba", () => {
    const TRES = [
      { id: "p1", tipo: "titulo", contenido: "La fe ve" },
      { id: "s1", tipo: "titulo", contenido: "Ve lo invisible", nivel: 1 },
      { id: "t1", tipo: "titulo", contenido: "Como Moisés", nivel: 2 },
      { id: "t2", tipo: "titulo", contenido: "Como Abraham", nivel: 2 },
      { id: "s2", tipo: "titulo", contenido: "Ve lo que viene", nivel: 1 },
      { id: "t3", tipo: "titulo", contenido: "Como Noé", nivel: 2 },
      { id: "p2", tipo: "titulo", contenido: "La fe obedece" },
    ];
    // I. → a) → 1.; cada nivel empieza de nuevo bajo el de arriba.
    expect(numerosDePuntos(TRES)).toEqual({ p1: "I.", s1: "a)", t1: "1.", t2: "2.", s2: "b)", t3: "1.", p2: "II." });
    // Con letras: A. → 1) → a.
    expect(numerosDePuntos(TRES, "letras")).toEqual({ p1: "A.", s1: "1)", t1: "a.", t2: "b.", s2: "2)", t3: "a.", p2: "B." });
    expect([nivelDe(TRES[0]), nivelDe(TRES[1]), nivelDe(TRES[2])]).toEqual([0, 1, 2]);
    expect(nivelDe({ tipo: "titulo", nivel: 7 })).toBe(0); // lo raro vuelve a punto
    expect(estiloDeNivel("romanos", 2)).toBe("numeros");
    expect(NIVEL_MAXIMO).toBe(2);
    // Se guarda su nivel; el resumen lleva dos sangrías en el tercer nivel.
    const doc = documentoDePredica({ titulo: "x", fecha: "", serie: "", base: "", estado: "borrador", piezas: TRES });
    expect(doc.piezas.find((p) => p.id === "t1").nivel).toBe(2);
    expect(resumenDePuntos(TRES, 3)).toEqual(["I. La fe ve", SANGRIA_RESUMEN + "a) Ve lo invisible", SANGRIA_RESUMEN + SANGRIA_RESUMEN + "1. Como Moisés", SANGRIA_RESUMEN + SANGRIA_RESUMEN + "2. Como Abraham"]);
    // Por partes, el sub-subpunto va con su punto.
    expect(partesDelResumen(resumenDePuntos(TRES, 6), 6).map((p) => p.length)).toEqual([6, 1]);
  });

  it("cada nivel con su propia numeración; sin elegir, sigue al de arriba", () => {
    const TRES = [
      { id: "p1", tipo: "titulo", contenido: "La fe ve" },
      { id: "s1", tipo: "titulo", contenido: "Ve lo invisible", nivel: 1 },
      { id: "t1", tipo: "titulo", contenido: "Como Moisés", nivel: 2 },
    ];
    // Romanos, después números y después letras (el caso del usuario).
    expect(numerosDePuntos(TRES, "romanos", ["numeros-parentesis", "minusculas"])).toEqual({ p1: "I.", s1: "1)", t1: "a." });
    // Solo el segundo nivel elegido: el tercero sigue automático.
    expect(numerosDePuntos(TRES, "romanos", [null, "letras"])).toEqual({ p1: "I.", s1: "a)", t1: "A." });
    expect(estilosDeNiveles("romanos", null)).toEqual(["romanos", "minusculas-parentesis", "numeros"]);
    expect(nivelesValidos(["letras", "rara"])).toEqual(["letras", null]);
    expect(nivelesValidos(undefined)).toEqual([null, null]);
    expect(normalizarPredica("x", { numeracionNiveles: ["numeros"], piezas: [] }).numeracionNiveles).toEqual(["numeros", null]);
    expect(resumenDePuntos(TRES, 2, "romanos", ["numeros", "letras"])).toEqual(["I. La fe ve", SANGRIA_RESUMEN + "1. Ve lo invisible", SANGRIA_RESUMEN + SANGRIA_RESUMEN + "A. Como Moisés"]);
  });

  it("combinaciones ya hechas para los tres niveles, y cuál tiene la prédica", () => {
    const vista = (c) => c.estilos.map((s) => etiquetaPunto(1, s)).join(" ");
    expect(COMBINACIONES.map(vista)).toEqual(["I. A. 1.", "I. a) 1.", "I. 1) a.", "1. a) i.", "A. 1) a.", "1) a) i."]);
    // La de fábrica (sin niveles elegidos) es «Romanos y letras».
    expect(combinacionDe("romanos", null).clave).toBe("fabrica");
    expect(combinacionDe("romanos", ["numeros-parentesis", "minusculas"]).clave).toBe("romanos-numeros");
    expect(combinacionDe("romanos", ["letras", "letras"])).toBeNull();
    expect(datosDeCombinacion(COMBINACIONES[0])).toEqual({ numeracion: "romanos", numeracionNiveles: ["letras", "numeros"] });
  });

  it("el resumen por partes de 6 renglones, sin separar un punto de sus subpuntos", () => {
    const S = SANGRIA_RESUMEN;
    const ocho = ["I. a", "II. b", "III. c", "IV. d", "V. e", "VI. f", "VII. g", "VIII. h"];
    expect(partesDelResumen(ocho)).toEqual([ocho.slice(0, 6), ocho.slice(6)]);
    expect(partesDelResumen(ocho.slice(0, 6))).toHaveLength(1);
    expect(partesDelResumen([])).toEqual([]);
    // El punto V con sus dos subpuntos no cabe en la primera parte: pasa entero.
    const conSub = ["I. a", "II. b", "III. c", "IV. d", "V. e", S + "a) x", S + "b) y"];
    expect(partesDelResumen(conSub)).toEqual([["I. a", "II. b", "III. c", "IV. d"], ["V. e", S + "a) x", S + "b) y"]]);
    // Un punto que solo ya no cabe se parte (no hay otra forma).
    const largo = ["I. a", ...Array.from({ length: 7 }, (_, i) => S + i)];
    expect(partesDelResumen(largo).map((p) => p.length)).toEqual([6, 2]);
    expect(RENGLONES_RESUMEN).toBe(6);
  });

  it("numeración: escribir otro número lleva el ítem a ese lugar y los demás se corren", () => {
    const ids = (lista) => lista.map((p) => p.id);
    expect(ids(moverA(PIEZAS, 3, 0))).toEqual(["d", "a", "b", "c"]);
    expect(ids(moverA(PIEZAS, 0, 2))).toEqual(["b", "c", "a", "d"]);
    expect(moverA(PIEZAS, 1, 1)).toBe(PIEZAS);
    expect(moverA(PIEZAS, 1, 9)).toBe(PIEZAS);
    expect(posicionEscrita("3", 8)).toBe(2);
    expect(posicionEscrita(" 8 ", 8)).toBe(7);
    expect(posicionEscrita("9", 8)).toBeNull();
    expect(posicionEscrita("0", 8)).toBeNull();
    expect(posicionEscrita("", 8)).toBeNull();
    expect(posicionEscrita("2.5", 8)).toBeNull();
    expect(posicionEscrita("dos", 8)).toBeNull();
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
    expect(fechaLarga("2026-11-21")).toBe("Sábado 21 de noviembre");
    expect(fechaLarga("2026-11-15")).toBe("Domingo 15 de noviembre");
    expect(fechaLarga("")).toBe("");
    expect(hojaDeFecha("2026-11-15")).toEqual({ mes: "NOV", dia: 15, semana: "domingo" });
    expect(hojaDeFecha("2026-11-21")).toEqual({ mes: "NOV", dia: 21, semana: "sábado" });
    expect(hojaDeFecha("")).toBeNull();
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
  const n = { id: "n", tipo: "mensaje", contenido: "" };

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
