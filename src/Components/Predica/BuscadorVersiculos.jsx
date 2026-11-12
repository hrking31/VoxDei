import { useEffect, useState } from "react";
import { ChevronLeftIcon, PlayIcon } from "@heroicons/react/24/solid";
import { PlusIcon as MasGrueso } from "@heroicons/react/24/outline";
import { obtenerVersiculo } from "../FuncionesControlPredica/FuncionesControlPredica";
import { useAppContext } from "../Context/AppContext";
import { librosDe, versionValida } from "../Biblia/versionesBiblia";
import { siglaBiblia } from "../LibrosBiblia/avisosBiblia.js";
import { citaDeLibro, interpretarEntrada, nombreCorto, nombreSinSan, nuevaPieza } from "./utilesPredica.js";

const callado = () => {};

// El texto de una cita, sin avisos de «Versículo encontrado» en cada tecla.
async function textoDe(sigla, capitulo, versiculo, version) {
  const datos = await obtenerVersiculo(sigla, capitulo, versiculo, "versiculo", callado, version).catch(() => null);
  return datos?.texto || null;
}

// El buscador de versículos de la columna derecha (computador, 11 de noviembre
// de 2026, pedidos del usuario):
// - el campo, de todo el ancho y sin botón («Escribe una cita: Juan 3 16»);
// - Antiguo | Nuevo, con el estilo del botón RVR1960 / DHH;
// - la cuadrícula de libros → capítulos → versículos, sin ventanas, de alto
//   fijo: el de los libros del Antiguo Testamento de la RVR1960;
// - desde ahí hasta abajo, el versículo elegido (escrito o tocado en la
//   cuadrícula): la cita, las iniciales de su Biblia y el texto. Un clic en
//   la tarjeta, o Enter en el campo, lo agrega al bosquejo.
// En Predicar (12-11-2026, pedido del usuario: «copia todo ese bloque como
// está en Preparar») es el mismo bloque con `accion="proyectar"`: la tarjeta
// dice «Proyectar» y el clic lo envía al templo sin tocar el bosquejo. Si
// `onAgregar` devuelve false (sin turno), lo escrito se queda.
// TEMPORAL DHH: los libros, el reconocimiento y el texto son de la Biblia
// elegida (RVR1960 o DHH); al quitarla, `librosDe` y `version` se van.
const ACCIONES = {
  // La marca de agua del +: el de contorno con trazo grueso (el relleno era
  // muy fino y no se veía; pedido del usuario, 12-11-2026).
  agregar: { verbo: "Agregar", marca: MasGrueso, grosor: 3, ayuda: "aquí lo ves y con un clic se agrega." },
  proyectar: { verbo: "Proyectar", marca: PlayIcon, ayuda: "aquí lo ves y con un clic se proyecta." },
};

