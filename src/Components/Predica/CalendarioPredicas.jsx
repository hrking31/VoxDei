import { useMemo, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { NOMBRES_MES, diasDelMes, estadoDelDia, fechaLarga, hoyLocal, predicasPorFecha } from "./utilesPredica.js";
import { tonoDe } from "./tonosPredica.js";

const SEMANA = ["D", "L", "M", "M", "J", "V", "S"];

const mesDe = (fecha) => {
  const [anio, m] = fecha.split("-").map(Number);
  return { anio, mes: m - 1 };
};

// Calendario de Mis prédicas (pedido del usuario, tomado de una referencia):
// los domingos resaltados, un círculo punteado en los días con prédica con el
// color de su estado (tonosPredica: dorado borrador, azul terminada, verde
// predicada, rojo sin predicar), la abierta en dorado y hoy en violeta.
//
// Tocar un día no crea nada (12-11-2026, pedido del usuario: antes un día
// libre creaba un borrador al instante, y mirar el mes siguiente se prestaba
// a crearlos por error). Quien lo monta decide con `onTocarDia(fecha,
// prédicasDelDia)`; `marcada` es el día libre elegido (aro dorado punteado).
// Un día gris del mes vecino solo pasa a ese mes, y «Hoy» vuelve al actual.
export default function CalendarioPredicas({ predicas, abiertaFecha, marcada, onTocarDia, hoy = hoyLocal() }) {
  const [mes, setMes] = useState(() => mesDe(abiertaFecha || hoy));
  const dias = useMemo(() => diasDelMes(mes.anio, mes.mes), [mes]);
  const porFecha = useMemo(() => predicasPorFecha(predicas), [predicas]);
  const actual = mesDe(hoy);
  const enMesActual = mes.anio === actual.anio && mes.mes === actual.mes;

  const cambiarMes = (paso) =>
    setMes(({ anio, mes: m }) => {
      const fecha = new Date(anio, m + paso, 1);
      return { anio: fecha.getFullYear(), mes: fecha.getMonth() };
    });

  return (
    <section aria-label="Calendario de prédicas" className="flex flex-col gap-1.5 rounded-2xl border border-app-border bg-app-aviso p-2.5">
      <div className="flex items-center gap-1">
        <button type="button" onClick={() => cambiarMes(-1)} aria-label="Mes anterior" className="grid h-8 w-8 place-items-center rounded-full text-app-muted hover:text-app-main">
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
          const conPredica = delDia.length > 0;
          const esMarcada = delMes && !abierta && !conPredica && fecha === marcada;
          const esHoy = fecha === hoy && !abierta;
          // Cada día es un círculo (12-11-2026, pedido del usuario):
          //   con prédica: borde punteado del color del estado que más pide
          //     atención ese día (antes, un puntito debajo);
          //   libre elegido: borde dorado continuo;
          //   hoy: fondo violeta suave (antes, un aro gris), que se ve también
          //     si hoy tiene prédica, porque esa va en el borde;
          //   abierta: relleno dorado.
          const estado = conPredica ? estadoDelDia(delDia, hoy) : null;
          const borde = abierta
            ? ""
            : conPredica
              ? `border border-dashed ${tonoDe(estado).borde}` // fino: 1 px (pedido del usuario)
              : esMarcada
                ? "border-2 border-app-main"
                : "";
          const fondo = abierta
            ? "bg-app-main font-bold text-app-dark"
            : esHoy
              ? "bg-app-violeta/20 font-bold text-app-violeta"
              : esMarcada
                ? "font-bold text-app-main"
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
              data-estado-dia={estado || undefined}
              data-marcada={esMarcada || undefined}
              data-hoy={esHoy || undefined}
              aria-label={`${fechaLarga(fecha)}${conPredica ? `: ${delDia.map((p) => p.titulo).join(", ")}` : ""}`}
              aria-current={abierta ? "date" : undefined}
              aria-pressed={esMarcada || undefined}
              onClick={() => (delMes ? onTocarDia(fecha, delDia) : setMes(mesDe(fecha)))}
              className={`mx-auto grid h-7 w-7 place-items-center rounded-full text-xs transition ${fondo} ${borde}`}
            >
              {dia}
            </button>
          );
        })}
      </div>
    </section>
  );
}
