import { ROLES_PASTORES, normalizarRol } from "../Roles/Roles.js";

// Lógica pura de la vista Usuarios (sin React).

// «Ana Gómez» → «AG»; «ana» → «A»; vacío → «?».
export function iniciales(nombre) {
  const partes = String(nombre || "").trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  const letras = partes.length === 1 ? [partes[0]] : [partes[0], partes[partes.length - 1]];
  return letras.map((p) => p[0]).join("").toLocaleUpperCase("es");
}

// El dueño es quien registró la iglesia: su uid es el groupId.
export const esDueno = (usuario) => Boolean(usuario) && usuario.id === usuario.groupId;

// Reparte a la gente en «pastores» (Pastor y Pastora) y «equipo» (el resto).
// En cada grupo el dueño va primero y luego el orden alfabético.
export function agruparEquipo(usuarios) {
  const orden = (a, b) =>
    Number(esDueno(b)) - Number(esDueno(a)) ||
    String(a.name || "").localeCompare(String(b.name || ""), "es");

  const lista = Array.isArray(usuarios) ? usuarios : [];
  const esDePastores = (u) => ROLES_PASTORES.includes(normalizarRol(u.role));

  return {
    pastores: lista.filter(esDePastores).sort(orden),
    equipo: lista.filter((u) => !esDePastores(u)).sort(orden),
  };
}

// Texto para el lector de pantalla: nombre, rol y si es el dueño o la propia persona.
export function etiquetaDePersona(usuario, miUid) {
  const extras = [];
  if (esDueno(usuario)) extras.push("dueño de la iglesia");
  if (usuario.id === miUid) extras.push("tú");
  return `${usuario.name}, ${usuario.role}${extras.length ? ` (${extras.join(", ")})` : ""}`;
}
