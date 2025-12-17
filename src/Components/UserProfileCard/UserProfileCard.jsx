import { XMarkIcon } from "@heroicons/react/24/outline";

export default function UserProfileCard({
  isModalOpen,
  setIsModalOpen,
  user,
  handleDelete,
}) {
  const handlerLogout = async () => {
    await logout();
  };

  if (!user) return null;

  return (
    <>
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
            <div className="h-32 bg-linear-to-br from-app-main to-app-dark relative">
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
                src={user.photo || "https://ui-avatars.com/api/?name=User"}
                alt="user"
                className="w-32 h-32 rounded-full object-cover border-4 border-gray-900 shadow-xl mx-auto"
              />
            </div>

            {/* Contenido del modal */}
            <div className="px-8 py-6 text-center">
              <h2 className="text-2xl font-bold  dark:text-white">
                {user.name || "Usuario"}
              </h2>
              <p className="text-sm text-app-muted mt-1">
                {user.email || "Sin correo"}
              </p>

              <div className="mt-6 flex justify-center">
                <span
                  className="px-4 py-2 rounded-full text-sm font-medium capitalize
                  bg-app-main/10 text-app-main"
                >
                  {user.role || "Sin rol"}
                </span>
              </div>

              <button
                onClick={async () => {
                  setIsModalOpen(false);
                  await handleDelete();
                }}
                className="mt-8 w-full py-3 bg-app-main text-white font-medium rounded-xl hover:bg-app-light transition shadow-lg"
              >
                Eliminar
              </button>

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
