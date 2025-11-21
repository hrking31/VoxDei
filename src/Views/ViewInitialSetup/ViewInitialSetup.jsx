import { useState, useRef, useEffect } from "react";
import { db } from "../../Components/Firebase/Firebase";
import { doc, setDoc, getDocs, collection } from "firebase/firestore";
import { useAuth } from "../../Components/Context/AuthContext.jsx";
import { useNavigate } from "react-router-dom";
import { UserPlusIcon } from "@heroicons/react/24/solid";

export default function ViewInitialSetup() {
  const { signup, loading, setLoading } = useAuth();
  const navigate = useNavigate();

  const refGenero = useRef(null);
  const genderOptions = ["Masculino", "Femenino"];

  const [openDropdown, setOpenDropdown] = useState(null);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    churchName: "",
    name: "",
    gender: "",
    email: "",
    password: "",
  });

  const handleChange = ({ target: { name, value } }) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const toggleDropdown = (name) => {
    setOpenDropdown(openDropdown === name ? null : name);
  };

  useEffect(() => {
    function handleClickOutside(e) {
      if (refGenero.current && !refGenero.current.contains(e.target)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

    setLoading(true);

    try {
      // Crear usuario en Auth
      const userCred = await signup(form.email, form.password);
      const uid = userCred.user.uid;

      // Guardar datos en Firestore
      await setDoc(doc(db, "users", uid), {
        churchName: form.churchName,
        name: form.name,
        gender: form.gender,
        email: form.email,
        role: "admin", // Asignación automática
        groupId: uid, // Grupo raíz creado por este admin
        createdAt: new Date(),
      });

      navigate("/ViewSelector");
    } catch (err) {
      const errors = {
        "auth/email-already-in-use": "El correo ya está registrado.",
        "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.",
        "auth/invalid-email": "Correo inválido.",
      };
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
    </div>
  );
}
