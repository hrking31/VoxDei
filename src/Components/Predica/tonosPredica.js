// Un color por estado de la prédica, en estilo «tonal» (fondo del color al
// 10 %, borde y letra del mismo color, como la franja verde del turno). Pedido
// del usuario, 11 de noviembre de 2026. Lo usan la lista y los filtros
// (BibliotecaPredicas), el botón de estado del bosquejo (EditorPredica) y el
// círculo punteado del calendario (`borde`, CalendarioPredicas).
//
//   Borrador      naranja la estás preparando
//   Terminada     azul    preparada, falta predicarla
//   Predicada     verde   ya se predicó
//   Sin predicar  rojo    pasó la fecha y no se marcó predicada
//   Todas (filtro) claro, sin color de estado
//
// El borrador fue dorado hasta el 12-11-2026: el usuario lo cambió a naranja
// porque el dorado es el acento de la app.
//
// Las clases van completas (nada de `bg-${color}`) para que Tailwind las vea.
const TONOS = {
  todas: {
    chip: "border-app-texto bg-app-texto/10 text-app-texto",
    letra: "text-app-texto",
  },
  borrador: {
    chip: "border-app-naranja bg-app-naranja/10 text-app-naranja",
    letra: "text-app-naranja",
    halo: "ring-app-naranja/25",
    abierta: "border-app-naranja bg-app-naranja/15",
    punto: "bg-app-naranja",
    borde: "border-app-naranja",
  },
  terminada: {
    chip: "border-app-azul bg-app-azul/10 text-app-azul",
    letra: "text-app-azul",
    halo: "ring-app-azul/25",
    abierta: "border-app-azul bg-app-azul/15",
    punto: "bg-app-azul",
    borde: "border-app-azul",
  },
  predicada: {
    chip: "border-app-success bg-app-success/10 text-app-success",
    letra: "text-app-success",
    halo: "ring-app-success/25",
    abierta: "border-app-success bg-app-success/15",
    punto: "bg-app-success",
    borde: "border-app-success",
  },
  "sin-predicar": {
    chip: "border-app-error bg-app-error/10 text-app-error",
    letra: "text-app-error",
    halo: "ring-app-error/25",
    abierta: "border-app-error bg-app-error/15",
    punto: "bg-app-error",
    borde: "border-app-error",
  },
};

export const tonoDe = (estado) => TONOS[estado] || TONOS.borrador;
