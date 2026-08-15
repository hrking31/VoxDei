import { Routes, Route, Navigate } from "react-router-dom";
import {
  ViewLogin,
  ViewSelector,
  ViewGestion,
  ViewImagenes,
  ViewDisplay,
  ViewStylos,
  ViewTicker,
  ViewMessage,
  ViewPredica,
  ViewVersiculo,
  ViewCanciones,
  ViewResetPassword,
  ViewUsers,
  VistaNoAutorizada,
  ViewRegister,
} from "./Views/index";
import { ProtectedRoutes } from "./Components/ProtectedRoutes/ProtectedRoutes.jsx";
import { ROLES_ADMIN, ROLES_OPERADOR } from "./Components/Roles/Roles.js";
import { AppProvider } from "./Components/Context/AppContext";
import InicializarEstados from "./Components/InicializarEstados/InicializarEstados";
import Notificaciones from "./Components/Notificaciones/Notificaciones";

export default function App() {
  return (
    <AppProvider>
      <InicializarEstados />
      <Notificaciones />
      <Routes>
        <Route path="/" element={<Navigate to="/ViewLogin" />} />
        <Route path="/ViewLogin" element={<ViewLogin />} />
        <Route path="/ResetPassword" element={<ViewResetPassword />} />
        <Route path="/VistaNoAutorizada" element={<VistaNoAutorizada />} />
        <Route path="/ViewRegister" element={<ViewRegister />} />

        <Route
          path="/ViewSelector"
          element={
            <ProtectedRoutes>
              <ViewSelector />
            </ProtectedRoutes>
          }
        />

        <Route
          path="/ViewGestion"
          element={
            <ProtectedRoutes>
              <ViewGestion />
            </ProtectedRoutes>
          }
        />

        <Route
          path="/VOXDEI"
          element={
            <ProtectedRoutes rolesPermitidos={ROLES_OPERADOR}>
              <ViewDisplay />
            </ProtectedRoutes>
          }
        />

        <Route
          path="/ViewImagenes"
          element={
            <ProtectedRoutes rolesPermitidos={ROLES_OPERADOR}>
              <ViewImagenes />
            </ProtectedRoutes>
          }
        />

        <Route
          path="/ViewStylos"
          element={
            <ProtectedRoutes rolesPermitidos={ROLES_OPERADOR}>
              <ViewStylos />
            </ProtectedRoutes>
          }
        />

        <Route
          path="/ViewUsers"
          element={
            <ProtectedRoutes rolesPermitidos={ROLES_ADMIN}>
              <ViewUsers />
            </ProtectedRoutes>
          }
        />

        <Route
          path="/viewTicker"
          element={
            <ProtectedRoutes rolesPermitidos={ROLES_OPERADOR}>
              <ViewTicker />
            </ProtectedRoutes>
          }
        />

        <Route
          path="/ViewMessage"
          element={
            <ProtectedRoutes rolesPermitidos={ROLES_OPERADOR}>
              <ViewMessage />
            </ProtectedRoutes>
          }
        />

        <Route
          path="/ViewPredica"
          element={
            <ProtectedRoutes rolesPermitidos={ROLES_ADMIN}>
              <ViewPredica />
            </ProtectedRoutes>
          }
        />

        <Route
          path="/ViewVersiculo"
          element={
            <ProtectedRoutes rolesPermitidos={ROLES_OPERADOR}>
              <ViewVersiculo />
            </ProtectedRoutes>
          }
        />

        <Route
          path="/ViewCanciones"
          element={
            <ProtectedRoutes rolesPermitidos={ROLES_OPERADOR}>
              <ViewCanciones />
            </ProtectedRoutes>
          }
        />
      </Routes>
    </AppProvider>
  );
}
