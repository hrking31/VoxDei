// Los dígitos de siete segmentos del reloj del púlpito (ver RelojSegmentos.jsx). Es un archivo aparte
// porque un archivo de componentes solo puede exportar componentes (refresco en caliente de Vite).
//
//      aaa
//     f   b
//      ggg
//     e   c
//      ddd

// Cada segmento es un hexágono alargado (extremos en punta), en un dígito de 50 × 90.
export const SEGMENTOS = {
  a: "5.5,4.5 10,0 40,0 44.5,4.5 40,9 10,9",
  g: "5.5,45 10,40.5 40,40.5 44.5,45 40,49.5 10,49.5",
  d: "5.5,85.5 10,81 40,81 44.5,85.5 40,90 10,90",
  f: "4.5,5.5 9,10 9,40 4.5,44.5 0,40 0,10",
  b: "45.5,5.5 50,10 50,40 45.5,44.5 41,40 41,10",
  e: "4.5,45.5 9,50 9,80 4.5,84.5 0,80 0,50",
  c: "45.5,45.5 50,50 50,80 45.5,84.5 41,80 41,50",
};

// Qué segmentos se encienden en cada cifra.
export const ENCENDIDOS = {
  0: "abcdef",
  1: "bc",
  2: "abged",
  3: "abgcd",
  4: "fgbc",
  5: "afgcd",
  6: "afgecd",
  7: "abc",
  8: "abcdefg",
  9: "abcdfg",
};
