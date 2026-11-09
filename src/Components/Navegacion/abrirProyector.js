// Abre la pantalla del templo (/VOXDEI) en una ventana aparte. La usan la
// entrada (ViewSelector) y la barra lateral. Con el mismo nombre de ventana,
// pulsarlo otra vez reutiliza la ventana abierta en vez de abrir otra.
export const VENTANA_PROYECTOR = "VisorProyector";

const OPCIONES = [
  "width=900",
  "height=600",
  "menubar=no",
  "toolbar=no",
  "location=no",
  "status=no",
  "scrollbars=no",
  "resizable=no",
].join(",");

export function abrirProyector() {
  window.open("/VOXDEI", VENTANA_PROYECTOR, OPCIONES);
}
