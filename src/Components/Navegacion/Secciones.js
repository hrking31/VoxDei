import {
  BookOpenIcon,
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  MicrophoneIcon,
  MusicalNoteIcon,
  PaintBrushIcon,
  PhotoIcon,
  QueueListIcon,
  Squares2X2Icon,
  TagIcon,
  UserGroupIcon,
  VideoCameraIcon,
} from "@heroicons/react/24/solid";
import { esPastor } from "../Roles/Roles.js";

// Lista única de las secciones del panel. La usan la cuadrícula de Gestión
// (celular) y la barra lateral (computador): una sección nueva se agrega aquí
// y aparece en los dos sitios, con el mismo filtro de roles.
//
// `tambien`: prefijos de otras rutas que pertenecen a la sección y deben dejar
// su ícono encendido. Dentro de una canción la dirección es /ViewCancion/…, no
// /ViewCanciones.

export const GRUPOS = [
  { id: "proyectar", nombre: "Proyectar" },
  { id: "organizar", nombre: "Organizar" },
];

export const INICIO = {
  ruta: "/ViewGestion",
  nombre: "Inicio",
  Icono: Squares2X2Icon,
};

// `corto`: nombre para la barra inferior del celular, donde no cabe el largo.
export const SECCIONES = [
  {
    ruta: "/ViewCulto",
    nombre: "Orden del culto",
    corto: "Culto",
    Icono: QueueListIcon,
    grupo: "proyectar",
  },
  { ruta: "/ViewVersiculo", nombre: "Biblia", Icono: BookOpenIcon, grupo: "proyectar" },
  {
    ruta: "/ViewCanciones",
    nombre: "Canciones",
    Icono: MusicalNoteIcon,
    grupo: "proyectar",
    tambien: ["/ViewCancion/", "/ViewCancionEditar"],
  },
  { ruta: "/ViewMessage", nombre: "Mensajes", Icono: ChatBubbleLeftRightIcon, grupo: "proyectar" },
  { ruta: "/ViewTicker", nombre: "Ticker", Icono: TagIcon, grupo: "proyectar" },
  { ruta: "/ViewImagenes", nombre: "Imágenes", Icono: PhotoIcon, grupo: "proyectar" },
  { ruta: "/ViewVideo", nombre: "Video", Icono: VideoCameraIcon, grupo: "proyectar" },
  {
    ruta: "/ViewPredica",
    nombre: "Prédica",
    Icono: MicrophoneIcon,
    grupo: "proyectar",
    soloPastores: true,
  },
  {
    ruta: "/ViewCronograma",
    nombre: "Cronograma",
    Icono: CalendarDaysIcon,
    grupo: "organizar",
    tambien: ["/ViewServicioEditar"],
  },
  { ruta: "/ViewUsers", nombre: "Usuarios", Icono: UserGroupIcon, grupo: "organizar" },
  { ruta: "/ViewStylos", nombre: "Estilos y colores", Icono: PaintBrushIcon, grupo: "organizar" },
];

// Barra inferior del celular: estas cuatro, en este orden, con el Orden del
// culto en el centro (más grande). Las demás van en «Más».
export const EN_BARRA_INFERIOR = ["/ViewVersiculo", "/ViewCanciones", "/ViewCulto", "/ViewMessage"];
export const CENTRO_BARRA_INFERIOR = "/ViewCulto";

export function reparto(userData) {
  const todas = seccionesPara(userData);
  return {
    enBarra: EN_BARRA_INFERIOR.map((ruta) => todas.find((s) => s.ruta === ruta)).filter(Boolean),
    enMas: todas.filter((s) => !EN_BARRA_INFERIOR.includes(s.ruta)),
  };
}

// Prédica es solo de pastor y pastora: se oculta en vez de dejar que el
// operador entre y choque con la pantalla de acceso denegado.
export function seccionesPara(userData) {
  return SECCIONES.filter((s) => !s.soloPastores || esPastor(userData));
}

// Las rutas de React Router no distinguen mayúsculas (App registra
// /viewTicker y se navega a /ViewTicker), así que aquí tampoco.
export function estaActiva(seccion, pathname) {
  const actual = pathname.toLowerCase();
  if (actual === seccion.ruta.toLowerCase()) return true;
  return (seccion.tambien || []).some((prefijo) =>
    actual.startsWith(prefijo.toLowerCase())
  );
}
