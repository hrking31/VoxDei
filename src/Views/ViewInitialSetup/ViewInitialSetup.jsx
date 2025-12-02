import { useState, useRef, useEffect } from "react";
import { db, storage } from "../../Components/Firebase/Firebase";
import { doc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "../../Components/Context/AuthContext.jsx";
import { useNavigate } from "react-router-dom";
import { UserPlusIcon, UserIcon } from "@heroicons/react/24/solid";
import Footer from "../../Components/Footer/Footer.jsx";

export default function ViewInitialSetup() {
  const { signup, loading, setLoading } = useAuth();
  const navigate = useNavigate();

  const refGenero = useRef(null);
  const genderOptions = ["Masculino", "Femenino"];
  const [preview, setPreview] = useState(null);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    churchName: "",
    name: "",
    gender: "",
    email: "",
    photo: "",
    password: "",
  });

  // Manejar cambios en el formulario
  const handleChange = ({ target: { name, value } }) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setError("");
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

  // Crear usuario y guardar datos
  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");

    if (
      !form.churchName.trim() ||
      !form.name.trim() ||
      !form.gender.trim() ||
      !form.email.trim() ||
      !form.password.trim()
    ) {
      setError("Por favor completa todos los campos.");
      return;
    }

    if (!form.photo) {
      setError("Por favor sube una foto");
      return;
    }

    setLoading(true);

    try {
      // Crear usuario en Auth
      const userCred = await signup(form.email, form.password);
      const uid = userCred.user.uid;

      // Subir la imagen a Firebase Storage
      const imageRef = ref(storage, `users/${uid}/profile.jpg`);
      await uploadBytes(imageRef, form.photo);

      // Obtener URL de la imagen
      const photoURL = await getDownloadURL(imageRef);

      const role =
        form.gender.toLowerCase() === "femenino" ? "Pastora" : "Pastor";

      // Guardar datos en Firestore
      await setDoc(doc(db, "users", uid), {
        churchName: form.churchName,
        name: form.name,
        gender: form.gender,
        email: form.email,
        photo: photoURL,
        role: role,
        groupId: uid,
        createdAt: new Date(),
      });
      
      setUserData(userData);

      navigate("/ViewSelector");
    } catch (err) {
      const errors = {
        "auth/email-already-in-use": "El correo ya está registrado.",
        "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.",
        "auth/invalid-email": "Correo inválido.",
      };

      console.error(err);
      setError(errors[err.code] || "Error al crear el usuario.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-gradient-to-b from-gray-900 to-gray-800">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-extrabold text-yellow-400 drop-shadow-md">
          Crear Iglesia
        </h1>
        <p className="text-gray-400 mt-2 text-lg">
          Completa la información para iniciar tu plataforma.
        </p>
      </div>

      <div className="w-full max-w-md bg-gray-900/40 backdrop-blur-sm border border-gray-700 rounded-2xl shadow-xl p-8">
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          {/* Foto de perfil */}
          <div className="flex flex-col items-center gap-4">
            <label className="text-white">Tu foto de perfil</label>

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
                  className="w-24 h-24 rounded-full object-cover"
                  alt="preview"
                />
              ) : (
                <div className="w-22 h-22 rounded-full bg-gray-200 flex items-center justify-center">
                  <UserIcon className="w-10 h-10 text-gray-500" />
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
            className="p-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />

          {/* Nombre usuario */}
          <input
            type="text"
            name="name"
            placeholder="Nombre completo"
            value={form.name}
            onChange={handleChange}
            className="p-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />

          {/* Género */}
          <div ref={refGenero} className="relative">
            <button
              type="button"
              onClick={() => toggleDropdown("gender")}
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-left text-gray-400 focus:ring-2 focus:ring-yellow-400"
            >
              {form.gender || "Selecciona un género"}
            </button>

            {openDropdown === "gender" && (
              <ul className="absolute left-0 right-0 bg-gray-800 border border-gray-700 rounded-lg mt-1 shadow-lg z-20">
                {genderOptions.map((g) => (
                  <li
                    key={g}
                    className="px-4 py-2 text-gray-300 hover:bg-yellow-400 hover:text-black cursor-pointer"
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
            className="p-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />

          {/* Password */}
          <input
            type="password"
            name="password"
            placeholder="Contraseña"
            value={form.password}
            onChange={handleChange}
            className="p-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />

          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 bg-yellow-400 text-black py-3 rounded-lg font-bold hover:bg-yellow-300 transition"
          >
            <UserPlusIcon className="w-5 h-5" />
            {loading ? "Creando..." : "Crear iglesia"}
          </button>
        </form>

        {error && (
          <p className="text-red-400 text-center mt-4 font-semibold">{error}</p>
        )}
      </div>
      <Footer />
    </div>
  );
}
