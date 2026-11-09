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
  ViewCancion,
  ViewCancionEditar,
  ViewVideo,
  ViewResetPassword,
  ViewUsers,
  VistaNoAutorizada,
  ViewRegister,
  ViewEliminarCuenta,
  ViewCronograma,
  ViewServicioEditar,
} from "./Views/index";
import { ProtectedRoutes } from "./Components/ProtectedRoutes/ProtectedRoutes.jsx";
import { ROLES_PASTORES, ROLES_PROYECCION } from "./Components/Roles/Roles.js";
import { AppProvider } from "./Components/Context/AppProvider.jsx";
import InicializarEstados from "./Components/InicializarEstados/InicializarEstados";
import Notificaciones from "./Components/Notificaciones/Notificaciones";
import MarcoPanel from "./Components/Navegacion/MarcoPanel.jsx";

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
        {/* Pública a propósito: Google Play exige una web para pedir el borrado */}
        <Route path="/EliminarCuenta" element={<ViewEliminarCuenta />} />

        <Route
          path="/ViewSelector"
          element={
            <ProtectedRoutes>
              <ViewSelector />
            </ProtectedRoutes>
          }
        />

        <Route
          path="/VOXDEI"
          element={
            <ProtectedRoutes rolesPermitidos={ROLES_PROYECCION}>
              <ViewDisplay />
            </ProtectedRoutes>
          }
        />

        {/* Pantallas del panel: en el computador llevan la barra lateral.
            Cada una conserva su dirección y su protección por rol. */}
        <Route element={<MarcoPanel />}>
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
              <ProtectedRoutes rolesPermitidos={ROLES_PROYECCION}>
                <ViewImagenes />
              </ProtectedRoutes>
            }
          />

          <Route
            path="/ViewStylos"
            element={
              <ProtectedRoutes rolesPermitidos={ROLES_PROYECCION}>
                <ViewStylos />
              </ProtectedRoutes>
            }
          />

          <Route
            path="/ViewUsers"
            element={
              // Abierta a todos: es donde cada quien puede eliminar su cuenta.
              // Crear y borrar a otros lo limita la propia vista y el servidor.
              <ProtectedRoutes rolesPermitidos={ROLES_PROYECCION}>
                <ViewUsers />
              </ProtectedRoutes>
            }
          />

          <Route
            path="/viewTicker"
            element={
              <ProtectedRoutes rolesPermitidos={ROLES_PROYECCION}>
                <ViewTicker />
              </ProtectedRoutes>
            }
          />

          <Route
            path="/ViewMessage"
            element={
              <ProtectedRoutes rolesPermitidos={ROLES_PROYECCION}>
                <ViewMessage />
              </ProtectedRoutes>
            }
          />

          <Route
            path="/ViewPredica"
            element={
              <ProtectedRoutes rolesPermitidos={ROLES_PASTORES}>
                <ViewPredica />
              </ProtectedRoutes>
            }
          />

          <Route
            path="/ViewVersiculo"
            element={
              <ProtectedRoutes rolesPermitidos={ROLES_PROYECCION}>
                <ViewVersiculo />
              </ProtectedRoutes>
            }
          />

          <Route
            path="/ViewCanciones"
            element={
              <ProtectedRoutes rolesPermitidos={ROLES_PROYECCION}>
                <ViewCanciones />
              </ProtectedRoutes>
            }
          />

          <Route
            path="/ViewCancion/:id"
            element={
              <ProtectedRoutes rolesPermitidos={ROLES_PROYECCION}>
                <ViewCancion />
              </ProtectedRoutes>
            }
          />

          {/* Sin id es una canción nueva; con id se corrige una propia */}
          <Route
            path="/ViewCancionEditar"
            element={
              <ProtectedRoutes rolesPermitidos={ROLES_PROYECCION}>
                <ViewCancionEditar />
              </ProtectedRoutes>
            }
          />

          <Route
            path="/ViewCancionEditar/:id"
            element={
              <ProtectedRoutes rolesPermitidos={ROLES_PROYECCION}>
                <ViewCancionEditar />
              </ProtectedRoutes>
            }
          />

          <Route
            path="/ViewVideo"
            element={
              <ProtectedRoutes rolesPermitidos={ROLES_PROYECCION}>
                <ViewVideo />
              </ProtectedRoutes>
            }
          />

          {/* Cronograma: lo ve todo el equipo; los servicios solo los crean y
              editan pastor y pastora */}
          <Route
            path="/ViewCronograma"
            element={
              <ProtectedRoutes rolesPermitidos={ROLES_PROYECCION}>
                <ViewCronograma />
              </ProtectedRoutes>
            }
          />

          <Route
            path="/ViewServicioEditar"
            element={
              <ProtectedRoutes rolesPermitidos={ROLES_PASTORES}>
                <ViewServicioEditar />
              </ProtectedRoutes>
            }
          />

          <Route
            path="/ViewServicioEditar/:id"
            element={
              <ProtectedRoutes rolesPermitidos={ROLES_PASTORES}>
                <ViewServicioEditar />
              </ProtectedRoutes>
            }
          />
        </Route>
      </Routes>
    </AppProvider>
  );
}
