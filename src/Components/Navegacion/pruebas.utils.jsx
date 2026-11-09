/* eslint-disable react-refresh/only-export-components -- utilidades de prueba, no se cargan en la app */
import { afterEach, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { AuthContext } from "../Context/AuthContext";
import { AppContext } from "../Context/AppContext";

// Sin `globals` en Vitest, Testing Library no limpia sola entre pruebas.
afterEach(cleanup);

// Muestra la dirección actual para comprobar adónde navegó un botón.
function DondeEstoy() {
  const { pathname } = useLocation();
  return <output data-testid="ruta">{pathname}</output>;
}

// Monta un componente con sesión, contexto de la app y enrutador falsos.
// Por defecto: pastor con sesión lista, en computador, que confirma todo.
export function montar(ui, { ruta = "/ViewGestion", auth = {}, app = {} } = {}) {
  const valorAuth = {
    user: { uid: "u1" },
    userData: { name: "Ana Gómez", role: "Pastor" },
    correoVerificado: true,
    logout: vi.fn().mockResolvedValue(undefined),
    ...auth,
  };
  const valorApp = {
    isDesktop: true,
    confirmAction: vi.fn().mockResolvedValue(true),
    showNotif: vi.fn(),
    // Cronograma vacío: sin servicio ni ensayo, solo los pastores proyectan.
    servicios: [],
    ensayo: null,
    desfaseReloj: 0,
    ...app,
  };
  const resultado = render(
    <AuthContext.Provider value={valorAuth}>
      <AppContext.Provider value={valorApp}>
        <MemoryRouter initialEntries={[ruta]}>
          {ui}
          <DondeEstoy />
        </MemoryRouter>
      </AppContext.Provider>
    </AuthContext.Provider>
  );
  return { ...resultado, auth: valorAuth, app: valorApp };
}
