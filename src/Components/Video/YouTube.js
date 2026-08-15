// Utilidades para los videos de YouTube.
//
// El panel de control y la pantalla de proyección comparten este archivo para
// que ambos entiendan los enlaces igual.

// Saca el identificador del video de cualquier forma de enlace de YouTube.
// Devuelve null si no reconoce el enlace.
export function idDeYouTube(entrada) {
  const texto = String(entrada || "").trim();
  if (!texto) return null;

  const patrones = [
    /youtu\.be\/([\w-]{11})/, // youtu.be/ID
    /[?&]v=([\w-]{11})/, // youtube.com/watch?v=ID
    /youtube\.com\/embed\/([\w-]{11})/, // incrustado
    /youtube\.com\/shorts\/([\w-]{11})/, // shorts
    /youtube\.com\/live\/([\w-]{11})/, // transmisiones
  ];

  for (const patron of patrones) {
    const encontrado = texto.match(patron);
    if (encontrado) return encontrado[1];
  }

  // Por si pegan directamente el identificador
  return /^[\w-]{11}$/.test(texto) ? texto : null;
}

// Miniatura del video, para la lista de videos guardados.
export function miniaturaDe(videoId) {
  return `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
}

// Carga el script del reproductor de YouTube una sola vez y avisa cuando está
// listo. YouTube exige su propia API para poder pausar o adelantar desde fuera.
let promesaApi = null;

export function cargarApiYouTube() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (promesaApi) return promesaApi;

  promesaApi = new Promise((resolve, reject) => {
    const anterior = window.onYouTubeIframeAPIReady;

    window.onYouTubeIframeAPIReady = () => {
      if (typeof anterior === "function") anterior();
      resolve(window.YT);
    };

    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => {
      promesaApi = null;
      reject(new Error("No se pudo cargar el reproductor de YouTube"));
    };

    document.head.appendChild(script);
  });

  return promesaApi;
}

// Cuánto puede desviarse la proyección antes de reajustarla, en segundos.
// Por debajo de esto no vale la pena saltar: se notaría más el salto que el
// desfase.
export const TOLERANCIA_SEGUNDOS = 1.5;
