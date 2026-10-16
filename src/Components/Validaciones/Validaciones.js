// Largo mínimo de una contraseña nueva (registro y alta de usuarios).
//
// Firebase solo exige 6. Se comprueba al elegir una contraseña, nunca al
// iniciar sesión: las cuentas creadas antes con 6 siguen entrando igual.
// Su espejo en el servidor está en functions/index.js (LARGO_MINIMO_CLAVE).
export const LARGO_MINIMO_CLAVE = 8;

export const AVISO_CLAVE_CORTA = `La contraseña debe tener al menos ${LARGO_MINIMO_CLAVE} caracteres.`;
