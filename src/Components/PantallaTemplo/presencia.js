// Presencia de la pantalla del templo (9 de noviembre de 2026; cinco estados
// desde el 10 de noviembre de 2026).
//
// Cada ventana de /VOXDEI abierta anota en RTDB, bajo
// pantallaTemplo/{groupId}/{idVentana}, en qué modo está (`modo`). Con
// onDisconnect, la nota se borra sola al cerrar la ventana o perder la conexión
// (si el corte es brusco, Firebase puede tardar hasta un minuto). Así cualquier
// dispositivo de la iglesia sabe cómo está la pantalla, sin mirar el proyector.

export const NODO_PANTALLA = "pantallaTemplo";

// Estados, de mejor a peor. "apagada" no es un modo de ventana: es que no hay
// ninguna abierta.
//   encendida:  en pantalla completa (el botón de la app, o F11 en computador)
//   maximizada: ocupa la pantalla, pero se ven las barras del navegador
//   ventana:    se ve, pero no ocupa la pantalla
//   oculta:     abierta, pero minimizada, en otra pestaña o tapada
export const MODOS = ["encendida", "maximizada", "ventana", "oculta"];

// Si hay varias ventanas abiertas, manda la que esté mejor. Devuelve su nota
// ({ modo, dispositivo, por }) o null si no hay ninguna.
export function ventanaPrincipal(ventanas) {
  const lista = Object.values(ventanas || {}).filter(Boolean);
  if (!lista.length) return null;
  const rango = (v) => (MODOS.includes(v.modo) ? MODOS.indexOf(v.modo) : MODOS.indexOf("ventana"));
  return lista.reduce((mejor, v) => (rango(v) < rango(mejor) ? v : mejor));
}

export function estadoPantalla(ventanas) {
  const principal = ventanaPrincipal(ventanas);
  if (!principal) return "apagada";
  return MODOS.includes(principal.modo) ? principal.modo : "ventana";
}

export const TEXTO_ESTADO = {
  apagada: "Apagada",
  oculta: "OCULTA",
  ventana: "VENTANA",
  maximizada: "MAXIMIZADA",
  encendida: "COMPLETA", // la clave sigue siendo "encendida": pantalla completa
};

// Margen en píxeles para comparar la ventana con la pantalla: Windows cuenta
// los bordes de una ventana maximizada por fuera de la pantalla, y los
// navegadores redondean.
const TOLERANCIA = 8;

// Decide el modo de la ventana con lo que cuenta el navegador. Función pura
// para poder probarla; los datos los junta leerModo() en usePresenciaPantalla.
//   oculta:   document.visibilityState === "hidden"
//   completa: hay un elemento en pantalla completa (Fullscreen API)
//   movil:    celular o tablet, donde no hay ventanas
//   interior / exterior: { ancho, alto } de innerWidth/Height y outerWidth/Height
//   pantalla: window.screen
export function modoVentana({ oculta, completa, movil, interior, exterior, pantalla }) {
  if (oculta) return "oculta";
  if (completa) return "encendida";

  if (movil) {
    // En el celular la página ocupa siempre la pantalla, salvo con la pantalla
    // dividida. El ancho de la pantalla depende de cómo esté girado.
    const anchoPantalla =
      interior.ancho > interior.alto
        ? Math.max(pantalla.width, pantalla.height)
        : Math.min(pantalla.width, pantalla.height);
    return interior.ancho < anchoPantalla * 0.9 ? "ventana" : "maximizada";
  }

  // F11: el navegador no lo informa como pantalla completa, pero la página
  // ocupa la pantalla entera, sin barras.
  if (interior.ancho >= pantalla.width - TOLERANCIA && interior.alto >= pantalla.height - TOLERANCIA) {
    return "encendida";
  }
  const maximizada =
    exterior.ancho >= pantalla.availWidth - TOLERANCIA && exterior.alto >= pantalla.availHeight - TOLERANCIA;
  return maximizada ? "maximizada" : "ventana";
}

// Título del aviso de la pantalla del templo (AvisoPantalla, 10 de noviembre
// de 2026): solo el estado al que llegó, con una mini pantalla animada.
export const AVISO_ESTADO = {
  encendida: "Pantalla completa",
  maximizada: "Modo maximizado",
  ventana: "Modo ventana",
  oculta: "Pantalla oculta",
  apagada: "Pantalla apagada",
};

// Hay aviso en cada cambio de estado, salvo al cargar (antes = null). Ahora
// también entre ventana y maximizada: cada aviso dice solo el estado nuevo.
export function avisoDeCambio(antes, ahora) {
  if (!antes || antes === ahora) return null;
  return { antes, ahora };
}

// Cuánto dura el aviso. La línea que se vacía (--animate-cuenta-aviso en
// index.css) dura lo mismo: si cambias uno, cambia el otro.
export const DURACION_AVISO = 2000;

// Qué clase de equipo está proyectando, para saberlo desde otro.
export function tipoDispositivo(navegador = globalThis.navigator, ancho = globalThis.innerWidth) {
  const agente = navegador?.userAgent || "";
  if (/iPad|Tablet/i.test(agente) || (/Android/i.test(agente) && !/Mobile/i.test(agente))) return "tablet";
  if (navegador?.userAgentData?.mobile || /Mobi|iPhone|Android/i.test(agente)) return "celular";
  return ancho && ancho < 768 ? "celular" : "computador";
}
