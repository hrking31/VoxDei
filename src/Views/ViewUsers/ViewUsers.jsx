import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  UserPlusIcon,
  UsersIcon,
  UserIcon,
  PencilIcon,
} from "@heroicons/react/24/solid";
import { db, functions } from "../../Components/Firebase/Firebase";
import { getDocs, collection, query, where } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { useAuth } from "../../Components/Context/AuthContext";
import { useAppContext } from "../../Components/Context/AppContext";
import DatosIglesia from "../../Components/Iglesia/DatosIglesia.jsx";
import {
  ROLES_PASTORES,
  ROL_OPERADOR,
  ROL_POR_DEFECTO,
  esDuenoDeLaIglesia,
  esPastor,
  normalizarRol,
  rolDeLaPareja,
} from "../../Components/Roles/Roles.js";
import Footer from "../../Components/Footer/Footer.jsx";
import UserProfileCard from "../../Components/UserProfileCard/UserProfileCard.jsx";
import CampoClave from "../../Components/CampoClave/CampoClave.jsx";
import RequisitosClave from "../../Components/RequisitosClave/RequisitosClave.jsx";
import {
  AVISO_CLAVE_DEBIL,
  claveValida,
} from "../../Components/Validaciones/Validaciones.js";

export default function ViewUsers() {
  const { user, userData, loading, setLoading } = useAuth();
  const { showNotif, confirmAction } = useAppContext();
  const navigate = useNavigate();
  const refGenero = useRef(null);
  const genderOptions = ["Masculino", "Femenino"];
  const refRol = useRef(null);
  const [openDropdown, setOpenDropdown] = useState(null);
  // La vista está abierta a todos los roles, pero solo el pastor o la pastora
  // gestionan cuentas. El operador entra directo a la lista, sin pestaña Crear:
  // aquí solo consulta al equipo y puede eliminar su propia cuenta.
  const soyPastor = esPastor(userData);
  const [mode, setMode] = useState(soyPastor ? "create" : "users");
  const [groupUsers, setGroupUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newUser, setNewUser] = useState({
    name: "",
    gender: "",
    email: "",
    password: "",
    role: ROL_POR_DEFECTO,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Cambia para forzar que la lista del equipo se vuelva a leer
  const [recargar, setRecargar] = useState(0);

  // Quién registró la iglesia. Es el único que puede dar de alta a su pareja
  // pastoral y el único que puede eliminar cuentas.
  const soyElDueno = esDuenoDeLaIglesia(userData);

  // El rol que le falta a la pareja: si la iglesia la creó un pastor, la opción
  // que aparece es Pastora, y al revés.
  const rolPareja = rolDeLaPareja(userData?.role);
  const parejaYaExiste = groupUsers.some(
    (u) => normalizarRol(u.role) === rolPareja
  );

  // Mientras falte la pareja, el dueño puede elegir entre ella y Operador.
  // Una vez está, todo lo que se cree en adelante es Operador y el selector
  // desaparece.
  const rolesDisponibles =
    soyElDueno && !parejaYaExiste ? [rolPareja, ROL_OPERADOR] : [ROL_OPERADOR];
  const puedeElegirRol = rolesDisponibles.length > 1;

  // ¿Puedo eliminar a esta persona? Nunca a mí mismo ni a quien registró la
  // iglesia. A un pastor o pastora, solo si soy el dueño.
  const puedeEliminarA = (usuario) => {
    if (!usuario || !soyPastor) return false;
    if (usuario.id === userData?.uid) return false;
    if (usuario.id === usuario.groupId) return false;

    const esPareja = ROLES_PASTORES.includes(normalizarRol(usuario.role));
    return esPareja ? soyElDueno : true;
  };

  // Manejo inputs de creación
  const handleChange = ({ target: { name, value } }) => {
    setNewUser((prev) => ({ ...prev, [name]: value }));
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

  // Traduce a español lo que devuelven las funciones del servidor
  const traducirError = (err) => {
    const mensajes = {
      "auth/email-already-in-use": "El correo ya está registrado.",
      "auth/invalid-email": "Correo inválido.",
      "auth/weak-password": AVISO_CLAVE_DEBIL,
      unauthenticated: "Tu sesión expiró. Vuelve a iniciar sesión.",
      "permission-denied": "No tienes permiso para hacer esto.",
      "not-found": "El usuario ya no existe.",
    };

    return mensajes[err.code] || err.message || "Ocurrió un error inesperado.";
  };

  // Crear usuario a través del servidor.
  //
  // Va por el servidor a propósito: crear la cuenta desde el navegador iniciaba
  // sesión con el usuario recién creado y sacaba al pastor de su propia sesión.
  const handleCreate = async (e) => {
    e.preventDefault();

    if (
      !newUser.name?.trim() ||
      !newUser.email?.trim() ||
      !newUser.password?.trim() ||
      !newUser.role ||
      !newUser.gender
    ) {
      showNotif("error", "Por favor completa todos los campos.");
      return;
    }

    if (!claveValida(newUser.password)) {
      showNotif("error", AVISO_CLAVE_DEBIL);
      return;
    }

    setLoading(true);

    try {
      const crearUsuario = httpsCallable(functions, "crearUsuarioAdmin");
      await crearUsuario({
        name: newUser.name.trim(),
        email: newUser.email.trim(),
        password: newUser.password,
        role: newUser.role,
        gender: newUser.gender,
      });

      showNotif("success", "Usuario creado correctamente.");
      setNewUser({
        name: "",
        gender: "",
        email: "",
        password: "",
        role: ROL_POR_DEFECTO,
      });
      setRecargar((n) => n + 1);
    } catch (err) {
      console.error(err);
      showNotif("error", traducirError(err));
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

  //     showNotif("success", "Usuario eliminados con éxito");
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

  // Eliminar usuario a través del servidor: borra la cuenta de acceso, su
  // ficha y su foto. Hacerlo desde el navegador dejaba viva la cuenta.
  const handleDelete = async () => {
    // Se usa `id`, el identificador del documento, que es el mismo de la
    // cuenta de acceso.
    const uid = selectedUser?.id;

    if (!uid) {
      showNotif("error", "Usuario no válido.");
      return;
    }

    const accepted = await confirmAction(
      `¿Seguro que deseas eliminar la cuenta de ${selectedUser.email}?`
    );
    if (!accepted) return;

    setLoading(true);

    try {
      const eliminarUsuario = httpsCallable(functions, "eliminarUsuarioAdmin");
      await eliminarUsuario({ uid });

      showNotif("success", "Usuario eliminado correctamente");
      setSelectedUser(null);
      setRecargar((n) => n + 1);
    } catch (err) {
      console.error(err);
      showNotif("error", traducirError(err));
    } finally {
      setLoading(false);
    }
  };

  // Carga los usuarios
  useEffect(() => {
    // Se carga en los dos modos, no solo al listar: el formulario de creación
    // necesita saber si la pareja pastoral ya existe para ofrecer ese rol.
    const loadGroupUsers = async () => {
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
  }, [mode, userData, recargar]);

  return (
    <div className="min-h-pantalla flex flex-col bg-linear-to-b from-app-dark/50 to-app-light/50">
      {/* Titulo */}
      <div className="text-center mb-4">
        <h1 className="text-3xl sm:text-4xl font-bold text-app-main">
          Gestión de Usuarios
        </h1>
        {soyPastor && (
          <p className="text-app-muted">Crea, edita o elimina usuarios.</p>
        )}

        {/* Pestañas: solo quien gestiona cuentas puede crear */}
        {soyPastor && (
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
        )}
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
                  <CampoClave
                    name="password"
                    autoComplete="new-password"
                    placeholder="Contraseña"
                    value={newUser.password}
                    onChange={handleChange}
                    className="p-2 sm:p-3 border border-app-border focus:outline-none focus:ring-2 focus:ring-app-main transition rounded-lg text-app-muted"
                  />
                  <RequisitosClave clave={newUser.password} />

                  {/* Rol. El selector solo aparece mientras el dueño pueda dar
                      de alta a su pareja pastoral; después todo es Operador. */}
                  {puedeElegirRol && (
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
                        {rolesDisponibles.map((role) => (
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
                  )}

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

                {/* Los avisos ya no se pintan aquí: van por showNotif, que se
                    ve en cualquier pestaña. Este bloque solo aparecía en el
                    formulario de creación, así que los fallos al borrar o al
                    sincronizar permisos quedaban mudos. */}
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-col items-center justify-items-start w-full flex-1 py-4 px-2">
            <div className="flex flex-col items-center w-full flex-1 py-4 px-2 gap-3">
              {/* Nombre, sigla y logo de la iglesia: solo pastor y pastora */}
              {soyPastor && <DatosIglesia />}

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

                    {/* Ancho fijo: si no, "Operador" sale más ancho que "Pastor" */}
                    <span className="w-20 shrink-0 text-center text-[11px] bg-app-main/10 text-app-main py-1 rounded-full capitalize font-medium">
                      {user.role}
                    </span>

                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setIsModalOpen(true);
                      }}
                      className="p-2 rounded-full hover:bg-app-main transition"
                      aria-label={`Ver la ficha de ${user.name}`}
                    >
                      <PencilIcon className="w-6 h-6 text-app-muted hover:text-app-dark" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      <Footer />

      <UserProfileCard
        isModalOpen={isModalOpen}
        setIsModalOpen={setIsModalOpen}
        user={selectedUser}
        handleDelete={handleDelete}
        // Un pastor elimina operadores; a la pareja pastoral solo el dueño, y
        // al dueño nadie. El servidor lo vuelve a comprobar: esto solo evita
        // mostrar un botón que fallaría.
        puedeEliminar={puedeEliminarA(selectedUser)}
        // En la ficha propia, en vez de eliminar, se ofrece irse: lleva a la
        // pantalla que pide la contraseña (eliminarMiCuenta en el servidor).
        esMiCuenta={selectedUser?.id === user?.uid}
        onEliminarMiCuenta={() => navigate("/EliminarCuenta")}
        // La lista guarda su propia copia de las fichas: tras cambiar la foto
        // se recarga para que se vea también ahí.
        alCambiarFoto={() => setRecargar((n) => n + 1)}
      />
    </div>
  );
}
