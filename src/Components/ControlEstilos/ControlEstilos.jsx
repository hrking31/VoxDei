import { useState, useEffect, useId } from "react";
import { HexColorPicker } from "react-colorful";
import { setDoc, serverTimestamp } from "firebase/firestore";
import {
  SwatchIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";
import { useAppContext } from "../Context/AppContext";
import { useAuth } from "../../Components/Context/AuthContext";
import {
  docIglesia,
  CONFIGURACION,
  ESTILOS,
} from "../Firebase/RutasIglesia";
import {
  ESQUINAS_MARCA_AGUA,
  ESTILOS_POR_DEFECTO,
  TEMAS,
  combinarEstilos,
  estiloMarcaAgua,
  fondoDe,
  sombraDe,
} from "../Estilos/EstilosProyeccion";
import { Simbolo } from "../Logo/Logo.jsx";

// Contenido de muestra para la vista previa
const EJEMPLOS = {
  mensaje: {
    titulo: "Bienvenidos",
    texto: "Este es un mensaje de ejemplo\npara ver cómo se verá en pantalla.",
  },
  versiculo: {
    titulo: "Lectura de hoy",
    texto:
      "Aquí aparecerá el texto del versículo\nque elijas proyectar durante el servicio.",
    cita: "Libro 1:1",
  },
  cancion: {
    titulo: "Canción de alabanza",
    texto: "Primera línea de la estrofa\nsegunda línea de la estrofa",
  },
};

export default function ControlEstilos() {
  const { userData } = useAuth();
  const {
    estilos: estilosGuardados,
    showNotif,
    confirmAction,
  } = useAppContext();

  // Se trabaja sobre una copia: la pantalla del templo solo cambia al guardar,
  // para no ir mostrando cada ajuste intermedio durante el servicio.
  const [estilos, setEstilos] = useState(estilosGuardados);
  const [seccionAbierta, setSeccionAbierta] = useState("temas");
  const [ejemplo, setEjemplo] = useState("versiculo");
  const [pantalla, setPantalla] = useState("proyector");
  const [guardando, setGuardando] = useState(false);

  // Toma los ajustes de la iglesia cuando terminan de cargar
  useEffect(() => {
    setEstilos(combinarEstilos(estilosGuardados));
  }, [estilosGuardados]);

  const cambiar = (grupo, campo, valor) =>
    setEstilos((prev) => ({
      ...prev,
      [grupo]: { ...prev[grupo], [campo]: valor },
    }));

  const aplicarTema = (nombre) => {
    const tema = TEMAS[nombre];
    setEstilos((prev) => ({
      ...prev,
      fondo: { ...prev.fondo, ...tema.fondo },
      titulo: { ...prev.titulo, ...tema.titulo },
      texto: { ...prev.texto, ...tema.texto },
      ticker: { ...prev.ticker, ...tema.ticker },
    }));
    showNotif("info", `🎨 Tema "${nombre}" aplicado a la vista previa`);
  };

  // Guarda en la iglesia. La pantalla de proyección lo recoge sola.
  const guardarEnIglesia = async (datos, mensaje) => {
    setGuardando(true);

    try {
      await setDoc(
        docIglesia(userData.groupId, CONFIGURACION, ESTILOS),
        { ...datos, updatedAt: serverTimestamp() },
        { merge: true }
      );

      showNotif("success", mensaje);
    } catch (error) {
      console.error("Error al guardar los estilos:", error);
      showNotif("error", "No se pudieron guardar los estilos");
    } finally {
      setGuardando(false);
    }
  };

  const restablecer = async () => {
    const accepted = await confirmAction(
      "¿Devolver todos los ajustes a como estaban al principio? La pantalla cambiará de inmediato."
    );
    if (!accepted) return;

    setEstilos(ESTILOS_POR_DEFECTO);
    await guardarEnIglesia(ESTILOS_POR_DEFECTO, "↩️ Ajustes restablecidos");
  };

  const guardar = () =>
    guardarEnIglesia(estilos, "🎨 Estilos aplicados a la pantalla");

  // ---- Estilos calculados para la vista previa ----
  // Se usan las mismas funciones que la pantalla real, para que lo que se ve
  // aquí sea exactamente lo que se proyecta.

  const fondoPreview = fondoDe(estilos);
  const sombra = sombraDe(estilos);

  // La vista previa es pequeña: se escalan los tamaños para que quepan
  const escala = pantalla === "proyector" ? 0.5 : 0.32;

  const datos = EJEMPLOS[ejemplo];

  return (
    <div className="min-h-pantalla bg-linear-to-b from-app-dark/50 to-app-light/50">
      {/* ENCABEZADO */}
      <div className="sticky top-0 z-20 border-b border-app-main bg-app-light px-2">
        <div className="flex items-center justify-between gap-2 py-2">
          <h1 className="font-bold text-app-main flex items-center gap-1">
            <SwatchIcon className="w-5 h-5" />
            Estilos y colores
          </h1>

          <div className="flex items-center gap-2">
            <button
              onClick={restablecer}
              title="Restablecer"
              className="p-2 rounded-full text-app-muted hover:text-app-main hover:bg-app-border transition"
            >
              <ArrowPathIcon className="w-5 h-5" />
            </button>

            <button
              onClick={guardar}
              disabled={guardando}
              className={`px-3 py-1.5 rounded text-white text-xs sm:text-sm font-bold ${
                guardando ? "bg-app-border cursor-not-allowed" : "bg-green-500"
              }`}
            >
              {guardando ? "Guardando..." : "Guardar"}
            </button>

          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-2 sm:p-4">
        {/* ------------------ VISTA PREVIA ------------------ */}
        <div className="lg:sticky lg:top-20 h-fit">
          <div className="flex items-center justify-between mb-2 gap-2">
            <h2 className="font-bold text-app-main">Vista previa</h2>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setPantalla("proyector")}
                title="Ver como proyector"
                className={`p-1.5 rounded ${
                  pantalla === "proyector"
                    ? "text-app-main bg-app-border"
                    : "text-app-muted"
                }`}
              >
                <ComputerDesktopIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => setPantalla("movil")}
                title="Ver como celular"
                className={`p-1.5 rounded ${
                  pantalla === "movil"
                    ? "text-app-main bg-app-border"
                    : "text-app-muted"
                }`}
              >
                <DevicePhoneMobileIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Qué contenido se está previsualizando */}
          <div className="flex gap-1 mb-2">
            {Object.keys(EJEMPLOS).map((clave) => (
              <button
                key={clave}
                onClick={() => setEjemplo(clave)}
                className={`flex-1 py-1.5 text-xs font-semibold rounded capitalize transition ${
                  ejemplo === clave
                    ? "bg-app-main text-app-dark"
                    : "text-app-muted border border-app-border hover:border-app-main"
                }`}
              >
                {clave}
              </button>
            ))}
          </div>

          {/* La pantalla simulada */}
          <div
            className={`relative overflow-hidden rounded-lg border-2 border-app-border shadow-xl mx-auto ${
              pantalla === "proyector" ? "w-full" : "w-56"
            }`}
            style={{ ...fondoPreview, aspectRatio: "16 / 9" }}
          >
            <div
              className="absolute inset-0 flex flex-col"
              style={{ padding: `${estilos.legibilidad.margen}%` }}
            >
              {/* Título */}
              <div
                style={{
                  color: estilos.titulo.color,
                  fontSize: `${estilos.titulo.tamano * escala * 0.28}px`,
                  fontWeight: estilos.titulo.negrita ? 700 : 400,
                  textTransform: estilos.titulo.mayusculas
                    ? "uppercase"
                    : "none",
                  textAlign: estilos.titulo.alineacion,
                  textShadow: sombra,
                }}
              >
                {datos.titulo}
              </div>

              {/* Texto central */}
              <div
                className="flex-1 flex flex-col items-center justify-center"
                style={{
                  transition: estilos.transicion.fundido
                    ? `opacity ${estilos.transicion.duracion}ms`
                    : "none",
                }}
              >
                <div
                  className="w-full whitespace-pre-wrap"
                  style={{
                    color: estilos.texto.color,
                    fontSize: `${estilos.texto.tamano * escala * 0.22}px`,
                    fontWeight: estilos.texto.negrita ? 700 : 400,
                    lineHeight: `${estilos.texto.interlineado}%`,
                    textAlign: estilos.texto.alineacion,
                    textShadow: sombra,
                  }}
                >
                  {datos.texto}
                </div>

                {/* Cita del versículo */}
                {ejemplo === "versiculo" && estilos.versiculo.mostrarCita && (
                  <div
                    className="self-end mt-2"
                    style={{
                      color: estilos.versiculo.colorCita,
                      fontSize: `${
                        estilos.versiculo.tamanoCita * escala * 0.14
                      }px`,
                      textShadow: sombra,
                    }}
                  >
                    {datos.cita}
                  </div>
                )}
              </div>
            </div>

            {/* Marca de agua: la misma función que la pantalla real */}
            {estilos.marcaAgua.visible && (
              <Simbolo
                alt=""
                className="h-auto"
                style={estiloMarcaAgua(
                  estilos,
                  `${estilos.ticker.altura * escala * 0.16}px`
                )}
              />
            )}

            {/* Ticker */}
            <div
              className="absolute bottom-0 left-0 right-0 flex items-center overflow-hidden"
              style={{
                backgroundColor: estilos.ticker.colorFondo,
                height: `${estilos.ticker.altura * escala * 0.16}px`,
              }}
            >
              <span
                className="whitespace-nowrap px-2"
                style={{
                  color: estilos.ticker.colorTexto,
                  fontSize: `${estilos.ticker.tamano * escala * 0.13}px`,
                }}
              >
                Aquí se desliza el anuncio del ticker ·
              </span>
            </div>
          </div>

          <p className="text-[11px] text-app-muted mt-2 text-center">
            Los cambios llegan a la pantalla del templo al tocar Guardar.
          </p>
        </div>

        {/* ------------------ CONTROLES ------------------ */}
        <div className="flex flex-col gap-2">
          {/* TEMAS */}
          <Seccion
            titulo="Temas rápidos"
            abierta={seccionAbierta === "temas"}
            onToggle={() =>
              setSeccionAbierta(seccionAbierta === "temas" ? null : "temas")
            }
          >
            <div className="grid grid-cols-2 gap-2">
              {Object.keys(TEMAS).map((nombre) => (
                <button
                  key={nombre}
                  onClick={() => aplicarTema(nombre)}
                  className="p-2 rounded-lg border border-app-border hover:border-app-main transition text-left"
                >
                  <span className="block text-sm font-semibold text-app-main mb-1">
                    {nombre}
                  </span>
                  <span className="flex gap-1">
                    {[
                      TEMAS[nombre].fondo.color,
                      TEMAS[nombre].titulo.color,
                      TEMAS[nombre].texto.color,
                      TEMAS[nombre].ticker.colorFondo,
                    ].map((c, i) => (
                      <span
                        key={i}
                        className="w-5 h-5 rounded-full border border-app-border"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </span>
                </button>
              ))}
            </div>
          </Seccion>

          {/* FONDO */}
          <Seccion
            titulo="Fondo de la pantalla"
            abierta={seccionAbierta === "fondo"}
            onToggle={() =>
              setSeccionAbierta(seccionAbierta === "fondo" ? null : "fondo")
            }
          >
            <Opciones
              etiqueta="Tipo"
              valor={estilos.fondo.tipo}
              opciones={[
                { valor: "solido", texto: "Color plano" },
                { valor: "degradado", texto: "Degradado" },
              ]}
              onChange={(v) => cambiar("fondo", "tipo", v)}
            />

            <Color
              etiqueta={
                estilos.fondo.tipo === "degradado" ? "Color inicial" : "Color"
              }
              valor={estilos.fondo.color}
              onChange={(v) => cambiar("fondo", "color", v)}
            />

            {estilos.fondo.tipo === "degradado" && (
              <>
                <Color
                  etiqueta="Color final"
                  valor={estilos.fondo.colorFinal}
                  onChange={(v) => cambiar("fondo", "colorFinal", v)}
                />
                <Opciones
                  etiqueta="Dirección"
                  valor={estilos.fondo.direccion}
                  opciones={[
                    { valor: "abajo", texto: "↓" },
                    { valor: "derecha", texto: "→" },
                    { valor: "diagonal", texto: "↘" },
                  ]}
                  onChange={(v) => cambiar("fondo", "direccion", v)}
                />
              </>
            )}
          </Seccion>

          {/* TÍTULO */}
          <Seccion
            titulo="Título"
            abierta={seccionAbierta === "titulo"}
            onToggle={() =>
              setSeccionAbierta(seccionAbierta === "titulo" ? null : "titulo")
            }
          >
            <Color
              etiqueta="Color"
              valor={estilos.titulo.color}
              onChange={(v) => cambiar("titulo", "color", v)}
            />
            <Rango
              etiqueta="Tamaño"
              valor={estilos.titulo.tamano}
              min={50}
              max={200}
              sufijo="%"
              onChange={(v) => cambiar("titulo", "tamano", v)}
            />
            <Opciones
              etiqueta="Alineación"
              valor={estilos.titulo.alineacion}
              opciones={[
                { valor: "left", texto: "Izquierda" },
                { valor: "center", texto: "Centro" },
                { valor: "right", texto: "Derecha" },
              ]}
              onChange={(v) => cambiar("titulo", "alineacion", v)}
            />
            <Interruptor
              etiqueta="Negrita"
              valor={estilos.titulo.negrita}
              onChange={(v) => cambiar("titulo", "negrita", v)}
            />
            <Interruptor
              etiqueta="TODO EN MAYÚSCULAS"
              valor={estilos.titulo.mayusculas}
              onChange={(v) => cambiar("titulo", "mayusculas", v)}
            />
          </Seccion>

          {/* TEXTO PRINCIPAL */}
          <Seccion
            titulo="Texto principal"
            descripcion="Mensajes, prédica y letras de canciones"
            abierta={seccionAbierta === "texto"}
            onToggle={() =>
              setSeccionAbierta(seccionAbierta === "texto" ? null : "texto")
            }
          >
            <Color
              etiqueta="Color"
              valor={estilos.texto.color}
              onChange={(v) => cambiar("texto", "color", v)}
            />
            <Rango
              etiqueta="Tamaño"
              valor={estilos.texto.tamano}
              min={50}
              max={200}
              sufijo="%"
              onChange={(v) => cambiar("texto", "tamano", v)}
            />
            <Rango
              etiqueta="Separación entre renglones"
              valor={estilos.texto.interlineado}
              min={100}
              max={220}
              sufijo="%"
              onChange={(v) => cambiar("texto", "interlineado", v)}
            />
            <Opciones
              etiqueta="Alineación"
              valor={estilos.texto.alineacion}
              opciones={[
                { valor: "left", texto: "Izquierda" },
                { valor: "center", texto: "Centro" },
                { valor: "right", texto: "Derecha" },
              ]}
              onChange={(v) => cambiar("texto", "alineacion", v)}
            />
            <Interruptor
              etiqueta="Negrita"
              valor={estilos.texto.negrita}
              onChange={(v) => cambiar("texto", "negrita", v)}
            />
          </Seccion>

          {/* VERSÍCULOS */}
          <Seccion
            titulo="Versículos"
            abierta={seccionAbierta === "versiculo"}
            onToggle={() =>
              setSeccionAbierta(
                seccionAbierta === "versiculo" ? null : "versiculo"
              )
            }
          >
            <Color
              etiqueta="Color del encabezado"
              valor={estilos.versiculo.colorTitulo}
              onChange={(v) => cambiar("versiculo", "colorTitulo", v)}
            />
            <Color
              etiqueta="Color de la cita"
              valor={estilos.versiculo.colorCita}
              onChange={(v) => cambiar("versiculo", "colorCita", v)}
            />
            <Rango
              etiqueta="Tamaño de la cita"
              valor={estilos.versiculo.tamanoCita}
              min={50}
              max={180}
              sufijo="%"
              onChange={(v) => cambiar("versiculo", "tamanoCita", v)}
            />
            <Interruptor
              etiqueta="Mostrar la cita en pantalla"
              valor={estilos.versiculo.mostrarCita}
              onChange={(v) => cambiar("versiculo", "mostrarCita", v)}
            />
          </Seccion>

          {/* TICKER */}
          <Seccion
            titulo="Ticker"
            descripcion="La cinta de anuncios de abajo"
            abierta={seccionAbierta === "ticker"}
            onToggle={() =>
              setSeccionAbierta(seccionAbierta === "ticker" ? null : "ticker")
            }
          >
            <Color
              etiqueta="Color de fondo"
              valor={estilos.ticker.colorFondo}
              onChange={(v) => cambiar("ticker", "colorFondo", v)}
            />
            <Color
              etiqueta="Color del texto"
              valor={estilos.ticker.colorTexto}
              onChange={(v) => cambiar("ticker", "colorTexto", v)}
            />
            <Rango
              etiqueta="Tamaño del texto"
              valor={estilos.ticker.tamano}
              min={50}
              max={180}
              sufijo="%"
              onChange={(v) => cambiar("ticker", "tamano", v)}
            />
            <Rango
              etiqueta="Alto de la cinta"
              valor={estilos.ticker.altura}
              min={60}
              max={180}
              sufijo="%"
              onChange={(v) => cambiar("ticker", "altura", v)}
            />
          </Seccion>

          {/* LEGIBILIDAD */}
          <Seccion
            titulo="Legibilidad"
            descripcion="Para que se lea bien desde el fondo del templo"
            abierta={seccionAbierta === "legibilidad"}
            onToggle={() =>
              setSeccionAbierta(
                seccionAbierta === "legibilidad" ? null : "legibilidad"
              )
            }
          >
            <Rango
              etiqueta="Sombra del texto"
              ayuda="Ayuda a leer sobre fondos claros o fotos"
              valor={estilos.legibilidad.sombra}
              min={0}
              max={100}
              sufijo="%"
              onChange={(v) => cambiar("legibilidad", "sombra", v)}
            />
            <Rango
              etiqueta="Margen de seguridad"
              ayuda="Muchos proyectores recortan los bordes de la imagen"
              valor={estilos.legibilidad.margen}
              min={0}
              max={15}
              sufijo="%"
              onChange={(v) => cambiar("legibilidad", "margen", v)}
            />
            <Interruptor
              etiqueta="Achicar la letra si el texto es muy largo"
              valor={estilos.legibilidad.ajusteAutomatico}
              onChange={(v) => cambiar("legibilidad", "ajusteAutomatico", v)}
            />
          </Seccion>

          {/* TRANSICIONES */}
          <Seccion
            titulo="Transiciones"
            abierta={seccionAbierta === "transicion"}
            onToggle={() =>
              setSeccionAbierta(
                seccionAbierta === "transicion" ? null : "transicion"
              )
            }
          >
            <Interruptor
              etiqueta="Fundir al cambiar de contenido"
              valor={estilos.transicion.fundido}
              onChange={(v) => cambiar("transicion", "fundido", v)}
            />
            {estilos.transicion.fundido && (
              <Rango
                etiqueta="Duración"
                valor={estilos.transicion.duracion}
                min={100}
                max={1500}
                paso={100}
                sufijo=" ms"
                onChange={(v) => cambiar("transicion", "duracion", v)}
              />
            )}
          </Seccion>

          {/* MARCA DE AGUA */}
          <Seccion
            titulo="Marca de agua"
            descripcion="El símbolo de VOXDEI en una esquina, para las transmisiones por internet"
            abierta={seccionAbierta === "marcaAgua"}
            onToggle={() =>
              setSeccionAbierta(
                seccionAbierta === "marcaAgua" ? null : "marcaAgua"
              )
            }
          >
            <Interruptor
              etiqueta="Mostrar la marca de agua"
              valor={estilos.marcaAgua.visible}
              onChange={(v) => cambiar("marcaAgua", "visible", v)}
            />
            {estilos.marcaAgua.visible && (
              <>
                <Opciones
                  etiqueta="Esquina"
                  valor={estilos.marcaAgua.esquina}
                  opciones={ESQUINAS_MARCA_AGUA}
                  onChange={(v) => cambiar("marcaAgua", "esquina", v)}
                />
                <Rango
                  etiqueta="Tamaño"
                  valor={estilos.marcaAgua.tamano}
                  min={4}
                  max={15}
                  sufijo="%"
                  onChange={(v) => cambiar("marcaAgua", "tamano", v)}
                />
                <Rango
                  etiqueta="Opacidad"
                  ayuda="Más baja, más discreta"
                  valor={estilos.marcaAgua.opacidad}
                  min={10}
                  max={80}
                  sufijo="%"
                  onChange={(v) => cambiar("marcaAgua", "opacidad", v)}
                />
              </>
            )}
          </Seccion>
        </div>
      </div>
    </div>
  );
}

/* ------------------------- Piezas reutilizables ------------------------- */

function Seccion({ titulo, descripcion, abierta, onToggle, children }) {
  return (
    <div className="border border-app-border rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 bg-app-light text-left"
      >
        <span>
          <span className="block font-semibold text-app-main">{titulo}</span>
          {descripcion && (
            <span className="block text-[11px] text-app-muted">
              {descripcion}
            </span>
          )}
        </span>
        <ChevronDownIcon
          className={`w-5 h-5 text-app-muted transition-transform ${
            abierta ? "rotate-180" : ""
          }`}
        />
      </button>

      {abierta && <div className="p-3 flex flex-col gap-4">{children}</div>}
    </div>
  );
}

// ¿Es un color hexadecimal completo? Se exige el # y 3 o 6 dígitos.
const esHexValido = (texto) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(texto);

function Color({ etiqueta, valor, onChange }) {
  const [abierto, setAbierto] = useState(false);
  // Texto que se está escribiendo a mano. Se guarda aparte del color real para
  // poder teclear "#1a" sin que la paleta se vuelva loca a media escritura.
  const [texto, setTexto] = useState(valor);
  const idTitulo = useId();

  // Al abrir, el campo parte del color actual.
  useEffect(() => {
    if (abierto) setTexto(valor);
  }, [abierto, valor]);

  // Cerrar con la tecla Escape, como cualquier ventana.
  useEffect(() => {
    if (!abierto) return;

    const alPulsarTecla = (evento) => {
      if (evento.key === "Escape") setAbierto(false);
    };

    document.addEventListener("keydown", alPulsarTecla);
    return () => document.removeEventListener("keydown", alPulsarTecla);
  }, [abierto]);

  const escribirTexto = (entrada) => {
    const limpio = entrada.startsWith("#") ? entrada : `#${entrada}`;
    setTexto(limpio);
    // Solo se aplica cuando el código está completo; si no, se deja escribir.
    if (esHexValido(limpio)) onChange(limpio);
  };

  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm text-app-muted">{etiqueta}</span>

      <button
        type="button"
        onClick={() => setAbierto(true)}
        aria-label={`Cambiar el color de ${etiqueta}`}
        className="flex items-center gap-2 border border-app-border rounded px-2 py-1 hover:border-app-main transition"
      >
        <span
          className="w-6 h-6 rounded border border-app-border"
          style={{ backgroundColor: valor }}
        />
        <span className="text-xs text-app-muted uppercase">{valor}</span>
      </button>

      {/* Ventana centrada y fija.
          Antes era un panel `absolute` dentro del acordeón, que tiene
          overflow-hidden: los colores del final de cada sección quedaban
          recortados y algunos no se veían en absoluto. Al ser fija ya no
          depende de ningún contenedor. */}
      {abierto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={idTitulo}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-app-dark/80"
          onClick={() => setAbierto(false)}
        >
          <div
            className="w-full max-w-xs bg-app-light border-2 border-app-border rounded-xl shadow-2xl p-4"
            onClick={(evento) => evento.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3 gap-2">
              <h3
                id={idTitulo}
                className="text-base font-semibold text-app-main truncate"
              >
                {etiqueta}
              </h3>
              <button
                type="button"
                onClick={() => setAbierto(false)}
                aria-label="Cerrar"
                className="text-app-accent hover:text-app-error transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* La paleta ocupa el ancho del modal en vez de su tamaño fijo */}
            <HexColorPicker
              color={valor}
              onChange={onChange}
              style={{ width: "100%", height: "180px" }}
            />

            <div className="flex items-center gap-2 mt-3">
              <span
                className="w-9 h-9 rounded border border-app-border shrink-0"
                style={{ backgroundColor: valor }}
              />
              <input
                type="text"
                value={texto}
                onChange={(evento) => escribirTexto(evento.target.value)}
                spellCheck="false"
                className="flex-1 p-2 text-center text-sm uppercase rounded border border-app-border text-app-muted bg-app-light"
              />
            </div>

            <button
              type="button"
              onClick={() => setAbierto(false)}
              className="w-full mt-3 py-2 rounded-lg bg-app-main text-white font-semibold hover:bg-app-main/90 transition"
            >
              Listo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Rango({ etiqueta, ayuda, valor, min, max, paso = 1, sufijo, onChange }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-app-muted">{etiqueta}</span>
        <span className="text-xs text-app-main font-semibold w-16 text-right">
          {valor}
          {sufijo}
        </span>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={paso}
        value={valor}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-app-main"
      />

      {ayuda && <p className="text-[11px] text-app-muted">{ayuda}</p>}
    </div>
  );
}

function Opciones({ etiqueta, valor, opciones, onChange }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm text-app-muted">{etiqueta}</span>

      <div className="flex gap-1">
        {opciones.map((opcion) => (
          <button
            key={opcion.valor}
            type="button"
            onClick={() => onChange(opcion.valor)}
            // Si el texto es un símbolo, `nombre` dice qué es.
            aria-label={opcion.nombre}
            title={opcion.nombre}
            aria-pressed={valor === opcion.valor}
            className={`px-2 py-1 text-xs rounded border transition ${
              valor === opcion.valor
                ? "bg-app-main text-app-dark border-app-main font-semibold"
                : "text-app-muted border-app-border hover:border-app-main"
            }`}
          >
            {opcion.texto}
          </button>
        ))}
      </div>
    </div>
  );
}

function Interruptor({ etiqueta, valor, onChange }) {
  return (
    <button
      onClick={() => onChange(!valor)}
      className="flex items-center justify-between gap-2 w-full"
    >
      <span className="text-sm text-app-muted text-left">{etiqueta}</span>

      <span
        className={`w-11 h-6 rounded-full p-0.5 transition-colors shrink-0 ${
          valor ? "bg-app-success" : "bg-app-border"
        }`}
      >
        <span
          className={`block w-5 h-5 rounded-full bg-white transition-transform ${
            valor ? "translate-x-5" : ""
          }`}
        />
      </span>
    </button>
  );
}
