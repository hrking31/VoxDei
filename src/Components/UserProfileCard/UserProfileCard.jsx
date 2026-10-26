import { XMarkIcon } from "@heroicons/react/24/outline";
import MiFoto from "../MiFoto/MiFoto.jsx";

// Ficha de un miembro del equipo.
//
// Es de consulta, salvo dos cosas. Se puede eliminar: a otro, si quien mira es
// pastor y le corresponde (`puedeEliminar`), o la propia cuenta, en la ficha de
// uno mismo (`esMiCuenta`). Y en la ficha propia la foto se cambia tocándola
// (MiFoto): es el único lugar de la app donde se hace. Antes había también un
// botón "Cerrar sesión" que cerraba la sesión de QUIEN MIRABA, no la del
// usuario de la ficha; se quitó porque inducía a error.
export default function UserProfileCard({
  isModalOpen,
  setIsModalOpen,
  user,
  handleDelete,
  puedeEliminar = false,
  esMiCuenta = false,
  onEliminarMiCuenta,
  alCambiarFoto,
}) {
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

            {/* Avatar grande centrado arriba del contenido. En la ficha propia
                se toca para cambiar la foto. */}
            <div className="relative -mt-16 px-8 flex justify-center">
              {esMiCuenta ? (
                <MiFoto
                  tamano="w-32 h-32 border-4 border-gray-900 shadow-xl"
                  alCambiar={alCambiarFoto}
                />
              ) : (
                <img
                  src={user.photo || "https://ui-avatars.com/api/?name=User"}
                  alt="user"
                  className="w-32 h-32 rounded-full object-cover border-4 border-gray-900 shadow-xl"
                />
              )}
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

              {puedeEliminar && (
                <button
                  onClick={async () => {
                    setIsModalOpen(false);
                    await handleDelete();
                  }}
                  className="mt-8 w-full py-3 bg-app-error text-white font-medium rounded-xl hover:bg-red-700 transition shadow-lg"
                >
                  Eliminar cuenta
                </button>
              )}

              {esMiCuenta && onEliminarMiCuenta && (
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    onEliminarMiCuenta();
                  }}
                  className="mt-8 w-full py-3 bg-app-error text-white font-medium rounded-xl hover:bg-red-700 transition shadow-lg"
                >
                  Eliminar mi cuenta
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
