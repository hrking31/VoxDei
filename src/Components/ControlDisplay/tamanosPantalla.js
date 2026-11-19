// Tamaños base de la pantalla del templo según el tipo de pantalla, como valores
// CSS: los ajustes de Estilos y colores los multiplican por su porcentaje (ver
// `escalar` en EstilosProyeccion.js). Los usan la pantalla real (ControlDisplay)
// y la guía (PantallaGuia/EscenaGuia): una sola tabla para que nunca se
// desajusten. Sacada de ControlDisplay el 18-11-2026, sin cambiar los números.
export const TAMANOS_PANTALLA = {
  proyector: {
    text: "clamp(2.5rem,4vw,4rem)",
    title: "clamp(3rem,5vw,5rem)",
    verseTitle: "clamp(1.8rem,3vw,2.3rem)",
    verseCite: "clamp(1.4rem,2.5vw,1.8rem)",
    tickerText: "clamp(1.8rem,3vw,2.3rem)",
    tickerHeight: "clamp(3.5rem,6vw,4rem)",
    speed: 1.4,
  },
  desktop: {
    text: "clamp(1.5rem,3vw,2.5rem)",
    title: "clamp(2rem,4vw,3rem)",
    verseTitle: "clamp(1.2rem,2.5vw,1.6rem)",
    verseCite: "clamp(1rem,2vw,1.3rem)",
    tickerText: "clamp(1.2rem,2.5vw,1.6rem)",
    tickerHeight: "clamp(2.5rem,4vw,3rem)",
    speed: 1.2,
  },
  movil: {
    text: "clamp(1rem,2.5vw,1.25rem)",
    title: "clamp(1.2rem,3vw,1.5rem)",
    verseTitle: "1rem",
    verseCite: "0.875rem",
    tickerText: "1rem",
    tickerHeight: "2.5rem",
    speed: 0.6,
  },
};

// El tipo de pantalla, con la misma regla de useScreenType pero desde los datos
// que la ventana del templo anota en su presencia (ancho, alto y clase de
// equipo), para poder calcularlo desde otro dispositivo.
export function tipoDePantalla({ ancho, alto, dispositivo = "computador" }) {
  const ladoCorto = Math.min(ancho, alto);
  if (dispositivo === "computador" && ladoCorto >= 900 && ancho >= 1280) return "proyector";
  if (dispositivo !== "computador" && ladoCorto < 820) return "movil";
  return "desktop";
}
