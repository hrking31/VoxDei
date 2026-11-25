import { useNavigate } from "react-router-dom";
import { useAuth } from "../../Components/Context/AuthContext";
import { useAppContext } from "../../Components/Context/AppContext";
import Loading from "../../Components/Loading/Loading.jsx";
import Footer from "../../Components/Footer/Footer.jsx";
import LogoDeLaIglesia from "../../Components/Logo/LogoDeLaIglesia.jsx";
import { abrirProyector } from "../../Components/Navegacion/abrirProyector.js";
import EncabezadoUsuario from "../../Components/Entrada/EncabezadoUsuario.jsx";
import FichaPaso from "../../Components/Entrada/FichaPaso.jsx";
import { IlustracionAdministrar, IlustracionProyectar } from "../../Components/Entrada/Ilustraciones.jsx";
import { primerNombre, saludoSegunHora } from "../../Components/Entrada/utilesEntrada.js";
import EspacioNieve from "../../Components/Navidad/EspacioNieve.jsx";

// Pantalla de entrada (rediseñada el 9 de noviembre de 2026). Antes del culto
// hay dos pasos: Proyectar, en el dispositivo conectado al proyector, y
// Administrar, desde ese mismo dispositivo o desde otro.
//
// Proyectar solo aparece si la pantalla del templo está apagada (presencia en
// RTDB, ver PantallaTemplo/): si ya se abrió en cualquier equipo, desaparece
// en todos y queda solo Administrar. Para volver a abrirla se vuelve al
// dispositivo del proyector.
export default function ViewSelector() {
  const navigate = useNavigate();
  const { userData, loading } = useAuth();
  const { pantallaTemplo } = useAppContext();

  if (loading || !userData) {
    return <Loading text="Preparando la pantalla de adoración..." />;
  }

  // Proyectar se oculta solo si se SABE que la pantalla está abierta. Si aún
  // no se sabe (cargando, o sin permiso de leer la presencia), se ofrece: es
  // mejor ofrecerlo de más que dejar a alguien sin poder abrir el proyector.
  const lista = Boolean(pantallaTemplo) && pantallaTemplo !== "apagada";
  const conProyectar = !lista;

  return (
    <div className="min-h-svh flex flex-col fondo-entrada text-app-texto">
      <EncabezadoUsuario />

      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-6 sm:gap-12 sm:py-16">
        <div className="flex flex-col items-center gap-2 text-center sm:gap-3">
          <span className="relative h-16 w-16 sm:h-24 sm:w-24">
            <span aria-hidden="true" className="absolute -inset-5 rounded-full brillo-oro motion-safe:animate-respira" />
            <LogoDeLaIglesia alt="" className="relative h-16 w-16 sm:h-24 sm:w-24" />
          </span>
          <h1 className="text-2xl font-bold sm:text-4xl lg:text-5xl">
            {saludoSegunHora()}, {primerNombre(userData.name)}
          </h1>
          <p className="text-sm text-app-muted sm:text-base lg:text-lg">
            {lista ? "Todo listo para el culto" : "¿Qué hará este dispositivo hoy?"}
          </p>
        </div>

        <div
          className={`flex w-full flex-col items-stretch gap-3 sm:flex-row sm:gap-12 ${
            conProyectar ? "max-w-3xl sm:max-w-5xl lg:max-w-6xl" : "max-w-sm"
          }`}
        >
          {conProyectar && (
            <FichaPaso
              numero={1}
              titulo="Proyectar"
              lineas={["Si este dispositivo va al proyector"]}
              relleno
              onClick={abrirProyector}
            >
              <IlustracionProyectar />
            </FichaPaso>
          )}
          <FichaPaso
            numero={conProyectar ? 2 : null}
            titulo="Administrar"
            lineas={[
              "Gestiona versículos, canciones, prédicas, mensajes, tickers, imágenes, videos, cronograma, usuarios y estilos",
              "Desde este dispositivo o desde otro",
            ]}
            onClick={() => navigate("/ViewInicio")}
          >
            <IlustracionAdministrar />
          </FichaPaso>
        </div>
      </main>

      <Footer />
      <EspacioNieve className="bg-transparent" />
    </div>
  );
}
