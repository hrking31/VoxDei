import { useAuth } from "../../Components/Context/AuthContext.jsx";
import { Navigate, useLocation } from "react-router-dom";
import Loading from "../Loading/Loading.jsx";

export function ProtectedRoutes({ children, rolesPermitidos = [] }) {
  const { user, userData, loading } = useAuth();
  const location = useLocation(); // Ruta actual

  // console.log("carga", loading);
  // console.log("usuario", user);

  // Mostrar un indicador de carga mientras se verifica el estado de autenticación
  if (loading) return <Loading text="Procesando usuario..." />;

  // Si no está logueado → enviar al login
  if (!user) return <Navigate to="/ViewLogin" />;

// Si hay roles permitidos definidos, verificar si el usuario tiene uno de esos roles
  if (rolesPermitidos.length > 0 && userData) {
    if (!rolesPermitidos.includes(userData.role)) {
      // Guarda la ruta original
      return (
        <Navigate to="/VistaNoAutorizada" state={{ from: location }} replace />
      );
    }
  }
  return <>{children}</>;
}
