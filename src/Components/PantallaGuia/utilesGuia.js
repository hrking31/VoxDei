// Lógica pura de la guía de la pantalla del templo (sin React ni Firebase).
// Replica las decisiones de ControlDisplay para saber qué ocupa el centro.

import { ventanaPrincipal } from "../PantallaTemplo/presencia.js";
import { tipoDePantalla } from "../ControlDisplay/tamanosPantalla.js";

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
    return espejo.versiculo
      ? { tipo: "versiculo", contenido: { cita: espejo.cita, texto: espejo.versiculo, titulo: espejo.tituloVersiculo || "", version: espejo.version || "RVR1960" } }
      : null;
  }
  return null;
}

// Los tamaños de letra de la pantalla real se miden en `vw` (ancho de la
// ventana). Dentro de la escena, la «ventana» es la escena misma, que es un
// contenedor: `cqw` hace ese papel y las letras miden lo mismo que en el templo.
export const aContenedor = (tamanos) =>
  Object.fromEntries(Object.entries(tamanos).map(([clave, valor]) => [clave, typeof valor === "string" ? valor.replace(/vw/g, "cqw") : valor]));

// Las medidas de la pantalla del templo para dibujar la escena: las que anota
// la ventana que proyecta (la mejor de todas, como en el estado de la
// pantalla). Sin ventana abierta, o con una anterior a este dato, se supone un
// proyector de 1920×1080.
export const MEDIDAS_POR_DEFECTO = { ancho: 1920, alto: 1080, tipo: "proyector" };

export function medidasDeTemplo(ventanas) {
  const principal = ventanaPrincipal(ventanas);
  const ancho = Number(principal?.ancho);
  const alto = Number(principal?.alto);
  if (!(ancho > 0) || !(alto > 0)) return MEDIDAS_POR_DEFECTO;
  return { ancho, alto, tipo: tipoDePantalla({ ancho, alto, dispositivo: principal.dispositivo }) };
}

// ¿Cabe el texto en la pantalla? Se mide sobre la escena a tamaño real:
//   limite: hasta dónde llega el espacio útil (sin el margen de seguridad de abajo)
//   fondo:  dónde termina de verdad lo que se dibujó
//   bloque: alto del texto; hueco: alto del espacio que le toca en el centro
// «no-cabe»: se sale y el proyector lo cortaría. «justo»: ocupa el 90 % o más de
// su espacio, casi sin aire. «bien»: el resto.
export const UMBRAL_JUSTO = 0.9;
export function evaluarCabida({ limite, fondo, bloque, hueco }) {
  if (!(limite > 0)) return "bien";
  if (fondo > limite + 1) return "no-cabe";
  if (hueco > 0 && bloque / hueco >= UMBRAL_JUSTO) return "justo";
  return "bien";
}

// ¿Se ve algo en el templo? El título no sale en la pantalla de espera.
export function seVeAlgo(centro, espejo, visibles) {
  return Boolean(centro) || Boolean(visibles.titulo && !visibles.espera && espejo.titulo) || Boolean(visibles.ticker && espejo.ticker);
}
