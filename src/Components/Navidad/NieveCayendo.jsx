import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAppContext } from "../Context/AppContext";
import { hayNieve } from "./utilesNieve.js";
import Snowfall from "./Nieve/Snowfall.jsx";
import { crearCopos } from "./Nieve/copos.js";
import { Acumulacion, aportePorCopo } from "./acumulacion.js";
import PilaDeNieve from "./PilaDeNieve.jsx";

// Nieve cayendo sobre toda la app (Navidad, 24 de noviembre de 2026). El motor
// es una copia de react-snowfall (carpeta Nieve/, licencia MIT incluida), sin
// instalar el paquete. Es una capa fija que no recibe toques; los avisos y las
// ventanas emergentes (z-50) quedan por encima. Solo está en temporada
// (`navidadActiva`).
//
// Los copos aterrizan en una pila que va creciendo abajo (pedido del usuario:
// «que se quede abajo y cree una capa de nieve»): ver `acumulacion.js` y
// `PilaDeNieve.jsx`. Tarda unos dos minutos y medio en llenarse y baja a cero al
// recargar. Nunca pasa de `ALTO_MAXIMO` px.
//
// Cuándo nieva y cuándo no (el proyector, «reducir movimiento») lo decide `hayNieve`
// (utilesNieve.js), que comparte con `EspacioNieve`, el espacio que se reserva
// abajo en el panel: mide lo que la pila (variable `--alto-pila-actual`, de 0 a 20 px).
export default function NieveCayendo() {
  const { pathname } = useLocation();
  if (!hayNieve(pathname)) return null;
  return <Nevada />;
}

function Nevada() {
  const { isDesktop } = useAppContext();
  const cantidad = isDesktop ? 110 : 60;
  // Los dibujos de los copos y la pila se crean una sola vez, solo si va a nevar
  const [copos] = useState(crearCopos);
  const [pila] = useState(
    () => new Acumulacion({ ancho: window.innerWidth, aporte: aportePorCopo({ ancho: window.innerWidth, copos: cantidad, altoVentana: window.innerHeight }) })
  );
  // El espacio de abajo crece con la pila: se publica su altura como variable de la raíz
  useEffect(() => {
    const raiz = document.documentElement.style;
    const publicar = (px) => raiz.setProperty("--alto-pila-actual", `${px}px`);
    publicar(pila.altoActual);
    pila.alCrecer = publicar;
    return () => {
      pila.alCrecer = null;
      raiz.removeProperty("--alto-pila-actual");
    };
  }, [pila]);
  // Funciones estables: el motor compara su configuración y una función nueva en cada dibujo la reiniciaría
  const getSuelo = useCallback((x) => pila.alturaEn(x), [pila]);
  const alAterrizar = useCallback((x) => pila.deposita(x), [pila]);
  return (
    <div aria-hidden="true" data-nieve-cayendo className="pointer-events-none fixed inset-0 z-40">
      <Snowfall
        images={copos}
        snowflakeCount={cantidad}
        radius={[4, 14]}
        speed={[0.6, 2.2]}
        wind={[-0.4, 1.0]}
        opacity={[0.35, 0.95]}
        rotationSpeed={[-0.5, 0.5]}
        changeFrequency={260}
        getSuelo={getSuelo}
        onLand={alAterrizar}
      />
      <PilaDeNieve pila={pila} />
    </div>
  );
}
