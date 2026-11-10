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

// Lista única de las secciones del panel. La usan la barra lateral
// (computador) y la barra inferior con «Más» (celular): una sección nueva se
// agrega aquí y aparece en los dos sitios, con el mismo filtro de roles.
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
// logo de la barra lateral y, en el celular, desde «Más».
export const MENU_INICIAL = {
  ruta: "/ViewSelector",
  nombre: "Menú inicial",
  Icono: HomeIcon,
};

// Cómo preparar la pantalla del servicio. No es una sección de trabajo: va
// abajo en la barra lateral y dentro de «Más» en el celular.
export const AYUDA = {
  ruta: "/ViewAyuda",
  nombre: "Ayuda",
  Icono: QuestionMarkCircleIcon,
};

// En el orden en que se muestran, grupo por grupo.
// `corto`: nombre para la barra inferior del celular, donde no cabe el largo.
export const SECCIONES = [
  {
    ruta: "/ViewCulto",
    nombre: "Orden del culto",
    corto: "Culto",
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

// A qué entrada del panel pertenece una dirección (sección, Inicio o Ayuda).
// La usan el título de la pestaña y el botón de volver a la anterior.
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
