// import { useState, useEffect } from "react";
// import { useNavigate } from "react-router-dom";
// import {
//   UserPlusIcon,
//   TrashIcon,
//   PencilSquareIcon,
// } from "@heroicons/react/24/solid";
// import { useAuth } from "../../Components/Context/AuthContext.jsx";
// import {
//   createUserWithEmailAndPassword,
//   updatePassword,
//   deleteUser,
//   onAuthStateChanged,
// } from "firebase/auth";
// import { auth } from "../../Components/Firebase/Firebase";

// export default function ViewUsers() {
//   const navigate = useNavigate();
//   const { user: currentUser } = useAuth();

//   const [user, setUser] = useState({ name: "", email: "", password: "" });
//   const [roleSeleccionado, setRoleSeleccionado] = useState("");
//   const [generoSeleccionado, setGeneroSeleccionado] = useState("");
//   const [editMode, setEditMode] = useState(false);
//   const [error, setError] = useState("");
//   const [message, setMessage] = useState("");
//   const [loading, setLoading] = useState(false);

//   const handleChange = ({ target: { name, value } }) => {
//     setUser((prev) => ({ ...prev, [name]: value }));
//     setError("");
//     setMessage("");
//   };

//   const handleCreate = async (event) => {
//     event.preventDefault();
//     setError("");
//     setMessage("");

//     if (!user.email || !user.password) {
//       setError("Por favor ingresa un correo y una contraseña.");
//       return;
//     }

//     setLoading(true);
//     try {
//       await createUserWithEmailAndPassword(auth, user.email, user.password);
//       setMessage("✅ Usuario creado exitosamente.");
//       setUser({ email: "", password: "" });
//     } catch (err) {
//       console.error(err.code);
//       const errorMessages = {
//         "auth/email-already-in-use": "El correo ya está registrado.",
//         "auth/invalid-email": "Correo inválido.",
//         "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.",
//       };
//       setError(errorMessages[err.code] || "Error al crear el usuario.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleEdit = async (event) => {
//     event.preventDefault();
//     setError("");
//     setMessage("");

//     if (!currentUser) {
//       setError("Debes iniciar sesión para editar un usuario.");
//       return;
//     }

//     if (!user.password) {
//       setError("Por favor ingresa una nueva contraseña.");
//       return;
//     }

//     setLoading(true);
//     try {
//       await updatePassword(currentUser, user.password);
//       setMessage("✅ Contraseña actualizada correctamente.");
//       setUser({ email: currentUser.email, password: "" });
//     } catch (err) {
//       console.error(err.code);
//       const errorMessages = {
//         "auth/requires-recent-login":
//           "Por seguridad, vuelve a iniciar sesión para cambiar la contraseña.",
//         "auth/weak-password":
//           "La nueva contraseña debe tener al menos 6 caracteres.",
//       };
//       setError(errorMessages[err.code] || "Error al actualizar la contraseña.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleDelete = async () => {
//     if (!currentUser) {
//       setError("Debes iniciar sesión para eliminar una cuenta.");
//       return;
//     }

//     const confirmDelete = window.confirm(
//       "¿Seguro que deseas eliminar tu cuenta? Esta acción no se puede deshacer."
//     );

//     if (!confirmDelete) return;

//     setLoading(true);
//     try {
//       await deleteUser(currentUser);
//       setMessage("✅ Cuenta eliminada correctamente.");
//       navigate("/"); // volver a inicio o login
//     } catch (err) {
//       console.error(err.code);
//       const errorMessages = {
//         "auth/requires-recent-login":
//           "Debes volver a iniciar sesión antes de eliminar tu cuenta.",
//       };
//       setError(errorMessages[err.code] || "Error al eliminar la cuenta.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     const unsubscribe = onAuthStateChanged(auth, (userData) => {
//       if (userData) {
//         setUser({ email: userData.email || "", password: "" });
//         setEditMode(true);
//       } else {
//         setUser({ email: "", password: "" });
//         setEditMode(false);
//       }
//     });
//     return () => unsubscribe();
//   }, []);

//   return (
//     <div className="relative flex flex-col items-center justify-center min-h-screen p-6 bg-app-dark">
//       {/* Encabezado */}
//       <div className="text-center mb-10">
//         <h1 className="text-3xl sm:text-4xl font-bold text-app-main tracking-tight">
//           {editMode ? "Editar Usuario" : "Crear Usuario"}
//         </h1>
//         <p className="text-app-muted text-base sm:text-lg mt-2">
//           {editMode
//             ? "Actualiza tu contraseña o elimina tu cuenta."
//             : "Registra una nueva cuenta de usuario."}
//         </p>
//       </div>

