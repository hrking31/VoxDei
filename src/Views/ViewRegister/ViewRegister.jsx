import { useState, useRef, useEffect } from "react";
import { auth, db, storage } from "../../Components/Firebase/Firebase.js";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { sendEmailVerification } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "../../Components/Context/AuthContext";
import { useAppContext } from "../../Components/Context/AppContext";
import { useNavigate } from "react-router-dom";
import { UserPlusIcon, UserIcon } from "@heroicons/react/24/solid";
import Footer from "../../Components/Footer/Footer.jsx";
import {
  LADO_PERFIL,
  comprimirImagen,
} from "../../Components/ComprimirImagen/ComprimirImagen.js";
import CampoClave from "../../Components/CampoClave/CampoClave.jsx";
import RequisitosClave from "../../Components/RequisitosClave/RequisitosClave.jsx";
import { LogoHorizontal } from "../../Components/Logo/Logo.jsx";
import CampoLogoIglesia from "../../Components/Iglesia/CampoLogoIglesia.jsx";
import { guardarDatosIglesia } from "../../Components/Iglesia/accionesIglesia.js";
import { LARGO_SIGLA, normalizarSigla } from "../../Components/Iglesia/datosIglesia.js";
import {
  AVISO_CLAVE_DEBIL,
  claveValida,
} from "../../Components/Validaciones/Validaciones.js";

