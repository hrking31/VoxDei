import { Outlet } from "react-router-dom";
import { useAuth } from "../Context/AuthContext";
import { useAppContext } from "../Context/AppContext";
import BarraLateral from "./BarraLateral.jsx";
import BarraInferior, { BotonAnterior } from "./BarraInferior.jsx";
import IconoPestana from "./IconoPestana.jsx";

// Marco de las pantallas del panel. En App.jsx es una ruta sin dirección
// propia que agrupa a las demás: cada una conserva su URL y su protección por
// rol, y aparece en el hueco `Outlet`. Al cambiar de sección solo se
// reemplaza ese hueco; las barras no se vuelven a crear.
//
// Las barras salen solo con la sesión lista: mientras ProtectedRoutes decide
// (cargando, verificar correo, sin ficha) no tiene sentido ofrecer secciones.
// Computador: barra lateral. Celular: barra inferior y el botón para volver a
// la sección anterior; el relleno de abajo deja sitio a la barra.
export default function MarcoPanel() {
  const { isDesktop } = useAppContext();
  const { user, userData, correoVerificado } = useAuth();

  if (!user || !userData || !correoVerificado) return <Outlet />;

  if (!isDesktop) {
    return (
      <>
        <IconoPestana />
        <div className="pb-barra-inferior">
          <Outlet />
        </div>
        <BotonAnterior />
        <BarraInferior />
      </>
    );
  }

  return (
    <div className="flex min-h-svh">
      <IconoPestana />
      <BarraLateral />
      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}
