import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { UserPlusIcon, ChevronDownIcon } from "@heroicons/react/24/solid";
import LogoDeLaIglesia from "../../Components/Logo/LogoDeLaIglesia.jsx";
import { db, functions } from "../../Components/Firebase/Firebase";
import { getDocs, collection, query, where } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { useAuth } from "../../Components/Context/AuthContext";
import { useAppContext } from "../../Components/Context/AppContext";
import DatosIglesia from "../../Components/Iglesia/DatosIglesia.jsx";
import { datosDeIglesia } from "../../Components/Iglesia/datosIglesia.js";
import FilaPersona from "../../Components/Usuarios/FilaPersona.jsx";
import PanelNuevaPersona from "../../Components/Usuarios/PanelNuevaPersona.jsx";
import { agruparEquipo } from "../../Components/Usuarios/utilesUsuarios.js";
import {
  ROLES_PASTORES,
  ROL_LIDER,
  ROL_OPERADOR,
  ROL_POR_DEFECTO,
  esDuenoDeLaIglesia,
  esPastor,
  normalizarRol,
  rolDeLaPareja,
} from "../../Components/Roles/Roles.js";
import Footer from "../../Components/Footer/Footer.jsx";
import UserProfileCard from "../../Components/UserProfileCard/UserProfileCard.jsx";
import {
  AVISO_CLAVE_DEBIL,
  claveValida,
} from "../../Components/Validaciones/Validaciones.js";

export default function ViewUsers() {
  const { user, userData, loading, setLoading } = useAuth();
  const { showNotif, confirmAction, iglesia } = useAppContext();
  const navigate = useNavigate();
  // La vista está abierta a todos los roles, pero solo el pastor o la pastora
  // gestionan cuentas. El operador ve la lista, sin el botón de añadir: aquí
  // solo consulta al equipo y puede eliminar su propia cuenta.
  const soyPastor = esPastor(userData);
  const [panelAbierto, setPanelAbierto] = useState(false);
  const cerrarPanel = useCallback(() => setPanelAbierto(false), []);
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

  // Todo pastor puede crear Operadores y Líderes (25-11-2026). Mientras falte la
  // pareja pastoral, el dueño puede elegir además a ella.
  const rolesDisponibles =
    soyElDueno && !parejaYaExiste
      ? [rolPareja, ROL_LIDER, ROL_OPERADOR]
      : [ROL_LIDER, ROL_OPERADOR];
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
      setPanelAbierto(false);
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
    // La lista también decide si el formulario de creación ofrece el rol de la
    // pareja pastoral (solo mientras no exista).
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
  }, [userData, recargar]);

  const { pastores, equipo } = agruparEquipo(groupUsers);
  const datosIgl = datosDeIglesia(iglesia, userData);
  const abrirFicha = (persona) => {
    setSelectedUser(persona);
    setIsModalOpen(true);
  };

  const Grupo = ({ titulo, personas }) =>
    personas.length > 0 && (
      <section aria-label={titulo} className="flex flex-col gap-2">
        <h2 className="flex items-center gap-2 px-1 text-xs font-bold uppercase tracking-wide text-app-muted">
          {titulo}
          <span className="rounded-full bg-app-border px-1.5 text-pie font-semibold text-app-texto">{personas.length}</span>
        </h2>
        <ul className="grid gap-2 lg:grid-cols-2">
          {personas.map((persona) => (
            <FilaPersona key={persona.id} usuario={persona} miUid={user?.uid} alAbrir={abrirFicha} />
          ))}
        </ul>
      </section>
    );

  return (
    <div className="min-h-pantalla flex flex-col bg-linear-to-b from-app-dark/50 to-app-light/50">
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-5 p-3 sm:p-5">
        {/* Cabecera: la iglesia, cuánta gente tiene y el botón de añadir */}
        <header className="flex items-center gap-3 rounded-2xl border border-app-border bg-app-light p-3 sm:p-4">
          <LogoDeLaIglesia alt="" className="h-14 w-14 shrink-0 rounded-xl bg-app-dark ring-2 ring-app-main" />
          <div className="flex min-w-0 flex-1 flex-col leading-tight">
            <h1 className="truncate text-lg font-bold text-app-texto lg:text-2xl">
              {datosIgl.nombre || "Mi iglesia"}
            </h1>
            <p className="text-sm text-app-muted" data-contador-personas>
              {groupUsers.length === 1 ? "1 persona" : `${groupUsers.length} personas`}
              {datosIgl.sigla && <span className="text-app-main"> · {datosIgl.sigla}</span>}
            </p>
          </div>
          {soyPastor && (
            <button
              type="button"
              onClick={() => setPanelAbierto(true)}
              data-anadir-persona
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-app-main px-3 py-2 text-sm font-bold text-app-dark transition hover:bg-app-main/90"
            >
              <UserPlusIcon className="h-5 w-5" />
              <span className="hidden sm:inline">Añadir persona</span>
              <span className="sm:hidden">Añadir</span>
            </button>
          )}
        </header>

        {groupUsers.length === 0 ? (
          <p className="py-6 text-center text-sm text-app-muted">No hay usuarios en este grupo</p>
        ) : (
          <>
            {Grupo({ titulo: "Pastores", personas: pastores })}
            {Grupo({ titulo: "Equipo", personas: equipo })}
          </>
        )}

        {/* Nombre, sigla y logo de la iglesia: solo pastor y pastora */}
        {soyPastor && (
          <details className="group rounded-2xl border border-app-border bg-app-light/60" data-datos-iglesia>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-app-muted transition hover:text-app-texto">
              Datos de la iglesia
              <ChevronDownIcon className="h-4 w-4 transition group-open:rotate-180" />
            </summary>
            <div className="px-3 pb-3">
              <DatosIglesia />
            </div>
          </details>
        )}
      </div>

      <Footer />

      {soyPastor && panelAbierto && (
        <PanelNuevaPersona
          nuevo={newUser}
          alCambiar={handleChange}
          alElegir={(cambios) => setNewUser((prev) => ({ ...prev, ...cambios }))}
          roles={rolesDisponibles}
          puedeElegirRol={puedeElegirRol}
          cargando={loading}
          alEnviar={handleCreate}
          alCerrar={cerrarPanel}
        />
      )}

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
