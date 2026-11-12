// Mini pantalla animada del aviso de la pantalla del templo (10 de noviembre
// de 2026). Cuenta con un dibujo lo que pasó: la proyección que llena la
// pantalla, la ventana que se esconde en la barra de tareas, el televisor que
// se apaga... El color del marco y de las flechas lo hereda (currentColor) de
// la clase `tono` del contenedor, que sale del estado. Las animaciones están en
// el @theme de index.css (animate-escena-*) y solo corren con motion-safe: con
// «reducir movimiento» queda el dibujo quieto del estado final.

// Diapositiva en miniatura: fondo noche, título dorado y tres renglones.
function Diapositiva({ x, y, w, h }) {
  const alto = Math.max(1.6, h * 0.06);
  return (
    <>
      <rect className="fill-app-noche" x={x} y={y} width={w} height={h} rx="2" />
      <rect className="fill-app-main" x={x + w * 0.3} y={y + h * 0.16} width={w * 0.4} height={Math.max(2.2, h * 0.09)} rx="1" />
      {[0.38, 0.52, 0.66].map((p, i) => (
        <rect
          key={p}
          className="fill-app-texto opacity-80"
          x={x + w * (i === 1 ? 0.18 : 0.24)}
          y={y + h * p}
          width={w * (i === 1 ? 0.64 : 0.52)}
          height={alto}
          rx="1"
        />
      ))}
    </>
  );
}

function Marco() {
  return (
    <>
      <rect className="fill-app-aviso stroke-current" strokeWidth="1.6" x="2" y="2" width="92" height="54" rx="5" />
      <rect className="fill-current opacity-40" x="38" y="57" width="20" height="3.5" rx="1.5" />
    </>
  );
}

function Flechas({ animacion }) {
  return (
    <g className={`origin-center transform-fill ${animacion}`}>
      <path
        className="fill-none stroke-current"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 15V9h6M87 15V9h-6M9 43v6h6M87 43v6h-6"
      />
    </g>
  );
}

// Los cinco rayos del símbolo de VOXDEI, saliendo del centro.
const RAYOS = [0, 1, 2, 3, 4].map((i) => {
  const a = ((-150 + i * 30) * Math.PI) / 180;
  const x = 48 + Math.cos(a) * 30;
  const y = 30 + Math.sin(a) * 20;
  return { d: `M48 30 L${(x - 1.6).toFixed(1)} ${y.toFixed(1)} L${(x + 1.6).toFixed(1)} ${y.toFixed(1)} Z`, opacidad: 0.35 + i * 0.05 };
});

function Escritorio() {
  return (
    <>
      <rect className="fill-app-escritorio" x="5" y="5" width="86" height="48" rx="2" />
      <rect className="fill-app-light" x="5" y="48" width="86" height="5" />
    </>
  );
}

const ESCENAS = {
  encendida: () => (
    <>
      <Marco />
      <g className="origin-center transform-fill motion-safe:animate-escena-crece">
        <Diapositiva x={5} y={5} w={86} h={48} />
      </g>
      <g className="origin-center transform-fill motion-safe:animate-escena-rayos">
        {RAYOS.map((r) => (
          <path key={r.d} className="fill-app-haz" d={r.d} opacity={r.opacidad} />
        ))}
      </g>
      <Flechas animacion="opacity-0 motion-safe:animate-escena-esquinas" />
    </>
  ),
  maximizada: () => (
    <>
      <Marco />
      <rect className="fill-app-border" x="5" y="5" width="86" height="7" rx="1.5" />
      <circle className="fill-app-muted" cx="10" cy="8.5" r="1.3" />
      <circle className="fill-app-muted" cx="14.5" cy="8.5" r="1.3" />
      <rect className="fill-app-muted" x="24" y="7.2" width="40" height="2.6" rx="1.3" />
      <Diapositiva x={5} y={12} w={86} h={41} />
      <Flechas animacion="motion-safe:animate-escena-empuja" />
    </>
  ),
  ventana: () => (
    <>
      <Marco />
      <Escritorio />
      <g className="motion-safe:animate-escena-flota">
        <rect className="fill-app-main" x="25" y="12" width="46" height="4" rx="1" />
        <Diapositiva x={25} y={16} w={46} h={26} />
      </g>
    </>
  ),
  oculta: () => (
    <>
      <Marco />
      <Escritorio />
      <rect className="fill-app-error motion-safe:animate-escena-late" x="44" y="49.2" width="8" height="2.6" rx="1" />
      <g className="origin-bottom transform-fill motion-safe:animate-escena-baja motion-reduce:opacity-0">
        <Diapositiva x={20} y={10} w={56} h={34} />
      </g>
      <g
        className="fill-none stroke-app-error origin-center transform-fill motion-safe:animate-escena-ojo"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <path d="M36 26c3.5-5 8-7 12-7s8.5 2 12 7c-3.5 5-8 7-12 7s-8.5-2-12-7Z" />
        <circle cx="48" cy="26" r="3" />
        <path d="M37 17l22 18" />
      </g>
    </>
  ),
  apagada: () => (
    <>
      <Marco />
      <g className="origin-center transform-fill motion-safe:animate-escena-tv motion-reduce:opacity-0">
        <Diapositiva x={5} y={5} w={86} h={48} />
      </g>
    </>
  ),
};

export default function EscenaPantalla({ estado, className = "" }) {
  const Escena = ESCENAS[estado];
  if (!Escena) return null;
  return (
    <svg viewBox="0 0 96 62" className={`overflow-visible ${className}`} data-escena={estado} aria-hidden="true">
      <Escena />
    </svg>
  );
}