export default function ViewRegister() {
  const { signup, login, logout, loading, setLoading, setUserData } =
    useAuth();
  const { showNotif } = useAppContext();
  const navigate = useNavigate();

  const refGenero = useRef(null);
  const genderOptions = ["Masculino", "Femenino"];
  const [preview, setPreview] = useState(null);
  const [openDropdown, setOpenDropdown] = useState(null);

  // Logo de la iglesia (opcional), con su vista previa
  const [logoIglesia, setLogoIglesia] = useState(null);
  const [vistaLogo, setVistaLogo] = useState(null);

  const [form, setForm] = useState({
    churchName: "",
    sigla: "",
    name: "",
    gender: "",
    email: "",
    photo: "",
    password: "",
  });

  // Manejar cambios en el formulario
  const handleChange = ({ target: { name, value } }) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Toggle dropdown
  const toggleDropdown = (name) => {
    setOpenDropdown(openDropdown === name ? null : name);
  };

  // Manejar cambio de foto
  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setForm((prev) => ({ ...prev, photo: file }));
    setPreview(URL.createObjectURL(file));
  };

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(e) {
      if (refGenero.current && !refGenero.current.contains(e.target)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Crea la cuenta de acceso o, si quedó a medias de un intento anterior, la
  // retoma.
  //
  // El registro son tres pasos (cuenta, foto, ficha) y no hay forma de
  // hacerlos de una sola vez. Un corte de internet entre el primero y el
  // último dejaba una cuenta sin iglesia: no podía entrar y tampoco volver a
  // registrarse, porque "el correo ya está registrado". Ahora, si la
  // contraseña coincide y la ficha no existe, se termina ese registro.
  const obtenerCuenta = async () => {
    try {
      return await signup(form.email, form.password);
    } catch (err) {
      if (err.code !== "auth/email-already-in-use") throw err;

      let credencial;
      try {
        credencial = await login(form.email, form.password);
      } catch {
        // Contraseña distinta: el correo es de otra persona.
        throw err;
      }

      const ficha = await getDoc(doc(db, "users", credencial.user.uid));
      if (ficha.exists()) {
        // Registro completo: es una iglesia que ya existe.
        await logout();
        throw err;
      }

      return credencial;
    }
  };

  // Crear usuario y guardar datos
  const handleCreate = async (e) => {
    e.preventDefault();

    if (
      !form.churchName.trim() ||
      !form.name.trim() ||
      !form.gender.trim() ||
      !form.email.trim() ||
      !form.password.trim()
    ) {
      showNotif("error", "Por favor completa todos los campos.");
      return;
    }

    if (!claveValida(form.password)) {
      showNotif("error", AVISO_CLAVE_DEBIL);
      return;
    }

    if (!form.photo) {
      showNotif("error", "Por favor sube una foto");
      return;
    }

    setLoading(true);

    try {
      // Crear usuario en Auth (o retomar uno a medias)
      const userCred = await obtenerCuenta();
      const uid = userCred.user.uid;

      // Subir la imagen a Firebase Storage
      const imageRef = ref(storage, `users/${uid}/profile.jpg`);
      await uploadBytes(
        imageRef,
        await comprimirImagen(form.photo, LADO_PERFIL)
      );

      // Obtener URL de la imagen
      const photoURL = await getDownloadURL(imageRef);

      const role =
        form.gender.toLowerCase() === "femenino" ? "Pastora" : "Pastor";

      // Guardar datos en Firestore.
      // El campo uid se guarda igual que en crearUsuarioAdmin, para que todas
      // las fichas de usuario tengan la misma forma.
      const newUserData = {
        uid,
        churchName: form.churchName,
        name: form.name,
        gender: form.gender,
        email: form.email,
        photo: photoURL,
        role: role,
        groupId: uid,
        createdAt: new Date(),
      };

      await setDoc(doc(db, "users", uid), newUserData);

      // Datos de la iglesia: nombre, sigla y logo. Va después de la ficha,
      // porque la regla pide que quien escribe sea pastor. Si falla (sin
      // internet), la iglesia ya existe y los datos se completan luego desde
      // Usuarios: no se frena el registro por esto.
      try {
        await guardarDatosIglesia(uid, {
          nombre: form.churchName,
          sigla: form.sigla,
          logoArchivo: logoIglesia,
        });
      } catch (errorIglesia) {
        console.error("No se guardaron los datos de la iglesia:", errorIglesia);
      }

      // Actualizar contexto
      setUserData(newUserData);

      // Quien registra una iglesia debe verificar su correo antes de usarla
      // (ProtectedRoutes lo para en VerificarCorreo). Si el envío falla, desde
      // esa pantalla se puede reenviar: no se frena el registro por esto.
      try {
        await sendEmailVerification(auth.currentUser);
      } catch (errorCorreo) {
        console.error("No se pudo enviar la verificación:", errorCorreo);
      }

      navigate("/ViewSelector");
    } catch (err) {
      const errors = {
        "auth/email-already-in-use": "El correo ya está registrado.",
        "auth/weak-password": AVISO_CLAVE_DEBIL,
        "auth/password-does-not-meet-requirements": AVISO_CLAVE_DEBIL,
        "auth/invalid-email": "Correo inválido.",
        "auth/network-request-failed":
          "Error de red. Revisa tu conexión e inténtalo de nuevo.",
      };

      console.error(err);
      // Lo que ya se creó no se pierde: al volver a pulsar con el mismo correo
      // y contraseña, obtenerCuenta retoma el registro.
      showNotif(
        "error",
        errors[err.code] ||
          "No se pudo completar el registro. Inténtalo de nuevo."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-svh flex flex-col bg-linear-to-b from-gray-900 to-gray-800 overflow-hidden">
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md space-y-4">
          {/* Encabezado */}
          <div className="text-center mb-4">
            {/* Horizontal y pequeño: el formulario es largo y la página no
                se desplaza, así que el vertical lo empujaría fuera. */}
            <LogoHorizontal className="mx-auto mb-3 h-10 sm:h-12 w-auto" />
            <h1 className="text-3xl sm:text-4xl font-extrabold text-app-main drop-shadow-md">
              Registrar Iglesia
            </h1>
            <p className="text-app-muted text-base sm:text-lg mt-2">
              Completa la información para iniciar.
            </p>
          </div>

          {/* Formulario */}
          <div className="w-full max-w-md bg-gray-900/40 backdrop-blur-sm border border-gray-700 shadow-xl p-3 sm:p-5">
            <form
              onSubmit={handleCreate}
              className="flex flex-col form-dark2 gap-3 sm:gap-4"
            >
              {/* Foto de perfil */}
              <div className="flex flex-col items-center gap-2 sm:gap-4">
                {!preview && (
                  <label className="text-white">Tu foto de perfil</label>
                )}

                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                  id="photoInput"
                />

                <label htmlFor="photoInput" className="cursor-pointer">
                  {preview ? (
                    <img
                      src={preview}
                      className="w-14 h-14 sm:w-24 sm:h-24 rounded-full object-cover"
                      alt="preview"
                    />
                  ) : (
                    <div className="w-14 h-14 sm:w-24 sm:h-24 rounded-full bg-gray-200 flex items-center justify-center">
                      <UserIcon className="w-10 h-10 sm:w-14 sm:h-14 text-gray-500" />
                    </div>
                  )}
                </label>
              </div>

              {/* Nombre iglesia */}
              <input
                type="text"
                name="churchName"
                placeholder="Nombre de la iglesia"
                value={form.churchName}
                onChange={handleChange}
                className="p-2 sm:p-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 focus:outline-none focus:ring-2 focus:ring-app-main"
              />

              {/* Logo y nombre corto de la iglesia (opcionales) */}
              <div className="flex items-center gap-3">
                <CampoLogoIglesia
                  vista={vistaLogo}
                  onElegir={(archivo) => {
                    setLogoIglesia(archivo);
                    setVistaLogo(URL.createObjectURL(archivo));
                  }}
                />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <input
                    type="text"
                    name="sigla"
                    placeholder="Nombre corto o sigla (opcional)"
                    value={form.sigla}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, sigla: normalizarSigla(e.target.value) }))
                    }
                    maxLength={LARGO_SIGLA}
                    className="p-2 sm:p-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 focus:outline-none focus:ring-2 focus:ring-app-main"
                  />
                  <span className="text-xs text-app-muted">
                    Por ejemplo «CDP». Se usa donde el nombre completo no cabe.
                  </span>
                </div>
              </div>

              {/* Nombre usuario */}
              <input
                type="text"
                name="name"
                placeholder="Nombre completo"
                value={form.name}
                onChange={handleChange}
                className="p-2 sm:p-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 focus:outline-none focus:ring-2 focus:ring-app-main"
              />

              {/* Género */}
              <div ref={refGenero} className="relative">
                <button
                  type="button"
                  onClick={() => toggleDropdown("gender")}
                  className="w-full p-2 sm:p-3 bg-gray-800 border border-gray-700 rounded-lg text-left text-gray-400 focus:ring-2 focus:ring-app-main"
                >
                  {form.gender || "Selecciona un género"}
                </button>

                {openDropdown === "gender" && (
                  <ul className="absolute left-0 right-0 bg-gray-800 border border-gray-700 rounded-lg mt-1 shadow-lg z-20">
                    {genderOptions.map((g) => (
                      <li
                        key={g}
                        className="px-4 py-2 text-gray-300 hover:bg-app-main hover:text-black cursor-pointer"
                        onClick={() => {
                          setForm((prev) => ({ ...prev, gender: g }));
                          setOpenDropdown(null);
                        }}
                      >
                        {g}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Email */}
              <input
                type="email"
                name="email"
                placeholder="Correo electrónico"
                value={form.email}
                onChange={handleChange}
                className="p-2 sm:p-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 focus:outline-none focus:ring-2 focus:ring-app-main"
              />

              {/* Password */}
              <CampoClave
                name="password"
                autoComplete="new-password"
                placeholder="Contraseña"
                value={form.password}
                onChange={handleChange}
                className="p-2 sm:p-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 focus:outline-none focus:ring-2 focus:ring-app-main"
              />
              <RequisitosClave clave={form.password} />

              {/* Botón de envío */}
              <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center gap-2 bg-app-main text-white py-2.5 sm:py-3 rounded-lg font-semibold hover:bg-app-main/90 transition"
              >
                <UserPlusIcon className="w-5 h-5" />
                {loading ? "Creando..." : "Crear iglesia"}
              </button>
            </form>

          </div>
          {/* Enlace de inicio */}
          <div className="w-full max-w-md bg-gray-900/40 backdrop-blur-sm border border-gray-700 shadow-xl p-6 sm:p-8 text-center">
            <p className="text-sm text-app-muted">
              ¿Tienes una cuenta?{" "}
              <button
                onClick={() => navigate("/ViewLogin")}
                className="text-app-main font-semibold hover:underline"
              >
                Inicia sesión
              </button>
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
