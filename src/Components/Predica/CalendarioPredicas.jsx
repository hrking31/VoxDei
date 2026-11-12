import { useMemo, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { NOMBRES_MES, diasDelMes, estadoDelDia, hoyLocal, predicasPorFecha } from "./utilesPredica.js";
import { tonoDe } from "./tonosPredica.js";

const SEMANA = ["D", "L", "M", "M", "J", "V", "S"];

// Calendario de Mis prédicas (pedido del usuario, tomado de una referencia):
// los domingos resaltados, un punto en los días con prédica con el color de
// su estado (tonosPredica: dorado borrador, azul terminada, verde predicada,
// rojo sin predicar), la abierta en dorado y hoy con
// un aro. Tocar un día con prédica la abre; un día sin prédica crea una nueva
// con esa fecha.
export default function CalendarioPredicas({ predicas, abiertaFecha, onAbrir, onNueva, hoy = hoyLocal() }) {
  const [mes, setMes] = useState(() => {
    const [anio, m] = (abiertaFecha || hoy).split("-").map(Number);
    return { anio, mes: m - 1 };
  });
  const dias = useMemo(() => diasDelMes(mes.anio, mes.mes), [mes]);
  const porFecha = useMemo(() => predicasPorFecha(predicas), [predicas]);

  const cambiarMes = (paso) =>
    setMes(({ anio, mes: m }) => {
      const fecha = new Date(anio, m + paso, 1);
      return { anio: fecha.getFullYear(), mes: fecha.getMonth() };
    });

  return (
    <section aria-label="Calendario de prédicas" className="flex flex-col gap-1.5 rounded-2xl border border-app-border bg-app-aviso p-2.5">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => cambiarMes(-1)} aria-label="Mes anterior" className="grid h-8 w-8 place-items-center rounded-full text-app-muted hover:text-app-main">
          <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
        </button>
        <b className="text-sm text-app-main">
          {NOMBRES_MES[mes.mes]} {mes.anio}
        </b>
        <button type="button" onClick={() => cambiarMes(1)} aria-label="Mes siguiente" className="grid h-8 w-8 place-items-center rounded-full text-app-muted hover:text-app-main">
          <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-px text-center">
        {SEMANA.map((letra, i) => (
          <span key={i} aria-hidden="true" className={`py-0.5 text-diminuto font-semibold ${i === 0 ? "text-app-main" : "text-app-muted"}`}>
            {letra}
          </span>
        ))}
        {dias.map(({ fecha, dia, delMes, domingo }) => {
          const delDia = porFecha[fecha] || [];
          const abierta = fecha === abiertaFecha;
          // El punto lleva el color del estado que más pide atención ese día.
          const estado = estadoDelDia(delDia, hoy);
          return (
            <button
              key={fecha}
              type="button"
              data-fecha={fecha}
              aria-label={`${dia}${delDia.length ? `: ${delDia.map((p) => p.titulo).join(", ")}` : ""}`}
              aria-current={abierta ? "date" : undefined}
              onClick={() => (delDia.length ? onAbrir(delDia[0].id) : onNueva(fecha))}
              className={`relative grid h-7 place-items-center rounded-full text-xs transition ${
                abierta
                  ? "bg-app-main font-bold text-app-dark"
                  : !delMes
                    ? "text-app-border"
                    : domingo
                      ? "font-semibold text-app-texto hover:bg-app-light"
                      : "text-app-muted hover:bg-app-light"
              } ${fecha === hoy && !abierta ? "ring-1 ring-app-muted ring-inset" : ""}`}
            >
              {dia}
              {delDia.length > 0 && !abierta && (
                <span
                  aria-hidden="true"
                  data-punto={estado}
                  className={`absolute bottom-0 h-1 w-1 rounded-full ${tonoDe(estado).punto}`}
                />
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
