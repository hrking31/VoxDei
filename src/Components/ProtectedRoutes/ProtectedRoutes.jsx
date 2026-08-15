import { useAuth } from "../../Components/Context/AuthContext.jsx";
import { Navigate, useLocation } from "react-router-dom";
import { tieneRol } from "../Roles/Roles.js";
import Loading from "../Loading/Loading.jsx";

export function ProtectedRoutes({ children, rolesPermitidos = [] }) {
  const { user, userData, loading } = useAuth();
  const location = useLocation(); // Ruta actual

  // Mostrar un indicador de carga mientras se verifica el estado de autenticación
  if (loading) return <Loading text="Procesando usuario..." />;

  // Si no está logueado → enviar al login
  if (!user) return <Navigate to="/ViewLogin" />;

  // Si la ruta exige roles, el usuario debe tener uno de ellos.
  // Sin userData (documento de Firestore ausente o no cargado) se deniega:
  // el acceso nunca se concede por falta de datos.
  if (rolesPermitidos.length > 0 && !tieneRol(userData, rolesPermitidos)) {
    // Guarda la ruta original
    return (
      <Navigate to="/VistaNoAutorizada" state={{ from: location }} replace />
    );
  }

  return <>{children}</>;
}
