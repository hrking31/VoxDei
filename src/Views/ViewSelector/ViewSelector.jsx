import { useNavigate } from "react-router-dom";
import {
  PlayCircleIcon,
  Squares2X2Icon,
  XMarkIcon,
  UserIcon,
} from "@heroicons/react/24/solid";
import Footer from "../../Components/Footer/Footer.jsx";
import { useAuth } from "../../Components/Context/AuthContext.jsx";
import Loading from "../../Components/Loading/Loading.jsx";

export default function ViewSelector() {
  const navigate = useNavigate();
  const { logout, userData, loading } = useAuth();

  const handlerLogout = async () => {
    await logout();
  };

  if (loading || !userData) {
    return <Loading text="Creando iglesia..." />;
  }

  // const abrirVisor = () => {
  //   const ancho = 1280;
  //   const alto = 720;

  //   window.open(
  //     "/VOXDEI",
  //     "VisorProyector",
  //     `
  //     width=${ancho},
  //     height=${alto},
  //     menubar=no,
  //     toolbar=no,
  //     location=no,
  //     status=no,
  //     scrollbars=no,
  //     resizable=no
  //   `
  //   );
  // };

  const abrirVisor = () => {
    const w = window.open(
      "/VOXDEI",
      "VisorProyector",
      "menubar=no,toolbar=no,location=no,status=no,scrollbars=no,resizable=no"
    );

    if (!w) return;

    w.moveTo(0, 0);

    // Forzamos tamaño pantalla completa (como Proyektor)
    w.resizeTo(window.screen.availWidth, window.screen.availHeight);

    w.focus();
  };



  return (
    // <div className="relative flex flex-col items-center justify-center min-h-screen p-6 bg-gradient-to-b from-app-light/50 to-white">
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-app-dark/50 to-app-light/50">
      {userData && (
        <div className="flex items-center gap-3 w-full max-w-3xl border border-app-border rounded-full px-4 py-2 mt-4 mb-8 hover:shadow-inner hover:shadow-app-muted transition-shadow duration-300">
          {userData.photo ? (
            <img
              src={userData.photo}
              alt="user"
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
              <UserIcon className="w-5 h-5 text-gray-500" />
            </div>
          )}
          <div className="flex flex-col flex-1 leading-tight">
            <span className="text-sm font-medium text-app-main">
              {userData.name || "Usuario"}
            </span>
            <span className="text-[11px] text-app-muted">
              {userData.email || userData.role || ""}
            </span>
          </div>

          <span className="text-[11px] bg-app-main/10 text-app-main px-3 py-1 rounded-full capitalize font-medium">
            {userData.role || "Sin rol"}
          </span>
          <button
            onClick={handlerLogout}
            className="p-2 rounded-full hover:bg-app-main transition"
            aria-label="Cerrar"
          >
            <XMarkIcon className="w-6 h-6 text-app-muted hover:text-app-dark" />
          </button>
        </div>
      )}

      {/* Encabezado */}
      <div className="text-center mb-6">
        <h1 className="text-3xl sm:text-4xl font-bold text-app-main tracking-tight">
          Bienvenidos a VOXDEI
        </h1>
        <p className="text-app-muted text-base sm:text-lg mt-2">
          ¿Cómo quieres usar este dispositivo?
        </p>
      </div>

      {/* Contenedor de botones */}
      <div className="flex-1 flex items-center justify-center w-full p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-3xl">
          {/* Botón Presentación */}
          <button
            onClick={() => navigate("/ViewDisplay")}
            className="group flex flex-col items-center justify-center p-8 sm:p-10 bg-gradient-to-b from-app-main/40 to-app-light rounded-2xl shadow-md hover:shadow-xl transform hover:-translate-y-1 hover:scale-105 transition-all duration-300 border border-app-border"
          >
            <PlayCircleIcon className="w-14 h-14 text-app-main mb-3 transform transition-all duration-300 group-hover:scale-125 group-hover:-translate-y-1" />
            <span className="text-base sm:text-lg font-semibold text-app-main text-center">
              Presentación
            </span>
            <p className="text-sm text-app-muted mt-1 text-center">
              Muestra el contenido en la pantalla principal
            </p>
          </button>

          <button onClick={abrirVisor}>Abrir visor de proyección</button>

          {/* Botón Administrador */}
          <button
            onClick={() => navigate("/ViewGestion")}
            className="group flex flex-col items-center justify-center p-8 sm:p-10 bg-gradient-to-b from-app-main/40 to-app-light rounded-2xl shadow-md hover:shadow-xl transform hover:-translate-y-1 hover:scale-105 transition-all duration-300 border border-app-border"
          >
            <Squares2X2Icon className="w-14 h-14 text-app-main mb-3 transform transition-all duration-300 group-hover:scale-125 group-hover:-translate-y-1" />
            <span className="text-base sm:text-lg font-semibold text-app-main text-center">
              Administrador
            </span>
            <p className="text-sm text-app-muted mt-1 text-center">
              Gestiona tickers, mensajes, predicas, versiculos, usuarios y
              estilos
            </p>
          </button>
        </div>
      </div>
      <Footer />
    </div>
  );
}
