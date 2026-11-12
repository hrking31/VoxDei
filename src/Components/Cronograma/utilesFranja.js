import { esPastor } from "../Roles/Roles.js";
import { puedeProyectar, textoHora } from "./UtilesCronograma.js";

// Qué dice la franja del turno (FranjaTurno) a quien está mirando, sin React ni
// Firebase. La usan la franja de verdad y los ejemplos de la Ayuda, así que lo
// que enseña la Ayuda es siempre lo que muestra la app.

export const ETIQUETA_BOTON = {
  iniciar: "Iniciar ensayo",
  tomar: "Tomar ensayo",
  terminar: "Terminar",
};

const hora = (ms) =>
  new Date(ms).toLocaleTimeString("es", { hour: "numeric", minute: "2-digit" });

// { puedo, titulo, explicacion, completo, botones }
//   titulo:   de quién es el turno («Turno de Laura · 14:00 – 16:00»); es lo
//             único que se ve: el verde o el rojo dicen si puedes proyectar
//   explicacion: qué puedes hacer («Puedes proyectar como pastor.»), oculta,
//             para el lector de pantalla
//   completo: la frase entera, para el `title`
//   botones:  los del ensayo que te tocan ("iniciar" | "tomar" | "terminar")
export function estadoFranja(turno, userData, uid) {
  const pastor = esPastor(userData);
  const esMio = Boolean(turno.uid) && turno.uid === uid;
  const puedo = puedeProyectar(turno, userData, uid);
  const rol = (userData?.role || "pastor").toLowerCase();

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
    titulo = `${esMio ? "Tu ensayo" : `Ensayo de ${turno.nombre}`} · hasta ${hora(turno.hasta)}`;
  } else {
    titulo = "Sin servicio";
  }

  // A la vista solo va el título: el color dice si puedes o no (pedido del
  // usuario, 11-11-2026). Esta frase queda en el `title` y para el lector.
  const explicacion = puedo
    ? pastor && !esMio
      ? `Puedes proyectar como ${rol}.`
      : "Puedes proyectar."
    : turno.tipo === "libre"
      ? "Inicia un ensayo para poder proyectar."
      : "No puedes proyectar ahora.";

  const botones = [];
  if (turno.tipo === "libre" && !pastor) botones.push("iniciar");
  if (turno.tipo === "ensayo" && !esMio && !pastor) botones.push("tomar");
  if (turno.tipo === "ensayo" && (esMio || pastor)) botones.push("terminar");

  const completo = `${titulo}. ${explicacion}`;
  return { puedo, titulo, explicacion, completo, botones };
}
