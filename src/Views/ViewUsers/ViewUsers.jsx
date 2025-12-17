// import { useState, useEffect, useRef } from "react";
// import { useNavigate } from "react-router-dom";
// import {
//   UserPlusIcon,
//   TrashIcon,
//   XMarkIcon,
//   UserIcon,
// } from "@heroicons/react/24/solid";
// import { db, storage } from "../../Components/Firebase/Firebase";
// import { doc, setDoc, getDoc, deleteDoc } from "firebase/firestore";
// import { ref, deleteObject } from "firebase/storage";
// import { deleteUser } from "firebase/auth";
// import { useAuth } from "../../Components/Context/AuthContext.jsx";
// import { useAppContext } from "../../Components/Context/AppContext";
// import Footer from "../../Components/Footer/Footer.jsx";
// import UserProfileCard from "../../Components/UserProfileCard/UserProfileCard.jsx";

// export default function ViewUsers() {
//   const { signup, login, userData, loading, setLoading } = useAuth();
//   const { showNotif, confirmAction } = useAppContext();
//   const navigate = useNavigate();
//   const refGenero = useRef(null);
//   const genderOptions = ["Masculino", "Femenino"];
//   const refRol = useRef(null);
//   const roleOptions = ["Pastor", "Pastora", "Asistente", "administrador"];
//   const [openDropdown, setOpenDropdown] = useState(null); // "genero" o "rol"
//   const [mode, setMode] = useState("create"); // "create" o "delete"
//   const [newUser, setNewUser] = useState({
//     name: "",
//     gender: "",
//     email: "",
//     password: "",
//     role: "",
//   });

//   const [deleteData, setDeleteData] = useState({
//     email: "",
//     password: "",
//   });

//   const [message, setMessage] = useState("");
//   const [error, setError] = useState("");

//   // Manejo inputs de creación y eliminación
//   const handleChange = ({ target: { name, value } }) => {
//     if (mode === "create") setNewUser((prev) => ({ ...prev, [name]: value }));
//     else setDeleteData((prev) => ({ ...prev, [name]: value }));

//     setError("");
//     setMessage("");
//   };

//   // Alternar dropdowns
//   const toggleDropdown = (name) => {
//     setOpenDropdown(openDropdown === name ? null : name);
//   };

//   // Cerrar al hacer clic fuera
//   useEffect(() => {
//     function handleClickOutside(event) {
//       if (
//         refGenero.current &&
//         !refGenero.current.contains(event.target) &&
//         refRol.current &&
//         !refRol.current.contains(event.target)
//       ) {
//         setOpenDropdown(null);
//       }
//     }

//     document.addEventListener("mousedown", handleClickOutside);
//     return () => document.removeEventListener("mousedown", handleClickOutside);
//   }, []);

//   // Crear usuario y guardar datos en Firestore
//   const handleCreate = async (e) => {
//     e.preventDefault();

//     // Limpiar mensajes previos
//     setError("");

//     if (
//       !newUser.name?.trim() ||
//       !newUser.email?.trim() ||
//       !newUser.password?.trim() ||
//       !newUser.role ||
//       !newUser.gender
//     ) {
//       setError("Por favor completa todos los campos.");
//       return;
//     }

//     setLoading(true);

//     try {
//       const userCredential = await signup(newUser.email, newUser.password);
//       const uid = userCredential.user.uid;

//       // Guardar información adicional
//       await setDoc(doc(db, "users", uid), {
//         name: newUser.name,
//         gender: newUser.gender,
//         email: newUser.email,
//         role: newUser.role,
//         churchName: userData.churchName,
//         groupId: userData.groupId,
//         createdAt: new Date(),
//       });

//       showNotif("success", "✅ Usuario creado correctamente.");
//     } catch (err) {
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

//   // Eliminar usuario Auth y Firestore
//   const handleDelete = async (e) => {
//     e.preventDefault();
//     setError("");

//     if (!deleteData.email || !deleteData.password) {
//       setError("Debes ingresar el correo y contraseña del usuario a eliminar.");
//       return;
//     }

//     // Espera respuesta del usuario
//     const accepted = await confirmAction(
//       `¿Seguro que deseas eliminar la cuenta de ${deleteData.email}?`
//     );
//     if (!accepted) return;

