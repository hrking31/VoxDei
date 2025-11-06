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
} from "@heroicons/react/24/solid";

export default function ViewSelector() {
  const navigate = useNavigate();

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen p-6 bg-app-dark">
      {/* Botón de cerrar */}
      <button
        onClick={() => navigate("/ViewSelector")}
        className="absolute top-4 right-4 p-2 rounded-full hover:bg-app-main transition"
        aria-label="Cerrar"
      >
        <XMarkIcon className="w-6 h-6 text-app-muted hover:text-app-dark" />
      </button>

      {/* Encabezado */}
      <div className="text-center mb-8 sm:mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-app-main">
          Panel de Gestión
        </h1>
        <p className="text-app-muted text-base sm:text-lg mt-2">
          Seleccione una opción para continuar
        </p>
      </div>

      {/* Cuadrícula de botones */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 w-full max-w-5xl">
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
          onClick={() => navigate("/ViewPanel")}
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
          icon={<BookOpenIcon className="w-10 h-10 text-app-muted mb-2" />}
          label="Biblia"
          onClick={() => navigate("/ViewVersiculo")}
        />
      </div>
    </div>
  );
}

/* Componente reutilizable */
function OptionButton({ icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center p-6 bg-app-light rounded-xl shadow-md hover:shadow-xl transform hover:scale-105 transition-all duration-300 sm:aspect-square"
    >
      {icon}
      <span className="text-sm sm:text-base font-medium text-app-main text-center">
        {label}
      </span>
    </button>
  );
}
