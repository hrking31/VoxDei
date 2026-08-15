// Roles de VOXDEI para las Cloud Functions.
//
// Espejo de src/Components/Roles/Roles.js. Se duplica a propósito: las
// funciones son un paquete CommonJS independiente y no comparten build con el
// frontend. Si cambias los roles allí, cámbialos también aquí.

const ROL_PASTOR = "Pastor";
const ROL_PASTORA = "Pastora";
const ROL_ADMINISTRADOR = "administrador";
const ROL_ASISTENTE = "Asistente";

const ROLES = [ROL_PASTOR, ROL_PASTORA, ROL_ADMINISTRADOR, ROL_ASISTENTE];

// Mandan en la iglesia: gestionan usuarios y prédicas.
const ROLES_ADMIN = [ROL_PASTOR, ROL_PASTORA, ROL_ADMINISTRADOR];

// Nombres antiguos que pueden seguir guardados en la base de datos.
const ALIAS = {
  admin: ROL_ADMINISTRADOR,
};

// Devuelve el rol en su forma canónica; tolera el alias "admin" que se usaba antes.
function normalizarRol(rol) {
  if (typeof rol !== "string") return "";

  const limpio = rol.trim();
  const minusculas = limpio.toLowerCase();

  if (ALIAS[minusculas]) return ALIAS[minusculas];

  return ROLES.find((valido) => valido.toLowerCase() === minusculas) || limpio;
}

// ¿Este rol manda en la iglesia? (pastor, pastora o administrador delegado)
function esAdmin(rol) {
  const normalizado = normalizarRol(rol);
  return ROLES_ADMIN.some((permitido) => permitido === normalizado);
}

module.exports = {
  ROL_PASTOR,
  ROL_PASTORA,
  ROL_ADMINISTRADOR,
  ROL_ASISTENTE,
  ROLES,
  ROLES_ADMIN,
  normalizarRol,
  esAdmin,
};
