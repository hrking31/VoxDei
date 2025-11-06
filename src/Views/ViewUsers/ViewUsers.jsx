import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  UserPlusIcon,
  TrashIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/solid";
import { useAuth } from "../../Components/Context/AuthContext.jsx";
import {
  createUserWithEmailAndPassword,
  updatePassword,
  deleteUser,
  onAuthStateChanged,
} from "firebase/auth";
import { auth } from "../../Components/Firebase/Firebase";

export default function ViewUsers() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [user, setUser] = useState({ email: "", password: "" });
  const [editMode, setEditMode] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = ({ target: { name, value } }) => {
    setUser((prev) => ({ ...prev, [name]: value }));
    setError("");
    setMessage("");
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!user.email || !user.password) {
      setError("Por favor ingresa un correo y una contraseña.");
      return;
    }

    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, user.email, user.password);
      setMessage("✅ Usuario creado exitosamente.");
      setUser({ email: "", password: "" });
    } catch (err) {
      console.error(err.code);
      const errorMessages = {
        "auth/email-already-in-use": "El correo ya está registrado.",
        "auth/invalid-email": "Correo inválido.",
        "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.",
      };
      setError(errorMessages[err.code] || "Error al crear el usuario.");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!currentUser) {
      setError("Debes iniciar sesión para editar un usuario.");
      return;
    }

    if (!user.password) {
      setError("Por favor ingresa una nueva contraseña.");
      return;
    }

    setLoading(true);
    try {
      await updatePassword(currentUser, user.password);
      setMessage("✅ Contraseña actualizada correctamente.");
      setUser({ email: currentUser.email, password: "" });
    } catch (err) {
      console.error(err.code);
      const errorMessages = {
        "auth/requires-recent-login":
          "Por seguridad, vuelve a iniciar sesión para cambiar la contraseña.",
        "auth/weak-password":
          "La nueva contraseña debe tener al menos 6 caracteres.",
      };
      setError(errorMessages[err.code] || "Error al actualizar la contraseña.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!currentUser) {
      setError("Debes iniciar sesión para eliminar una cuenta.");
      return;
    }

    const confirmDelete = window.confirm(
      "¿Seguro que deseas eliminar tu cuenta? Esta acción no se puede deshacer."
    );

    if (!confirmDelete) return;

    setLoading(true);
    try {
      await deleteUser(currentUser);
      setMessage("✅ Cuenta eliminada correctamente.");
      navigate("/"); // volver a inicio o login
    } catch (err) {
      console.error(err.code);
      const errorMessages = {
        "auth/requires-recent-login":
          "Debes volver a iniciar sesión antes de eliminar tu cuenta.",
      };
      setError(errorMessages[err.code] || "Error al eliminar la cuenta.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (userData) => {
      if (userData) {
        setUser({ email: userData.email || "", password: "" });
        setEditMode(true);
      } else {
        setUser({ email: "", password: "" });
        setEditMode(false);
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen p-6 bg-gradient-to-b from-app-light/50 to-white">
      {/* Encabezado */}
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-app-main tracking-tight">
          {editMode ? "Editar Usuario" : "Crear Usuario"}
        </h1>
        <p className="text-app-muted text-base sm:text-lg mt-2">
          {editMode
            ? "Actualiza tu contraseña o elimina tu cuenta."
            : "Registra una nueva cuenta de usuario."}
        </p>
      </div>

      {/* Formulario */}
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-md p-8 border border-gray-100">
        <form
          onSubmit={editMode ? handleEdit : handleCreate}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col">
            <label className="text-sm font-medium text-app-main mb-1">
              Correo electrónico
            </label>
            <input
              type="email"
              name="email"
              placeholder="ejemplo@correo.com"
              value={user.email}
              onChange={handleChange}
              disabled={editMode}
              className={`p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-app-main transition text-app-muted ${
                editMode ? "bg-gray-100 cursor-not-allowed" : ""
              }`}
            />
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium text-app-main mb-1">
              {editMode ? "Nueva contraseña" : "Contraseña"}
            </label>
            <input
              type="password"
              name="password"
              placeholder="********"
              value={user.password}
              onChange={handleChange}
              className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-app-main transition text-app-muted"
            />
          </div>

          {error && (
            <p className="text-red-500 text-center text-sm font-medium mt-2">
              {error}
            </p>
          )}
          {message && (
            <p className="text-green-600 text-center text-sm font-medium mt-2">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`flex items-center justify-center gap-2 ${
              editMode
                ? "bg-yellow-500 hover:bg-yellow-600"
                : "bg-app-main hover:bg-app-main/90"
            } text-white py-3 rounded-lg font-semibold transition mt-4 ${
              loading ? "opacity-70 cursor-not-allowed" : ""
            }`}
          >
            {editMode ? (
              <>
                <PencilSquareIcon className="w-5 h-5" />
                {loading ? "Actualizando..." : "Actualizar contraseña"}
              </>
            ) : (
              <>
                <UserPlusIcon className="w-5 h-5" />
                {loading ? "Creando..." : "Crear usuario"}
              </>
            )}
          </button>
        </form>

        {editMode && (
          <button
            onClick={handleDelete}
            disabled={loading}
            className="flex items-center justify-center gap-2 bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition mt-4 w-full"
          >
            <TrashIcon className="w-5 h-5" />
            Eliminar cuenta
          </button>
        )}

        <p className="text-center text-sm text-app-muted mt-4">
          {editMode ? "¿Quieres cerrar sesión?" : "¿Ya tienes una cuenta?"}
          <button
            onClick={() => navigate(editMode ? "/" : "/ViewLogin")}
            className="text-app-main hover:underline ml-1"
          >
            {editMode ? "Cerrar sesión" : "Iniciar sesión"}
          </button>
        </p>
      </div>
    </div>
  );
}
