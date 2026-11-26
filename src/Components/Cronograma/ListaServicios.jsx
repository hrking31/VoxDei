import { useState } from "react";
import { ArrowPathIcon, StarIcon } from "@heroicons/react/24/solid";
import { textoHora } from "./UtilesCronograma.js";
import {
  bloqueDeFecha,
  conteoServicios,
  especialesProximos,
  semanaDeRepetidos,
  textoFalta,
  textoRepeticion,
} from "./utilesServicios.js";

const FILTROS = [
  ["todos", "Todos"],
  ["repiten", "Se repiten"],
  ["especiales", "Especiales"],
];

// A partir de cuántos servicios un día muestra su cuenta en el encabezado («Dom · 12»)
const MUCHOS = 4;

// Lo que dice una tarjeta que se toca (o no, si quien mira no puede corregir servicios)
function Envoltura({ servicio, interactiva, alTocar, clases, children }) {
  return interactiva ? (
    <button
      type="button"
      data-servicio={servicio.id}
      onClick={() => alTocar(servicio)}
      className={`${clases} text-left hover:border-app-main`}
    >
      {children}
    </button>
  ) : (
    <div data-servicio={servicio.id} className={clases}>
      {children}
    </div>
  );
}

// Tarjeta de UN servicio que se repite (tablero de la semana, diseño 2 del lienzo): franja dorada,
// hora, nombre y «Cada semana» (el título dice qué días: «Cada domingo»). Nunca se junta con otras.
function TarjetaRepite({ servicio, enCurso, seCorrige, interactiva, alTocar }) {
  const pausado = servicio.activo === false;
  const clases = `flex w-full shrink-0 flex-col gap-0.5 rounded-xl border border-l-4 px-2.5 py-2 transition ${
    enCurso
      ? "border-app-success bg-app-success/10"
      : seCorrige
        ? "border-app-main bg-app-main/10"
        : "border-app-border bg-app-light/40"
  } border-l-app-main ${pausado ? "opacity-50" : ""}`;
  return (
    <Envoltura
      servicio={servicio}
      interactiva={interactiva}
      alTocar={alTocar}
      clases={clases}
    >
      <span
        data-tipo="repite"
        className="flex flex-wrap items-baseline gap-x-2 text-[0.8rem] font-extrabold text-app-main"
      >
        {textoHora(servicio.inicio)} – {textoHora(servicio.fin)}
        {enCurso && (
          <span className="text-xs font-bold text-app-success">· en curso</span>
        )}
        {pausado && (
          <span className="text-xs font-bold text-app-muted">· pausado</span>
        )}
      </span>
      {servicio.nombre && (
        <span className="truncate text-[0.8rem] text-app-texto">
          {servicio.nombre}
        </span>
      )}
      <span
        title={textoRepeticion(servicio)}
        className="mt-0.5 inline-flex w-fit items-center gap-1 rounded-full bg-app-main/15 px-2 py-0.5 text-[0.65rem] font-bold text-app-main"
      >
        <ArrowPathIcon className="h-2.5 w-2.5" aria-hidden="true" />
        Cada semana
      </span>
    </Envoltura>
  );
}

