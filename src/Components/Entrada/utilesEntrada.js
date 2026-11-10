// Textos de la pantalla de entrada. Funciones puras para probarlas.

// Saludo según la hora del dispositivo.
export function saludoSegunHora(fecha = new Date()) {
  const hora = fecha.getHours();
  if (hora < 12) return "Buenos días";
  if (hora < 19) return "Buenas tardes";
  return "Buenas noches";
}

// Solo el primer nombre: el saludo nunca se alarga.
export function primerNombre(nombre) {
  return String(nombre || "").trim().split(/\s+/)[0] || "";
}

// Iniciales para el círculo cuando no hay foto: «Hernando Rey» → «HR».
export function iniciales(nombre) {
  const partes = String(nombre || "").trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return "?";
  const primera = partes[0][0];
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primera + ultima).toLocaleUpperCase("es");
}
