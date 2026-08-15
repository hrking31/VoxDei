// Roles de VOXDEI: fuente única de verdad.
//
// Cada iglesia es un grupo aislado. El pastor o pastora que se registra en
// ViewRegister queda como dueño y su uid se usa como groupId; todos los
// usuarios que él cree después heredan ese groupId y solo ven los datos de su
// propia iglesia.
//
// Jerarquía:
//   Pastor / Pastora  → dueño de la iglesia (se crea en el registro)
//   administrador     → delegado por el pastor, mismo poder de gestión
//   Asistente         → solo puede proyectar contenido

export const ROL_PASTOR = "Pastor";
export const ROL_PASTORA = "Pastora";
export const ROL_ADMINISTRADOR = "administrador";
export const ROL_ASISTENTE = "Asistente";

// Todos los roles válidos de la aplicación.
export const ROLES = [
  ROL_PASTOR,
  ROL_PASTORA,
  ROL_ADMINISTRADOR,
  ROL_ASISTENTE,
];

// Mandan en la iglesia: gestionan usuarios y prédicas.
export const ROLES_ADMIN = [ROL_PASTOR, ROL_PASTORA, ROL_ADMINISTRADOR];

// Pueden operar el proyector: ticker, mensajes, versículos, imágenes y estilos.
export const ROLES_OPERADOR = [...ROLES_ADMIN, ROL_ASISTENTE];

// Opciones que el dueño puede asignar al crear un usuario de su iglesia.
export const ROLES_ASIGNABLES = [
  ROL_PASTOR,
  ROL_PASTORA,
  ROL_ADMINISTRADOR,
  ROL_ASISTENTE,
];

// Nombres antiguos que pueden seguir guardados en la base de datos.
const ALIAS = {
  admin: ROL_ADMINISTRADOR,
};

// Devuelve el rol en su forma canónica. Tolera mayúsculas distintas, espacios
// sobrantes y el alias "admin" que se usaba antes, para no dejar fuera a los
// usuarios ya creados.
export function normalizarRol(rol) {
  if (typeof rol !== "string") return "";

  const limpio = rol.trim();
  const minusculas = limpio.toLowerCase();

  if (ALIAS[minusculas]) return ALIAS[minusculas];

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

// ¿Manda en la iglesia? (pastor, pastora o administrador delegado)
export function esAdmin(userData) {
  return tieneRol(userData, ROLES_ADMIN);
}
