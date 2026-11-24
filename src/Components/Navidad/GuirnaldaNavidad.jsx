import { navidadActiva } from "../Logo/utilesNavidad.js";
import { ALTO_PINO, ANCHO_PINO, agujasFondo, agujasFrente, polvoDeNieve, ramaCentral, yRama } from "./pinoNavidad.js";

// Guirnalda de Navidad (24 de noviembre de 2026, diseño del usuario): una rama de
// pino densa, con piñas, bolas doradas, rojas y plateadas, acebo con bayas, nieve
// en polvo y un lazo rojo en cada punta, y un cable de luces de cuatro colores
// enredado en la rama: serpentea entre las agujas y se asoma, un bombillo arriba
// y el siguiente abajo. Para eso el dibujo va en capas: la rama con las agujas del
// fondo, el cable con los bombillos, y encima las agujas del frente, los adornos
// y la nieve, que tapan el cable a medias. Todo está dibujado a mano en SVG, sin
// recursos externos ni licencias. Solo está en temporada (`navidadActiva`).
//
// OCUPA SU SITIO arriba del contenido, para no tapar ningún texto (pedido del
// usuario). Las pantallas que miden la ventana entera usan `h-pantalla` /
// `min-h-pantalla`, que descuentan su alto (`--alto-guirnalda` en index.css,
// que se activa con el atributo `data-guirnalda` de este componente). Una pantalla
// nueva del panel NO debe medir con `h-svh` ni `min-h-dvh`, o se desbordaría.
// Solo puede haber una a la vez (los patrones y los degradados llevan id).
const LUCES = ["text-app-luz-roja", "text-app-luz-verde", "text-app-luz-crema", "text-app-main"];
const CANTIDAD = 12;
const PERIODOS = CANTIDAD / 2; // el cable da una vuelta completa cada dos bombillos
const VUELTA = 7; // cuánto sube y baja el cable respecto a la rama, en unidades del dibujo
const AGUJAS_FONDO = agujasFondo();
const AGUJAS_FRENTE = agujasFrente();
const RAMA = ramaCentral();
const POLVO = polvoDeNieve();

