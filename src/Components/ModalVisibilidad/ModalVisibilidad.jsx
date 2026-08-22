import {
  EyeIcon,
  TagIcon,
  BookmarkIcon,
  ChatBubbleLeftRightIcon,
  TvIcon,
} from "@heroicons/react/24/solid";
import { useState, useRef, useEffect, useCallback } from "react";
import { useAppContext } from "../Context/AppContext";

// Medidas del menú, en píxeles. Se conocen de antemano para poder colocarlo
// sin tener que medirlo después de pintarlo.
const MARGEN = 8; // separación vertical con el botón
const BORDE_DERECHO = 2; // separación con el borde derecho de la pantalla
const ALTO_FILA = 44; // icono de 28 más el relleno de su botón
const SEPARACION_FILAS = 12; // el gap-3 entre opciones

export default function ModalVisibilidad({
  toggleVisibleTicker,
  toggleVisibleTitulo,
  toggleVisibleTexto,
  setAllVisible,
  colorClass,
}) {
  const [open, setOpen] = useState(false);
  const [posicion, setPosicion] = useState(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const { visibleTicker, visibleTitulo, visibleTexto } = useAppContext();

  const options = [
    {
      etiqueta: "Ticker",
      icon: (
        <TagIcon
          className={`w-7 h-7 ${
            visibleTicker ? "text-app-success" : "text-app-muted"
          }`}
        />
      ),
      onClick: toggleVisibleTicker,
    },
    {
      etiqueta: "Título",
      icon: (
        <BookmarkIcon
          className={`w-7 h-7 ${
            visibleTitulo ? "text-app-accent" : "text-app-muted"
          }`}
        />
      ),
      onClick: toggleVisibleTitulo,
    },
    {
      etiqueta: "Texto",
      icon: (
        <ChatBubbleLeftRightIcon
          className={`w-7 h-7 ${
            visibleTexto ? "text-app-main" : "text-app-muted"
          }`}
        />
      ),
      onClick: toggleVisibleTexto,
    },
    {
      etiqueta: "Dejar la pantalla lista",
      icon: <TvIcon className={`w-7 h-7 ${colorClass}`} />,
      onClick: setAllVisible,
    },
    // La pantalla que no manda un interruptor no lo ve: canciones, por
    // ejemplo, no proyecta título y no envía `toggleVisibleTitulo`.
  ].filter((opcion) => opcion.onClick);

  // Dónde termina el encabezado de la vista, que es la línea divisoria
  // amarilla: el menú nunca puede quedar por encima de ella. Se busca subiendo
  // desde el botón hasta el primer ancestro pegajoso, que es ese encabezado en
  // las cuatro vistas que usan este menú.
  const finDelEncabezado = (boton) => {
    let elemento = boton.parentElement;

    while (elemento && elemento !== document.body) {
      if (window.getComputedStyle(elemento).position === "sticky") {
        return elemento.getBoundingClientRect().bottom;
      }
      elemento = elemento.parentElement;
    }
    return 0;
  };

  // El menú se ancla con posición fija, no al contenedor de la vista: así sale
  // siempre en el mismo sitio en todas las pantallas y no queda recortado por
  // el `overflow` ni por el encabezado pegajoso.
  const ubicar = useCallback(() => {
    const boton = buttonRef.current;
    if (!boton) return;

    const caja = boton.getBoundingClientRect();
    const alto =
      options.length * ALTO_FILA +
      (options.length - 1) * SEPARACION_FILAS +
      MARGEN * 2;

    // Debajo del botón y, sobre todo, debajo de la línea amarilla: manda la
    // que quede más abajo de las dos.
    const top = Math.max(caja.bottom, finDelEncabezado(boton)) + MARGEN;

    // Nunca se abre hacia arriba, porque taparía el encabezado. Si lo que
    // queda de pantalla no alcanza, el menú se desplaza por dentro.
    const disponible = window.innerHeight - top - MARGEN;
    const maxHeight = alto > disponible ? disponible : undefined;

    setPosicion({ top, maxHeight });
  }, [options.length]);

  // Recalcular mientras está abierto: el encabezado es pegajoso y el botón se
  // mueve al desplazar o al girar el teléfono.
  useEffect(() => {
    if (!open) return;

    ubicar();
    window.addEventListener("resize", ubicar);
    window.addEventListener("scroll", ubicar, true);
    return () => {
      window.removeEventListener("resize", ubicar);
      window.removeEventListener("scroll", ubicar, true);
    };
  }, [open, ubicar]);

  // Cerrar al tocar fuera o con la tecla Escape
  useEffect(() => {
    if (!open) return;

    const alTocarFuera = (evento) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(evento.target) &&
        !buttonRef.current?.contains(evento.target)
      ) {
        setOpen(false);
      }
    };
    const alPulsarEscape = (evento) => {
      if (evento.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", alTocarFuera);
    document.addEventListener("keydown", alPulsarEscape);
    return () => {
      document.removeEventListener("mousedown", alTocarFuera);
      document.removeEventListener("keydown", alPulsarEscape);
    };
  }, [open]);

  return (
    <>
      {/* Botón que abre el menú */}
      <button
        ref={buttonRef}
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Mostrar u ocultar partes de la pantalla"
        aria-expanded={open}
        className="w-full h-full flex items-center justify-center text-center text-xs sm:text-sm md:text-base font-bold text-app-main rounded inset-shadow-sm inset-shadow-app-main active:bg-app-main transition"
      >
        <EyeIcon className="w-4 h-4" />
      </button>

      {/* Menú */}
      {open && posicion && (
        <div
          ref={menuRef}
          role="menu"
          // Se ancla por la derecha y **no lleva ancho**: mide lo que midan
          // sus iconos, que son los mismos en todas las vistas. Un ancho fijo
          // obligaría a adivinar el número y descuadraría según el relleno.
          style={{
            top: posicion.top,
            right: BORDE_DERECHO,
            maxHeight: posicion.maxHeight,
          }}
          className="fixed z-50 shadow-[0_2px_6px_rgba(0,0,0,0.45)] rounded-xl p-2 flex flex-col gap-3 overflow-y-auto scrollbar-custom transform-gpu origin-top-right transition-all duration-150 animate-menu-open"
        >
          {options.map((item) => (
            <button
              key={item.etiqueta}
              role="menuitem"
              aria-label={item.etiqueta}
              title={item.etiqueta}
              onClick={() => {
                item.onClick();
                setOpen(false);
              }}
              className="flex items-center justify-center p-2 rounded-lg hover:bg-app-muted/10 transition"
            >
              {item.icon}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
