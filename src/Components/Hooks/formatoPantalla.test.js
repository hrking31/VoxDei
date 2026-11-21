import { afterEach, describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { esAnchoCompacto, esAnchoReducido, esAnchoSoloIconos, esApaisada, useAnchoCompacto, useAnchoReducido, useAnchoSoloIconos, useApaisado, useTabletaGrande, esBaja, esEscritorio, esIPadConTeclado, esTabletaGrande, esTactil, formatoDe } from "./formatoPantalla.js";

describe("el formato de la pantalla del panel", () => {
  it("toda tableta táctil, de cualquier tamaño, es «tableta»: también el iPad Air, el Pro de 11 y el de 12,9 acostado", () => {
    [744, 820, 834, 1024, 1180, 1194, 1366, 1376].forEach((ancho) => expect(formatoDe(ancho, true), String(ancho)).toBe("tableta"));
    // Más allá del iPad más grande, y los PC con mouse, siguen siendo escritorio
    expect(formatoDe(1501, true)).toBe("escritorio");
    // El Surface Pro (1368 a 1440 px según la escala)
    expect(formatoDe(1368, true)).toBe("tableta");
    expect(formatoDe(1440, true)).toBe("tableta");
    expect(formatoDe(1366, false)).toBe("escritorio");
    expect(formatoDe(1024, false)).toBe("escritorio");
    // Un celular táctil sigue siendo celular
    expect(formatoDe(390, true)).toBe("celular");
    expect(formatoDe(743, true)).toBe("celular");
  });

  it("el panel de escritorio (isDesktop) no incluye a las tabletas, ni a una pantalla baja", () => {
    expect(esEscritorio(1024, true)).toBe(false);
    expect(esEscritorio(1376, true)).toBe(false); // iPad Pro de 13" acostado
    expect(esEscritorio(1366, true)).toBe(false);
    expect(esEscritorio(1024, false)).toBe(true);
    expect(esEscritorio(900, false)).toBe(false);
    expect(esBaja(1180, 820, true)).toBe(false); // una tableta no es «baja»
  });

  it("celular hasta 743, tableta de 744 a 1023, escritorio desde 1024", () => {
    expect(formatoDe(390)).toBe("celular");
    expect(formatoDe(743)).toBe("celular");
    expect(formatoDe(744)).toBe("tableta"); // iPad mini de pie
    expect(formatoDe(1023)).toBe("tableta");
    expect(formatoDe(1024)).toBe("escritorio");
    expect(formatoDe(1366)).toBe("escritorio"); // iPad Pro acostado
  });

  it("baja: solo el escritorio con menos de 800 de alto (un PC de 1280×720)", () => {
    expect(esBaja(1280, 720)).toBe(true);
    expect(esBaja(1366, 768)).toBe(true);
    expect(esBaja(1280, 900)).toBe(false);
    expect(esBaja(744, 600)).toBe(false); // una tableta no es «baja»
  });
});

describe("tabletas acostadas", () => {
  it("apaisada: más ancha que alta", () => {
    expect(esApaisada(1133, 744)).toBe(true);
    expect(esApaisada(744, 1133)).toBe(false);
    expect(esApaisada(800, 800)).toBe(false);
  });

  it("grande: acostada y de 1180 px en adelante (iPad Air y Pro); el mini acostado (1133) no", () => {
    expect(esTabletaGrande(1133, 744)).toBe(false);
    expect(esTabletaGrande(1180, 820)).toBe(true);
    expect(esTabletaGrande(1194, 834)).toBe(true);
    expect(esTabletaGrande(1366, 1024)).toBe(true);
    // De pie nunca es grande, aunque sea alto
    expect(esTabletaGrande(1024, 1366)).toBe(false);
  });
});

describe("un iPad con teclado y trackpad", () => {
  const poner = (userAgent, puntos) => {
    Object.defineProperty(navigator, "userAgent", { value: userAgent, configurable: true });
    Object.defineProperty(navigator, "maxTouchPoints", { value: puntos, configurable: true });
  };
  const original = { ua: navigator.userAgent, puntos: navigator.maxTouchPoints };
  it("se presenta como un Mac pero con pantalla táctil: se reconoce; un Mac de verdad, no", () => {
    poner("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15", 5);
    expect(esIPadConTeclado()).toBe(true);
    poner("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15", 0);
    expect(esIPadConTeclado()).toBe(false);
    // Un PC con Windows táctil no es un iPad
    poner("Mozilla/5.0 (Windows NT 10.0; Win64; x64)", 10);
    expect(esIPadConTeclado()).toBe(false);
    poner(original.ua, original.puntos);
  });
});

describe("esTactil: también un Surface Pro con el teclado puesto", () => {
  const original = window.matchMedia;
  const conPunteros = (activos) => {
    window.matchMedia = (consulta) => ({ matches: activos.includes(consulta), media: consulta, addEventListener() {}, removeEventListener() {} });
  };
  it("el puntero principal táctil, o algún puntero táctil (el Surface con trackpad), cuentan; un PC sin pantalla táctil, no", () => {
    conPunteros(["(pointer: coarse)"]);
    expect(esTactil()).toBe(true);
    // Surface Pro con el teclado: el principal es fino, pero hay pantalla táctil
    conPunteros(["(pointer: fine)", "(any-pointer: coarse)"]);
    expect(esTactil()).toBe(true);
    // Un PC con mouse
    conPunteros(["(pointer: fine)", "(any-pointer: fine)"]);
    expect(esTactil()).toBe(false);
    window.matchMedia = original;
  });
});

describe("los mismos puntos de quiebre en el computador", () => {
  it("compacto por debajo de 1180 px (el mismo límite de las tabletas grandes); de 1180 en adelante, completo", () => {
    expect(esAnchoCompacto(1024)).toBe(true);
    expect(esAnchoCompacto(1133)).toBe(true); // el iPad mini acostado
    expect(esAnchoCompacto(1179)).toBe(true);
    expect(esAnchoCompacto(1180)).toBe(false);
    expect(esAnchoCompacto(1366)).toBe(false);
    expect(esAnchoCompacto(1920)).toBe(false);
  });
});

describe("el diseño completo del computador empieza en 1600 px", () => {
  it("reducido (como tableta) por debajo de 1600; completo de ahí en adelante", () => {
    expect(esAnchoReducido(1180)).toBe(true);
    expect(esAnchoReducido(1366)).toBe(true);
    expect(esAnchoReducido(1599)).toBe(true);
    expect(esAnchoReducido(1600)).toBe(false);
    expect(esAnchoReducido(1920)).toBe(false);
  });
});

describe("los botones de control de Predicar: solo íconos por debajo de 1200 px", () => {
  it("1199 solo íconos; 1200 con texto", () => {
    expect(esAnchoSoloIconos(1133)).toBe(true);
    expect(esAnchoSoloIconos(1180)).toBe(true);
    expect(esAnchoSoloIconos(1199)).toBe(true);
    expect(esAnchoSoloIconos(1200)).toBe(false);
    expect(esAnchoSoloIconos(1366)).toBe(false);
  });
});

describe("los ganchos que reaccionan al tamaño de la ventana", () => {
  const original = { ancho: window.innerWidth, alto: window.innerHeight };
  afterEach(() => {
    window.innerWidth = original.ancho;
    window.innerHeight = original.alto;
  });
  const poner = (ancho, alto) => {
    window.innerWidth = ancho;
    window.innerHeight = alto;
  };
  const cambiar = (ancho, alto) =>
    act(() => {
      poner(ancho, alto);
      window.dispatchEvent(new Event("resize"));
    });

  it("useApaisado: lee el tamaño al montar y se actualiza al girar", () => {
    poner(744, 1133);
    const { result } = renderHook(() => useApaisado());
    expect(result.current).toBe(false);
    cambiar(1133, 744);
    expect(result.current).toBe(true);
    // También con el aviso de orientación de los dispositivos
    act(() => {
      poner(744, 1133);
      window.dispatchEvent(new Event("orientationchange"));
    });
    expect(result.current).toBe(false);
  });

  it("useTabletaGrande: acostada y de 1180 px en adelante", () => {
    poner(1133, 744);
    const { result } = renderHook(() => useTabletaGrande());
    expect(result.current).toBe(false);
    cambiar(1180, 820);
    expect(result.current).toBe(true);
    cambiar(1024, 1366); // de pie, aunque sea alto
    expect(result.current).toBe(false);
  });

  it("useAnchoCompacto, useAnchoSoloIconos y useAnchoReducido cambian en 1180, 1200 y 1600 px", () => {
    poner(1100, 800);
    const compacto = renderHook(() => useAnchoCompacto());
    const soloIconos = renderHook(() => useAnchoSoloIconos());
    const reducido = renderHook(() => useAnchoReducido());
    expect([compacto.result.current, soloIconos.result.current, reducido.result.current]).toEqual([true, true, true]);
    cambiar(1190, 800);
    expect([compacto.result.current, soloIconos.result.current, reducido.result.current]).toEqual([false, true, true]);
    cambiar(1200, 800);
    expect([compacto.result.current, soloIconos.result.current, reducido.result.current]).toEqual([false, false, true]);
    cambiar(1600, 900);
    expect([compacto.result.current, soloIconos.result.current, reducido.result.current]).toEqual([false, false, false]);
  });

  it("al desmontar dejan de escuchar la ventana", () => {
    poner(1100, 800);
    const { result, unmount } = renderHook(() => useAnchoCompacto());
    unmount();
    cambiar(1700, 900);
    expect(result.current).toBe(true); // se quedó con el último valor, sin errores
  });
});
