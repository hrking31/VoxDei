import { useAuth } from "../../Components/Context/AuthContext";
import { Navigate, useLocation } from "react-router-dom";
import { tieneRol } from "../Roles/Roles.js";
import Loading from "../Loading/Loading.jsx";
import PerfilNoDisponible from "../PerfilNoDisponible/PerfilNoDisponible.jsx";
import VerificarCorreo from "../VerificarCorreo/VerificarCorreo.jsx";

export function ProtectedRoutes({ children, rolesPermitidos = [] }) {
  const { user, userData, loading, correoVerificado } = useAuth();
  const location = useLocation(); // Ruta actual

  // Mostrar un indicador de carga mientras se verifica el estado de autenticación
  if (loading) return <Loading text="Encendiendo el proyector..." />;

  // Si no está logueado → enviar al login, recordando adónde iba: así la
  // ventana del proyector vuelve sola a /VOXDEI cuando se inicia sesión.
  if (!user) {
    return <Navigate to="/ViewLogin" state={{ from: location }} replace />;
  }

  // Con sesión pero sin ficha (sin internet o registro a medias): pantalla con
  // salida, en vez de una carga eterna o un "no autorizado" que no lo es.
  if (!userData) return <PerfilNoDisponible />;

  // Nadie usa la app hasta verificar su correo: el dueño y también el equipo
  // que él da de alta. Si el pastor escribe mal un correo, la persona no puede
  // entrar y el error salta a la vista, en vez de quedar una cuenta cuyo
  // «¿Olvidaste tu contraseña?» llega a un buzón ajeno.
  if (!correoVerificado) {
    return <VerificarCorreo />;
  }

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