//       {/* Formulario */}
//       <div className="w-full max-w-sm bg-white rounded-2xl shadow-md p-8 border border-gray-100">
//         <form
//           onSubmit={editMode ? handleEdit : handleCreate}
//           className="flex flex-col gap-4"
//         >
//           <div className="flex flex-col">
//             <label className="text-sm font-medium text-app-main mb-1">
//               Correo electrónico
//             </label>
//             <input
//               type="email"
//               name="email"
//               placeholder="ejemplo@correo.com"
//               value={user.email}
//               onChange={handleChange}
//               disabled={editMode}
//               className={`p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-app-main transition text-app-muted ${
//                 editMode ? "bg-gray-100 cursor-not-allowed" : ""
//               }`}
//             />
//           </div>

//           <div className="flex flex-col">
//             <label className="text-sm font-medium text-app-main mb-1">
//               {editMode ? "Nueva contraseña" : "Contraseña"}
//             </label>
//             <input
//               type="password"
//               name="password"
//               placeholder="********"
//               value={user.password}
//               onChange={handleChange}
//               className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-app-main transition text-app-muted"
//             />
//           </div>

//           {error && (
//             <p className="text-red-500 text-center text-sm font-medium mt-2">
//               {error}
//             </p>
//           )}
//           {message && (
//             <p className="text-green-600 text-center text-sm font-medium mt-2">
//               {message}
//             </p>
//           )}

//           <button
//             type="submit"
//             disabled={loading}
//             className={`flex items-center justify-center gap-2 ${
//               editMode
//                 ? "bg-yellow-500 hover:bg-yellow-600"
//                 : "bg-app-main hover:bg-app-main/90"
//             } text-white py-3 rounded-lg font-semibold transition mt-4 ${
//               loading ? "opacity-70 cursor-not-allowed" : ""
//             }`}
//           >
//             {editMode ? (
//               <>
//                 <PencilSquareIcon className="w-5 h-5" />
//                 {loading ? "Actualizando..." : "Actualizar contraseña"}
//               </>
//             ) : (
//               <>
//                 <UserPlusIcon className="w-5 h-5" />
//                 {loading ? "Creando..." : "Crear usuario"}
//               </>
//             )}
//           </button>
//         </form>

//         {editMode && (
//           <button
//             onClick={handleDelete}
//             disabled={loading}
//             className="flex items-center justify-center gap-2 bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition mt-4 w-full"
//           >
//             <TrashIcon className="w-5 h-5" />
//             Eliminar cuenta
//           </button>
//         )}

//         <p className="text-center text-sm text-app-muted mt-4">
//           {editMode ? "¿Quieres cerrar sesión?" : "¿Ya tienes una cuenta?"}
//           <button
//             onClick={() => navigate(editMode ? "/" : "/ViewLogin")}
//             className="text-app-main hover:underline ml-1"
//           >
//             {editMode ? "Cerrar sesión" : "Iniciar sesión"}
//           </button>
//         </p>
//       </div>
//     </div>
//   );
// }

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserPlusIcon, TrashIcon } from "@heroicons/react/24/solid";
import { useAuth } from "../../Components/Context/AuthContext.jsx";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  deleteUser,
} from "firebase/auth";
import { auth, db } from "../../Components/Firebase/Firebase";
import { doc, setDoc, deleteDoc } from "firebase/firestore";