// Tarjeta de una fecha especial: bloque de fecha azul, hora, nombre y cuánto falta.
function TarjetaEspecial({
  servicio,
  hoyISO,
  enCurso,
  seCorrige,
  interactiva,
  alTocar,
}) {
  const bloque = bloqueDeFecha(servicio.fecha);
  const pausado = servicio.activo === false;
  const clases = `flex w-full gap-2.5 rounded-xl border px-3 py-2.5 transition bg-linear-to-br from-app-azul/10 to-app-light/40 ${
    enCurso
      ? "border-app-success"
      : seCorrige
        ? "border-app-main bg-app-main/10"
        : "border-app-azul/45"
  } ${pausado ? "opacity-50" : ""}`;
  return (
    <Envoltura
      servicio={servicio}
      interactiva={interactiva}
      alTocar={alTocar}
      clases={clases}
    >
      <span
        data-bloque-fecha
        title="Una sola vez"
        className="w-11 shrink-0 self-start overflow-hidden rounded-xl border border-app-azul/50 bg-app-aviso text-center"
      >
        <i className="block bg-app-azul py-0.5 text-[0.6rem] font-extrabold not-italic tracking-widest text-app-dark">
          {bloque.mes}
        </i>
        <b className="block py-0.5 text-xl leading-tight text-app-texto">
          {bloque.dia}
        </b>
        <em className="block pb-1 text-[0.6rem] not-italic text-app-muted uppercase">
          {bloque.semana}
        </em>
      </span>
      <span
        data-tipo="especial"
        className="flex min-w-0 flex-1 flex-col gap-0.5"
      >
        <span className="text-sm font-extrabold text-app-azul">
          {textoHora(servicio.inicio)} – {textoHora(servicio.fin)}
          {enCurso && (
            <span className="ml-2 text-xs font-bold text-app-success">
              · en curso
            </span>
          )}
          {pausado && (
            <span className="ml-2 text-xs font-bold text-app-muted">
              · pausado
            </span>
          )}
        </span>
        {servicio.nombre && (
          <span className="truncate text-[0.8rem] text-app-texto">
            {servicio.nombre}
          </span>
        )}
        <span className="text-xs text-app-muted">
          {textoFalta(servicio.fecha, hoyISO)}
        </span>
      </span>
    </Envoltura>
  );
}

