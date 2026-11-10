import { ref, set } from "firebase/database";
import { database } from "../Firebase/Firebase";

// Enciende o apaga la pantalla de espera del templo. La usan Cronograma e
// Inicio; quien la llame debe pasar antes por exigirTurno().
export function cambiarEspera(groupId, activa) {
  return set(ref(database, `displayEspera/${groupId}`), { activa });
}