export default function ViewUsers() {
  const navigate = useNavigate();
  const { user: adminUser } = useAuth(); // usuario actual (admin)

  const [mode, setMode] = useState("create"); // "create" o "delete"

  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    role: "",
    gender: "",
  });

  const [deleteData, setDeleteData] = useState({
    email: "",
    password: "",
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Manejar inputs de creación y eliminación
  const handleChange = ({ target: { name, value } }) => {
    if (mode === "create") setNewUser((prev) => ({ ...prev, [name]: value }));
    else setDeleteData((prev) => ({ ...prev, [name]: value }));

    setError("");
    setMessage("");
  };

  // 🔹 Crear usuario y guardar datos en Firestore
  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (
      !newUser.email ||
      !newUser.password ||
      !newUser.role ||
      !newUser.gender
    ) {
      setError("Por favor completa todos los campos.");
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        newUser.email,
        newUser.password
      );
      const createdUser = userCredential.user;

      // Guardar información adicional
      await setDoc(doc(db, "users", createdUser.uid), {
        email: newUser.email,
        role: newUser.role,
        gender: newUser.gender,
        createdAt: new Date(),
      });

      setMessage("✅ Usuario creado y guardado correctamente.");
      setNewUser({ email: "", password: "", role: "", gender: "" });

      // Reautenticar admin
      const adminPassword = prompt(
        "Confirma tu contraseña de administrador para continuar:"
      );
      if (adminPassword) {
        await signInWithEmailAndPassword(auth, adminUser.email, adminPassword);
      }
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

  // 🔹 Eliminar usuario (Auth + Firestore)
  const handleDelete = async (e) => {
    e.preventDefault();
    if (!deleteData.email || !deleteData.password) {
      setError("Debes ingresar el correo y contraseña del usuario a eliminar.");
      return;
    }

    const confirmDelete = window.confirm(
      `¿Seguro que deseas eliminar la cuenta de ${deleteData.email}? Esta acción no se puede deshacer.`
    );
    if (!confirmDelete) return;

    setLoading(true);
    try {
      const adminEmail = adminUser.email;
      const userCredential = await signInWithEmailAndPassword(
        auth,
        deleteData.email,
        deleteData.password
      );
      const userToDelete = userCredential.user;

      await deleteDoc(doc(db, "users", userToDelete.uid));
      await deleteUser(userToDelete);

      setMessage("✅ Usuario eliminado correctamente de Firebase y Firestore.");
      setDeleteData({ email: "", password: "" });

      // Reautenticar admin
      const adminPassword = prompt("Confirma tu contraseña de administrador:");
      if (adminPassword) {
        await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
      }
    } catch (err) {
      console.error(err.code);
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

      {/* Card principal unificada */}
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-md p-8 border border-gray-200">
        {/* Selector de modo */}
        <div className="flex justify-center gap-3 mb-6">
          <button
            onClick={() => setMode("create")}
            className={`px-4 py-2 rounded-full font-semibold transition ${
              mode === "create"
                ? "bg-app-main text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Crear usuario
          </button>
          <button
            onClick={() => setMode("delete")}
            className={`px-4 py-2 rounded-full font-semibold transition ${
              mode === "delete"
                ? "bg-red-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Eliminar usuario
          </button>
        </div>

        {/* Formulario dinámico */}
        {mode === "create" ? (
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <input
              type="email"
              name="email"
              placeholder="Correo electrónico"
              value={newUser.email}
              onChange={handleChange}
              className="p-3 border border-gray-300 rounded-lg"
            />
            <input
              type="password"
              name="password"
              placeholder="Contraseña"
              value={newUser.password}
              onChange={handleChange}
              className="p-3 border border-gray-300 rounded-lg"
            />
            <select
              name="role"
              value={newUser.role}
              onChange={handleChange}
              className="p-3 border border-gray-300 rounded-lg"
            >
              <option value="">Selecciona un rol</option>
              <option value="pastor">Pastor</option>
              <option value="pastora">Pastora</option>
              <option value="asistente">Asistente</option>
            </select>
            <select
              name="gender"
              value={newUser.gender}
              onChange={handleChange}
              className="p-3 border border-gray-300 rounded-lg"
            >
              <option value="">Selecciona un género</option>
              <option value="masculino">Masculino</option>
              <option value="femenino">Femenino</option>
            </select>

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
          <form onSubmit={handleDelete} className="flex flex-col gap-4">
            <input
              type="email"
              name="email"
              placeholder="Correo del usuario a eliminar"
              value={deleteData.email}
              onChange={handleChange}
              className="p-3 border border-gray-300 rounded-lg"
            />
            <input
              type="password"
              name="password"
              placeholder="Contraseña del usuario"
              value={deleteData.password}
              onChange={handleChange}
              className="p-3 border border-gray-300 rounded-lg"
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

      {/* Cerrar sesión */}
      <p className="text-center text-sm text-app-muted mt-4">
        ¿Deseas cerrar sesión?
        <button
          onClick={() => navigate("/")}
          className="text-app-main hover:underline ml-1"
        >
          Cerrar sesión
        </button>
      </p>
    </div>
  );
}