//     setLoading(true);

//     try {
//       setLoading(true);
//       const userCredential = await login(deleteData.email, deleteData.password);
//       const userToDelete = userCredential.user;

//       // Obtiene datos del usuario desde Firestore
//       const userRef = doc(db, "users", userToDelete.uid);
//       const userSnap = await getDoc(userRef);

//       // 🔴 Eliminar imagen del STORAGE
//       if (userSnap.exists() && userSnap.data().photo) {
//         const imageUrl = userSnap.data().photo;

//         try {
//           const imageRef = ref(storage, imageUrl);
//           await deleteObject(imageRef);
//           console.log("✅ Imagen eliminada del storage");
//         } catch (error) {
//           console.warn("⚠ No se pudo eliminar la imagen:", error.message);
//         }
//       }

//       // 🔴 Eliminar documento de Firestore
//       await deleteDoc(userRef);

//       // 🔴 Eliminar usuario de Authentication
//       await deleteUser(userToDelete);

//       showNotif("success", "✅ Usuario eliminados con éxito");
//       setDeleteData({ email: "", password: "" });
//     } catch (err) {
//       const errorMessages = {
//         "auth/user-not-found": "No se encontró una cuenta con ese correo.",
//         "auth/wrong-password": "Contraseña incorrecta.",
//         "auth/invalid-email": "Correo inválido.",
//         "auth/too-many-requests":
//           "Demasiados intentos fallidos. Intenta de nuevo más tarde.",
//       };

//       setError(errorMessages[err.code] || "Error al eliminar el usuario.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="relative flex flex-col items-center justify-between min-h-screen bg-linear-to-b from-app-dark/50 to-app-light/50 px-6 border">
//       <div className="text-center">
//         <h1 className="text-3xl sm:text-4xl font-bold text-app-main border">
//           Gestión de Usuarios
//         </h1>
//         <p className="text-app-muted text-base sm:text-lg mt-2 border">
//           Crea, edita o elimina usuarios.
//         </p>
//       </div>

//       {/* Pestañas */}
//       <div className="flex justify-center gap-10 border">
//         <button
//           onClick={() => {
//             setMode("create"), setError(""), setMessage("");
//           }}
//           className={`relative pb-2 font-semibold transition ${
//             mode === "create"
//               ? "text-app-main after:content-[''] after:absolute after:left-0 after:bottom-0 after:w-full after:h-[2px] after:bg-app-main"
//               : "border-transparent text-app-muted hover:text-app-main"
//           }`}
//         >
//           Crear usuario
//         </button>

//         <button
//           onClick={() => {
//             setMode("delete"), setError(""), setMessage("");
//           }}
//           className={`relative pb-2 font-semibold transition ${
//             mode === "delete"
//               ? "text-app-error after:content-[''] after:absolute after:left-0 after:bottom-0 after:w-full after:h-[2px] after:bg-app-error"
//               : "border-transparent text-app-muted hover:text-red-600"
//           }`}
//         >
//           Usuario
//         </button>
//       </div>

//       {/* Contenido dinámico */}
//       {mode === "create" ? (
//         <>
//           <div className="w-full max-w-sm bg-app-light rounded-2xl shadow-md px-8 pb-8 pt-4 border border-app-border">
//             {/* Crear usuario */}
//             <form
//               onSubmit={handleCreate}
//               noValidate
//               className="flex flex-col form-dark gap-4"
//             >
//               <input
//                 type="Nombre"
//                 name="name"
//                 placeholder="Nombre del usuario"
//                 value={newUser.name}
//                 onChange={handleChange}
//                 className="p-3 border border-app-border focus:outline-none focus:ring-2 focus:ring-app-main transition rounded-lg text-app-muted"
//               />
//               {/* Dropdowns para genero */}
//               <div ref={refGenero} className="relative">
//                 <button
//                   type="button"
//                   onClick={() => toggleDropdown("genero")}
//                   className="w-full p-3 border border-app-border focus:outline-none focus:ring-2 focus:ring-app-main transition rounded-lg text-app-muted text-left bg-app-light"
//                 >
//                   {newUser.gender || "Selecciona un género"}
//                 </button>

