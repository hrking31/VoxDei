import { useCallback, useState } from "react";

// Una preferencia de sí o no que se acuerda en este dispositivo (localStorage),
// por ejemplo «ocultar la pantalla del templo en esta vista». Nunca debe romper la
// vista: sin almacenamiento (ventana privada, datos bloqueados) funciona igual,
// solo que no se recuerda.
//   const [sinPantalla, setSinPantalla] = usePreferenciaLocal("voxdei.biblia.sinPantalla");
export function usePreferenciaLocal(clave, inicial = false) {
  const [valor, setValor] = useState(() => {
    try {
      const guardado = localStorage.getItem(clave);
      return guardado === null ? inicial : guardado === "1";
    } catch {
      return inicial;
    }
  });

  const cambiar = useCallback(
    (nuevo) => {
      setValor((previo) => {
        const siguiente = Boolean(typeof nuevo === "function" ? nuevo(previo) : nuevo);
        try {
          localStorage.setItem(clave, siguiente ? "1" : "0");
        } catch {
          // sin almacenamiento: solo se pierde la preferencia
        }
        return siguiente;
      });
    },
    [clave]
  );

  return [valor, cambiar];
}
