// Estilos de la pantalla de proyección.
//
// Este archivo es la fuente única: lo usan el panel de ajustes (ControlEstilos),
// el estado global (AppContext) y la pantalla real (ControlDisplay). Así la
// vista previa y lo que se ve en el templo se calculan igual y no divergen.
//
// Los tamaños van en porcentaje sobre el tamaño base de cada pantalla, de modo
// que siguen adaptándose al proyector, al escritorio o al celular.

export const ESTILOS_POR_DEFECTO = {
  fondo: {
    tipo: "solido", // solido | degradado
    color: "#000000",
    colorFinal: "#1b1b2f",
    direccion: "abajo", // abajo | derecha | diagonal
  },
  titulo: {
    color: "#ffffff",
    tamano: 100,
    negrita: true,
    mayusculas: false,
    alineacion: "center",
  },
  texto: {
    color: "#ffffff",
    tamano: 100,
    negrita: true,
    interlineado: 130,
    alineacion: "center",
  },
  versiculo: {
    colorTitulo: "#9ca3af",
    colorCita: "#facc15",
    tamanoCita: 100,
    mostrarCita: true,
  },
  ticker: {
    colorFondo: "#2563eb",
    colorTexto: "#ffffff",
    tamano: 100,
    altura: 100,
  },
  legibilidad: {
    sombra: 60,
    margen: 5,
    ajusteAutomatico: true,
  },
  transicion: {
    fundido: true,
    duracion: 400,
  },
};

export const TEMAS = {
  Clásico: {
    fondo: { tipo: "solido", color: "#000000" },
    titulo: { color: "#facc15" },
    texto: { color: "#ffffff" },
    ticker: { colorFondo: "#111827", colorTexto: "#ffffff" },
  },
  "Alto contraste": {
    fondo: { tipo: "solido", color: "#000000" },
    titulo: { color: "#ffffff" },
    texto: { color: "#ffff00" },
    ticker: { colorFondo: "#000000", colorTexto: "#ffffff" },
  },
  Claro: {
    fondo: { tipo: "solido", color: "#f8fafc" },
    titulo: { color: "#1e293b" },
    texto: { color: "#0f172a" },
    ticker: { colorFondo: "#1e293b", colorTexto: "#ffffff" },
  },
  Cálido: {
    fondo: { tipo: "degradado", color: "#2b1055", colorFinal: "#7597de" },
    titulo: { color: "#ffd76e" },
    texto: { color: "#ffffff" },
    ticker: { colorFondo: "#1a0b33", colorTexto: "#ffd76e" },
  },
};

// Completa lo que venga de la base de datos con los valores por defecto, para
// que un ajuste guardado con una versión anterior no deje campos vacíos.
export function combinarEstilos(guardados) {
  if (!guardados) return ESTILOS_POR_DEFECTO;

  const resultado = {};

  for (const grupo of Object.keys(ESTILOS_POR_DEFECTO)) {
    resultado[grupo] = {
      ...ESTILOS_POR_DEFECTO[grupo],
      ...(guardados[grupo] || {}),
    };
  }

  return resultado;
}

const DIRECCIONES = {
  abajo: "to bottom",
  derecha: "to right",
  diagonal: "135deg",
};

// Fondo de la pantalla: color plano o degradado.
export function fondoDe(estilos) {
  const { fondo } = estilos;

  if (fondo.tipo === "degradado") {
    return {
      backgroundImage: `linear-gradient(${
        DIRECCIONES[fondo.direccion] || "to bottom"
      }, ${fondo.color}, ${fondo.colorFinal})`,
    };
  }

  return { backgroundColor: fondo.color };
}

// Sombra del texto: lo que permite leerlo sobre fondos claros o fotos.
export function sombraDe(estilos) {
  const { sombra } = estilos.legibilidad;
  if (!sombra) return "none";

  return `0 2px ${sombra / 10}px rgba(0,0,0,${sombra / 100})`;
}

// Multiplica un tamaño base (que puede ser un clamp) por el porcentaje elegido.
export function escalar(base, porcentaje) {
  return `calc(${base} * ${(porcentaje ?? 100) / 100})`;
}
