import { describe, expect, it } from "vitest";
import {
  AVISO_ESTADO,
  avisoDeCambio,
  estadoPantalla,
  modoVentana,
  tipoDispositivo,
  ventanaPrincipal,
} from "./presencia.js";

describe("estadoPantalla", () => {
  it("sin ventanas está apagada", () => {
    expect(estadoPantalla(null)).toBe("apagada");
    expect(estadoPantalla({})).toBe("apagada");
  });

  it("con una ventana, su modo", () => {
    for (const modo of ["oculta", "ventana", "maximizada", "encendida"]) {
      expect(estadoPantalla({ a: { modo } })).toBe(modo);
    }
  });

  it("con varias ventanas manda la que esté mejor", () => {
    expect(estadoPantalla({ a: { modo: "oculta" }, b: { modo: "encendida" } })).toBe("encendida");
    expect(estadoPantalla({ a: { modo: "ventana" }, b: { modo: "maximizada" } })).toBe("maximizada");
    expect(estadoPantalla({ a: { modo: "oculta" }, b: { modo: "ventana" } })).toBe("ventana");
  });

  it("una nota sin modo cuenta como abierta en ventana", () => {
    expect(estadoPantalla({ a: { completa: true } })).toBe("ventana");
  });
});

describe("modoVentana", () => {
  // Monitor de 1920 × 1080 con la barra de tareas de 40 px.
  const pantalla = { width: 1920, height: 1080, availWidth: 1920, availHeight: 1040 };
  const computador = (interior, exterior, extra = {}) =>
    modoVentana({ oculta: false, completa: false, movil: false, interior, exterior, pantalla, ...extra });

  it("oculta manda sobre todo, incluso sobre pantalla completa", () => {
    expect(computador({ ancho: 1920, alto: 1080 }, { ancho: 1920, alto: 1080 }, { oculta: true, completa: true })).toBe("oculta");
  });

  it("pantalla completa con el botón o con F11", () => {
    expect(computador({ ancho: 800, alto: 600 }, { ancho: 816, alto: 700 }, { completa: true })).toBe("encendida");
    expect(computador({ ancho: 1920, alto: 1080 }, { ancho: 1920, alto: 1080 })).toBe("encendida");
  });

  it("maximizada, con los bordes de Windows por fuera de la pantalla", () => {
    expect(computador({ ancho: 1920, alto: 955 }, { ancho: 1936, alto: 1056 })).toBe("maximizada");
  });

  it("en ventana si no ocupa la pantalla", () => {
    expect(computador({ ancho: 1200, alto: 700 }, { ancho: 1216, alto: 800 })).toBe("ventana");
  });

  it("en el celular: maximizada salvo con la pantalla dividida", () => {
    const celular = { width: 390, height: 844, availWidth: 390, availHeight: 844 };
    const movil = (interior) =>
      modoVentana({ oculta: false, completa: false, movil: true, interior, exterior: interior, pantalla: celular });
    expect(movil({ ancho: 390, alto: 700 })).toBe("maximizada");
    expect(movil({ ancho: 844, alto: 340 })).toBe("maximizada"); // girado
    expect(movil({ ancho: 420, alto: 340 })).toBe("ventana"); // girado y dividido
  });
});

describe("avisoDeCambio", () => {
  it("no avisa al cargar ni si no cambia nada", () => {
    expect(avisoDeCambio(null, "encendida")).toBeNull();
    expect(avisoDeCambio("apagada", "apagada")).toBeNull();
  });

  it("avisa en cada cambio, también entre ventana y maximizada", () => {
    expect(avisoDeCambio("apagada", "encendida")).toEqual({ antes: "apagada", ahora: "encendida" });
    expect(avisoDeCambio("encendida", "oculta")).toEqual({ antes: "encendida", ahora: "oculta" });
    expect(avisoDeCambio("ventana", "maximizada")).toEqual({ antes: "ventana", ahora: "maximizada" });
    expect(avisoDeCambio("maximizada", "ventana")).toEqual({ antes: "maximizada", ahora: "ventana" });
  });

  it("cada estado tiene su título corto", () => {
    expect(AVISO_ESTADO).toEqual({
      encendida: "Pantalla completa",
      maximizada: "Modo maximizado",
      ventana: "Modo ventana",
      oculta: "Pantalla oculta",
      apagada: "Pantalla apagada",
    });
  });
});

describe("ventanaPrincipal", () => {
  it("elige la ventana que esté mejor", () => {
    const ventanas = {
      a: { modo: "oculta", dispositivo: "celular", por: "Luis" },
      b: { modo: "encendida", dispositivo: "computador", por: "Ana Gómez" },
    };
    expect(ventanaPrincipal(ventanas).por).toBe("Ana Gómez");
    expect(ventanaPrincipal(null)).toBeNull();
  });
});

describe("tipoDispositivo", () => {
  it("reconoce celular, tablet y computador", () => {
    expect(tipoDispositivo({ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)" }, 390)).toBe("celular");
    expect(tipoDispositivo({ userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile" }, 412)).toBe("celular");
    expect(tipoDispositivo({ userAgent: "Mozilla/5.0 (Linux; Android 14; SM-X200)" }, 1200)).toBe("tablet");
    expect(tipoDispositivo({ userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }, 1920)).toBe("computador");
  });
});
