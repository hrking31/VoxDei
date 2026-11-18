import { useAuth } from "../Context/AuthContext";
import { useAppContext } from "../Context/AppContext";
import { useTurno } from "../Hooks/useTurno.js";
import { useFormato } from "../Hooks/formatoPantalla.js";
import { useRanuraGuia } from "../PantallaGuia/AccionesGuia.js";
import { iniciarEnsayo, terminarEnsayo } from "./AccionesEnsayo.js";
import { estadoFranja } from "./utilesFranja.js";
import VistaFranja from "./VistaFranja.jsx";

// Franja que dice de quién es el turno de proyectar. Va arriba del Cronograma
// y de cada panel que envía a la pantalla. El color depende de quién mira: con
// el servicio de Laura, el pastor y Laura la ven verde («Turno de Laura» / «Tu
// turno») y otro operador, roja. Los textos salen de estadoFranja y el dibujo
// de VistaFranja, los mismos que enseña la Ayuda.
//
// Botones del ensayo, según el caso:
// - Sin servicio ni ensayo, un operador lo inicia para sí mismo (para dárselo a
//   otro, desde el Cronograma).
// - Con el ensayo de otro, un operador lo toma, previa confirmación: si quien
//   lo tenía ya se fue, nadie se queda bloqueado esperándolo.
// - Lo termina quien lo tiene o un pastor.
//
// En el celular no se pinta (el servicio y la pantalla ya van en la barra de
// arriba de la app), salvo con `siempre`, que usa el Cronograma porque ahí se
// gestiona el ensayo.
//
// Donde hay guía del templo (computador, secciones que proyectan) la franja
// va arriba de su columna derecha (`enGuia`, 18-11-2026, pedido del usuario),
// como en el púlpito de Prédica; las demás instancias de esa sección se callan.
export default function FranjaTurno({ siempre = false, enGuia = false }) {
  const { user, userData } = useAuth();
  const { formato } = useFormato();
  const hayGuia = Boolean(useRanuraGuia());
  const { showNotif, confirmAction } = useAppContext();
  const { turno } = useTurno();
  const yo = { uid: user?.uid, nombre: userData?.name || "Operador" };

  const ejecutar = async (accion, exito) => {
    try {
      await accion();
      if (exito) showNotif("success", exito);
    } catch (error) {
      console.error("Error en el ensayo:", error);
      showNotif("error", "No se pudo cambiar el ensayo. Revisa tu conexión.");
    }
  };

  const alPulsar = async (clave) => {
    if (clave === "iniciar") {
      ejecutar(() => iniciarEnsayo(userData.groupId, yo, user.uid), "Ensayo iniciado: ya puedes proyectar.");
    } else if (clave === "tomar") {
      const ok = await confirmAction(`${turno.nombre} tiene el ensayo. ¿Quieres tomarlo?`);
      if (ok) ejecutar(() => iniciarEnsayo(userData.groupId, yo, user.uid), "Ahora el ensayo es tuyo.");
    } else if (clave === "terminar") {
      ejecutar(() => terminarEnsayo(userData.groupId), "Ensayo terminado.");
    }
  };

  if (formato === "celular" && !siempre) return null;
  if (hayGuia && !enGuia) return null;

  return <VistaFranja estado={estadoFranja(turno, userData, user?.uid)} alPulsar={alPulsar} />;
}
