import { useMemo, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import {
  NOMBRES_MES,
  diasDelMes,
  fechaLarga,
  hoyLocal,
} from "../Predica/utilesPredica.js";
import { marcasDelDia } from "./utilesServicios.js";

const SEMANA = ["D", "L", "M", "M", "J", "V", "S"];

const mesDe = (fecha) => {
  const [anio, m] = fecha.split("-").map(Number);
  return { anio, mes: m - 1 };
};

// Calendario de la columna del Cronograma (25-11-2026, pedido del usuario, con el diseño del
// de Mis prédicas): se recorre mes a mes, así que se ve todo el año. Cada día con servicio
// lleva un círculo punteado, dorado si se repite y azul si es de una sola vez (la azul gana
// si el día tiene las dos); hoy va en violeta, los domingos resaltados y el día elegido en
// dorado macizo. Tocar un día no hace nada por sí solo: `alTocarDia(fecha, marcas)` decide.
export default function CalendarioServicios({
  servicios,
  elegida,
  alTocarDia,
  hoy = hoyLocal(),
}) {
  const [mes, setMes] = useState(() => mesDe(elegida || hoy));
  const dias = useMemo(() => diasDelMes(mes.anio, mes.mes), [mes]);
  const actual = mesDe(hoy);
  const enMesActual = mes.anio === actual.anio && mes.mes === actual.mes;

  const cambiarMes = (paso) =>
    setMes(({ anio, mes: m }) => {
      const fecha = new Date(anio, m + paso, 1);
      return { anio: fecha.getFullYear(), mes: fecha.getMonth() };
    });

  return (
    <section
      aria-label="Calendario de servicios"
      data-calendario-servicios
      className="flex flex-col gap-1.5 rounded-2xl border border-app-border bg-app-aviso p-2.5"
    >
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => cambiarMes(-1)}
          aria-label="Mes anterior"
          className="grid h-8 w-8 place-items-center rounded-full text-app-muted hover:text-app-main"
        >
          <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
        </button>
        <b className="flex-1 text-center text-sm text-app-main">
          {NOMBRES_MES[mes.mes]} {mes.anio}
        </b>
        {!enMesActual && (
          <button
            type="button"
            onClick={() => setMes(actual)}
            className="h-6 rounded-full border border-app-border px-2.5 text-diminuto font-semibold text-app-muted hover:border-app-main hover:text-app-main"
          >
            Hoy
          </button>
        )}
        <button
          type="button"
          onClick={() => cambiarMes(1)}
          aria-label="Mes siguiente"
          className="grid h-8 w-8 place-items-center rounded-full text-app-muted hover:text-app-main"
        >
          <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-px text-center">
        {SEMANA.map((letra, i) => (
          <span
            key={i}
            aria-hidden="true"
            className={`py-0.5 text-diminuto font-semibold ${i === 0 ? "text-app-main" : "text-app-muted"}`}
          >
            {letra}
          </span>
        ))}
        {dias.map(({ fecha, dia, delMes, domingo }) => {
          const marcas = marcasDelDia(servicios, fecha);
          const conServicio = marcas.servicios.length > 0;
          const esElegida = fecha === elegida;
          const esHoy = fecha === hoy && !esElegida;
          const borde = esElegida
            ? ""
            : marcas.unico
              ? "border border-dashed border-app-azul"
              : marcas.repite
                ? "border border-dashed border-app-main"
                : "";
          const fondo = esElegida
            ? "bg-app-main font-bold text-app-dark"
            : esHoy
              ? "bg-app-violeta/20 font-bold text-app-violeta"
              : !delMes
                ? "text-app-border hover:text-app-muted"
                : domingo
                  ? "font-semibold text-app-texto hover:bg-app-light"
                  : "text-app-muted hover:bg-app-light";
          return (
            <button
              key={fecha}
              type="button"
              data-fecha={fecha}
              data-clase-dia={
                marcas.unico ? "unico" : marcas.repite ? "repite" : undefined
              }
              data-hoy={esHoy || undefined}
              aria-label={`${fechaLarga(fecha)}${conServicio ? `: ${marcas.servicios.map((s) => s.nombre || "Servicio").join(", ")}` : ""}`}
              aria-current={esElegida ? "date" : undefined}
              onClick={() =>
                delMes ? alTocarDia(fecha, marcas) : setMes(mesDe(fecha))
              }
              className={`mx-auto grid h-7 w-7 place-items-center rounded-full text-xs transition ${fondo} ${borde}`}
            >
              {dia}
            </button>
          );
        })}
      </div>

      <div className="flex justify-between gap-2 pt-1 text-diminuto text-app-muted">
        <span className="flex items-center gap-1">
          <i className="inline-block h-2.5 w-2.5 rounded-full border border-dashed border-app-main" />
          Se repite
        </span>
        <span className="flex items-center gap-1">
          <i className="inline-block h-2.5 w-2.5 rounded-full border border-dashed border-app-azul" />
          Una sola vez
        </span>
        <span className="flex items-center gap-1">
          <i className="inline-block h-2.5 w-2.5 rounded-full bg-app-violeta/50" />
          Hoy
        </span>
      </div>
    </section>
  );
}
