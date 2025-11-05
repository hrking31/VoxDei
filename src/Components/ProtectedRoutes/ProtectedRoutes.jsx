import { useAuth } from "../Context/AuthContext.jsx";
import { Navigate } from "react-router-dom";

export function ProtectedRoutes({ children }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/ViewLogin" />;
  return <>{children}</>;
}
