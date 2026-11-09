import { useEffect, useState } from "react";
import { useAppContext } from "../Context/AppContext";
import { useAuth } from "../Context/AuthContext";
import { LogoVertical } from "../Logo/Logo.jsx";
import { escalar } from "../Estilos/EstilosProyeccion";
import { contenidoEspera } from "./utilesEspera.js";

// Pantalla de espera del templo (idea 6 del logo): el logo, el nombre de la
// iglesia y cuánto falta para el próximo servicio del Cronograma. Nadie
// escribe nada: la hora sale del cronograma y del reloj del servidor.
//
// Los colores son los de *Estilos y colores*, como el resto de la proyección.
// `tamanos` son los tamaños base de ControlDisplay según el tipo de pantalla.
export default function PantallaEspera({ tamanos }) {
  const { servicios, desfaseReloj, estilos } = useAppContext();
  const { userData } = useAuth();
  const [ahora, setAhora] = useState(() => Date.now() + desfaseReloj);

  // Cada segundo: es una cuenta regresiva a la vista de todo el templo.
  useEffect(() => {
    const actualizar = () => setAhora(Date.now() + desfaseReloj);
    actualizar();
    const temporizador = setInterval(actualizar, 1000);
    return () => clearInterval(temporizador);
  }, [desfaseReloj]);

  const contenido = contenidoEspera(servicios, ahora);
  const sombra = `0 2px 8px rgba(0,0,0,${estilos.legibilidad.sombra / 100})`;
  const texto = {
    color: estilos.texto.color,
    fontSize: escalar(tamanos.verseTitle, 100),
    textShadow: sombra,
  };

  return (
    <div
      data-testid="pantalla-espera"
      className="flex h-full w-full flex-col items-center justify-center gap-espera-hueco text-center"
    >
      <LogoVertical alt="VOXDEI" className="h-espera-logo w-auto" />

      {userData?.churchName && (
        <p
          style={{
            color: estilos.titulo.color,
            fontSize: escalar(tamanos.title, 80),
            fontWeight: 700,
            textShadow: sombra,
          }}
        >
          {userData.churchName}
        </p>
      )}

      {contenido.modo === "cuenta" && (
        <>
          <p style={texto}>El servicio empieza en</p>
          <p
            role="timer"
            style={{
              color: estilos.versiculo.colorCita,
              fontSize: escalar(tamanos.title, 160),
              fontWeight: 700,
              fontVariantNumeric: "tabular-nums",
              lineHeight: 1,
              textShadow: sombra,
            }}
          >
            {contenido.cuenta}
          </p>
          <p style={texto}>
            {contenido.nombre} · {contenido.hora}
          </p>
        </>
      )}

      {contenido.modo === "fecha" && (
        <p style={texto}>
          Próximo servicio: {contenido.nombre}, {contenido.dia} · {contenido.hora}
        </p>
      )}

      {contenido.modo === "enCurso" && <p style={texto}>{contenido.nombre}</p>}
    </div>
  );
}