//                 {openDropdown === "genero" && (
//                   <ul
//                     className="
//                   absolute
//                   left-0
//                   right-0
//                   top-full
//                   mt-1
//                   bg-app-light
//                   border-2 border-app-border
//                   rounded-lg
//                   shadow-lg
//                   max-h-64
//                   overflow-y-auto
//                   z-20
//                   text-app-muted
//                   text-sm sm:text-base
//                   scrollbar-custo
//                 "
//                   >
//                     {genderOptions.map((option) => (
//                       <li
//                         key={option}
//                         onClick={() => {
//                           setNewUser((prev) => ({ ...prev, gender: option }));
//                           setOpenDropdown(null);
//                         }}
//   className="px-4 py-2 cursor-pointer hover:bg-app-main hover:text-white transition-colors duration-200"
// >
//                         {option}
//                       </li>
//                     ))}
//                   </ul>
//                 )}
//               </div>
//               <input
//                 type="email"
//                 name="email"
//                 placeholder="Correo electrónico"
//                 value={newUser.email}
//                 onChange={handleChange}
//   className="p-3 border border-app-border focus:outline-none focus:ring-2 focus:ring-app-main transition rounded-lg text-app-muted"
// />
//               <input
//                 type="password"
//                 name="password"
//                 placeholder="Contraseña"
//                 value={newUser.password}
//                 onChange={handleChange}
//   className="p-3 border border-app-border focus:outline-none focus:ring-2 focus:ring-app-main transition rounded-lg text-app-muted"
// />
//               {/* Dropdowns para rol */}
//               <div ref={refRol} className="relative">
//                 <button
//                   type="button"
//                   onClick={() => toggleDropdown("rol")}
//   className="w-full p-3 border border-app-border focus:outline-none focus:ring-2 focus:ring-app-main transition rounded-lg text-app-muted text-left bg-app-light"
// >
//                   {newUser.role || "Selecciona un rol"}
//                 </button>
//                 {openDropdown === "rol" && (
//                   <ul
//                     className="
//                   absolute
//                   left-0
//                   right-0
//                   top-full
//                   mt-1
//                   bg-app-light
//                   border-2 border-app-border
//                   rounded-lg
//                   shadow-lg
//                   max-h-64
//                   overflow-y-auto
//                   z-20
//                   text-app-muted
//                   text-sm sm:text-base
//                   scrollbar-custom
//                 "
//                   >
//                     {roleOptions.map((roleOptions) => (
//                       <li
//                         key={roleOptions}
//                         onClick={() => {
//                           setNewUser((prev) => ({
//                             ...prev,
//                             role: roleOptions,
//                           }));
//                           setOpenDropdown(null);
//                         }}
//                         className="px-4 py-2 cursor-pointer hover:bg-app-main hover:text-white transition-colors duration-200"
//                       >
//                         {roleOptions}
//                       </li>
//                     ))}
//                   </ul>
//                 )}
//               </div>

//               <button
//                 type="submit"
//                 disabled={loading}
//                 className={`flex items-center justify-center gap-2 bg-app-main text-white py-3 rounded-lg font-semibold hover:bg-app-main/90 transition ${
//                   loading ? "opacity-70 cursor-not-allowed" : ""
//                 }`}
//               >
//                 <UserPlusIcon className="w-5 h-5" />
//                 {loading ? "Creando..." : "Crear usuario"}
//               </button>
//             </form>

//             {/* Mensajes */}
//             {(error || message) && (
//               <p
//                 className={`text-center text-sm font-medium mt-4 ${
//                   error ? "text-red-500" : "text-green-600"
//                 }`}
//               >
//                 {error || message}
//               </p>
//             )}
//           </div>
//         </>
//       ) : (
//         <>
//           <div className="flex items-center gap-3 w-full max-w-3xl border border-app-border rounded-full px-4 py-2 mt-4 mb-8 hover:shadow-inner hover:shadow-app-muted transition-shadow duration-300">
//             {userData.photo ? (
//               <img
//                 src={userData.photo}
//                 alt="user"
//                 className="w-10 h-10 rounded-full object-cover"
//               />
//             ) : (
//               <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
//                 <UserIcon className="w-5 h-5 text-gray-500" />
//               </div>
//             )}
//             <div className="flex flex-col flex-1 leading-tight">
//               <span className="text-sm font-medium text-app-main">
//                 {userData.name || "Usuario"}
//               </span>
//               <span className="text-[11px] text-app-muted">
//                 {userData.email || userData.role || ""}
//               </span>
//             </div>

