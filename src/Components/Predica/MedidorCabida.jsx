import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../Context/AuthContext";
import { useAppContext } from "../Context/AppContext";
import { ESTILOS_POR_DEFECTO } from "../Estilos/EstilosProyeccion.js";
import EscenaGuia from "../PantallaGuia/EscenaGuia.jsx";
import { useMedidasTemplo } from "../PantallaGuia/useEspejoTemplo.js";

// Mide, ítem por ítem, si el texto cabe en la pantalla del templo (semáforo,
// 18-11-2026, pedido del usuario). No se ve: dibuja cada ítem sobre una escena a
// TAMAÑO REAL de la pantalla del templo (las medidas de la ventana que proyecta;
// sin ventana abierta, las de un proyector de 1920×1080), con los estilos,
// márgenes y tamaños de letra reales, la deja fuera de la vista y mide cuánto
// espacio ocupa. Avisa con `alMedir({ [idDelItem]: "bien" | "justo" | "no-cabe" })`.
//
// Se mide con el nombre de la prédica en la franja de título (así sale en el
// templo al predicar) y sin el anuncio. Los avisos cambian solos si cambian los
// estilos o la pantalla.
//   elementos: [{ id, centro }] (ver elementosParaMedir)
export default function MedidorCabida({ elementos, titulo = "", alMedir }) {
  const { userData } = useAuth();
  const { estilos: delContexto } = useAppContext();
  const estilos = delContexto || ESTILOS_POR_DEFECTO;
  const medidas = useMedidasTemplo(userData?.groupId);
  const [mapa, setMapa] = useState({});

  // Si el estado no cambió, React no vuelve a dibujar: la escena avisa en cada
  // dibujo y esto no debe encadenar más.
  const anotar = useCallback((id, estado) => setMapa((previo) => (previo[id] === estado ? previo : { ...previo, [id]: estado })), []);

  useEffect(() => {
    alMedir?.(mapa);
  }, [mapa, alMedir]);

  if (!elementos.length) return null;

  return (
    <div
      aria-hidden="true"
      data-medidor-cabida
      style={{ position: "fixed", top: 0, left: -100000, visibility: "hidden", pointerEvents: "none" }}
    >
      {elementos.map((elemento) => (
        <EscenaGuia
          key={elemento.id}
          centro={elemento.centro}
          titulo={titulo}
          ticker=""
          estilos={estilos}
          medidas={medidas}
          alMedir={(estado) => anotar(elemento.id, estado)}
        />
      ))}
    </div>
  );
}
