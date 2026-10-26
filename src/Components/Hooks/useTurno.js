import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../Context/AuthContext";
import { useAppContext } from "../Context/AppContext";
import {
  puedeProyectar,
  turnoActual,
} from "../Cronograma/UtilesCronograma.js";

// Cada cuánto se vuelve a mirar el reloj. Con 30 s el turno cambia como mucho
// medio minuto tarde, y no se re-dibuja la pantalla a cada segundo.
const INTERVALO_MS = 30 * 1000;

// Turno actual del cronograma y si este usuario puede proyectar ahora.
//
//   const { turno, puedoProyectar } = useTurno();
//
// Los datos los suscribe InicializarEstados; aquí solo se combinan con la hora
// del servidor (no la del dispositivo: ver desfaseReloj).
export function useTurno() {
  const { user, userData } = useAuth();
  const { servicios, ensayo, desfaseReloj, showNotif } = useAppContext();
  const [ahora, setAhora] = useState(() => Date.now() + desfaseReloj);

  useEffect(() => {
    const actualizar = () => setAhora(Date.now() + desfaseReloj);
    actualizar();
    const temporizador = setInterval(actualizar, INTERVALO_MS);
    return () => clearInterval(temporizador);
  }, [desfaseReloj]);

  // Se recalcula también cuando cambian el ensayo o el cronograma, sin esperar
  // al reloj. Un ensayo recién iniciado lleva la hora del servidor, que puede
  // ir hasta 30 s por delante de `ahora`; ensayoVigente lo da por bueno igual.
  const turno = useMemo(
    () => turnoActual(servicios, ensayo, ahora),
    [servicios, ensayo, ahora]
  );

  const puedoProyectar = puedeProyectar(turno, userData, user?.uid);

  // Guardia para el inicio de cada función que escribe en la pantalla:
  //   if (!exigirTurno()) return;
  // Si no es tu turno, avisa por qué y devuelve false.
  const exigirTurno = () => {
    if (puedoProyectar) return true;
    showNotif(
      "warning",
      turno.tipo === "libre"
        ? "No hay servicio en curso: inicia un ensayo para poder proyectar."
        : `Ahora es el turno de ${turno.nombre || "otro operador"}: no puedes proyectar.`
    );
    return false;
  };

  return { turno, puedoProyectar, exigirTurno };
}
