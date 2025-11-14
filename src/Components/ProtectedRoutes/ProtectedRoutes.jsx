import { useAuth } from "../../Components/Context/AuthContext.jsx";
import { Navigate, useLocation } from "react-router-dom";

export function ProtectedRoutes({ children, rolesPermitidos = [] }) {
  const { user, userData, loading } = useAuth();
  const location = useLocation(); // Ruta actual

  // Mostrar un indicador de carga mientras se verifica el estado de autenticación
  if (loading) return <p>Cargando...</p>;

  // 1. Si no está logueado → enviar al login
  if (!user) return <Navigate to="/ViewLogin" />;

  // 2. Si hay rolesPermitidos y el rol del usuario NO está dentro → bloquear
  if (rolesPermitidos.length > 0) {
    if (!userData || !rolesPermitidos.includes(userData.role)) {
      // Guarda la ruta original
      return (
        <Navigate to="/VistaNoAutorizada" state={{ from: location }} replace />
      );
    }
  }

  // 3. Si pasa las validaciones → permitir acceso
  return <>{children}</>;
}