// El cable (viewBox 0 0 100 ALTO_PINO, estirado al ancho): una onda alrededor de la rama
const CABLE = Array.from({ length: 121 }, (_, i) => {
  const x = i * (100 / 120);
  const y = yRama((x / 100) * ANCHO_PINO) + VUELTA * Math.sin(2 * Math.PI * (x / 100) * PERIODOS);
  return `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
}).join("");

// Cada bombillo va en un extremo de la onda: uno abajo de la rama, el siguiente arriba
const BOMBILLOS = Array.from({ length: CANTIDAD }, (_, i) => {
  const x = ((i + 0.5) * 100) / CANTIDAD;
  const y = yRama((x / 100) * ANCHO_PINO) + (i % 2 === 0 ? VUELTA : -VUELTA);
  return { x: x.toFixed(2), y: ((y / ALTO_PINO) * 100).toFixed(2), gira: i % 2 === 0 ? 20 : -20 };
});

// Degradado de una bola: un punto de luz arriba a la izquierda y el color que se oscurece
function Bola({ id, claro, medio, oscuro }) {
  return (
    <radialGradient id={id} cx="35%" cy="30%" r="75%">
      <stop offset="0" style={{ stopColor: claro }} />
      <stop offset="0.45" style={{ stopColor: medio }} />
      <stop offset="1" style={{ stopColor: oscuro }} />
    </radialGradient>
  );
}

function Agujas({ agujas }) {
  return (
    <g fill="none" strokeWidth="1.7" strokeLinecap="round">
      {Object.entries(agujas).map(([clase, d]) => (
        <path key={clase} d={d} className={clase} />
      ))}
    </g>
  );
}

function Adornos() {
  return (
    <>
      {/* Bola dorada */}
      <rect x="33.4" y="11" width="5.2" height="3.2" rx="1" className="fill-app-cable" />
      <circle cx="36" cy="20" r="6.4" fill="url(#bola-oro)" />
      <ellipse cx="33.8" cy="17.8" rx="1.8" ry="1.2" className="fill-app-nieve" opacity="0.75" />
      {/* Piña */}
      <path d="M78 10 L78 13" strokeWidth="1.2" className="stroke-app-pina-oscura" />
      <g transform="rotate(14 78 20)">
        <ellipse cx="78" cy="20" rx="4.6" ry="7" className="fill-app-pina" />
        <path d="M74.4 15.5Q78 18 81.6 15.5M73.8 19Q78 22 82.2 19M74.4 22.6Q78 25.4 81.6 22.6M75.6 26Q78 27.6 80.4 26M78 13.4V26.8" fill="none" strokeWidth="1" className="stroke-app-pina-oscura" />
      </g>
      {/* Bola roja */}
      <rect x="115.4" y="11" width="5.2" height="3.2" rx="1" className="fill-app-cable" />
      <circle cx="118" cy="21" r="7" fill="url(#bola-roja)" />
      <ellipse cx="115.6" cy="18.4" rx="2" ry="1.3" className="fill-app-nieve" opacity="0.7" />
      {/* Acebo con bayas */}
      <ellipse cx="146" cy="14" rx="7.4" ry="3.3" transform="rotate(28 146 14)" className="fill-app-pino-claro stroke-app-pino-oscuro" strokeWidth="0.8" />
      <ellipse cx="158" cy="14" rx="7.4" ry="3.3" transform="rotate(-28 158 14)" className="fill-app-pino-claro stroke-app-pino-oscuro" strokeWidth="0.8" />
      <path d="M143 12.5L149 15.5M161 12.5L155 15.5" strokeWidth="0.7" className="stroke-app-pino-oscuro" />
      <circle cx="150" cy="15" r="2.7" className="fill-app-baya" />
      <circle cx="154.4" cy="14.4" r="2.7" className="fill-app-baya" />
      <circle cx="152.2" cy="18.2" r="2.7" className="fill-app-baya" />
      <circle cx="149.2" cy="14" r="0.8" className="fill-app-nieve" opacity="0.8" />
      {/* Bola plateada */}
      <rect x="193.4" y="11" width="5.2" height="3.2" rx="1" className="fill-app-cable" />
      <circle cx="196" cy="19" r="5.6" fill="url(#bola-plata)" />
      <ellipse cx="194.2" cy="16.8" rx="1.6" ry="1.1" className="fill-app-nieve" opacity="0.8" />
      {/* Segunda piña y acebo pequeño, para que no se repita tan igual */}
      <ellipse cx="14" cy="13" rx="5.8" ry="2.6" transform="rotate(30 14 13)" className="fill-app-pino-claro stroke-app-pino-oscuro" strokeWidth="0.7" />
      <circle cx="12" cy="14.6" r="2.2" className="fill-app-baya" />
      <circle cx="15.4" cy="15.4" r="2.2" className="fill-app-baya" />
      <circle cx="224" cy="13.4" r="2.2" className="fill-app-baya" />
      <circle cx="227.4" cy="14.4" r="2.2" className="fill-app-baya" />
      <ellipse cx="221" cy="12.6" rx="5.4" ry="2.4" transform="rotate(-30 221 12.6)" className="fill-app-pino-claro stroke-app-pino-oscuro" strokeWidth="0.7" />
    </>
  );
}

// Una capa del pino: `fondo` (rama y agujas largas) o `frente` (agujas cortas,
// adornos y nieve). El patrón mide 30 de alto y se escala hasta los 36 px (2,25 rem)
// de `--spacing-pino`: si cambias ese alto en index.css, cambia ALTO_PX. El pino es
// 4 px más alto que el espacio que reserva la guirnalda (2 rem): sobresale hacia abajo.
const ALTO_PX = 36;
const ESCALA = ALTO_PX / ALTO_PINO;

function CapaPino({ capa }) {
  const id = `pino-${capa}`;
  return (
    <svg aria-hidden="true" data-pino data-capa={capa} className="absolute inset-x-0 top-0 h-pino w-full">
      <defs>
        {capa === "frente" && (
          <>
            <Bola id="bola-oro" claro="var(--color-app-oro-claro)" medio="var(--color-app-main)" oscuro="var(--color-app-oro-oscuro)" />
            <Bola id="bola-roja" claro="var(--color-app-luz-roja)" medio="var(--color-app-baya)" oscuro="var(--color-app-baya-oscura)" />
            <Bola id="bola-plata" claro="var(--color-app-nieve)" medio="var(--color-app-plata)" oscuro="var(--color-app-plata-oscura)" />
          </>
        )}
        <pattern id={id} width={ANCHO_PINO} height={ALTO_PINO} patternUnits="userSpaceOnUse" patternTransform={`scale(${ESCALA.toFixed(4)})`}>
          {capa === "fondo" ? (
            <>
              <path d={RAMA} fill="none" strokeWidth="4" strokeLinejoin="round" className="stroke-app-pino-oscuro" />
              <Agujas agujas={AGUJAS_FONDO} />
            </>
          ) : (
            <>
              <Agujas agujas={AGUJAS_FRENTE} />
              <Adornos />
              {POLVO.map((p, i) => (
                <circle key={i} cx={p.cx} cy={p.cy} r={p.r} className="fill-app-nieve" opacity="0.9" />
              ))}
            </>
          )}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

// El cable de luces: pasa entre el fondo y el frente del pino, así que las
// agujas de adelante lo tapan a medias
function Cable() {
  return (
    <svg data-cable viewBox={`0 0 100 ${ALTO_PINO}`} preserveAspectRatio="none" className="absolute inset-x-0 top-0 h-pino w-full">
      <path d={CABLE} fill="none" strokeWidth="1.6" vectorEffect="non-scaling-stroke" className="stroke-app-cable" />
    </svg>
  );
}

// Los bombillos van encima del pino, para que se vean y brillen; cada casquillo
// lleva pegado un manojito de agujas, como si estuvieran metidos en la rama
function Bombillos() {
  return (
    <div className="absolute inset-x-0 top-0 h-pino">
      {BOMBILLOS.map((b, i) => (
        <span
          key={i}
          data-luz
          className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
          style={{ left: `${b.x}%`, top: `${b.y}%`, rotate: `${b.gira}deg` }}
        >
          <svg viewBox="0 0 16 10" className="-mb-1.5 h-2.5 w-4">
            <path d="M8 10L2 1M8 10L8 0M8 10L14 1" fill="none" strokeWidth="1.8" strokeLinecap="round" className="stroke-app-pino" />
            <path d="M8 10L4.5 2M8 10L11.5 2" fill="none" strokeWidth="1.5" strokeLinecap="round" className="stroke-app-pino-brillo" />
          </svg>
          <span className="h-1 w-1.5 bg-app-cable" />
          <span
            className={`h-3.5 w-2.5 rounded-full bg-current shadow-luz motion-safe:animate-parpadea-luz ${LUCES[i % LUCES.length]}`}
            style={{ animationDelay: `${(i * 0.31).toFixed(2)}s` }}
          />
        </span>
      ))}
    </div>
  );
}

// Lazo rojo de las puntas. La punta derecha lo lleva en espejo (`-scale-x-100`).
function Lazo({ className }) {
  return (
    <svg aria-hidden="true" data-lazo viewBox="0 0 48 52" className={`absolute top-0 h-9 w-8 ${className}`}>
      <path d="M22 19L12 46L18 42L22 50L27 22Z" className="fill-app-baya-oscura" />
      <path d="M26 19L36 46L30 42L26 50L21 22Z" className="fill-app-baya" />
      <path d="M24 17C11 2 1 9 5 18C8 25 19 23 24 17Z" className="fill-app-baya stroke-app-baya-oscura" strokeWidth="1" />
      <path d="M24 17C37 2 47 9 43 18C40 25 29 23 24 17Z" className="fill-app-baya stroke-app-baya-oscura" strokeWidth="1" />
      <path d="M8 14C12 10 17 12 20 16M40 14C36 10 31 12 28 16" fill="none" strokeWidth="1.2" strokeLinecap="round" className="stroke-app-luz-roja" />
      <ellipse cx="24" cy="18" rx="4.6" ry="5" className="fill-app-baya-oscura" />
      <ellipse cx="22.8" cy="16.4" rx="1.4" ry="1.8" className="fill-app-luz-roja" opacity="0.7" />
    </svg>
  );
}

export default function GuirnaldaNavidad() {
  if (!navidadActiva()) return null;
  return (
    <div aria-hidden="true" data-guirnalda className="pointer-events-none relative z-20 h-guirnalda">
      <CapaPino capa="fondo" />
      <Cable />
      <CapaPino capa="frente" />
      <Bombillos />
      <Lazo className="left-1" />
      <Lazo className="right-1 -scale-x-100" />
    </div>
  );
}
