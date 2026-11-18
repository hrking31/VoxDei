// Lógica pura de la guía de la pantalla del templo (sin React ni Firebase).
// Replica las decisiones de ControlDisplay para saber qué ocupa el centro.

// Secciones que proyectan y por eso llevan la guía a la derecha (computador).
// Prédica no está: su púlpito ya trae la suya. Tampoco la lista de canciones
// (solo gestiona) ni el editor: la de una canción abierta sí. Se compara en
// minúsculas porque React Router no distingue mayúsculas.
const PREFIJOS_CON_GUIA = [
  "/viewculto",
  "/viewversiculo",
  "/viewmessage",
  "/viewticker",
  "/viewimagenes",
  "/viewvideo",
  "/viewcancion/",
];

export function rutaConGuia(pathname) {
  const ruta = String(pathname || "").toLowerCase();
  return PREFIJOS_CON_GUIA.some((prefijo) => ruta === prefijo || ruta.startsWith(prefijo.endsWith("/") ? prefijo : `${prefijo}/`));
}

// La miniatura de YouTube (i.ytimg.com ya está permitida en la CSP).
export const miniaturaDeVideo = (videoId) => `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`;

// «single» trae una imagen; «carousel», varias (igual que ControlDisplay).
export function imagenesDeNodo(datos) {
  if (!datos) return [];
  if (datos.type === "carousel" && Array.isArray(datos.images)) return datos.images;
  return datos.image ? [datos.image] : [];
}

// Lo que ocupa el centro del templo, en la forma que entiende PantallaPrevia
// (o null si no hay nada). Mismo orden de prioridad que ControlDisplay:
// espera > video > imagen > texto (mensaje, prédica o versículo).
export function piezaDelCentro(espejo, visibles, indiceImagen = 0) {
  if (visibles.espera) return { tipo: "mensaje", contenido: "Pantalla de espera" };

  if (visibles.video && espejo.video?.videoId) {
    return { tipo: "imagen", contenido: { url: miniaturaDeVideo(espejo.video.videoId), nombre: espejo.video.titulo || "Video" } };
  }

  const imagenes = espejo.imagenes || [];
  const imagen = imagenes.length ? imagenes[indiceImagen % imagenes.length] : null;
  if (visibles.imagen && imagen) return { tipo: "imagen", contenido: { url: imagen, nombre: "Imagen" } };

  if (!visibles.texto) return null;
  if (espejo.display === "mensaje") return espejo.mensaje ? { tipo: "mensaje", contenido: espejo.mensaje } : null;
  if (espejo.display === "mensajePredica") {
    return espejo.mensajePredica ? { tipo: "mensaje", contenido: espejo.mensajePredica, alineacion: espejo.alineacion || undefined } : null;
  }
  if (espejo.display === "versiculo") {
    return espejo.versiculo ? { tipo: "versiculo", contenido: { cita: espejo.cita, texto: espejo.versiculo } } : null;
  }
  return null;
}

// ¿Se ve algo en el templo? El título no sale en la pantalla de espera.
export function seVeAlgo(centro, espejo, visibles) {
  return Boolean(centro) || Boolean(visibles.titulo && !visibles.espera && espejo.titulo) || Boolean(visibles.ticker && espejo.ticker);
}
