import { serverTimestamp, setDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "../Firebase/Firebase";
import { PERFIL, PERFIL_DATOS, docIglesia } from "../Firebase/RutasIglesia";
import { LADO_PERFIL, comprimirImagen } from "../ComprimirImagen/ComprimirImagen.js";
import { normalizarSigla } from "./datosIglesia.js";

// Guarda nombre, sigla y, si se eligió uno nuevo, el logo de la iglesia.
// El logo va en imagenes/{groupId}/, la carpeta de la iglesia en Storage, que
// ya se borra entera si la iglesia se elimina (eliminarMiCuenta).
export async function guardarDatosIglesia(groupId, { nombre, sigla, logoArchivo }) {
  const datos = { nombre: nombre.trim(), sigla: normalizarSigla(sigla), actualizado: serverTimestamp() };

  if (logoArchivo) {
    const destino = ref(storage, `imagenes/${groupId}/logo-iglesia`);
    await uploadBytes(destino, await comprimirImagen(logoArchivo, LADO_PERFIL));
    datos.logo = await getDownloadURL(destino);
  }

  await setDoc(docIglesia(groupId, PERFIL, PERFIL_DATOS), datos, { merge: true });
  return datos;
}
