// Roles de VOXDEI: fuente única de verdad.
//
// Cada iglesia es un grupo aislado. El pastor o pastora que se registra en
// ViewRegister queda como dueño y su uid se usa como groupId; todos los
// usuarios que él cree después heredan ese groupId y solo ven los datos de su
// propia iglesia.
//
// Solo hay dos niveles (15 de agosto de 2026):
//   Pastor / Pastora  → todos los permisos, incluida la gestión de cuentas
//   Operador          → maneja la proyección; nada de cuentas ni de prédicas
//
// Se eliminaron "administrador" (nivel intermedio que no se usaba) y el nombre
// "Asistente", sustituido por "Operador" porque describe lo que hace.

export const ROL_PASTOR = "Pastor";
export const ROL_PASTORA = "Pastora";
export const ROL_OPERADOR = "Operador";

// Todos los roles válidos de la aplicación.
export const ROLES = [ROL_PASTOR, ROL_PASTORA, ROL_OPERADOR];

// Mandan en la iglesia: gestionan cuentas, prédicas y todo lo demás.
export const ROLES_PASTORES = [ROL_PASTOR, ROL_PASTORA];

// Pueden manejar el proyector: ticker, mensajes, versículos, imágenes, estilos.
export const ROLES_PROYECCION = [...ROLES_PASTORES, ROL_OPERADOR];

// Rol con el que nace cualquier usuario adicional de la iglesia.
export const ROL_POR_DEFECTO = ROL_OPERADOR;

// Devuelve el rol de la pareja pastoral que falta. Solo el dueño puede dar de
// alta a su contraparte, y una sola vez.
export function rolDeLaPareja(rol) {
  return normalizarRol(rol) === ROL_PASTOR ? ROL_PASTORA : ROL_PASTOR;
}

// Devuelve el rol en su forma canónica. Tolera mayúsculas distintas y espacios
// sobrantes, para que una diferencia de escritura no deje a nadie fuera.
export function normalizarRol(rol) {
  if (typeof rol !== "string") return "";

  const limpio = rol.trim();
  const minusculas = limpio.toLowerCase();

  return ROLES.find((valido) => valido.toLowerCase() === minusculas) || limpio;
}

// ¿El usuario tiene alguno de los roles indicados?
// Sin userData devuelve false: nunca se concede acceso a ciegas.
export function tieneRol(userData, rolesPermitidos = []) {
  if (!userData) return false;

  const rol = normalizarRol(userData.role);
  if (!rol) return false;

  return rolesPermitidos.some((permitido) => normalizarRol(permitido) === rol);
}

// ¿Es pastor o pastora? Es lo que habilita gestionar cuentas y prédicas.
export function esPastor(userData) {
  return tieneRol(userData, ROLES_PASTORES);
}

// ¿Es la cuenta que registró la iglesia? Su uid es el groupId, así que las
// reglas la reconocen como dueña y no se puede eliminar ni degradar.
export function esDuenoDeLaIglesia(userData) {
  if (!userData?.uid || !userData?.groupId) return false;
  return userData.uid === userData.groupId;
}
