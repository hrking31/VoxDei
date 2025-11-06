import { Routes, Route, Navigate } from "react-router-dom";
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
} from "./Views/index";
import { AppProvider } from "./Components/Context/AppContext";
import InicializarEstados from "./Components/InicializarEstados/InicializarEstados";
import Notificaciones from "./Components/Notificaciones/Notificaciones";
import { ProtectedRoutes } from "./Components/ProtectedRoutes/ProtectedRoutes.jsx";

export default function App() {
  return (
    <AppProvider>
      <InicializarEstados />
      <Notificaciones />
      <Routes>
        <Route path="/" element={<Navigate to="/ViewLogin" />} />
        <Route path="/ViewLogin" element={<ViewLogin />} />
        <Route path="/ResetPassword" element={<ViewResetPassword />} />

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
            <ProtectedRoutes>
              <ViewDisplay />
            </ProtectedRoutes>
          }
        />

        <Route
          path="/ViewStylos"
          element={
            <ProtectedRoutes>
              <ViewStylos />{" "}
            </ProtectedRoutes>
          }
        />

        <Route
          path="/ViewUsers"
          element={
            <ProtectedRoutes>
              <ViewUsers />{" "}
            </ProtectedRoutes>
          }
        />

        <Route
          path="/viewTicker"
          element={
            <ProtectedRoutes>
              <ViewTicker />
            </ProtectedRoutes>
          }
        />

        <Route
          path="/ViewMessage"
          element={
            <ProtectedRoutes>
              <ViewMessage />
            </ProtectedRoutes>
          }
        />
        <Route
          path="/ViewPredica"
          element={
            <ProtectedRoutes>
              <ViewPredica />
            </ProtectedRoutes>
          }
        />
        <Route
          path="/ViewVersiculo"
          element={
            <ProtectedRoutes>
              <ViewVersiculo />
            </ProtectedRoutes>
          }
        />
      </Routes>
    </AppProvider>
  );
}
