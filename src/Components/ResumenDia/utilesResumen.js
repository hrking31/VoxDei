// Textos del resumen del día (Inicio). Funciones puras para probarlas sin red.

// La tarjeta «Servicio», a partir de contenidoEspera (PantallaEspera).
export function textoServicio(contenido) {
  const quien = contenido.operador
    ? `Maneja la pantalla: ${contenido.operador}`
    : "Sin operador asignado";

  switch (contenido.modo) {
    case "enCurso":
      return { principal: `${contenido.nombre} · en curso`, detalle: quien };
    case "cuenta":
      return {
        principal: `${contenido.nombre} empieza en ${contenido.cuenta}`,
        detalle: `${contenido.hora} · ${quien}`,
      };
    case "fecha":
      return {
        principal: `${contenido.nombre}: ${contenido.dia}, ${contenido.hora}`,
        detalle: quien,
      };
    default:
      return { principal: "No hay servicios en el cronograma", detalle: "" };
  }
}

// «1 paso», «3 pasos»; «1 canción», «2 canciones».
export function cantidad(n, singular, plural) {
  return `${n} ${n === 1 ? singular : plural}`;
}
