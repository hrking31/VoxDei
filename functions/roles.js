// Roles de VOXDEI para las Cloud Functions.
//
// Espejo de src/Components/Roles/Roles.js. Se duplica a propósito: las
// funciones son un paquete CommonJS independiente y no comparten build con el
// frontend. Si cambias los roles allí, cámbialos también aquí.
//
// Solo hay dos niveles: Pastor / Pastora (todo) y Operador (proyectar).

const ROL_PASTOR = "Pastor";
const ROL_PASTORA = "Pastora";
const ROL_OPERADOR = "Operador";

const ROLES = [ROL_PASTOR, ROL_PASTORA, ROL_OPERADOR];

// Mandan en la iglesia: gestionan cuentas y contenido.
const ROLES_PASTORES = [ROL_PASTOR, ROL_PASTORA];

// Rol con el que nace todo usuario adicional creado desde ViewUsers.
const ROL_POR_DEFECTO = ROL_OPERADOR;

// Devuelve el rol en su forma canónica; tolera mayúsculas y espacios sobrantes.
function normalizarRol(rol) {
  if (typeof rol !== "string") return "";

  const limpio = rol.trim();
  const minusculas = limpio.toLowerCase();

  return ROLES.find((valido) => valido.toLowerCase() === minusculas) || limpio;
}

// ¿Es pastor o pastora? Es lo que habilita gestionar cuentas.
function esPastor(rol) {
  const normalizado = normalizarRol(rol);
  return ROLES_PASTORES.some((permitido) => permitido === normalizado);
}

module.exports = {
  ROL_PASTOR,
  ROL_PASTORA,
  ROL_OPERADOR,
  ROL_POR_DEFECTO,
  ROLES,
  ROLES_PASTORES,
  normalizarRol,
  esPastor,
};
