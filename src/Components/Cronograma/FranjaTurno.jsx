import { ClockIcon } from "@heroicons/react/24/solid";
import { useAuth } from "../Context/AuthContext";
import { useAppContext } from "../Context/AppContext";
import { useTurno } from "../Hooks/useTurno.js";
import { esPastor } from "../Roles/Roles.js";
import { iniciarEnsayo, terminarEnsayo } from "./AccionesEnsayo.js";
import { textoHora } from "./UtilesCronograma.js";

// Franja que dice de quién es el turno de proyectar y, si no es tuyo, por qué
// no puedes. Va arriba del Cronograma y de cada panel que envía a la pantalla.
//
// Botones del ensayo, según el caso:
// - Sin servicio ni ensayo, un operador lo inicia para sí mismo (para dárselo a
//   otro, desde el Cronograma).
// - Con el ensayo de otro, un operador lo toma, previa confirmación: si quien
//   lo tenía ya se fue, nadie se queda bloqueado esperándolo.
// - Lo termina quien lo tiene o un pastor.
export default function FranjaTurno() {
  const { user, userData } = useAuth();
  const { showNotif, confirmAction } = useAppContext();
  const { turno, puedoProyectar } = useTurno();

  const pastor = esPastor(userData);
  const esMio = turno.uid && turno.uid === user?.uid;
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

  const tomar = async () => {
    const ok = await confirmAction(
      `${turno.nombre} tiene el ensayo. ¿Quieres tomarlo?`
    );
    if (ok) {
      ejecutar(
        () => iniciarEnsayo(userData.groupId, yo, user.uid),
        "Ahora el ensayo es tuyo."
      );
    }
  };

  let titulo;
  if (turno.tipo === "servicio") {
    const s = turno.servicio;
    titulo = !turno.uid
      ? "Servicio sin operador asignado"
      : esMio
        ? "Tu turno"
        : `Turno de ${turno.nombre}`;
    titulo += ` · ${textoHora(s.inicio)} – ${textoHora(s.fin)}`;
  } else if (turno.tipo === "ensayo") {
    titulo = `${esMio ? "Tu ensayo" : `Ensayo de ${turno.nombre}`} · hasta ${new Date(
      turno.hasta
    ).toLocaleTimeString("es", { hour: "numeric", minute: "2-digit" })}`;
  } else {
    titulo = "Sin servicio en curso";
  }

  let detalle = "";
  if (!puedoProyectar) {
    detalle =
      turno.tipo === "libre"
        ? "Inicia un ensayo para poder proyectar."
        : "No puedes proyectar ahora.";
  } else if (pastor && !esMio) {
    detalle = "Puedes proyectar como pastor.";
  }

  const boton =
    "shrink-0 px-2 py-1 text-xs font-bold rounded inset-shadow-sm transition";

  return (
    <div
      className={`shrink-0 flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm border-b ${
        puedoProyectar
          ? "bg-app-success/10 border-app-success text-app-success"
          : "bg-app-error/10 border-app-error text-app-error"
      }`}
      role="status"
    >
      <ClockIcon className="w-4 h-4 shrink-0" />
      <div className="flex-1 min-w-0 leading-tight">
        <p className="font-bold truncate">{titulo}</p>
        {detalle && <p className="text-app-muted truncate">{detalle}</p>}
      </div>

      {turno.tipo === "libre" && !pastor && (
        <button
          onClick={() =>
            ejecutar(
              () => iniciarEnsayo(userData.groupId, yo, user.uid),
              "Ensayo iniciado: ya puedes proyectar."
            )
          }
          className={`${boton} text-app-main inset-shadow-app-main hover:bg-app-main hover:text-app-dark`}
        >
          Iniciar ensayo
        </button>
      )}

      {turno.tipo === "ensayo" && !esMio && !pastor && (
        <button
          onClick={tomar}
          className={`${boton} text-app-main inset-shadow-app-main hover:bg-app-main hover:text-app-dark`}
        >
          Tomar ensayo
        </button>
      )}

      {turno.tipo === "ensayo" && (esMio || pastor) && (
        <button
          onClick={() =>
            ejecutar(() => terminarEnsayo(userData.groupId), "Ensayo terminado.")
          }
          className={`${boton} text-app-muted inset-shadow-app-muted hover:text-app-error hover:inset-shadow-app-error`}
        >
          Terminar
        </button>
      )}
    </div>
  );
}
