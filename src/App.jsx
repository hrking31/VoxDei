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
  ViewResetPassword,
  ViewUsers,
  VistaNoAutorizada,
  ViewRegister,
} from "./Views/index";
import { ProtectedRoutes } from "./Components/ProtectedRoutes/ProtectedRoutes.jsx";
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
          path="/ViewImagenes"
          element={
            <ProtectedRoutes>
              <ViewImagenes />
            </ProtectedRoutes>
          }
        />

        <Route
          path="/VOXDEI"
          element={
            <ProtectedRoutes
              rolesPermitidos={["Pastor", "Pastora", "Asistente", "admin"]}
            >
              <ViewDisplay />
            </ProtectedRoutes>
          }
        />

        <Route
          path="/ViewStylos"
          element={
            <ProtectedRoutes
              rolesPermitidos={["Pastor", "Pastora", "Asistente", "admin"]}
            >
              <ViewStylos />{" "}
            </ProtectedRoutes>
          }
        />

        <Route
          path="/ViewUsers"
          element={
            <ProtectedRoutes rolesPermitidos={["Pastor", "Pastora", "admin"]}>
              <ViewUsers />{" "}
            </ProtectedRoutes>
          }
        />

        <Route
          path="/viewTicker"
          element={
            <ProtectedRoutes
              rolesPermitidos={["Pastor", "Pastora", "Asistente", "admin"]}
            >
              <ViewTicker />
            </ProtectedRoutes>
          }
        />

        <Route
          path="/ViewMessage"
          element={
            <ProtectedRoutes
              rolesPermitidos={["Pastor", "Pastora", "Asistente", "admin"]}
            >
              <ViewMessage />
            </ProtectedRoutes>
          }
        />

        <Route
          path="/ViewPredica"
          element={
            <ProtectedRoutes rolesPermitidos={["Pastor", "Pastora", "admin"]}>
              <ViewPredica />
            </ProtectedRoutes>
          }
        />

        <Route
          path="/ViewVersiculo"
          element={
            <ProtectedRoutes
              rolesPermitidos={["Pastor", "Pastora", "Asistente", "admin"]}
            >
              <ViewVersiculo />
            </ProtectedRoutes>
          }
        />
      </Routes>
    </AppProvider>
  );
}
