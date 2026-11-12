// TEMPORAL DHH (10-11-2026): lectura de la Biblia Dios Habla Hoy Estándar
// (DHHS94) directamente del repositorio público mrk214/bible-data-es-spa, sin
// subirla a Firestore (se pidió solo para el domingo 15-11-2026). Se borra junto
// con todo lo marcado «TEMPORAL DHH».
//
// El repositorio publica un único archivo con toda la Biblia (unos 8 MB, 1,9 MB
// comprimido). Se baja la primera vez que se consulta y queda en memoria
// mientras la pestaña esté abierta. Solo lo bajan los equipos que manejan el
// panel: la pantalla del templo recibe el texto ya listo por RTDB.
//
// En producción, la CSP de firebase.json debe permitir este dominio en
// connect-src, o el navegador bloquea la descarga.

export const URL_DHH = "https://mrk214.github.io/snapshots/es___spa___spa/DHHS94_vid_1846.json";

// Títulos que van como encabezado. Las etiquetas de los salmos («Del maestro de
// coro…», tipo `label`) se omiten, igual que en la RVR1960 cargada.
const TITULOS = new Set(["heading1", "heading2", "section1"]);

// Convierte un capítulo del archivo en lo mismo que guarda un documento de
// `biblia` en Firestore: { libro, capitulo, versiculos, chapter_html }.
// Cuando la DHH junta dos versículos (14–15), el texto queda en los dos números
// y el capítulo muestra «14-15». Devuelve null si el libro o el capítulo no
// existen.
export function capituloDeArchivo(datos, sigla, capitulo, nombreLibro) {
  const libro = datos?.books?.find((b) => b.usfm === sigla);
  const encontrado = libro?.chapters?.find((c) => c.usfm === `${sigla}.${capitulo}`);
  if (!encontrado) return null;

  const versiculos = {};
  let html = "";
  for (const item of encontrado.items || []) {
    const texto = (item.lines || []).join(" ").trim();
    if (!texto) continue;
    if (TITULOS.has(item.type)) {
      html += `<h2>${escapar(texto)}</h2>`;
    } else if (item.type === "verse" && item.verse_numbers?.length) {
      for (const numero of item.verse_numbers) versiculos[String(numero)] = texto;
      const numeros = item.verse_numbers;
      const rotulo = numeros.length > 1 ? `${numeros[0]}-${numeros[numeros.length - 1]}` : `${numeros[0]}`;
      html += `<p><b>${rotulo}</b> ${escapar(texto)}</p>`;
    }
  }
  if (!Object.keys(versiculos).length) return null;

  return {
    libro: nombreLibro || libro.human,
    capitulo: Number(capitulo),
    versiculos,
    chapter_html: html,
  };
}

function escapar(texto) {
  return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Una sola descarga aunque se pidan varios capítulos a la vez. Si falla (sin
// internet, el repositorio cambió), se olvida para poder reintentar.
let descarga = null;

export function cargarDHH(pedir = fetch) {
  if (!descarga) {
    descarga = pedir(URL_DHH)
      .then((respuesta) => {
        if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
        return respuesta.json();
      })
      .catch((error) => {
        descarga = null;
        throw error;
      });
  }
  return descarga;
}

// Solo para las pruebas: vuelve a empezar sin el archivo en memoria.
export function olvidarDHH() {
  descarga = null;
}

export async function leerCapituloDHH(sigla, capitulo, nombreLibro, pedir) {
  const datos = await cargarDHH(pedir);
  return capituloDeArchivo(datos, sigla, capitulo, nombreLibro);
}
