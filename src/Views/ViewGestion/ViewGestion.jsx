import { useNavigate } from "react-router-dom";
import {
  TagIcon,
  ChatBubbleLeftRightIcon,
  PhotoIcon,
  VideoCameraIcon,
  MicrophoneIcon,
  BookOpenIcon,
  PaintBrushIcon,
  UserGroupIcon,
  XMarkIcon,
  UserIcon,
} from "@heroicons/react/24/solid";
import Footer from "../../Components/Footer/Footer.jsx";
import { useAuth } from "../../Components/Context/AuthContext.jsx";

export default function ViewSelector() {
  const { userData } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-svh flex flex-col items-center justify-center bg-linear-to-b from-app-dark/50 to-app-light/50 ">
      <div className="flex flex-col items-center justify-items-start w-full flex-1 px-2">
        {userData && (
          <div className="flex items-center gap-3 w-full max-w-3xl border border-app-border rounded-full px-2 py-2 mt-4 mb-3 hover:shadow-inner hover:shadow-app-muted transition-shadow duration-300">
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
              onClick={() => navigate("/ViewSelector")}
              className="p-2 rounded-full hover:bg-app-main transition"
              aria-label="Cerrar"
            >
              <XMarkIcon className="w-6 h-6 text-app-muted hover:text-app-dark" />
            </button>
          </div>
        )}
      </div>

      {/* Encabezado */}
      <div className="text-center sm:mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-app-main">
          Panel de Gestión
        </h1>
        <p className="text-app-muted text-base sm:text-lg mt-2">
          Seleccione una opción para continuar
        </p>
      </div>

      {/* Cuadrícula de botones */}
      <div className="flex-1 flex items-center justify-center w-full px-6 py-2">
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-2 sm:gap-6 w-full max-w-3xl">
          <OptionButton
            icon={<PaintBrushIcon className="w-10 h-10 text-app-muted mb-2" />}
            label="Estilos y colores"
            onClick={() => navigate("/ViewStylos")}
          />

          <OptionButton
            icon={<UserGroupIcon className="w-10 h-10 text-app-muted mb-2" />}
            label="Usuarios"
            onClick={() => navigate("/ViewUsers")}
          />

          <OptionButton
            icon={<TagIcon className="w-10 h-10 text-app-muted mb-2" />}
            label="Gestión Ticker"
            onClick={() => navigate("/ViewTicker")}
          />

          <OptionButton
            icon={
              <ChatBubbleLeftRightIcon className="w-10 h-10 text-app-muted mb-2" />
            }
            label="Gestión Mensaje"
            onClick={() => navigate("/ViewMessage")}
          />

          <OptionButton
            icon={<PhotoIcon className="w-10 h-10 text-app-muted mb-2" />}
            label="Gestión Imagen"
            onClick={() => navigate("/ViewImagenes")}
          />

          <OptionButton
            icon={<VideoCameraIcon className="w-10 h-10 text-app-muted mb-2" />}
            label="Gestión Video"
            onClick={() => navigate("/ViewPanel")}
          />

          <OptionButton
            icon={<MicrophoneIcon className="w-10 h-10 text-app-muted mb-2" />}
            label="Gestión Predica"
            onClick={() => navigate("/ViewPredica")}
          />

          <OptionButton
            icon={<BookOpenIcon className="w-10 h-10 text-app-muted mb-2 " />}
            label="Biblia"
            onClick={() => navigate("/ViewVersiculo")}
          />
        </div>
      </div>

      <Footer />
    </div>
  );
}

/* Componente reutilizable */
function OptionButton({ icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-center justify-center p-3 sm:p-6 bg-linear-to-b from-app-muted/40 to-app-dark rounded-2xl shadow-md hover:shadow-xl transform hover:scale-105 transition-all duration-300 border border-app-border sm:aspect-square"
    >
      <span className="text-app-main transform transition-all duration-300 group-hover:scale-125 group-hover:-translate-y-1">
        {icon}
      </span>

      <span className="text-sm sm:text-base font-medium text-app-main text-center mt-2">
        {label}
      </span>
    </button>
  );
}
