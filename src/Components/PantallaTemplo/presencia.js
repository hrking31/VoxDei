// Presencia de la pantalla del templo (9 de noviembre de 2026).
//
// Cada ventana de /VOXDEI abierta anota en RTDB, bajo
// pantallaTemplo/{groupId}/{idVentana}, que está encendida y si está en
// pantalla completa. Con onDisconnect, la nota se borra sola al cerrar la
// ventana o perder la conexión (si el corte es brusco, Firebase puede tardar
// hasta un minuto). Así cualquier dispositivo de la iglesia sabe si la pantalla
// está encendida, sin mirar el proyector.

export const NODO_PANTALLA = "pantallaTemplo";

// apagada: ninguna ventana | sin-completa: abierta como ventana normal |
// encendida: al menos una en pantalla completa.
export function estadoPantalla(ventanas) {
  const lista = Object.values(ventanas || {});
  if (!lista.length) return "apagada";
  return lista.some((v) => v?.completa) ? "encendida" : "sin-completa";
}

export const TEXTO_ESTADO = {
  apagada: "Apagada",
  "sin-completa": "Pantalla completa",
  encendida: "Encendida",
};

// Aviso de 2 segundos al cambiar de estado, o null si no hay que avisar.
export function avisoDeCambio(antes, ahora) {
  if (!antes || antes === ahora) return null;
  if (ahora === "apagada") return { tipo: "info", texto: "Se apagó la pantalla del templo" };
  if (ahora === "sin-completa") {
    return antes === "apagada"
      ? { tipo: "warning", texto: "Falta pantalla completa: toca el centro de la pantalla del templo" }
      : { tipo: "warning", texto: "La pantalla del templo salió de pantalla completa" };
  }
  return antes === "apagada"
    ? { tipo: "success", texto: "Se encendió la pantalla del templo" }
    : { tipo: "success", texto: "La pantalla del templo está en pantalla completa" };
}

export const DURACION_AVISO = 2000;

// Qué clase de equipo está proyectando, para saberlo desde otro.
export function tipoDispositivo(navegador = globalThis.navigator, ancho = globalThis.innerWidth) {
  const agente = navegador?.userAgent || "";
  if (/iPad|Tablet/i.test(agente) || (/Android/i.test(agente) && !/Mobile/i.test(agente))) return "tablet";
  if (navegador?.userAgentData?.mobile || /Mobi|iPhone|Android/i.test(agente)) return "celular";
  return ancho && ancho < 768 ? "celular" : "computador";
}
