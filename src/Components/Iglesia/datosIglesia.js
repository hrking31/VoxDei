// Datos de la iglesia (9 de noviembre de 2026): nombre, nombre corto o sigla
// y logo. Viven en iglesias/{groupId}/perfil/datos. Antes solo existía
// `churchName`, copiado en la ficha de cada usuario: se usa de respaldo para
// las iglesias registradas antes de esta fecha.

export const LARGO_SIGLA = 8;

// «c.d.p» → «CDP»; «camino 21» → «CAMINO21». Solo letras y números, en
// mayúsculas, hasta LARGO_SIGLA.
export function normalizarSigla(texto) {
  return String(texto || "")
    .toLocaleUpperCase("es")
    .replace(/[^A-ZÁÉÍÓÚÜÑ0-9]/g, "")
    .slice(0, LARGO_SIGLA);
}

export function datosDeIglesia(iglesia, userData) {
  return {
    nombre: iglesia?.nombre || userData?.churchName || "",
    sigla: iglesia?.sigla || "",
    logo: iglesia?.logo || "",
  };
}