//             <span className="text-[11px] bg-app-main/10 text-app-main px-3 py-1 rounded-full capitalize font-medium">
//               {userData.role || "Sin rol"}
//             </span>
//             <button
//               // onClick={handlerLogout}
//               className="p-2 rounded-full hover:bg-app-main transition"
//               aria-label="Cerrar"
//             >
//               <XMarkIcon className="w-6 h-6 text-app-muted hover:text-app-dark" />
//             </button>
//           </div>
//         </>
//       )}

//       {/* gresar a vista selector */}
//       <p className="text-center text-sm text-app-muted mt-4">
//         ¿Regresar al inicio?
//         <button
//           onClick={() => navigate("/ViewSelector")}
//           className="text-app-main hover:underline ml-1"
//         >
//           Inicio
//         </button>
//       </p>
//       <Footer />
//     </div>
//   );
// }

import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  UserPlusIcon,
  UsersIcon,
  UserIcon,
  PencilIcon,
} from "@heroicons/react/24/solid";
import { db, storage } from "../../Components/Firebase/Firebase";
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  collection,
  query,
  where,
} from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { deleteUser } from "firebase/auth";
import { useAuth } from "../../Components/Context/AuthContext.jsx";
import { useAppContext } from "../../Components/Context/AppContext";
import Footer from "../../Components/Footer/Footer.jsx";
import UserProfileCard from "../../Components/UserProfileCard/UserProfileCard.jsx";

