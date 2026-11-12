import { useEffect, useState } from "react";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, addDoc, serverTimestamp, onSnapshot, query, where } from "firebase/firestore";
import { db, storage } from "../Firebase/Firebase.js";
import { comprimirImagen, LADO_PROYECCION } from "../ComprimirImagen/ComprimirImagen.js";

// Las imágenes de la iglesia, compartidas por la sección Imágenes y Prédica
// (11 de noviembre de 2026; antes la subida vivía solo en ControlImagenes).
// Cada una: el archivo en Storage `imagenes/{groupId}/…` y un documento en la
// colección raíz `imagenes` con { groupId, url, name, storagePath, createdAt }.

// Comprime, sube y registra una imagen. Devuelve { url, nombre, storagePath }.
export async function subirImagen(groupId, original) {
  if (!groupId) throw new Error("Falta la iglesia para subir la imagen.");
  const archivo = await comprimirImagen(original, LADO_PROYECCION);
  const storagePath = `imagenes/${groupId}/${Date.now()}-${archivo.name}`;
  const referencia = storageRef(storage, storagePath);
  await uploadBytes(referencia, archivo);
  const url = await getDownloadURL(referencia);
  await addDoc(collection(db, "imagenes"), {
    groupId,
    url,
    name: archivo.name,
    storagePath,
    createdAt: serverTimestamp(),
  });
  return { url, nombre: archivo.name, storagePath };
}

// Más recientes primero; las recién creadas aún no tienen la hora del
// servidor y van arriba. (Un `orderBy` en la consulta exigiría un índice
// compuesto que el proyecto no declara.)
export const ordenarImagenes = (imagenes) =>
  [...imagenes].sort((a, b) => (b.createdAt?.seconds ?? Infinity) - (a.createdAt?.seconds ?? Infinity));

// Escucha las imágenes de la iglesia mientras `activo` (p. ej., con la ventana
// abierta). `null` mientras cargan.
export function useImagenesIglesia(groupId, activo = true) {
  const [imagenes, setImagenes] = useState(null);

  useEffect(() => {
    if (!groupId || !activo) return undefined;
    const consulta = query(collection(db, "imagenes"), where("groupId", "==", groupId));
    return onSnapshot(
      consulta,
      (snap) => {
        const lista = [];
        snap.forEach((documento) => lista.push({ id: documento.id, ...documento.data() }));
        setImagenes(ordenarImagenes(lista));
      },
      (error) => {
        console.error("No se pudieron cargar las imágenes:", error);
        setImagenes([]);
      }
    );
  }, [groupId, activo]);

  return imagenes;
}
