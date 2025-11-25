import { Routes, Route } from "react-router-dom";
import {
  ViewLogin,
  ViewSelector,
  ViewGestion,
  ViewDisplay,
  ViewStylos,
  ViewTicker,
  ViewMessage,
  ViewPredica,
  ViewVersiculo,
  ViewResetPassword,
  ViewUsers,
  VistaNoAutorizada,
  ViewInitialSetup,
} from "./Views/index";
import InitialSetupGuard from "./Components/InitialSetupGuard/InitialSetupGuard.jsx";
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
        <Route path="/" element={<InitialSetupGuard />} />
        <Route path="/ViewLogin" element={<ViewLogin />} />
        <Route path="/ResetPassword" element={<ViewResetPassword />} />
        <Route path="/VistaNoAutorizada" element={<VistaNoAutorizada />} />
        <Route path="/ViewInitialSetup" element={<ViewInitialSetup />} />

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
          path="/viewdisplay"
          element={
            <ProtectedRoutes
              rolesPermitidos={[
                "Pastor",
                "Pastora",
                "Asistente",
                "administrador",
              ]}
            >
              <ViewDisplay />
            </ProtectedRoutes>
          }
        />

        <Route
          path="/ViewStylos"
          element={
            <ProtectedRoutes
              rolesPermitidos={[
                "Pastor",
                "Pastora",
                "Asistente",
                "administrador",
              ]}
            >
              <ViewStylos />{" "}
            </ProtectedRoutes>
          }
        />

        <Route
          path="/ViewUsers"
          element={
            <ProtectedRoutes
              rolesPermitidos={["Pastor", "Pastora", "administrador"]}
            >
              <ViewUsers />{" "}
            </ProtectedRoutes>
          }
        />

        <Route
          path="/viewTicker"
          element={
            <ProtectedRoutes
              rolesPermitidos={[
                "Pastor",
                "Pastora",
                "Asistente",
                "administrador",
              ]}
            >
              <ViewTicker />
            </ProtectedRoutes>
          }
        />

        <Route
          path="/ViewMessage"
          element={
            <ProtectedRoutes
              rolesPermitidos={[
                "Pastor",
                "Pastora",
                "Asistente",
                "administrador",
              ]}
            >
              <ViewMessage />
            </ProtectedRoutes>
          }
        />

        <Route
          path="/ViewPredica"
          element={
            <ProtectedRoutes
              rolesPermitidos={["Pastor", "Pastora", "administrador"]}
            >
              <ViewPredica />
            </ProtectedRoutes>
          }
        />

        <Route
          path="/ViewVersiculo"
          element={
            <ProtectedRoutes
              rolesPermitidos={[
                "Pastor",
                "Pastora",
                "Asistente",
                "administrador",
              ]}
            >
              <ViewVersiculo />
            </ProtectedRoutes>
          }
        />
      </Routes>
    </AppProvider>
  );
}
