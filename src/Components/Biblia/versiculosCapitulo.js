// Los versículos de un capítulo, en orden, a partir de su HTML (`chapter_html`).
// Los usa el celular de Biblia para pasar de versículo en versículo con
// «Anterior» y «Siguiente» (18-11-2026, pedido del usuario). Lee el HTML con la
// misma regla con la que ControlVersiculo lo dibuja (renderCapitulo):
//   <h2>   el título de la sección, que va con el versículo que sigue
//   <p>    un versículo: su primer hijo trae el número («1», o «14-15» en la DHH)
//          y lo demás es el texto.
// Devuelve [{ numero: "1", texto: "En el principio…", titulo: "" }, …].
export function versiculosDeCapitulo(html) {
  if (!html || typeof DOMParser === "undefined") return [];
  const documento = new DOMParser().parseFromString(String(html), "text/html");
  const lista = [];
  let tituloPendiente = "";

  for (const nodo of documento.body.children) {
    if (nodo.tagName === "H2") {
      tituloPendiente = nodo.childNodes[0]?.data || "";
    } else if (nodo.tagName === "P") {
      const numero = nodo.childNodes[0]?.childNodes?.[0]?.data || null;
      if (!numero) continue;
      const texto = [...nodo.childNodes]
        .slice(1)
        .map((hijo) => hijo.data || hijo.childNodes?.[0]?.data || "")
        .join(" ")
        .trim();
      lista.push({ numero, texto, titulo: tituloPendiente });
      tituloPendiente = "";
    }
  }
  return lista;
}
