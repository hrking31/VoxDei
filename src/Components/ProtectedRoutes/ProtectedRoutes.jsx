import { useAuth } from "../../Components/Context/AuthContext.jsx";
import { Navigate } from "react-router-dom";

export function ProtectedRoutes({ children, rolesPermitidos = [] }) {
 const { user, userData, loading } = useAuth();

 // Mostrar un indicador de carga mientras se verifica el estado de autenticación
  if (loading) return <p>Cargando...</p>;

  // 1. Si no está logueado → enviar al login
  if (!user) return <Navigate to="/ViewLogin" />;

  // 2. Si hay rolesPermitidos y el rol del usuario NO está dentro → bloquear
  if (rolesPermitidos.length > 0) {
    if (!userData || !rolesPermitidos.includes(userData.role)) {
      return <Navigate to="/VistaNoAutorizada" />;
    }
  }

  // 3. Si pasa las validaciones → permitir acceso
  return <>{children}</>;
}
