import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { onSnapshot } from "firebase/firestore";
import { CalendarDaysIcon, MusicalNoteIcon, QueueListIcon } from "@heroicons/react/24/solid";
import { useAuth } from "../Context/AuthContext";
import { useAppContext } from "../Context/AppContext";
import { useTurno } from "../Hooks/useTurno.js";
import {
  ORDEN_ACTUAL,
  ORDEN_CULTO,
  REPERTORIO,
  REPERTORIO_ACTUAL,
  docIglesia,
} from "../Firebase/RutasIglesia";
import { contenidoEspera } from "../PantallaEspera/utilesEspera.js";
import { cambiarEspera } from "../PantallaEspera/accionesEspera.js";
import EstadoPantalla from "../Entrada/EstadoPantalla.jsx";
import { cantidad, textoServicio } from "./utilesResumen.js";

// Resumen del día: lo que hay que saber al llegar al templo, cada cosa con
// su botón. Es el contenido de Inicio (/ViewInicio) desde el 9 de noviembre
// de 2026, cuando las barras dejaron sin trabajo a la cuadrícula de secciones.
export default function ResumenDia() {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const { servicios, desfaseReloj, visibleEspera, showNotif } = useAppContext();
  const { exigirTurno } = useTurno();
  const groupId = userData.groupId;

  const [ahora, setAhora] = useState(() => Date.now() + desfaseReloj);
  const [pasos, setPasos] = useState(null);
  const [canciones, setCanciones] = useState(null);

  // Cada segundo, por la cuenta regresiva al próximo servicio.
  useEffect(() => {
    const actualizar = () => setAhora(Date.now() + desfaseReloj);
    actualizar();
    const temporizador = setInterval(actualizar, 1000);
    return () => clearInterval(temporizador);
  }, [desfaseReloj]);

  // Solo mientras se mira Inicio: no son suscripciones globales.
  useEffect(() => {
    const orden = onSnapshot(
      docIglesia(groupId, ORDEN_CULTO, ORDEN_ACTUAL),
      (snap) => setPasos(snap.data()?.pasos?.length || 0),
      () => setPasos(0)
    );
    const repertorio = onSnapshot(
      docIglesia(groupId, REPERTORIO, REPERTORIO_ACTUAL),
      (snap) => setCanciones(snap.data()?.canciones?.length || 0),
      () => setCanciones(0)
    );
    return () => {
      orden();
      repertorio();
    };
  }, [groupId]);

  const servicio = textoServicio(contenidoEspera(servicios, ahora));

  const alternarEspera = async () => {
    if (!exigirTurno()) return;
    try {
      await cambiarEspera(groupId, !visibleEspera);
    } catch (error) {
      console.error("Error con la pantalla de espera:", error);
      showNotif("error", "No se pudo cambiar la pantalla de espera. Revisa tu conexión.");
    }
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {/* El servicio, con el estado de la pantalla del templo al lado. La
          pantalla no se abre desde aquí: se abre en el dispositivo del
          proyector, con «Proyectar» en la entrada. */}
      <Tarjeta
        titulo="Servicio"
        Icono={CalendarDaysIcon}
        ancha
        principal={
          <span className="flex flex-wrap items-center gap-2">
            <EstadoPantalla />
            {servicio.principal}
          </span>
        }
        detalle={servicio.detalle}
      >
        <Boton onClick={() => navigate("/ViewCronograma")}>Ir a Cronograma</Boton>
        <Boton onClick={alternarEspera} pulsado={Boolean(visibleEspera)}>
          {visibleEspera ? "Quitar la pantalla de espera" : "Mostrar la pantalla de espera"}
        </Boton>
      </Tarjeta>

      <Tarjeta
        titulo="Orden del culto"
        Icono={QueueListIcon}
        principal={pasos === null ? "Cargando…" : pasos ? `${cantidad(pasos, "paso", "pasos")} listos` : "Sin preparar"}
        detalle="Durante el culto, un solo botón: «Siguiente»."
      >
        <Boton onClick={() => navigate("/ViewCulto")}>
          {pasos ? "Abrir el Orden del culto" : "Preparar el Orden del culto"}
        </Boton>
      </Tarjeta>

      <Tarjeta
        titulo="Canciones de hoy"
        Icono={MusicalNoteIcon}
        principal={canciones === null ? "Cargando…" : canciones ? cantidad(canciones, "canción", "canciones") : "Ninguna todavía"}
        detalle="La lista que se usa en el Orden del culto."
      >
        <Boton onClick={() => navigate("/ViewCanciones")}>Ir a Canciones</Boton>
      </Tarjeta>
    </div>
  );
}

function Tarjeta({ titulo, Icono, principal, detalle, ancha = false, children }) {
  return (
    <section
      aria-label={titulo}
      className={`flex flex-col gap-2 rounded-lg border border-app-border bg-app-light p-3 ${ancha ? "sm:col-span-2" : ""}`}
    >
      <h2 className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-app-muted">
        <Icono className="h-4 w-4" aria-hidden="true" />
        {titulo}
      </h2>
      <p className="font-semibold text-app-texto">{principal}</p>
      {detalle && <p className="text-sm text-app-muted">{detalle}</p>}
      <div className="mt-auto flex flex-wrap gap-2 pt-1">{children}</div>
    </section>
  );
}

function Boton({ onClick, pulsado, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pulsado}
      className="rounded px-3 py-1.5 text-xs font-bold text-app-main inset-shadow-sm inset-shadow-app-main transition hover:bg-app-main hover:text-app-dark sm:text-sm"
    >
      {children}
    </button>
  );
}
