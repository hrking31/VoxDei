import {
  BookOpenIcon,
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  HomeIcon,
  MicrophoneIcon,
  MusicalNoteIcon,
  PaintBrushIcon,
  PhotoIcon,
  QuestionMarkCircleIcon,
  QueueListIcon,
  Squares2X2Icon,
  TagIcon,
  UserGroupIcon,
  VideoCameraIcon,
} from "@heroicons/react/24/solid";
import { esPastor } from "../Roles/Roles.js";

// Lista única de las secciones del panel. La usa la barra lateral, fija en el
// computador y desplegable con el botón de menú en el celular: una sección
// nueva se agrega aquí y aparece en los dos sitios, con el mismo filtro de roles.
//
// `tambien`: prefijos de otras rutas que pertenecen a la sección y deben dejar
// su ícono encendido. Dentro de una canción la dirección es /ViewCancion/…, no
// /ViewCanciones.

// Orden pedido por el usuario (9 de noviembre de 2026): primero se organiza
// el culto, luego se proyecta y al final se administra la iglesia.
export const GRUPOS = [
  { id: "organizar", nombre: "Organizar" },
  { id: "proyectar", nombre: "Proyectar" },
  { id: "administrar", nombre: "Administrar" },
];

export const INICIO = {
  ruta: "/ViewInicio",
  nombre: "Inicio",
  Icono: Squares2X2Icon,
};

// La entrada (Proyectar / Administrar). Está fuera del panel: se llega con el
// logo de la barra lateral, también en el celular.
export const MENU_INICIAL = {
  ruta: "/ViewSelector",
  nombre: "Menú inicial",
  Icono: HomeIcon,
};

// Cómo preparar la pantalla del servicio. No es una sección de trabajo: va
// abajo en la barra lateral.
export const AYUDA = {
  ruta: "/ViewAyuda",
  nombre: "Ayuda",
  Icono: QuestionMarkCircleIcon,
};

// En el orden en que se muestran, grupo por grupo.
export const SECCIONES = [
  {
    ruta: "/ViewCulto",
    nombre: "Orden del culto",
    Icono: QueueListIcon,
    grupo: "organizar",
  },
  {
    ruta: "/ViewCronograma",
    nombre: "Cronograma",
    Icono: CalendarDaysIcon,
    grupo: "organizar",
    tambien: ["/ViewServicioEditar"],
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
  { ruta: "/ViewUsers", nombre: "Usuarios", Icono: UserGroupIcon, grupo: "administrar" },
  { ruta: "/ViewStylos", nombre: "Estilos y colores", Icono: PaintBrushIcon, grupo: "administrar" },
];

// Prédica es solo de pastor y pastora: se oculta en vez de dejar que el
// operador entre y choque con la pantalla de acceso denegado.
export function seccionesPara(userData) {
  return SECCIONES.filter((s) => !s.soloPastores || esPastor(userData));
}

// A qué entrada del panel pertenece una dirección (sección, Inicio o Ayuda).
// La usan el título de la pestaña y la barra de arriba del celular.
export function seccionDeRuta(pathname) {
  return [INICIO, ...SECCIONES, AYUDA].find((s) => estaActiva(s, pathname));
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
