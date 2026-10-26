// Requisitos de una contraseña nueva (registro y alta de usuarios).
//
// Son copia exacta de la política de contraseñas de Firebase Auth (consola →
// Authentication → Configuración), que se aplica al registrarse y, con la
// actualización forzada, también al iniciar sesión. Si la app aceptara algo
// que Firebase rechaza, esa persona quedaría fuera en su siguiente inicio de
// sesión; por eso las reglas se escriben igual que las evalúa Firebase:
// - Mayúscula y minúscula cuentan solo de la A a la Z: la Ñ y las vocales con
//   tilde se pueden usar, pero no cuentan.
// - Los símbolos válidos son solo los de `allowedNonAlphanumericCharacters`
//   (https://identitytoolkit.googleapis.com/v2/passwordPolicy?key=...). Ni
//   `+`, ni `=`, ni el espacio están.
//
// Su espejo en el servidor está en functions/index.js: si cambia uno, cambia el
// otro, y también la política en la consola.
export const LARGO_MINIMO_CLAVE = 12;

export const SIMBOLOS_CLAVE = "^$*.[]{}()?\"!@#%&/\\,><':;|_~`-";

export const REQUISITOS_CLAVE = [
  {
    texto: `Al menos ${LARGO_MINIMO_CLAVE} caracteres`,
    cumple: (clave) => clave.length >= LARGO_MINIMO_CLAVE,
  },
  { texto: "Una mayúscula (A-Z)", cumple: (clave) => /[A-Z]/.test(clave) },
  { texto: "Una minúscula (a-z)", cumple: (clave) => /[a-z]/.test(clave) },
  { texto: "Un número (0-9)", cumple: (clave) => /[0-9]/.test(clave) },
  {
    texto: "Un símbolo",
    cumple: (clave) => [...clave].some((c) => SIMBOLOS_CLAVE.includes(c)),
  },
];

export const claveValida = (clave) =>
  REQUISITOS_CLAVE.every((requisito) => requisito.cumple(clave));

export const AVISO_CLAVE_DEBIL =
  "La contraseña no cumple los requisitos de seguridad.";
