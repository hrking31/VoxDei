import { useEffect, useState } from "react";
import {
  addDoc,
  deleteDoc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { useAuth } from "../Context/AuthContext";
import { useAppContext } from "../Context/AppContext";
import { CRONOGRAMA, colIglesia, docIglesia } from "../Firebase/RutasIglesia";
import { DIAS, aMinutos } from "./UtilesCronograma.js";
import { SUGERENCIAS_NOMBRE } from "./utilesServicios.js";
import CampoConLista from "./CampoConLista.jsx";

const VACIO = {
  nombre: "",
  inicio: "08:00",
  fin: "10:00",
  dias: [],
  fecha: "",
  activo: true,
};

// Formulario de un servicio del cronograma, como una alarma del celular: horas,
// días en que se repite (ninguno = una sola vez, con fecha) e interruptor de activo.
// Ya NO lleva operador (25-11-2026): el servicio se repite, y quién sirve cada fecha se
// decide en la programación (cargos de cada servicio). Lo usan la página `ViewServicioEditar` (celular y enlaces) y la columna
// derecha del Cronograma en el computador (25-11-2026, pedido del usuario: las opciones
// de crear un servicio siempre a la vista). Solo pastor y pastora lo ven, y
// firestore.rules lo vuelve a exigir.
//
// Sin `id` es un servicio nuevo; con `id` se corrige uno existente. Quien lo monta
// decide qué pasa después (`fechaInicial` deja puesta la fecha de un servicio de una sola vez, por ejemplo la que se tocó en el calendario): `alTerminar` se llama al guardar o eliminar, y
// `alNoExistir` si el servicio que se pidió ya no está. Para empezar de cero se
// monta con otra `key`.
export default function FormularioServicio({
  id = null,
  alTerminar,
  alNoExistir,
  fechaInicial = "",
  className = "max-w-md mx-auto flex flex-col gap-4",
}) {
  const { userData } = useAuth();
  const { showNotif, confirmAction } = useAppContext();
  const [form, setForm] = useState({ ...VACIO, fecha: fechaInicial });
  const [cargando, setCargando] = useState(Boolean(id));
  const [guardando, setGuardando] = useState(false);
  const groupId = userData?.groupId;

  useEffect(() => {
    if (!id || !groupId) return;
    getDoc(docIglesia(groupId, CRONOGRAMA, id))
      .then((snap) => {
        if (!snap.exists()) {
          showNotif("error", "Ese servicio ya no existe.");
          alNoExistir?.();
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
        : [...form.dias, num].sort(),
    );

  const guardar = async (evento) => {
    evento.preventDefault();

    if (
      !form.inicio ||
      !form.fin ||
      aMinutos(form.fin) <= aMinutos(form.inicio)
    ) {
      showNotif("error", "La hora de fin debe ser posterior a la de inicio.");
      return;
    }
    if (!form.dias.length && !form.fecha) {
      showNotif("error", "Marca los días en que se repite o elige una fecha.");
      return;
    }
    const datos = {
      nombre: form.nombre.trim(),
      inicio: form.inicio,
      fin: form.fin,
      dias: form.dias,
      fecha: form.dias.length ? null : form.fecha,
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
      alTerminar?.();
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
      alTerminar?.();
    } catch (error) {
      console.error("Error al eliminar el servicio:", error);
      showNotif("error", "No se pudo eliminar el servicio.");
    }
  };

  const campo =
    "w-full p-2 rounded-lg border border-app-border bg-app-light text-app-muted focus:outline-none focus:ring-2 focus:ring-app-main";
  const etiqueta = "text-xs font-bold text-app-muted uppercase tracking-wide";

  if (cargando)
    return <p className="text-center text-app-muted py-8">Cargando...</p>;

  return (
    <form onSubmit={guardar} className={className}>
      <CampoConLista
        etiqueta="Nombre"
        valor={form.nombre}
        alCambiar={(valor) => cambiar("nombre", valor)}
        opciones={SUGERENCIAS_NOMBRE}
        placeholder="Escoge o escribe"
        claseEtiqueta={etiqueta}
        claseCampo={campo}
      />

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
  );
}
