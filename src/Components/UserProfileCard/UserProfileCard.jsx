import { useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../Components/Context/AuthContext.jsx";

export default function UserProfileCard() {
  const navigate = useNavigate();
  const { userData, logout } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handlerLogout = async () => {
    await logout();
  };

  if (!userData) return null;

  return (
    <>
      {/* Avatar que abre el modal */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="group relative focus:outline-none"
      >
        <img
          src={userData.photoURL || "https://ui-avatars.com/api/?name=User"}
          alt="user"
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover ring-4 ring-transparent group-hover:ring-app-border transition-all duration-200"
        />
        <div className="absolute inset-0 rounded-full bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
      </button>

      {/* Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setIsModalOpen(false)} // Cerrar al hacer clic fuera
        >
          <div
            className="relative w-full max-w-md bg-gray-900 rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()} // Evitar cerrar al hacer clic dentro
          >
            {/* Header con fondo degradado */}
            <div className="h-32 bg-gradient-to-br from-app-main to-app-dark relative">
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/20 backdrop-blur-md hover:bg-white/30 transition"
              >
                <XMarkIcon className="w-6 h-6 text-white" />
              </button>
            </div>

            {/* Avatar grande centrado arriba del contenido */}
            <div className="relative -mt-16 px-8 text-center">
              <img
                src={
                  userData.photoURL || "https://ui-avatars.com/api/?name=User"
                }
                alt="user"
                className="w-32 h-32 rounded-full object-cover border-4 border-gray-900 shadow-xl mx-auto"
              />
            </div>

            {/* Contenido del modal */}
            <div className="px-8 py-6 text-center">
              <h2 className="text-2xl font-bold  dark:text-white">
                {userData.name || "Usuario"}
              </h2>
              <p className="text-sm text-app-muted mt-1">
                {userData.email || "Sin correo"}
              </p>

              <div className="mt-6 flex justify-center">
                <span
                  className="px-4 py-2 rounded-full text-sm font-medium capitalize
                  bg-app-main/10 text-app-main"
                >
                  {userData.role || "Sin rol"}
                </span>
              </div>

              <button
                onClick={() => {
                  setIsModalOpen(false);
                  handlerLogout();
                }}
                className="mt-8 w-full py-3 bg-app-main text-white font-medium rounded-xl hover:bg-app-light transition shadow-lg"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
