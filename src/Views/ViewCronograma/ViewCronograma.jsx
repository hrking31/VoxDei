import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ref, set } from "firebase/database";
import { CalendarDaysIcon, PlusIcon } from "@heroicons/react/24/solid";
import { database } from "../../Components/Firebase/Firebase";
import { useAuth } from "../../Components/Context/AuthContext";
import { useAppContext } from "../../Components/Context/AppContext";
import { esPastor } from "../../Components/Roles/Roles.js";
import { useTurno } from "../../Components/Hooks/useTurno.js";
import { useOperadores } from "../../Components/Cronograma/useEquipo.js";
import FranjaTurno from "../../Components/Cronograma/FranjaTurno.jsx";
import { iniciarEnsayo } from "../../Components/Cronograma/AccionesEnsayo.js";
import {
  DIAS,
  HORAS_ENSAYO,
  aMinutos,
  fechaISO,
  textoDias,
  textoHora,
} from "../../Components/Cronograma/UtilesCronograma.js";

// Cronograma de la iglesia: qué operador proyecta en cada servicio.
//
// Lo ven todos; solo pastor y pastora crean y editan (ViewServicioEditar, y
// firestore.rules lo vuelve a exigir). Cualquiera puede iniciar aquí un ensayo
// para otro operador; en la franja de los paneles solo para uno mismo.
export default function ViewCronograma() {
  const navigate = useNavigate();
  const { user, userData } = useAuth();
  const { servicios, showNotif, confirmAction, visibleEspera } =
    useAppContext();
  const { turno, exigirTurno } = useTurno();
  const operadores = useOperadores();
  const [paraEnsayo, setParaEnsayo] = useState("");

  const pastor = esPastor(userData);
  const porHora = (a, b) => aMinutos(a.inicio) - aMinutos(b.inicio);

  // Los que se repiten, bajo cada uno de sus días; los de una sola vez, aparte
  // y solo si no han pasado.
  const semanales = DIAS.map((dia) => ({
    ...dia,
    servicios: servicios
      .filter((s) => s.dias?.includes(dia.num))
      .sort(porHora),
  })).filter((dia) => dia.servicios.length);

  const hoy = fechaISO(new Date());
  const unicos = servicios
    .filter((s) => !s.dias?.length && s.fecha >= hoy)
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || porHora(a, b));

  const asignarEnsayo = async () => {
    const elegido = operadores.find((o) => o.uid === paraEnsayo);
    if (!elegido) {
      showNotif("warning", "Elige a quién darle el ensayo.");
      return;
    }
    if (turno.tipo === "ensayo") {
      const ok = await confirmAction(
        `${turno.nombre} tiene el ensayo. ¿Dárselo a ${elegido.nombre}?`
      );
      if (!ok) return;
    }
    try {
      await iniciarEnsayo(userData.groupId, elegido, user.uid);
      showNotif("success", `Ensayo de ${elegido.nombre} iniciado.`);
      setParaEnsayo("");
    } catch (error) {
      console.error("Error al iniciar el ensayo:", error);
      showNotif("error", "No se pudo iniciar el ensayo. Revisa tu conexión.");
    }
  };

  // Pantalla de espera del templo: logo, iglesia y cuenta regresiva al
  // próximo servicio. Escribe en la pantalla, así que exige el turno.
  const alternarEspera = async () => {
    if (!exigirTurno()) return;
    try {
      await set(ref(database, `displayEspera/${userData.groupId}`), {
        activa: !visibleEspera,
      });
    } catch (error) {
      console.error("Error con la pantalla de espera:", error);
      showNotif("error", "No se pudo cambiar la pantalla de espera. Revisa tu conexión.");
    }
  };

  const tarjeta = (servicio) => {
    const enCurso =
      turno.tipo === "servicio" && turno.servicio.id === servicio.id;
    const inactivo = servicio.activo === false;
    const contenido = (
      <>
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-bold text-app-main">
            {textoHora(servicio.inicio)} – {textoHora(servicio.fin)}
          </span>
          {enCurso && (
            <span className="text-xs font-bold text-app-success">
              · en curso
            </span>
          )}
          {inactivo && (
            <span className="text-xs text-app-muted">· pausado</span>
          )}
        </div>
        {servicio.nombre && (
          <p className="text-sm text-gray-300 truncate">{servicio.nombre}</p>
        )}
        <p className="text-sm text-app-muted truncate">
          {servicio.operadorNombre || "Sin operador asignado"}
        </p>
      </>
    );
    const clases = `w-full text-left p-3 rounded-lg border transition ${
      enCurso
        ? "border-app-success bg-app-success/10"
        : "border-app-border bg-app-light/40"
    } ${inactivo ? "opacity-50" : ""}`;

    return pastor ? (
      <button
        key={servicio.id}
        onClick={() => navigate(`/ViewServicioEditar/${servicio.id}`)}
        className={`${clases} hover:border-app-main`}
      >
        {contenido}
      </button>
    ) : (
      <div key={servicio.id} className={clases}>
        {contenido}
      </div>
    );
  };

  const sinServicios = !semanales.length && !unicos.length;

  return (
    <div className="h-pantalla flex flex-col overflow-hidden bg-linear-to-b from-app-dark/50 to-app-light/50">
      {/* ENCABEZADO */}
      <div className="shrink-0 border-b border-app-main bg-app-light px-2">
        <div className="flex items-center justify-between gap-2 py-1">
          <h1 className="font-bold text-app-main flex items-center gap-1 truncate">
            <CalendarDaysIcon className="w-5 h-5 shrink-0" />
            <span className="truncate">Cronograma</span>
          </h1>

          <div className="flex items-center gap-2 shrink-0">
            {pastor && (
              <button
                onClick={() => navigate("/ViewServicioEditar")}
                className="px-3 py-1.5 text-xs sm:text-sm font-bold text-app-main rounded inset-shadow-sm inset-shadow-app-main hover:bg-app-main hover:text-app-dark transition flex items-center gap-1"
              >
                <PlusIcon className="w-4 h-4" />
                Servicio
              </button>
            )}

          </div>
        </div>
      </div>

      <FranjaTurno />

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-custom p-2 sm:p-4">
        <div className="max-w-3xl mx-auto flex flex-col gap-4">
          {/* PANTALLA DE ESPERA */}
          <section
            className={`p-3 rounded-lg border flex items-center gap-3 ${
              visibleEspera
                ? "border-app-success bg-app-success/10"
                : "border-app-border bg-app-light/40"
            }`}
          >
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-bold text-app-main">
                Pantalla de espera
                {visibleEspera && (
                  <span className="text-app-success"> · en pantalla</span>
                )}
              </h2>
              <p className="text-xs text-app-muted">
                Antes del servicio, el templo ve el logo, el nombre de la
                iglesia y cuánto falta para el próximo servicio.
              </p>
            </div>
            <button
              type="button"
              onClick={alternarEspera}
              aria-pressed={Boolean(visibleEspera)}
              className="shrink-0 px-3 py-1.5 text-xs sm:text-sm font-bold text-app-main rounded inset-shadow-sm inset-shadow-app-main hover:bg-app-main hover:text-app-dark transition"
            >
              {visibleEspera ? "Quitar" : "Mostrar"}
            </button>
          </section>

          {/* ENSAYO PARA OTRO OPERADOR */}
          {turno.tipo !== "servicio" && operadores.length > 0 && (
            <section className="p-3 rounded-lg border border-app-border bg-app-light/40">
              <h2 className="text-sm font-bold text-app-main">Ensayo</h2>
              <p className="text-xs text-app-muted mb-2">
                Fuera de los servicios, quien tenga el ensayo puede proyectar.
                Dura hasta que lo terminen, empiece un servicio o pasen{" "}
                {HORAS_ENSAYO} horas.
              </p>
              <div className="flex gap-2">
                <select
                  value={paraEnsayo}
                  onChange={(e) => setParaEnsayo(e.target.value)}
                  className="flex-1 min-w-0 p-2 rounded-lg border border-app-border bg-app-light text-app-muted text-sm"
                >
                  <option value="">Elige un operador</option>
                  {operadores.map((o) => (
                    <option key={o.uid} value={o.uid}>
                      {o.nombre}
                    </option>
                  ))}
                </select>
                <button
                  onClick={asignarEnsayo}
                  className="shrink-0 px-3 py-1.5 text-xs sm:text-sm font-bold text-app-main rounded inset-shadow-sm inset-shadow-app-main hover:bg-app-main hover:text-app-dark transition"
                >
                  Dar ensayo
                </button>
              </div>
            </section>
          )}

          {sinServicios && (
            <p className="text-center text-app-muted py-8">
              Aún no hay servicios.
              {pastor && " Crea el primero con el botón «Servicio»."}
            </p>
          )}

          {/* SERVICIOS SEMANALES, POR DÍA */}
          {semanales.map((dia) => (
            <section key={dia.num}>
              <h2 className="text-sm font-bold text-app-muted uppercase tracking-wide mb-1">
                {dia.largo}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {dia.servicios.map((s) => tarjeta(s))}
              </div>
            </section>
          ))}

          {/* SERVICIOS DE UNA SOLA VEZ */}
          {unicos.length > 0 && (
            <section>
              <h2 className="text-sm font-bold text-app-muted uppercase tracking-wide mb-1">
                Fechas especiales
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {unicos.map((s) => (
                  <div key={s.id}>
                    <p className="text-xs text-app-muted capitalize mb-0.5">
                      {textoDias(s)}
                    </p>
                    {tarjeta(s)}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
