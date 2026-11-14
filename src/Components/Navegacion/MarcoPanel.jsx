import { useState } from "react";
import { Outlet } from "react-router-dom";
import { useAuth } from "../Context/AuthContext";
import { useAppContext } from "../Context/AppContext";
import BarraLateral from "./BarraLateral.jsx";
import BarraSuperior from "./BarraSuperior.jsx";
import IconoPestana from "./IconoPestana.jsx";

// Marco de las pantallas del panel. En App.jsx es una ruta sin dirección
// propia que agrupa a las demás: cada una conserva su URL y su protección por
// rol, y aparece en el hueco `Outlet`. Al cambiar de sección solo se
// reemplaza ese hueco; las barras no se vuelven a crear.
//
// Las barras salen solo con la sesión lista: mientras ProtectedRoutes decide
// (cargando, verificar correo, sin ficha) no tiene sentido ofrecer secciones.
// Computador: barra lateral fija. Celular: una barra de arriba con el botón de
// menú, que despliega esa misma barra lateral; el relleno de arriba le deja
// sitio.
export default function MarcoPanel() {
  const { isDesktop } = useAppContext();
  const { user, userData, correoVerificado } = useAuth();
  const [menuAbierto, setMenuAbierto] = useState(false);

  if (!user || !userData || !correoVerificado) return <Outlet />;

  if (!isDesktop) {
    return (
      <>
        <IconoPestana />
        <BarraSuperior menuAbierto={menuAbierto} onAbrirMenu={() => setMenuAbierto(true)} />
        <BarraLateral movil abierta={menuAbierto} onCerrar={() => setMenuAbierto(false)} />
        <div className="pt-barra-superior">
          <Outlet />
        </div>
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
