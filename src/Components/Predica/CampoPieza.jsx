import { useEffect, useState } from "react";
import { ArrowUpIcon, CheckIcon, ChevronDownIcon } from "@heroicons/react/24/solid";
import { obtenerVersiculo } from "../FuncionesControlPredica/FuncionesControlPredica";
import { useAppContext } from "../Context/AppContext";
import { VERSIONES, VERSION_POR_DEFECTO, librosDe, versionValida } from "../Biblia/versionesBiblia";
import ElegirImagen from "./ElegirImagen.jsx";
import { tonoPieza } from "./tonosPieza.js";
import { NOMBRE_TIPO, TIPOS_PIEZA, interpretarEntrada, nuevaPieza } from "./utilesPredica.js";

const callado = () => {};

// Busca el texto de una cita sin avisos de «Versículo encontrado» en cada tecla.
// TEMPORAL DHH (11-11-2026): `version` es la Biblia elegida en SelectorBiblia.
async function textoDeCita(cita, version) {
  const datos = await obtenerVersiculo(cita.sigla, cita.capitulo, cita.versiculo, "versiculo", callado, version);
  return datos?.texto || null;
}

// El campo único de Preparar en el celular (sin cambios por ahora, decisión
// del usuario del 11-11-2026; en el computador se agrega con los botones del
// bosquejo y el BuscadorVersiculos de la columna derecha). Un solo renglón:
// el tipo es un botón que cambia al tocarlo (Punto, Mensaje, Imagen); una
// cita («Juan 3:16», «mar 9 23») se reconoce sola y pasa a Versículo; con
// Imagen, el campo cambia por «Subir imagen | Mis imágenes».
export default function CampoPieza({ onAgregar, showNotif }) {
  // TEMPORAL DHH: la Biblia elegida (RVR1960 o DHH) decide qué libros se
  // reconocen y de dónde sale el texto. Al quitarla: borrar estas tres líneas
  // y los usos de `version` y `libros` de abajo.
  const { versionBiblia } = useAppContext();
  const version = versionValida(versionBiblia);
  const libros = librosDe(version);
  const [tipo, setTipo] = useState("mensaje");
  const [texto, setTexto] = useState("");
  const [vista, setVista] = useState(null); // { cita, texto } | { cita, error }

  const lectura = interpretarEntrada(texto, tipo, libros);
  const cita = lectura?.cita || null;
  const tipoVisible = cita ? "versiculo" : tipo;

  // Trae el texto de la cita un momento después de dejar de escribir.
  useEffect(() => {
    if (!cita) {
      setVista(null);
      return undefined;
    }
    let vigente = true;
    const espera = setTimeout(async () => {
      const encontrado = await textoDeCita(cita, version).catch(() => null);
      if (vigente) setVista(encontrado ? { cita: cita.cita, texto: encontrado } : { cita: cita.cita, error: true });
    }, 350);
    return () => {
      vigente = false;
      clearTimeout(espera);
    };
    // La cita cambia de objeto en cada render; basta con su texto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cita?.cita, version]);

  const agregar = async (evento) => {
    evento?.preventDefault();
    if (!lectura) return;
    if (lectura.tipo === "versiculo") {
      const encontrado = vista?.cita === cita.cita && vista.texto ? vista.texto : await textoDeCita(cita, version).catch(() => null);
      if (!encontrado) {
        showNotif("error", `No encontré ${cita.cita}.`);
        return;
      }
      // La versión va con el versículo: la usa el aviso de derechos del templo.
      onAgregar(nuevaPieza("versiculo", { cita: cita.cita, texto: encontrado, version }));
    } else {
      onAgregar(nuevaPieza(lectura.tipo, texto.trim()));
    }
    setTexto("");
    setVista(null);
  };

  const siguienteTipo = () => {
    const i = TIPOS_PIEZA.findIndex((t) => t.tipo === tipoVisible);
    setTipo(TIPOS_PIEZA[(i + 1) % TIPOS_PIEZA.length].tipo);
    if (cita) setTexto(""); // salir de la cita reconocida para escribir otra cosa
  };

  const esImagen = tipoVisible === "imagen";
  const nombreTipo = NOMBRE_TIPO[tipoVisible];
  const placeholder = tipoVisible === "titulo" ? "Escribe un punto…" : "Escribe un mensaje o una cita…";

  return (
    <form onSubmit={agregar} className="flex flex-col gap-2" aria-label="Agregar pieza">
      {vista && (
        <p data-vista-cita className="m-0 flex items-center gap-2 overflow-hidden rounded-xl px-3 py-0.5 text-sm whitespace-nowrap">
          {vista.error ? (
            <span className="text-app-error">No encontré {vista.cita}</span>
          ) : (
            <>
              <CheckIcon className="h-4 w-4 shrink-0 text-app-agua" aria-hidden="true" />
              <b className="shrink-0 text-app-agua">{vista.cita}</b>
              {/* TEMPORAL DHH: se avisa cuando el texto no es de la RVR1960. */}
              {version !== VERSION_POR_DEFECTO && <span className="shrink-0 text-xs font-semibold text-app-main">{VERSIONES[version].corto}</span>}
              <span className="truncate text-app-muted">{vista.texto}</span>
            </>
          )}
        </p>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={siguienteTipo}
          aria-label={`Tipo: ${nombreTipo}. Tocar para cambiar`}
          className={`flex h-11 shrink-0 items-center gap-1 rounded-xl px-2.5 text-xs font-bold ${tonoPieza(tipoVisible).boton}`}
        >
          {nombreTipo}
          <ChevronDownIcon className="h-3 w-3" aria-hidden="true" />
        </button>

        {esImagen ? (
          <ElegirImagen compacto showNotif={showNotif} onElegida={(imagen) => onAgregar(nuevaPieza("imagen", imagen))} />
        ) : (
          <>
            <label className="flex h-11 min-w-0 flex-1 items-center rounded-xl border-2 border-app-border bg-app-aviso px-3 focus-within:border-app-main">
              <span className="sr-only">Nueva pieza</span>
              <input
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder={placeholder}
                maxLength={600}
                enterKeyHint="send"
                className="min-w-0 flex-1 bg-transparent text-base text-app-texto outline-none"
              />
            </label>
            <button
              type="submit"
              aria-label="Agregar"
              disabled={!texto.trim()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-app-main font-bold text-app-dark transition disabled:opacity-40"
            >
              <ArrowUpIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          </>
        )}
      </div>
    </form>
  );
}
