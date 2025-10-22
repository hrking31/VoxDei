import { useNavigate } from "react-router-dom";
import { PlayCircleIcon } from "@heroicons/react/24/solid";
import { TagIcon } from "@heroicons/react/24/outline";
import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";
import { PhotoIcon } from "@heroicons/react/24/outline";
import { VideoCameraIcon } from "@heroicons/react/24/outline";
import { MicrophoneIcon } from "@heroicons/react/24/outline";
import { BookOpenIcon as BookOpenOutline } from "@heroicons/react/24/outline";
import { BookOpenIcon as BookOpenSolid } from "@heroicons/react/24/solid";

export default function ViewSelector() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center p-4 gap-4">
      <div className="text-center mb-8 md:mb-3">
        <h1 className="text-4xl font-bold text-app-main">Panel de Gestión</h1>
        <p className="text-app-muted text-lg mt-2">
          Seleccione una opción para continuar
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 w-full max-w-4xl">
        <button
          onClick={() => navigate("/ViewDisplay")}
          className="flex flex-col items-center justify-center p-6 bg-app-light  rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 sm:aspect-square"
        >
          <PlayCircleIcon className="w-10 h-10 text-app-muted mb-2" />
          <span className="text-sm font-medium text-app-main text-center">
            Presentación
          </span>
        </button>

        <button
          onClick={() => navigate("/ViewTicker")}
          className="flex flex-col items-center justify-center p-6 bg-app-light  rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 sm:aspect-square"
        >
          <TagIcon className="w-10 h-10 text-app-muted mb-2" />
          <span className="text-sm font-medium text-app-main text-center">
            Gestión Ticker
          </span>
        </button>

        <button
          onClick={() => navigate("/ViewMessage")}
          className="flex flex-col items-center justify-center p-6 bg-app-light  rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 sm:aspect-square"
        >
          <ChatBubbleLeftRightIcon className="w-10 h-10 text-app-muted mb-2" />
          <span className="text-sm font-medium text-app-main text-center">
            Gestión Mensaje
          </span>
        </button>

        <button
          onClick={() => navigate("/ViewPanel")}
          className="flex flex-col items-center justify-center p-6 bg-app-light  rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 sm:aspect-square"
        >
          <PhotoIcon className="w-10 h-10 text-app-muted mb-2" />
          <span className="text-sm font-medium text-app-main text-center">
            Gestión Imagen
          </span>
        </button>

        <button
          onClick={() => navigate("/ViewPanel")}
          className="flex flex-col items-center justify-center p-6 bg-app-light  rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 sm:aspect-square"
        >
          <VideoCameraIcon className="w-10 h-10 text-app-muted mb-2" />
          <span className="text-sm font-medium text-app-main text-center">
            Gestión Video
          </span>
        </button>

        <button
          onClick={() => navigate("/ViewPredica")}
          className="flex flex-col items-center justify-center p-6 bg-app-light  rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 sm:aspect-square"
        >
          <MicrophoneIcon className="w-10 h-10 text-app-muted mb-2" />
          <span className="text-sm font-medium text-app-main text-center">
            Gestión Predica
          </span>
        </button>

        <button
          onClick={() => navigate("/ViewVersiculo")}
          className="flex flex-col items-center justify-center p-6 bg-app-light  rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 sm:aspect-square"
        >
          <BookOpenSolid className="w-10 h-10 text-app-muted mb-2" />
          <span className="text-sm font-medium text-app-main text-center">
            Capitulos
          </span>
        </button>

        <button
          onClick={() => navigate("/ViewVersiculos")}
          className="flex flex-col items-center justify-center p-6 bg-app-light  rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 sm:aspect-square"
        >
          <BookOpenOutline className="w-10 h-10 text-app-muted mb-2" />
          <span className="text-sm font-medium text-app-main text-center">
            Versiculos
          </span>
        </button>
      </div>
    </div>
  );
}

