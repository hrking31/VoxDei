import { useNavigate } from "react-router-dom";
import { QuestionMarkCircleIcon } from "@heroicons/react/24/solid";

// Ayuda dentro de la app (9 de noviembre de 2026): cómo preparar la pantalla
// para el servicio. Reemplaza a la hoja impresa que hubo un rato el mismo
// día: aquí siempre está a mano y cada consejo lleva a su sección.

const PASOS = [
  {
    titulo: "Conecta el dispositivo al proyector",
    texto: (
      <>
        Puede ser un computador, una tablet o un celular. En un computador con Windows, con el cable
        HDMI puesto, pulsa <Tecla>Windows</Tecla> + <Tecla>P</Tecla> y elige <b>Duplicar</b> (las dos
        pantallas muestran lo mismo) o <b>Extender</b> (el proyector es una pantalla aparte).
      </>
    ),
  },
  {
    titulo: "Abre la pantalla del templo",
    texto: (
      <>
        En ese mismo dispositivo, inicia sesión y en la entrada pulsa <b>Proyectar</b>. Se abre una
        ventana nueva: si elegiste <b>Extender</b>, arrástrala hasta el proyector. Toca el botón grande
        del centro para ponerla en <b>pantalla completa</b>; ese toque también deja que los videos
        suenen. Cuando está lista, el monitor junto al próximo servicio se pone en verde en todos los
        equipos.
      </>
    ),
  },
  {
    titulo: "Administra desde este dispositivo o desde otro",
    texto: (
      <>
        Entra con tu cuenta y pulsa <b>Administrar</b>: puede ser en el mismo dispositivo del proyector
        o en tu celular. Lo que envíes —versículos, canciones, anuncios, imágenes— aparece al instante
        en el templo.
      </>
    ),
  },
];

const ANTES = [
  {
    texto: (
      <>
        Mira en <b>Cronograma</b> quién maneja la pantalla en este servicio. Arriba de cada sección, una
        franja <b>verde</b> te dice que puedes proyectar; <b>roja</b>, que no es tu turno.
      </>
    ),
    ir: { texto: "Ir a Cronograma", ruta: "/ViewCronograma" },
  },
  {
    texto: (
      <>
        Arma el <b>Orden del culto</b>: durante el servicio solo tendrás que pulsar «Siguiente».
      </>
    ),
    ir: { texto: "Ir al Orden del culto", ruta: "/ViewCulto" },
  },
  {
    texto: (
      <>
        Mientras llega la gente, pulsa <b>Mostrar</b> en <b>Pantalla de espera</b> (en Cronograma): el
        templo verá el logo y cuánto falta para empezar.
      </>
    ),
  },
];

const PROBLEMAS = [
  {
    texto: (
      <>
        <b>¿El monitor junto al próximo servicio está gris?</b> La pantalla del templo se cerró. Vuelve
        al dispositivo conectado al proyector y pulsa <b>Proyectar</b> en la entrada. Si está en ámbar,
        falta tocar el centro para la pantalla completa.
      </>
    ),
  },
  {
    texto: (
      <>
        <b>¿La pantalla no cambia?</b> Revisa que el computador y el celular tengan internet y recarga la
        ventana del templo con <Tecla>F5</Tecla>.
      </>
    ),
  },
  {
    texto: (
      <>
        <b>¿Te dice que no es tu turno?</b> Pídele al pastor o a la pastora el ensayo o el turno en{" "}
        <b>Cronograma</b>.
      </>
    ),
    ir: { texto: "Ir a Cronograma", ruta: "/ViewCronograma" },
  },
  {
    texto: (
      <>
        <b>¿No se ve el texto?</b> Enciende <b>Texto</b>: en el celular, en el botón del ojo; en el
        computador, en el ícono del globo de diálogo.
      </>
    ),
  },
];

export default function Ayuda() {
  const navigate = useNavigate();

  return (
    <div className="h-pantalla flex flex-col overflow-hidden bg-linear-to-b from-app-dark/50 to-app-light/50">
      <div className="shrink-0 border-b border-app-main bg-app-light px-2">
        <h1 className="flex items-center gap-1 py-2 font-bold text-app-main">
          <QuestionMarkCircleIcon className="h-5 w-5 shrink-0" />
          Ayuda
        </h1>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-custom p-3 sm:p-4">
        <div className="mx-auto flex max-w-3xl flex-col gap-6">
          <section aria-labelledby="ayuda-pasos" className="flex flex-col gap-3">
            <h2 id="ayuda-pasos" className="text-lg font-bold text-app-texto">
              Así se prepara la pantalla para el servicio
            </h2>
            <ol className="flex flex-col gap-3">
              {PASOS.map((paso, i) => (
                <li key={paso.titulo} className="flex gap-3 rounded-lg border border-app-border bg-app-light p-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-app-main font-bold text-app-dark">
                    {i + 1}
                  </span>
                  <div className="flex min-w-0 flex-col gap-2">
                    <h3 className="font-semibold text-app-texto">{paso.titulo}</h3>
                    <p className="text-sm text-app-muted">{paso.texto}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <Consejos titulo="Antes de empezar" id="ayuda-antes" consejos={ANTES} navigate={navigate} />
          <Consejos titulo="Si algo no funciona" id="ayuda-problemas" consejos={PROBLEMAS} navigate={navigate} />
        </div>
      </div>
    </div>
  );
}

function Consejos({ titulo, id, consejos, navigate }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <h2 id={id} className="font-bold text-app-main">
        {titulo}
      </h2>
      <ul className="flex flex-col gap-2">
        {consejos.map((consejo, i) => (
          <li key={i} className="flex flex-col gap-2 border-t border-app-border pt-2 text-sm text-app-muted">
            <p>{consejo.texto}</p>
            {consejo.ir && (
              <BotonAccion onClick={() => navigate(consejo.ir.ruta)}>{consejo.ir.texto}</BotonAccion>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function BotonAccion({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="self-start rounded px-3 py-1.5 text-xs font-bold text-app-main inset-shadow-sm inset-shadow-app-main transition hover:bg-app-main hover:text-app-dark sm:text-sm"
    >
      {children}
    </button>
  );
}

function Tecla({ children }) {
  return (
    <kbd className="rounded border border-app-border bg-app-dark px-1.5 font-sans text-xs text-app-texto">
      {children}
    </kbd>
  );
}