export default function BuscadorVersiculos({ onAgregar, showNotif, accion = "agregar" }) {
  const { verbo, marca: MarcaAgua, grosor, ayuda } = ACCIONES[accion] || ACCIONES.agregar;
  // La tarjeta dice qué hace con la marca de agua; el nombre queda en aria-label.
  const { versionBiblia } = useAppContext();
  const version = versionValida(versionBiblia);
  const libros = librosDe(version);

  const [texto, setTexto] = useState("");
  // { cita, texto, version, numero? } | { cita, error: true } | null
  const [elegido, setElegido] = useState(null);
  const [testamento, setTestamento] = useState("antiguo");
  const [libro, setLibro] = useState(null);
  const [capitulo, setCapitulo] = useState(null);

  const cita = interpretarEntrada(texto, "versiculo", libros)?.cita || null;

  // La cita escrita pasa a la tarjeta un momento después de dejar de escribir.
  useEffect(() => {
    if (!cita) return undefined;
    let vigente = true;
    const espera = setTimeout(async () => {
      const encontrado = await textoDe(cita.sigla, cita.capitulo, cita.versiculo, version);
      if (vigente) setElegido(encontrado ? { cita: cita.cita, texto: encontrado, version } : { cita: cita.cita, error: true });
    }, 350);
    return () => {
      vigente = false;
      clearTimeout(espera);
    };
    // La cita cambia de objeto en cada render; basta con su texto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cita?.cita, version]);

  // Si cambia la Biblia, la cuadrícula vuelve a los libros.
  useEffect(() => {
    setLibro(null);
    setCapitulo(null);
  }, [version]);

  const agregar = (versiculo) => {
    if (!versiculo || versiculo.error) return;
    if (onAgregar(nuevaPieza("versiculo", { cita: versiculo.cita, texto: versiculo.texto, version: versiculo.version })) === false) return;
    setElegido(null);
    setTexto("");
  };

  // Enter en el campo: lo escrito (si aún no llegó a la tarjeta, se busca).
  const alEnviar = async (e) => {
    e.preventDefault();
    if (!texto.trim()) return agregar(elegido);
    if (!cita) {
      showNotif("warning", "No reconozco esa cita. Escríbela así: Juan 3 16");
      return undefined;
    }
    if (elegido?.cita === cita.cita) return agregar(elegido);
    const encontrado = await textoDe(cita.sigla, cita.capitulo, cita.versiculo, version);
    if (!encontrado) {
      showNotif("error", `No encontré ${cita.cita}.`);
      return undefined;
    }
    return agregar({ cita: cita.cita, texto: encontrado, version });
  };

  const elegirDeLaCuadricula = async (numero) => {
    const citaElegida = citaDeLibro(libro, capitulo, numero);
    const encontrado = await textoDe(libro.sigla, capitulo, numero, version);
    setElegido(encontrado ? { cita: citaElegida, texto: encontrado, version, numero } : { cita: citaElegida, error: true });
  };

  const lista = testamento === "antiguo" ? libros.librosAntiguo : libros.librosNuevo;
  const numeros = (n) => Array.from({ length: n || 0 }, (_, i) => i + 1);
  const casilla = "h-8 rounded-md border text-xs font-semibold transition";
  const normal = "border-app-border text-app-texto hover:border-app-agua hover:text-app-agua";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5">
      <form onSubmit={alEnviar} aria-label={`${verbo} versículo`}>
        <label className="flex h-11 w-full items-center rounded-xl border-2 border-app-border bg-app-aviso px-3 focus-within:border-app-agua">
          <span className="sr-only">Buscar versículo</span>
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Escribe una cita: Juan 3 16"
            maxLength={60}
            enterKeyHint="send"
            className="min-w-0 flex-1 bg-transparent text-base text-app-texto outline-none placeholder:text-app-muted"
          />
        </label>
      </form>

      <div role="group" aria-label="Testamento" className="flex rounded-lg border border-app-border p-0.5">
        {[
          ["antiguo", "Antiguo"],
          ["nuevo", "Nuevo"],
        ].map(([clave, nombre]) => (
          <button
            key={clave}
            type="button"
            aria-pressed={testamento === clave}
            onClick={() => {
              setTestamento(clave);
              setLibro(null);
              setCapitulo(null);
            }}
            className={`flex-1 rounded-md px-3 py-1 text-sm font-semibold transition ${
              testamento === clave ? "bg-app-main text-app-dark" : "text-app-muted hover:text-app-main"
            }`}
          >
            {nombre}
          </button>
        ))}
      </div>

      {/* Alto fijo: el de los 39 libros del Antiguo Testamento de la RVR1960
          (10 filas). Lo demás se desplaza por dentro. */}
      <div data-cuadricula-biblia className="scrollbar-custom h-94 shrink-0 overflow-y-auto">
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
          <div className="grid grid-cols-4 gap-1.5" aria-label="Libros">
            {lista.map((l) => (
              <button key={l.sigla} type="button" title={l.nombre} aria-label={l.nombre} onClick={() => setLibro(l)} className={`${casilla} ${normal}`}>
                {nombreCorto(l.nombre)}
              </button>
            ))}
          </div>
        ) : !capitulo ? (
          <div className="grid grid-cols-6 gap-1.5" aria-label={`Capítulos de ${libro.nombre}`}>
            {numeros(libro.capitulos).map((n) => (
              <button key={n} type="button" aria-label={`Capítulo ${n}`} onClick={() => setCapitulo(n)} className={`${casilla} ${normal}`}>
                {n}
              </button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-6 gap-1.5" aria-label={`Versículos de ${libro.nombre} ${capitulo}`}>
            {numeros(libro[`capitulo${capitulo}`]).map((n) => {
              const marcado = elegido?.numero === n && elegido.cita === citaDeLibro(libro, capitulo, n);
              return (
                <button
                  key={n}
                  type="button"
                  aria-label={`Versículo ${n}`}
                  aria-pressed={marcado}
                  onClick={() => elegirDeLaCuadricula(n)}
                  className={`${casilla} ${marcado ? "border-app-agua bg-app-agua text-app-dark" : normal}`}
                >
                  {n}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* El versículo elegido, hasta abajo: un clic lo agrega. */}
      {elegido && !elegido.error ? (
        <button
          type="button"
          data-versiculo-elegido
          onClick={() => agregar(elegido)}
          aria-label={`${verbo} ${elegido.cita}`}
          className="group scrollbar-custom relative isolate flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto rounded-xl border border-app-agua/60 bg-app-agua/10 p-3 text-left transition hover:border-app-agua hover:bg-app-agua/15"
        >
          {/* Marca de agua: + en Preparar, ▶ en Predicar (12-11-2026, pedido
              del usuario, en vez del rótulo «Agregar» / «Proyectar»). */}
          <MarcaAgua
            data-marca-agua={accion}
            strokeWidth={grosor}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 m-auto h-24 w-24 text-app-agua/15 transition group-hover:text-app-agua/25"
          />
          <span className="flex w-full items-center gap-2 text-xs font-bold tracking-widest text-app-agua uppercase">
            {elegido.cita}
            <span className="opacity-60">· {siglaBiblia(elegido.version)}</span>
          </span>
          <span className="text-sm leading-relaxed text-app-texto">{elegido.texto}</span>
        </button>
      ) : (
        <p className="m-0 flex min-h-0 flex-1 items-center justify-center rounded-xl border border-dashed border-app-border p-3 text-center text-sm text-app-muted">
          {elegido?.error ? `No encontré ${elegido.cita}.` : `Elige un versículo o escribe una cita: ${ayuda}`}
        </p>
      )}
    </div>
  );
}
