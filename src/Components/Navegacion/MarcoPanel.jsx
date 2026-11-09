import { Outlet } from "react-router-dom";
import { useAuth } from "../Context/AuthContext";
import { useAppContext } from "../Context/AppContext";
import BarraLateral from "./BarraLateral.jsx";

// Marco de las pantallas del panel. En App.jsx es una ruta sin dirección
// propia que agrupa a las demás: cada una conserva su URL y su protección por
// rol, y aparece en el hueco `Outlet`. Al cambiar de sección solo se
// reemplaza ese hueco; la barra no se vuelve a crear.
//
// La barra sale solo en el computador y con la sesión lista: mientras
// ProtectedRoutes decide (cargando, verificar correo, sin ficha) no tiene
// sentido ofrecer secciones. En el celular se sigue usando la cuadrícula.
export default function MarcoPanel() {
  const { isDesktop } = useAppContext();
  const { user, userData, correoVerificado } = useAuth();

  if (!isDesktop || !user || !userData || !correoVerificado) return <Outlet />;

  return (
    <div className="flex min-h-svh">
      <BarraLateral />
      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}
