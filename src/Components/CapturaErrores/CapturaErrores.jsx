import { Component } from "react";
import { ArrowPathIcon, ExclamationTriangleIcon } from "@heroicons/react/24/solid";

// Red de seguridad de toda la aplicación.
//
// Si una vista falla al dibujarse, React desmonta todo y deja la pantalla en
// blanco, sin más salida que cerrar la app. Esto atrapa el fallo y ofrece
// recargar. Tiene que ser un componente de clase: React no tiene un hook para
// capturar errores de dibujado.
//
// Va montado en main.jsx por fuera de AuthProvider y del router, así que no
// puede usar useAuth ni useNavigate: navega con window.location.
export default class CapturaErrores extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Fallo al dibujar la pantalla:", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-svh flex items-center justify-center px-4 bg-linear-to-b from-gray-900 to-gray-800">
        <div className="w-full max-w-md bg-gray-900/40 border border-gray-700 shadow-xl p-6 text-center space-y-4">
          <ExclamationTriangleIcon className="w-12 h-12 text-app-main mx-auto" />

          <h1 className="text-2xl font-bold text-app-main">Algo salió mal</h1>

          <p className="text-app-muted">
            La pantalla tuvo un problema. Lo que estaba en la proyección no se
            ha perdido: recarga para seguir.
          </p>

          <div className="flex flex-col gap-2">
            <button
              onClick={() => window.location.reload()}
              className="flex items-center justify-center gap-2 bg-app-main text-black py-2.5 rounded-lg font-semibold hover:bg-app-main/90 transition"
            >
              <ArrowPathIcon className="w-5 h-5" />
              Recargar
            </button>

            <button
              onClick={() => window.location.assign("/ViewSelector")}
              className="py-2.5 rounded-lg font-semibold text-app-muted border border-gray-700 hover:bg-gray-800 transition"
            >
              Ir al inicio
            </button>
          </div>
        </div>
      </div>
    );
  }
}
