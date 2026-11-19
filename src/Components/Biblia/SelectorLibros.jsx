import { useEffect, useState } from "react";
import { ChevronLeftIcon } from "@heroicons/react/24/solid";
import { nombreCorto, nombreSinSan } from "../Predica/utilesPredica.js";

// Minúsculas, sin acentos y sin «S. » al inicio, para buscar «mateo» en «S. Mateo».
const normalizar = (texto) =>
  String(texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/^s\.\s*/i, "");

const numeros = (n) => Array.from({ length: n || 0 }, (_, i) => i + 1);
// `grande` (la ventana de libros del celular, 18-11-2026, pedido del usuario): botones
// más altos y con letra más grande, para el dedo.
const CASILLA = "h-8 rounded-md border text-xs font-semibold transition";
const CASILLA_GRANDE = "h-11 rounded-lg border text-sm font-semibold transition";
const normal = "border-app-border text-app-texto hover:border-app-agua hover:text-app-agua";

// Los libros de la Biblia «listos para escoger» en la columna derecha de la
// sección Biblia (18-11-2026, pedido del usuario: como en Prédica): el campo
// para buscar un libro, Antiguo | Nuevo y la cuadrícula de libros → capítulos →
// versículos, sin ventanas y de alto fijo (el de los libros del Antiguo
// Testamento de la RVR1960). Solo elige: lo que hace cada elección (leer el
// capítulo, ir a un versículo) lo decide quien lo monta.
//   libros: { librosAntiguo, librosNuevo } de la Biblia elegida
//   version: la Biblia elegida; al cambiarla la cuadrícula vuelve a los libros
//   alElegirCapitulo(libro, capitulo) · alElegirVersiculo(libro, capitulo, versiculo)
//   recientes · alElegirReciente(r) · alLimpiarRecientes(): la pestaña «Recientes», la lista de
//   versículos proyectados (18-11-2026): tocar uno vuelve a él; quien monta decide qué hace.
export default function SelectorLibros({ libros, version, alElegirCapitulo, alElegirVersiculo, recientes = [], alElegirReciente, alLimpiarRecientes, grande = false }) {
  const casilla = grande ? CASILLA_GRANDE : CASILLA;
  const [texto, setTexto] = useState("");
  const [testamento, setTestamento] = useState("antiguo");
  const [libro, setLibro] = useState(null);
  const [capitulo, setCapitulo] = useState(null);

  useEffect(() => {
    setLibro(null);
    setCapitulo(null);
    setTexto("");
  }, [version]);

  const filtro = normalizar(texto.trim());
  // Con la pestaña «Recientes» y sin texto escrito, la cuadrícula muestra la lista de recientes.
  const verRecientes = !filtro && testamento === "recientes";
  const todos = [...libros.librosAntiguo, ...libros.librosNuevo];
  // Escribiendo, se busca en los dos testamentos; sin texto, en el elegido.
  const lista = filtro
    ? todos.filter((l) => normalizar(l.nombre).startsWith(filtro))
    : testamento === "antiguo"
      ? libros.librosAntiguo
      : libros.librosNuevo;

  const elegirLibro = (elegido) => {
    setLibro(elegido);
    setCapitulo(null);
    setTexto("");
  };

  const elegirCapitulo = (n) => {
    setCapitulo(n);
    alElegirCapitulo(libro, n);
  };

  // Elegir un versículo es lo último: el texto ya queda en él y la cuadrícula vuelve a
  // la lista de libros, lista para otra búsqueda (18-11-2026, elegido por el usuario).
  const elegirVersiculo = (n) => {
    alElegirVersiculo(libro, capitulo, n);
    setCapitulo(null);
    setLibro(null);
  };

  // Enter en el campo: con un solo libro que coincida, lo elige.
  const alEnviar = (e) => {
    e.preventDefault();
    if (filtro && lista.length === 1) elegirLibro(lista[0]);
  };

  return (
    <div data-selector-libros className="flex min-h-0 flex-1 flex-col gap-2.5">
      <form onSubmit={alEnviar} aria-label="Buscar libro">
        <label className="flex h-11 w-full items-center rounded-xl border-2 border-app-border bg-app-aviso px-3 focus-within:border-app-agua">
          <span className="sr-only">Buscar libro</span>
          <input
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value);
              setLibro(null);
              setCapitulo(null);
            }}
            placeholder="Escribe un libro: Juan"
            maxLength={40}
            enterKeyHint="search"
            className="min-w-0 flex-1 bg-transparent text-base text-app-texto outline-none placeholder:text-app-muted"
          />
        </label>
      </form>

      <div role="group" aria-label="Testamento" className="flex rounded-lg border border-app-border p-0.5">
        {[
          ["antiguo", "Antiguo"],
          ["nuevo", "Nuevo"],
          ["recientes", "Recientes"],
        ].map(([clave, nombre]) => (
          <button
            key={clave}
            type="button"
            aria-pressed={!filtro && testamento === clave}
            onClick={() => {
              setTestamento(clave);
              setTexto("");
              setLibro(null);
              setCapitulo(null);
            }}
            className={`flex-1 rounded-md px-3 ${grande ? "py-2" : "py-1"} text-sm font-semibold transition ${
              !filtro && testamento === clave ? "bg-app-main text-app-dark" : "text-app-muted hover:text-app-main"
            }`}
          >
            {nombre}
          </button>
        ))}
      </div>

      {/* La cuadrícula llena el alto libre de la columna (sin huecos en blanco abajo)
          y se encoge, hasta un mínimo, para que toda la columna quepa en la
          pantalla sin desplazarse; los libros se desplazan por dentro. */}
      <div data-cuadricula-biblia className={`${grande ? "scrollbar-oculta" : "scrollbar-custom"} min-h-40 flex-1 overflow-y-auto`}>
        {verRecientes ? (
          <div data-recientes aria-label="Versículos recientes">
            {recientes.length ? (
              <>
                <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                  {recientes.map((r) => (
                    <li key={`${r.sigla}-${r.capitulo}-${r.versiculo}`}>
                      <button
                        type="button"
                        data-reciente
                        aria-label={`Ir a ${r.cita}`}
                        onClick={() => alElegirReciente?.(r)}
                        className={`w-full rounded-md border border-app-border px-2.5 text-left transition hover:border-app-agua ${grande ? "py-2.5" : "py-1.5"}`}
                      >
                        <b className={`block text-app-agua ${grande ? "text-sm" : "text-xs"}`}>{r.cita}</b>
                        <span className={`block truncate text-app-muted ${grande ? "text-sm" : "text-xs"}`}>{r.texto}</span>
                      </button>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  data-limpiar-recientes
                  onClick={() => alLimpiarRecientes?.()}
                  className="mt-2 w-full py-1 text-center text-xs text-app-muted hover:text-app-main"
                >
                  Limpiar recientes
                </button>
              </>
            ) : (
              <p className="m-0 p-3 text-center text-sm text-app-muted">Aún no has proyectado versículos.</p>
            )}
          </div>
        ) : (
          <>
        {libro && (
          <button
            type="button"
            onClick={() => (capitulo ? setCapitulo(null) : setLibro(null))}
            className="mb-1.5 flex items-center gap-1 text-sm font-semibold text-app-agua hover:underline"
          >
            <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
            {capitulo ? `${nombreSinSan(libro.nombre)} ${capitulo}` : nombreSinSan(libro.nombre)}
          </button>
        )}
        {!libro ? (
          lista.length ? (
            <div className="grid grid-cols-4 gap-1.5" aria-label="Libros">
              {lista.map((l) => (
                <button key={l.sigla} type="button" title={l.nombre} aria-label={l.nombre} onClick={() => elegirLibro(l)} className={`${casilla} ${normal}`}>
                  {nombreCorto(l.nombre)}
                </button>
              ))}
            </div>
          ) : (
            <p className="m-0 p-3 text-center text-sm text-app-muted">No hay un libro que empiece así.</p>
          )
        ) : !capitulo ? (
          <div className="grid grid-cols-6 gap-1.5" aria-label={`Capítulos de ${libro.nombre}`}>
            {numeros(libro.capitulos).map((n) => (
              <button key={n} type="button" aria-label={`Capítulo ${n}`} onClick={() => elegirCapitulo(n)} className={`${casilla} ${normal}`}>
                {n}
              </button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-6 gap-1.5" aria-label={`Versículos de ${libro.nombre} ${capitulo}`}>
            {numeros(libro[`capitulo${capitulo}`]).map((n) => (
              <button key={n} type="button" aria-label={`Versículo ${n}`} onClick={() => elegirVersiculo(n)} className={`${casilla} ${normal}`}>
                {n}
              </button>
            ))}
          </div>
        )}
          </>
        )}
      </div>
    </div>
  );
}