export default function ViewUsers() {
  const { signup, login, userData, loading, setLoading } = useAuth();
  const { showNotif, confirmAction } = useAppContext();
  const navigate = useNavigate();
  const refGenero = useRef(null);
  const genderOptions = ["Masculino", "Femenino"];
  const refRol = useRef(null);
  const roleOptions = ["Pastor", "Pastora", "Asistente", "administrador"];
  const [openDropdown, setOpenDropdown] = useState(null);
  const [mode, setMode] = useState("create");
  const [groupUsers, setGroupUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
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
  const [isModalOpen, setIsModalOpen] = useState(false);

  console.log("user",selectedUser);

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
    setError(""); // Limpiar mensajes previos

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
  // const handleDelete = async (e) => {
  //   e.preventDefault();
  //   setError("");

  //   if (!deleteData.email || !deleteData.password) {
  //     setError("Debes ingresar el correo y contraseña del usuario a eliminar.");
  //     return;
  //   }

  //   // Espera respuesta del usuario
  //   const accepted = await confirmAction(
  //     `¿Seguro que deseas eliminar la cuenta de ${deleteData.email}?`
  //   );
  //   if (!accepted) return;

  //   setLoading(true);

  //   try {
  //     const userCredential = await login(deleteData.email, deleteData.password);
  //     const userToDelete = userCredential.user;

  //     // Obtiene datos del usuario desde Firestore
  //     const userRef = doc(db, "users", userToDelete.uid);
  //     const userSnap = await getDoc(userRef);

  //     // Eliminar imagen del STORAGE
  //     if (userSnap.exists() && userSnap.data().photo) {
  //       const imageUrl = userSnap.data().photo;
  //       try {
  //         const imageRef = ref(storage, imageUrl);
  //         await deleteObject(imageRef);
  //       } catch (error) {}
  //     }

  //     await deleteDoc(userRef); // Eliminar documento de Firestore
  //     await deleteUser(userToDelete); // Eliminar usuario de Authentication

  //     showNotif("success", "✅ Usuario eliminados con éxito");
  //     setDeleteData({ email: "", password: "" });
  //   } catch (err) {
  //     const errorMessages = {
  //       "auth/user-not-found": "No se encontró una cuenta con ese correo.",
  //       "auth/wrong-password": "Contraseña incorrecta.",
  //       "auth/invalid-email": "Correo inválido.",
  //       "auth/too-many-requests":
  //         "Demasiados intentos fallidos. Intenta de nuevo más tarde.",
  //     };

  //     setError(errorMessages[err.code] || "Error al eliminar el usuario.");
  //   } finally {
  //     setLoading(false);
  //   }
  // };

const handleDelete = async () => {
  if (!selectedUser?.uid) {
    setError("Usuario no válido.");
    return;
  }

  const accepted = await confirmAction(
    `¿Seguro que deseas eliminar la cuenta de ${selectedUser.email}?`
  );
  if (!accepted) return;

  setLoading(true);
  setError("");

  try {
    //  Referencia al usuario correcto
    const userRef = doc(db, "users", selectedUser.uid);
    const userSnap = await getDoc(userRef);

    //  Eliminar imagen si existe
    if (userSnap.exists() && userSnap.data()?.photo) {
      try {
        const imageRef = ref(storage, userSnap.data().photo);
        await deleteObject(imageRef);
      } catch (err) {
        console.warn("No se pudo borrar la imagen", err);
      }
    }

    // Eliminar documento Firestore
    await deleteDoc(userRef);

    showNotif("success", "✅ Usuario eliminado correctamente");

    //  Limpiar selección
    setSelectedUser(null);
  } catch (err) {
    console.error(err);
    setError("Error al eliminar el usuario.");
  } finally {
    setLoading(false);
  }
};

  // Carga los usuarios
  useEffect(() => {
    const loadGroupUsers = async () => {
      if (mode !== "users") return;
      if (!userData?.groupId) return;

      try {
        const q = query(
          collection(db, "users"),
          where("groupId", "==", userData.groupId)
        );

        const querySnapshot = await getDocs(q);

        const users = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setGroupUsers(users);
      } catch (error) {
        console.error("Error cargando usuarios del grupo:", error);
      }
    };

    loadGroupUsers();
  }, [mode, userData]);

  return (
    <div className="min-h-svh flex flex-col bg-linear-to-b from-app-dark/50 to-app-light/50">
      {/* Titulo */}
      <div className="text-center mb-4">
        <h1 className="text-3xl sm:text-4xl font-bold text-app-main">
          Gestión de Usuarios
        </h1>
        <p className="text-app-muted">Crea, edita o elimina usuarios.</p>

        {/* Pestañas */}
        <div className="flex justify-center items-center w-full">
          <div className="relative bg-app-light shadow-md p-1.5 flex items-center border-2 border-app-border w-full max-w-xs overflow-hidden">
            {/* Fondo animado */}
            <motion.div
              layout
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 22,
              }}
              className={`
        absolute top-1 bottom-1 w-1/2 
        ${mode === "create" ? "bg-app-main" : "bg-app-error"}
      `}
              style={{
                left: mode === "create" ? "4px" : "calc(50% - 4px)",
              }}
            />

            {/* Crear */}
            <button
              onClick={() => setMode("create")}
              className={`
        relative z-10 w-1/2 py-2 font-semibold flex items-center justify-center gap-1.5
        text-xs transition-all duration-300
        ${
          mode === "create" ? "text-white" : "text-gray-600 hover:text-app-main"
        }
      `}
            >
              <UserPlusIcon className="w-4 h-4" />
              Crear
            </button>

            {/* Usuarios */}
            <button
              onClick={() => setMode("users")}
              className={`
        relative z-10 w-1/2 py-2 font-semibold flex items-center justify-center gap-1.5
        text-xs transition-all duration-300
        ${mode === "users" ? "text-white" : "text-gray-600 hover:text-red-600"}
      `}
            >
              <UsersIcon className="w-4 h-4" />
              Usuarios
            </button>
          </div>
        </div>
      </div>

      {/* Contenido dinámico */}
      {mode === "create" ? (
        <>
          <div className="flex-1 flex items-center justify-center px-4">
            <div className="w-full max-w-md space-y-4">
              <div className="w-full max-w-md bg-app-light border-2 border-app-border shadow-xl p-3 sm:p-5">
                {/* Crear usuario */}
                <form
                  onSubmit={handleCreate}
                  noValidate
                  className="flex flex-col form-dark gap-3.5 sm:gap-4"
                >
                  {/* Input nombre */}
                  <input
                    type="Nombre"
                    name="name"
                    placeholder="Nombre del usuario"
                    value={newUser.name}
                    onChange={handleChange}
                    className="p-2 sm:p-3 border border-app-border focus:outline-none focus:ring-2 focus:ring-app-main transition rounded-lg text-app-muted"
                  />

                  {/* Dropdowns para genero */}
                  <div ref={refGenero} className="relative">
                    <button
                      type="button"
                      onClick={() => toggleDropdown("genero")}
                      className="w-full p-2 sm:p-3 border border-app-border focus:outline-none focus:ring-2 focus:ring-app-main transition rounded-lg text-app-muted text-left bg-app-light"
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
                              setNewUser((prev) => ({
                                ...prev,
                                gender: option,
                              }));
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

                  {/* Input email */}
                  <input
                    type="email"
                    name="email"
                    placeholder="Correo electrónico"
                    value={newUser.email}
                    onChange={handleChange}
                    className="p-2 sm:p-3 border border-app-border focus:outline-none focus:ring-2 focus:ring-app-main transition rounded-lg text-app-muted"
                  />

                  {/* Input contrseña */}
                  <input
                    type="password"
                    name="password"
                    placeholder="Contraseña"
                    value={newUser.password}
                    onChange={handleChange}
                    className="p-2 sm:p-3 border border-app-border focus:outline-none focus:ring-2 focus:ring-app-main transition rounded-lg text-app-muted"
                  />

                  {/* Dropdowns para rol */}
                  <div ref={refRol} className="relative">
                    <button
                      type="button"
                      onClick={() => toggleDropdown("rol")}
                      className="w-full p-2 sm:p-3 border border-app-border focus:outline-none focus:ring-2 focus:ring-app-main transition rounded-lg text-app-muted text-left bg-app-light"
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
                        {roleOptions.map((role) => (
                          <li
                            key={role}
                            onClick={() => {
                              setNewUser((prev) => ({ ...prev, role }));
                              setOpenDropdown(null);
                            }}
                            className="px-4 py-2 cursor-pointer hover:bg-app-main hover:text-white transition-colors duration-200"
                          >
                            {role}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Boton crear usuario */}
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

              {/* Boton inicio */}
              <div className="w-full max-w-md bg-app-light px-8 border-2 border-app-border shadow-xl p-6 sm:p-8 text-center">
                <p className="text-app-muted">
                  ¿Regresar al inicio?
                  <button
                    onClick={() => navigate("/Viewgestion")}
                    className="text-app-main font-semibold hover:underline ml-1"
                  >
                    Inicio
                  </button>
                </p>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-col items-center justify-items-start w-full flex-1 py-4 px-2">
            <div className="flex flex-col items-center w-full flex-1 py-4 px-2 gap-3">
              {groupUsers.length === 0 ? (
                <p className="text-app-muted text-sm">
                  No hay usuarios en este grupo
                </p>
              ) : (
                groupUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 w-full max-w-3xl border border-app-border rounded-full px-3 py-2 hover:shadow-inner transition"
                  >
                    {user.photo ? (
                      <img
                        src={user.photo}
                        alt={user.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <UserIcon className="w-5 h-5 text-gray-500" />
                      </div>
                    )}

                    <div className="flex flex-col flex-1 leading-tight">
                      <span className="text-sm font-medium text-app-main">
                        {user.name}
                      </span>
                      <span className="text-[11px] text-app-muted">
                        {user.email}
                      </span>
                    </div>

                    <span className="text-[11px] bg-app-main/10 text-app-main px-3 py-1 rounded-full capitalize font-medium">
                      {user.role}
                    </span>

                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setIsModalOpen(true);
                      }}
                      className="p-2 rounded-full hover:bg-app-main transition"
                      aria-label="Cerrar"
                    >
                      <PencilIcon className="w-6 h-6 text-app-muted hover:text-app-dark" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Boton inicio */}
          <div className="flex justify-center items-center mt-auto px-4 pb-10">
            <p className="text-app-muted">
              ¿Regresar al inicio?
              <button
                onClick={() => navigate("/ViewGestion")}
                className="text-app-main font-semibold hover:underline ml-1"
              >
                Inicio
              </button>
            </p>
          </div>
        </>
      )}

      <Footer />

      <UserProfileCard
        isModalOpen={isModalOpen}
        setIsModalOpen={setIsModalOpen}
        user={selectedUser}
        handleDelete={handleDelete}
      />
    </div>
  );
}
