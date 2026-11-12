import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRightIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useAppContext } from "../Context/AppContext";
import EscenaPantalla from "./EscenaPantalla";
import { AVISO_ESTADO, DURACION_AVISO, TEXTO_ESTADO } from "./presencia.js";

// Aviso de los cambios de la pantalla del templo (10 de noviembre de 2026,
// diseño aprobado por el usuario sobre https://claude.ai/artifact/3tf5hXWdbtZSWaP2i6hNDT).
// Es aparte de Notificaciones a propósito: va en otro sitio para no tapar lo
// que se usa durante el culto, y los demás avisos de la app no cambian.
//   - Computador: tarjeta compacta abajo a la derecha (la barra lateral está a
//     la izquierda y los botones, arriba). Con el mouse encima se detiene la cuenta.
//   - Celular y tablet: píldora arriba, debajo de la cámara (abajo están la
//     barra, el botón de volver y «Siguiente»). Tocarla la cierra.
// Solo dos líneas, en los dos (pedido del usuario: en 2 s no da para leer
// más): el estado arriba («Modo maximizado») y el cambio debajo
// («Ventana → Maximizada»).
// Un aviso nuevo reemplaza al anterior. Lo dispara InicializarEstados con
// setAvisoPantalla({ id, antes, ahora }).

// Cuenta atrás que se puede detener: al reanudar sigue con lo que le quedaba.
function useCuenta(aviso, pausado, alTerminar) {
  const restante = useRef(DURACION_AVISO);
  useEffect(() => {
    restante.current = DURACION_AVISO;
  }, [aviso?.id]);
  useEffect(() => {
    if (!aviso || pausado) return;
    const inicio = Date.now();
    const temporizador = setTimeout(alTerminar, restante.current);
    return () => {
      clearTimeout(temporizador);
      restante.current = Math.max(400, restante.current - (Date.now() - inicio));
    };
  }, [aviso, pausado, alTerminar]);
}

// «Ventana → Completa»
function Paso({ aviso }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-diminuto font-semibold tracking-widest text-app-muted uppercase">
      {TEXTO_ESTADO[aviso.antes]}
      <ArrowRightIcon className="h-3 w-3" aria-hidden="true" />
      <b className="tono font-bold">{TEXTO_ESTADO[aviso.ahora]}</b>
    </span>
  );
}

function Cuenta({ pausado, className }) {
  return (
    <div className={`pista-tono absolute bottom-0 ${className}`} aria-hidden="true">
      <i className={`cuenta-tono block h-full w-full origin-left animate-cuenta-aviso ${pausado ? "pausada" : ""}`} />
    </div>
  );
}

// El aviso oculto se sacude un poco al llegar: es el que más importa.
const sacudida = (aviso) => (aviso.ahora === "oculta" ? { x: [0, -4, 4, -4, 4, 0] } : {});
const transicion = {
  type: "spring",
  stiffness: 420,
  damping: 24,
  x: { type: "tween", delay: 0.5, duration: 0.45 },
};

function Tarjeta({ aviso, pausado, alPausar, alCerrar }) {
  const titulo = AVISO_ESTADO[aviso.ahora];
  return (
    <motion.div
      role="status"
      aria-live="polite"
      data-estado={aviso.ahora}
      data-aviso-pantalla="tarjeta"
      initial={{ opacity: 0, y: 40, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1, ...sacudida(aviso) }}
      exit={{ opacity: 0, y: 30, scale: 0.96, transition: { duration: 0.3 } }}
      transition={transicion}
      onMouseEnter={() => alPausar(true)}
      onMouseLeave={() => alPausar(false)}
      className="aviso-templo pointer-events-auto relative flex w-aviso-pantalla items-center gap-2.5 overflow-hidden rounded-2xl py-2.5 pr-2 pl-2.5"
    >
      <div className="tono resplandor-tono grid h-13 w-18 shrink-0 place-items-center rounded-xl">
        <EscenaPantalla estado={aviso.ahora} className="w-16" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="tono text-base leading-tight font-bold">{titulo}</span>
        <Paso aviso={aviso} />
      </div>
      <button
        type="button"
        onClick={alCerrar}
        aria-label="Cerrar aviso"
        className="grid h-7 w-7 shrink-0 place-items-center self-start rounded-lg text-app-muted hover:bg-app-texto/5 hover:text-app-texto"
      >
        <XMarkIcon className="h-4 w-4" />
      </button>
      {aviso.ahora === "encendida" && (
        <span
          className="reflejo pointer-events-none absolute inset-0 motion-safe:animate-brillo-aviso motion-reduce:hidden"
          aria-hidden="true"
        />
      )}
      <Cuenta pausado={pausado} className="inset-x-0 h-0.75" />
    </motion.div>
  );
}

function Pildora({ aviso, alCerrar }) {
  const titulo = AVISO_ESTADO[aviso.ahora];
  return (
    <motion.div
      role="status"
      aria-live="polite"
      aria-label={`${titulo}. Toca para cerrar`}
      data-estado={aviso.ahora}
      data-aviso-pantalla="pildora"
      initial={{ opacity: 0, y: -36, scale: 0.7 }}
      animate={{ opacity: 1, y: 0, scale: 1, ...sacudida(aviso) }}
      exit={{ opacity: 0, y: -30, scale: 0.85, transition: { duration: 0.3 } }}
      transition={transicion}
      onClick={alCerrar}
      className="aviso-templo pointer-events-auto relative flex max-w-60 cursor-pointer items-center gap-2 overflow-hidden rounded-full py-1.5 pr-4 pl-1.5"
    >
      <div className="tono resplandor-tono grid h-9 w-12 shrink-0 place-items-center rounded-full">
        <EscenaPantalla estado={aviso.ahora} className="w-11" />
      </div>
      <div className="flex min-w-0 flex-col">
        <span className="tono truncate text-sm leading-tight font-bold">{titulo}</span>
        <Paso aviso={aviso} />
      </div>
      <Cuenta className="inset-x-5 h-0.5" />
    </motion.div>
  );
}

export default function AvisoPantalla() {
  const { avisoPantalla: aviso, setAvisoPantalla, isDesktop } = useAppContext();
  const [pausado, setPausado] = useState(false);
  const cerrar = useCallback(() => {
    setPausado(false);
    setAvisoPantalla(null);
  }, [setAvisoPantalla]);
  useCuenta(aviso, isDesktop && pausado, cerrar);

  return (
    <div
      className={
        isDesktop
          ? "pointer-events-none fixed right-6 bottom-6 z-50"
          : "pointer-events-none fixed inset-x-0 top-aviso-isla z-50 flex justify-center px-3"
      }
    >
      <AnimatePresence mode="wait">
        {aviso &&
          (isDesktop ? (
            <Tarjeta key={aviso.id} aviso={aviso} pausado={pausado} alPausar={setPausado} alCerrar={cerrar} />
          ) : (
            <Pildora key={aviso.id} aviso={aviso} alCerrar={cerrar} />
          ))}
      </AnimatePresence>
    </div>
  );
}
