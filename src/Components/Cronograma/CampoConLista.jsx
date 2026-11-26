import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";

// Campo de texto con una lista desplegable de sugerencias, con el estilo de la app (25-11-2026,
// pedido del usuario: la lista nativa del navegador, `datalist`, no se podía vestir). Se puede
// ESCOGER una sugerencia o escribir libre. Al enfocarlo se abre la lista; al escribir se filtra;
// flechas arriba y abajo para moverse, Enter para escoger y Escape para cerrar.
export default function CampoConLista({
  etiqueta,
  valor,
  alCambiar,
  opciones,
  placeholder,
  claseEtiqueta,
  claseCampo,
  className = "",
}) {
  const id = useId();
  const [abierta, setAbierta] = useState(false);
  const [activa, setActiva] = useState(-1);

  // Con el campo vacío, o con una sugerencia ya escrita entera, salen todas; si no, las que coinciden
  const visibles = useMemo(() => {
    const texto = valor.trim().toLowerCase();
    if (!texto || opciones.some((o) => o.toLowerCase() === texto))
      return opciones;
    return opciones.filter((o) => o.toLowerCase().includes(texto));
  }, [valor, opciones]);

  const mostrar = abierta && visibles.length > 0;

  // La lista va FIJA a la pantalla (no dentro del contenedor): así no la recorta el panel con
  // scroll en el que esté el campo (25-11-2026: en «Administrar cargos» quedaba oculta). Se abre
  // hacia abajo y, si ahí no cabe, hacia arriba, con el alto que haya.
  const campoRef = useRef(null);
  const [sitio, setSitio] = useState(null);
  useEffect(() => {
    if (!mostrar) return undefined;
    const colocar = () => {
      const caja = campoRef.current?.getBoundingClientRect();
      if (!caja) return;
      const abajo = window.innerHeight - caja.bottom - 8;
      const arriba = caja.top - 8;
      const haciaArriba = abajo < 160 && arriba > abajo;
      const alto = Math.max(96, Math.min(224, haciaArriba ? arriba : abajo));
      setSitio({
        left: caja.left,
        width: caja.width,
        maxHeight: alto,
        ...(haciaArriba
          ? { bottom: window.innerHeight - caja.top + 4 }
          : { top: caja.bottom + 4 }),
      });
    };
    colocar();
    window.addEventListener("resize", colocar);
    window.addEventListener("scroll", colocar, true);
    return () => {
      window.removeEventListener("resize", colocar);
      window.removeEventListener("scroll", colocar, true);
    };
  }, [mostrar, visibles.length]);

  const escoger = (opcion) => {
    alCambiar(opcion);
    setAbierta(false);
    setActiva(-1);
  };

  const alPulsar = (evento) => {
    if (evento.key === "ArrowDown") {
      evento.preventDefault();
      setAbierta(true);
      setActiva((a) => (a + 1) % visibles.length);
    } else if (evento.key === "ArrowUp") {
      evento.preventDefault();
      setAbierta(true);
      setActiva((a) => (a <= 0 ? visibles.length - 1 : a - 1));
    } else if (evento.key === "Enter" && mostrar && activa >= 0) {
      evento.preventDefault();
      escoger(visibles[activa]);
    } else if (evento.key === "Escape" && abierta) {
      evento.preventDefault();
      setAbierta(false);
      setActiva(-1);
    }
  };

  return (
    <div className={`relative flex flex-col gap-1 ${className}`}>
      <label htmlFor={id} className={claseEtiqueta}>
        {etiqueta}
      </label>
      <div ref={campoRef} className="relative">
        <input
          id={id}
          role="combobox"
          aria-expanded={mostrar}
          aria-controls={`${id}-lista`}
          aria-autocomplete="list"
          aria-activedescendant={
            mostrar && activa >= 0 ? `${id}-${activa}` : undefined
          }
          autoComplete="off"
          value={valor}
          placeholder={placeholder}
          onChange={(e) => {
            alCambiar(e.target.value);
            setAbierta(true);
            setActiva(-1);
          }}
          onFocus={() => setAbierta(true)}
          onBlur={() => setAbierta(false)}
          onKeyDown={alPulsar}
          className={`${claseCampo} pr-9`}
        />
        <ChevronDownIcon
          aria-hidden="true"
          className={`pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-app-muted transition-transform ${mostrar ? "rotate-180" : ""}`}
        />
      </div>
      {mostrar && sitio && (
        <ul
          id={`${id}-lista`}
          role="listbox"
          aria-label={`Sugerencias de ${etiqueta.toLowerCase()}`}
          style={sitio}
          className="scrollbar-custom fixed z-50 overflow-y-auto rounded-lg border border-app-border bg-app-light p-1 shadow-xl"
        >
          {visibles.map((opcion, i) => (
            <li
              key={opcion}
              id={`${id}-${i}`}
              role="option"
              aria-selected={opcion === valor}
              // mousedown (no click): el campo no pierde el foco antes de escoger
              onMouseDown={(e) => {
                e.preventDefault();
                escoger(opcion);
              }}
              onMouseEnter={() => setActiva(i)}
              className={`cursor-pointer rounded-md px-2.5 py-1.5 text-sm transition ${
                i === activa
                  ? "bg-app-main/15 text-app-main"
                  : opcion === valor
                    ? "font-bold text-app-main"
                    : "text-app-muted"
              }`}
            >
              {opcion}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