// La pestaña «Servicios» (25-11-2026), con el diseño que el usuario armó mirando el lienzo
// https://claude.ai/artifact/5KGLCrx2ZFM1jtNaBm3Vu2 (Muchos servicios 5): arriba el título en dorado con
// cuántos hay de cada clase y los filtros Todos / Se repiten / Especiales; luego las FECHAS
// ESPECIALES, siempre arriba para que no se pierdan aunque haya muchos servicios; y debajo «La semana
// que se repite», un tablero de siete columnas (Lun a Dom) donde CADA servicio es su propia tarjeta.
// Cada día tiene un alto máximo y se desplaza por su cuenta si no cabe, así un domingo con muchos
// servicios no empuja nada hacia abajo. Una tarjeta por servicio, aunque se repita: todas sus fechas
// se ven en el calendario de la columna y en la pestaña Programación.
//
// `alTocar(servicio)` corrige un servicio; sin él, las tarjetas solo se miran.
export default function ListaServicios({
  servicios,
  hoyISO,
  diaDeHoy,
  turno,
  editando,
  alTocar,
}) {
  const [filtro, setFiltro] = useState("todos");
  const conteo = conteoServicios(servicios, hoyISO);
  const semana = semanaDeRepetidos(servicios);
  const especiales = especialesProximos(servicios, hoyISO);
  const verRepiten = filtro !== "especiales";
  const verEspeciales = filtro !== "repiten";
  const enCursoDe = (s) =>
    turno?.tipo === "servicio" && turno.servicio.id === s.id;

  // El título de la pestaña, arriba, en el dorado de la app (25-11-2026, pedido del usuario),
  // con cuántos hay de cada clase.
  const titulo = (
    <div
      data-titulo-servicios
      className="flex flex-wrap items-baseline gap-x-3"
    >
      <h2 className="m-0 text-xl font-bold text-app-main">Servicios</h2>
      <span className="text-sm text-app-muted">
        {conteo.repiten} {conteo.repiten === 1 ? "se repite" : "se repiten"} ·{" "}
        {conteo.especiales}{" "}
        {conteo.especiales === 1 ? "fecha especial" : "fechas especiales"}
      </span>
    </div>
  );

  if (conteo.todos === 0) {
    return (
      <div data-lista-servicios className="flex flex-col gap-4">
        {titulo}
        <p className="py-8 text-center text-app-muted">
          Aún no hay servicios.
          {alTocar &&
            " Crea el primero en la columna de la derecha, o con el botón «Servicio»."}
        </p>
      </div>
    );
  }

  return (
    <div data-lista-servicios className="flex flex-col gap-4">
      {titulo}
      <div
        role="group"
        aria-label="Filtrar servicios"
        className="flex flex-wrap items-center gap-2"
      >
        {FILTROS.map(([valor, texto]) => (
          <button
            key={valor}
            type="button"
            aria-pressed={filtro === valor}
            onClick={() => setFiltro(valor)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
              filtro === valor
                ? "bg-app-main text-app-dark"
                : valor === "especiales"
                  ? "bg-app-azul/15 text-app-azul hover:bg-app-azul/25"
                  : valor === "repiten"
                    ? "bg-app-main/15 text-app-main hover:bg-app-main/25"
                    : "bg-app-light text-app-muted hover:text-app-texto"
            }`}
          >
            {texto} · {conteo[valor]}
          </button>
        ))}
      </div>

      {verEspeciales && (
        <section
          data-columna-especiales
          aria-label="Fechas especiales"
          className="flex min-w-0 flex-col gap-2.5"
        >
          <h2 className="m-0 flex items-center gap-2 text-xs font-extrabold tracking-widest text-app-azul uppercase">
            <StarIcon className="h-4 w-4" aria-hidden="true" />
            Fechas especiales
            <span className="ml-auto rounded-full bg-app-azul/15 px-2 py-0.5 text-[0.7rem] tracking-normal normal-case">
              {conteo.especiales}
            </span>
          </h2>
          {especiales.length === 0 ? (
            <p className="m-0 rounded-xl border border-dashed border-app-border p-4 text-sm text-app-muted">
              No hay fechas especiales.{" "}
              {alTocar
                ? "Toca un día libre del calendario para crear una."
                : ""}
            </p>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-2.5">
              {especiales.map((s) => (
                <TarjetaEspecial
                  key={s.id}
                  servicio={s}
                  hoyISO={hoyISO}
                  enCurso={enCursoDe(s)}
                  seCorrige={editando === s.id}
                  interactiva={Boolean(alTocar)}
                  alTocar={alTocar}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {verRepiten && (
        <section
          data-columna-repiten
          aria-label="Se repiten"
          className="flex min-w-0 flex-col gap-2.5"
        >
          <h2 className="m-0 flex items-center gap-2 text-xs font-extrabold tracking-widest text-app-main uppercase">
            <ArrowPathIcon className="h-4 w-4" aria-hidden="true" />
            La semana que se repite
            <span className="ml-auto rounded-full bg-app-main/15 px-2 py-0.5 text-[0.7rem] tracking-normal normal-case">
              {conteo.repiten}
            </span>
          </h2>
          {conteo.repiten === 0 && (
            <p className="m-0 text-sm text-app-muted">
              Ningún servicio se repite todavía.
            </p>
          )}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-7">
            {semana.map((dia) => {
              const esHoy = dia.num === diaDeHoy;
              return (
                <div
                  key={dia.num}
                  data-dia-semana={dia.num}
                  className="flex min-w-0 flex-col gap-2"
                >
                  <h3
                    className={`m-0 rounded-lg px-2 py-1.5 text-center text-xs font-extrabold tracking-widest uppercase ${
                      esHoy
                        ? "bg-app-violeta/20 text-app-violeta"
                        : "bg-app-light text-app-muted"
                    }`}
                  >
                    {dia.abrev}
                    {esHoy && " · hoy"}
                    {dia.servicios.length > MUCHOS &&
                      ` · ${dia.servicios.length}`}
                  </h3>
                  {dia.servicios.length === 0 ? (
                    <div className="grid h-11 place-items-center rounded-xl border border-dashed border-app-border text-[0.7rem] text-app-border">
                      libre
                    </div>
                  ) : (
                    <div
                      data-dia-lista
                      className="scrollbar-custom flex max-h-[34rem] flex-col gap-2 overflow-y-auto pr-0.5"
                    >
                      {dia.servicios.map((s) => (
                        <TarjetaRepite
                          key={s.id}
                          servicio={s}
                          enCurso={enCursoDe(s)}
                          seCorrige={editando === s.id}
                          interactiva={Boolean(alTocar)}
                          alTocar={alTocar}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
