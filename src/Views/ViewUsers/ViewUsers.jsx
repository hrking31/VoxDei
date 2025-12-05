import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { UserPlusIcon, TrashIcon } from "@heroicons/react/24/solid";
import { db, storage } from "../../Components/Firebase/Firebase";
import { doc, setDoc, getDoc, deleteDoc } from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { deleteUser } from "firebase/auth";
import { useAuth } from "../../Components/Context/AuthContext.jsx";
import { useAppContext } from "../../Components/Context/AppContext";

export default function ViewUsers() {
  const { signup, login, userData, loading, setLoading } = useAuth();
  const { showNotif, confirmAction } = useAppContext();
  const navigate = useNavigate();
  const refGenero = useRef(null);
  const genderOptions = ["Masculino", "Femenino"];
  const refRol = useRef(null);
  const roleOptions = ["Pastor", "Pastora", "Asistente", "administrador"];
  const [openDropdown, setOpenDropdown] = useState(null); // "genero" o "rol"
  const [mode, setMode] = useState("create"); // "create" o "delete"
  const [newUser, setNewUser] = useState({
    name: "",
    gender: "",
    email: "",
    password: "",
    role: "",
  });

  const [deleteData, setDeleteData] = useState({
    email: "",
    password: "",
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Navegación según tamaño de pantalla
  const handleNavigate = () => {
    const width = window.innerWidth;

    if (width < 1024) {
      navigate("/ViewGestion");
    } else {
      navigate("/ViewSelector");
    }
  };

  // Manejo inputs de creación y eliminación
  const handleChange = ({ target: { name, value } }) => {
    if (mode === "create") setNewUser((prev) => ({ ...prev, [name]: value }));
    else setDeleteData((prev) => ({ ...prev, [name]: value }));

    setError("");
    setMessage("");
  };

  // Alternar dropdowns
  const toggleDropdown = (name) => {
    setOpenDropdown(openDropdown === name ? null : name);
  };

  // Cerrar al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        refGenero.current &&
        !refGenero.current.contains(event.target) &&
        refRol.current &&
        !refRol.current.contains(event.target)
      ) {
        setOpenDropdown(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Crear usuario y guardar datos en Firestore
  const handleCreate = async (e) => {
    e.preventDefault();

    // Limpiar mensajes previos
    setError("");

    if (
      !newUser.name?.trim() ||
      !newUser.email?.trim() ||
      !newUser.password?.trim() ||
      !newUser.role ||
      !newUser.gender
    ) {
      setError("Por favor completa todos los campos.");
      return;
    }

    setLoading(true);

    try {
      const userCredential = await signup(newUser.email, newUser.password);
      const uid = userCredential.user.uid;

      // Guardar información adicional
      await setDoc(doc(db, "users", uid), {
        name: newUser.name,
        gender: newUser.gender,
        email: newUser.email,
        role: newUser.role,
        churchName: userData.churchName,
        groupId: userData.groupId,
        createdAt: new Date(),
      });

      showNotif("success", "✅ Usuario creado correctamente.");
    } catch (err) {
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

  // Eliminar usuario Auth y Firestore
  const handleDelete = async (e) => {
    e.preventDefault();
    setError("");

    if (!deleteData.email || !deleteData.password) {
      setError("Debes ingresar el correo y contraseña del usuario a eliminar.");
      return;
    }

    // Espera respuesta del usuario
    const accepted = await confirmAction(
      `¿Seguro que deseas eliminar la cuenta de ${deleteData.email}?`
    );
    if (!accepted) return;

    setLoading(true);

    try {
      setLoading(true);
      const userCredential = await login(deleteData.email, deleteData.password);
      const userToDelete = userCredential.user;

      // Obtiene datos del usuario desde Firestore
      const userRef = doc(db, "users", userToDelete.uid);
      const userSnap = await getDoc(userRef);

      // 🔴 Eliminar imagen del STORAGE
      if (userSnap.exists() && userSnap.data().photo) {
        const imageUrl = userSnap.data().photo;

        try {
          const imageRef = ref(storage, imageUrl);
          await deleteObject(imageRef);
          console.log("✅ Imagen eliminada del storage");
        } catch (error) {
          console.warn("⚠ No se pudo eliminar la imagen:", error.message);
        }
      }

      // 🔴 Eliminar documento de Firestore
      await deleteDoc(userRef);

      // 🔴 Eliminar usuario de Authentication
      await deleteUser(userToDelete);

      showNotif("success", "✅ Usuario eliminados con éxito");
      setDeleteData({ email: "", password: "" });
    } catch (err) {
      const errorMessages = {
        "auth/user-not-found": "No se encontró una cuenta con ese correo.",
        "auth/wrong-password": "Contraseña incorrecta.",
        "auth/invalid-email": "Correo inválido.",
        "auth/too-many-requests":
          "Demasiados intentos fallidos. Intenta de nuevo más tarde.",
      };

      setError(errorMessages[err.code] || "Error al eliminar el usuario.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen p-6 bg-app-dark">
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-app-main">
          Gestión de Usuarios
        </h1>
        <p className="text-app-muted text-base sm:text-lg mt-2">
          Crea o elimina usuarios.
        </p>
      </div>

      <div className="w-full max-w-sm bg-app-light rounded-2xl shadow-md px-8 pb-8 pt-4 border border-app-border">
        {/* Pestañas */}
        <div className="flex justify-center gap-8 mb-6">
          <button
            onClick={() => {
              setMode("create"), setError(""), setMessage("");
            }}
            className={`relative pb-2 font-semibold transition ${
              mode === "create"
                ? "text-app-main after:content-[''] after:absolute after:left-0 after:bottom-0 after:w-full after:h-[2px] after:bg-app-main"
                : "border-transparent text-app-muted hover:text-app-main"
            }`}
          >
            Crear usuario
          </button>
          <button
            onClick={() => {
              setMode("delete"), setError(""), setMessage("");
            }}
            className={`relative pb-2 font-semibold transition ${
              mode === "delete"
                ? "text-app-error after:content-[''] after:absolute after:left-0 after:bottom-0 after:w-full after:h-[2px] after:bg-app-error"
                : "border-transparent text-app-muted hover:text-red-600"
            }`}
          >
            Eliminar usuario
          </button>
        </div>

        {/* Contenido dinámico */}
        {mode === "create" ? (
          // Crear usuario
          <form
            onSubmit={handleCreate}
            noValidate
            className="flex flex-col form-dark gap-4"
          >
            <input
              type="Nombre"
              name="name"
              placeholder="Nombre del usuario"
              value={newUser.name}
              onChange={handleChange}
              className="p-3 border border-app-border focus:outline-none focus:ring-2 focus:ring-app-main transition rounded-lg text-app-muted"
            />
            {/* Dropdowns para genero */}
            <div ref={refGenero} className="relative">
              <button
                type="button"
                onClick={() => toggleDropdown("genero")}
                className="w-full p-3 border border-app-border focus:outline-none focus:ring-2 focus:ring-app-main transition rounded-lg text-app-muted text-left bg-app-light"
              >
                {newUser.gender || "Selecciona un género"}
              </button>

              {openDropdown === "genero" && (
                <ul
                  className="
                  absolute
                  left-0
                  right-0
                  top-full
                  mt-1
                  bg-app-light
                  border-2 border-app-border
                  rounded-lg
                  shadow-lg
                  max-h-64
                  overflow-y-auto
                  z-20
                  text-app-muted
                  text-sm sm:text-base
                  scrollbar-custo
                "
                >
                  {genderOptions.map((option) => (
                    <li
                      key={option}
                      onClick={() => {
                        setNewUser((prev) => ({ ...prev, gender: option }));
                        setOpenDropdown(null);
                      }}
                      className="px-4 py-2 cursor-pointer hover:bg-app-main hover:text-white transition-colors duration-200"
                    >
                      {option}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <input
              type="email"
              name="email"
              placeholder="Correo electrónico"
              value={newUser.email}
              onChange={handleChange}
              className="p-3 border border-app-border focus:outline-none focus:ring-2 focus:ring-app-main transition rounded-lg text-app-muted"
            />
            <input
              type="password"
              name="password"
              placeholder="Contraseña"
              value={newUser.password}
              onChange={handleChange}
              className="p-3 border border-app-border focus:outline-none focus:ring-2 focus:ring-app-main transition rounded-lg text-app-muted"
            />
            {/* Dropdowns para rol */}
            <div ref={refRol} className="relative">
              <button
                type="button"
                onClick={() => toggleDropdown("rol")}
                className="w-full p-3 border border-app-border focus:outline-none focus:ring-2 focus:ring-app-main transition rounded-lg text-app-muted text-left bg-app-light"
              >
                {newUser.role || "Selecciona un rol"}
              </button>
              {openDropdown === "rol" && (
                <ul
                  className="
                  absolute
                  left-0
                  right-0
                  top-full
                  mt-1
                  bg-app-light
                  border-2 border-app-border
                  rounded-lg
                  shadow-lg
                  max-h-64
                  overflow-y-auto
                  z-20
                  text-app-muted
                  text-sm sm:text-base
                  scrollbar-custom
                "
                >
                  {roleOptions.map((roleOptions) => (
                    <li
                      key={roleOptions}
                      onClick={() => {
                        setNewUser((prev) => ({ ...prev, role: roleOptions }));
                        setOpenDropdown(null);
                      }}
                      className="px-4 py-2 cursor-pointer hover:bg-app-main hover:text-white transition-colors duration-200"
                    >
                      {roleOptions}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`flex items-center justify-center gap-2 bg-app-main text-white py-3 rounded-lg font-semibold hover:bg-app-main/90 transition ${
                loading ? "opacity-70 cursor-not-allowed" : ""
              }`}
            >
              <UserPlusIcon className="w-5 h-5" />
              {loading ? "Creando..." : "Crear usuario"}
            </button>
          </form>
        ) : (
          // Eliminar usuario
          <form
            onSubmit={handleDelete}
            noValidate
            className="flex flex-col form-dark  gap-4"
          >
            <input
              type="email"
              name="email"
              placeholder="Correo del usuario a eliminar"
              value={deleteData.email}
              onChange={handleChange}
              className="p-3 border border-app-border focus:outline-none focus:ring-2 focus:ring-app-main transition rounded-lg text-app-muted"
            />
            <input
              type="password"
              name="password"
              placeholder="Contraseña del usuario"
              value={deleteData.password}
              onChange={handleChange}
              className="p-3 border border-app-border focus:outline-none focus:ring-2 focus:ring-app-main transition rounded-lg text-app-muted"
            />
            <button
              type="submit"
              disabled={loading}
              className={`flex items-center justify-center gap-2 bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition ${
                loading ? "opacity-70 cursor-not-allowed" : ""
              }`}
            >
              <TrashIcon className="w-5 h-5" />
              {loading ? "Eliminando..." : "Eliminar usuario"}
            </button>
          </form>
        )}

        {/* Mensajes */}
        {(error || message) && (
          <p
            className={`text-center text-sm font-medium mt-4 ${
              error ? "text-red-500" : "text-green-600"
            }`}
          >
            {error || message}
          </p>
        )}
      </div>

      {/* gresar a vista selector o gestion */}
      <p className="text-center text-sm text-app-muted mt-4">
        ¿Regresar al inicio?
        <button
          onClick={handleNavigate}
          className="text-app-main hover:underline ml-1"
        >
          Inicio
        </button>
      </p>
    </div>
  );
}
