// Achica una imagen en el navegador antes de subirla a Storage.
//
// Una foto de celular pesa de 3 a 8 MB y mide unos 4000 px de lado, cuando el
// proyector muestra como mucho 1920: se subía y descargaba todo ese peso de más
// (Storage cobra por ambas cosas) y la imagen tardaba en aparecer en pantalla.
//
// Lo que no se puede o no conviene tocar se devuelve tal cual: GIF (perdería la
// animación), SVG, formatos que el navegador no sabe leer (HEIC fuera de
// Safari) y fotos que ya pesan menos que el resultado.
export const LADO_PROYECCION = 1920;
export const LADO_PERFIL = 512;

const CALIDAD_JPEG = 0.85;

export async function comprimirImagen(archivo, ladoMaximo = LADO_PROYECCION) {
  if (!archivo?.type?.startsWith("image/") || /gif|svg/.test(archivo.type)) {
    return archivo;
  }

  let bitmap;
  try {
    // from-image respeta la orientación de la foto (EXIF): sin esto, las
    // tomadas con el celular vertical podían salir acostadas.
    bitmap = await createImageBitmap(archivo, { imageOrientation: "from-image" });
  } catch {
    return archivo;
  }

  const escala = Math.min(1, ladoMaximo / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * escala);
  canvas.height = Math.round(bitmap.height * escala);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  // El PNG sigue siendo PNG para no perder la transparencia (un logo sobre el
  // fondo de la proyección); todo lo demás pasa a JPEG, que pesa mucho menos.
  const tipo = archivo.type === "image/png" ? "image/png" : "image/jpeg";
  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, tipo, CALIDAD_JPEG)
  );

  if (!blob || blob.size >= archivo.size) return archivo;

  const extension = tipo === "image/png" ? "png" : "jpg";
  const nombre = archivo.name.replace(/\.[^.]+$/, "") + "." + extension;
  return new File([blob], nombre, { type: tipo });
}
