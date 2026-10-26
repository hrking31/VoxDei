import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  addDoc,
  deleteDoc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { CalendarDaysIcon } from "@heroicons/react/24/solid";
import { useAuth } from "../../Components/Context/AuthContext";
import { useAppContext } from "../../Components/Context/AppContext";
import {
  CRONOGRAMA,
  colIglesia,
  docIglesia,
} from "../../Components/Firebase/RutasIglesia";
import { useOperadores } from "../../Components/Cronograma/useEquipo.js";
import { DIAS, aMinutos } from "../../Components/Cronograma/UtilesCronograma.js";

const VACIO = {
  nombre: "",
  inicio: "08:00",
  fin: "10:00",
  dias: [],
  fecha: "",
  operadorUid: "",
  activo: true,
};

// Alta y corrección de un servicio del cronograma, como una alarma del
// celular: horas, días en que se repite (ninguno = una sola vez, con fecha),
// operador e interruptor de activo. Solo pastor y pastora llegan aquí (ruta con
// ROLES_PASTORES) y firestore.rules lo vuelve a exigir.
//
// Sin id es un servicio nuevo; con id se corrige uno existente.
export default function ViewServicioEditar() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { userData } = useAuth();
  const { showNotif, confirmAction } = useAppContext();
  const operadores = useOperadores();
  const [form, setForm] = useState(VACIO);
  const [cargando, setCargando] = useState(Boolean(id));
  const [guardando, setGuardando] = useState(false);
  const groupId = userData?.groupId;

  useEffect(() => {
    if (!id || !groupId) return;
    getDoc(docIglesia(groupId, CRONOGRAMA, id))
      .then((snap) => {
        if (!snap.exists()) {
          showNotif("error", "Ese servicio ya no existe.");
          navigate("/ViewCronograma", { replace: true });
          return;
        }
        setForm({ ...VACIO, ...snap.data(), fecha: snap.data().fecha || "" });
      })
      .catch((error) => {
        console.error("Error al cargar el servicio:", error);
        showNotif("error", "No se pudo cargar el servicio.");
      })
      .finally(() => setCargando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, groupId]);

  const cambiar = (campo, valor) =>
    setForm((previo) => ({ ...previo, [campo]: valor }));

  const alternarDia = (num) =>
    cambiar(
      "dias",
      form.dias.includes(num)
        ? form.dias.filter((d) => d !== num)
        : [...form.dias, num].sort()
    );

  const operador = operadores.find((o) => o.uid === form.operadorUid);
  const operadorFuera = form.operadorUid && operadores.length > 0 && !operador;

  const guardar = async (evento) => {
    evento.preventDefault();

    if (!form.inicio || !form.fin || aMinutos(form.fin) <= aMinutos(form.inicio)) {
      showNotif("error", "La hora de fin debe ser posterior a la de inicio.");
      return;
    }
    if (!form.dias.length && !form.fecha) {
      showNotif("error", "Marca los días en que se repite o elige una fecha.");
      return;
    }
    if (!operador) {
      showNotif("error", "Elige el operador del servicio.");
      return;
    }

    const datos = {
      nombre: form.nombre.trim(),
      inicio: form.inicio,
      fin: form.fin,
      dias: form.dias,
      fecha: form.dias.length ? null : form.fecha,
      operadorUid: operador.uid,
      operadorNombre: operador.nombre,
      activo: form.activo,
      actualizadoEn: serverTimestamp(),
    };

    setGuardando(true);
    try {
      if (id) {
        await setDoc(docIglesia(groupId, CRONOGRAMA, id), datos);
      } else {
        await addDoc(colIglesia(groupId, CRONOGRAMA), datos);
      }
      showNotif("success", "Servicio guardado.");
      navigate("/ViewCronograma");
    } catch (error) {
      console.error("Error al guardar el servicio:", error);
      showNotif("error", "No se pudo guardar el servicio.");
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async () => {
    const ok = await confirmAction("¿Eliminar este servicio del cronograma?");
    if (!ok) return;
    try {
      await deleteDoc(docIglesia(groupId, CRONOGRAMA, id));
      showNotif("success", "Servicio eliminado.");
      navigate("/ViewCronograma");
    } catch (error) {
      console.error("Error al eliminar el servicio:", error);
      showNotif("error", "No se pudo eliminar el servicio.");
    }
  };

  const campo =
    "w-full p-2 rounded-lg border border-app-border bg-app-light text-app-muted focus:outline-none focus:ring-2 focus:ring-app-main";
  const etiqueta = "text-xs font-bold text-app-muted uppercase tracking-wide";

  return (
    <div className="h-svh flex flex-col overflow-hidden bg-linear-to-b from-app-dark/50 to-app-light/50">
      {/* ENCABEZADO */}
      <div className="shrink-0 border-b border-app-main bg-app-light px-2">
        <div className="flex items-center justify-between gap-2 py-1">
          <h1 className="font-bold text-app-main flex items-center gap-1 truncate">
            <CalendarDaysIcon className="w-5 h-5 shrink-0" />
            <span className="truncate">
              {id ? "Editar servicio" : "Nuevo servicio"}
            </span>
          </h1>
          <button
            onClick={() => navigate("/ViewCronograma")}
            className="px-3 py-1.5 boton-salida shrink-0"
          >
            Volver
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-custom p-2 sm:p-4">
        {cargando ? (
          <p className="text-center text-app-muted py-8">Cargando...</p>
        ) : (
          <form
            onSubmit={guardar}
            className="max-w-md mx-auto flex flex-col gap-4"
          >
            <label className="flex flex-col gap-1">
              <span className={etiqueta}>Nombre (opcional)</span>
              <input
                value={form.nombre}
                onChange={(e) => cambiar("nombre", e.target.value)}
                placeholder="Servicio dominical"
                className={campo}
              />
            </label>

            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1">
                <span className={etiqueta}>Inicio</span>
                <input
                  type="time"
                  value={form.inicio}
                  onChange={(e) => cambiar("inicio", e.target.value)}
                  className={campo}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className={etiqueta}>Fin</span>
                <input
                  type="time"
                  value={form.fin}
                  onChange={(e) => cambiar("fin", e.target.value)}
                  className={campo}
                />
              </label>
            </div>

            {/* Días, como en las alarmas: sin ninguno es de una sola vez */}
            <div className="flex flex-col gap-1">
              <span className={etiqueta}>Se repite</span>
              <div className="flex justify-between gap-1">
                {DIAS.map((dia) => {
                  const marcado = form.dias.includes(dia.num);
                  return (
                    <button
                      key={dia.num}
                      type="button"
                      onClick={() => alternarDia(dia.num)}
                      aria-pressed={marcado}
                      title={dia.largo}
                      className={`w-10 h-10 rounded-full font-bold text-sm transition ${
                        marcado
                          ? "bg-app-main text-app-dark"
                          : "border border-app-border text-app-muted hover:border-app-main"
                      }`}
                    >
                      {dia.corto}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-app-muted">
                {form.dias.length
                  ? "Se repite cada semana en los días marcados."
                  : "Sin días marcados, es de una sola vez: elige la fecha."}
              </p>
            </div>

            {!form.dias.length && (
              <label className="flex flex-col gap-1">
                <span className={etiqueta}>Fecha</span>
                <input
                  type="date"
                  value={form.fecha}
                  onChange={(e) => cambiar("fecha", e.target.value)}
                  className={campo}
                />
              </label>
            )}

            <label className="flex flex-col gap-1">
              <span className={etiqueta}>Operador</span>
              <select
                value={operador ? form.operadorUid : ""}
                onChange={(e) => cambiar("operadorUid", e.target.value)}
                className={campo}
              >
                <option value="">Elige un operador</option>
                {operadores.map((o) => (
                  <option key={o.uid} value={o.uid}>
                    {o.nombre}
                  </option>
                ))}
              </select>
              {operadorFuera && (
                <p className="text-xs text-app-error">
                  {form.operadorNombre || "El operador asignado"} ya no está en
                  el equipo: elige otro.
                </p>
              )}
              {operadores.length === 0 && (
                <p className="text-xs text-app-muted">
                  Aún no hay operadores. Créalos en Usuarios.
                </p>
              )}
            </label>

            <label className="flex items-center justify-between gap-2 p-3 rounded-lg border border-app-border">
              <span className="text-sm text-app-muted">
                Activo
                <span className="block text-xs">
                  Apágalo para pausar el servicio sin borrarlo.
                </span>
              </span>
              <input
                type="checkbox"
                checked={form.activo}
                onChange={(e) => cambiar("activo", e.target.checked)}
                className="w-5 h-5 accent-app-main"
              />
            </label>

            <button
              type="submit"
              disabled={guardando}
              className="py-2.5 rounded-lg font-semibold bg-app-main text-app-dark hover:bg-app-main/90 transition disabled:opacity-50"
            >
              {guardando ? "Guardando..." : "Guardar"}
            </button>

            {id && (
              <button
                type="button"
                onClick={eliminar}
                className="py-2.5 rounded-lg font-semibold text-app-error border border-app-error hover:bg-app-error hover:text-white transition"
              >
                Eliminar servicio
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
