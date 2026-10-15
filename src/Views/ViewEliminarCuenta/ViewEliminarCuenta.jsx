import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { ExclamationTriangleIcon } from "@heroicons/react/24/solid";
import { auth, functions } from "../../Components/Firebase/Firebase";
import { useAuth } from "../../Components/Context/AuthContext";
import { useAppContext } from "../../Components/Context/AppContext";
import Loading from "../../Components/Loading/Loading.jsx";
import Footer from "../../Components/Footer/Footer.jsx";

// Borrado de la propia cuenta, exigido por Google Play desde la app y desde
// una web. Por eso la ruta es pública: sin sesión explica cómo hacerlo (es la
// dirección que se declara en la ficha de la tienda); con sesión, lo hace.
// Dentro de la app se llega desde la ficha propia en Usuarios.
//
// Todo el borrado lo hace la función `eliminarMiCuenta`. Aquí solo se vuelve a
// pedir la contraseña, que el servidor exige reciente.
export default function ViewEliminarCuenta() {
  const navigate = useNavigate();
  const { user, userData, loading, logout } = useAuth();
  const { showNotif, confirmAction } = useAppContext();
  const [password, setPassword] = useState("");
  const [eliminando, setEliminando] = useState(false);

  if (loading) return <Loading text="Cargando..." />;

  // Quien registró la iglesia: su uid es el groupId, así que irse es borrarla.
  const esDueno = Boolean(user && userData && user.uid === userData.groupId);

  const eliminar = async (e) => {
    e.preventDefault();

    const seguro = await confirmAction(
      esDueno
        ? `Se eliminará la iglesia ${userData.churchName || ""} completa, con todos sus usuarios y su contenido. No se puede deshacer. ¿Continuar?`
        : "Se eliminará tu cuenta. No se puede deshacer. ¿Continuar?"
    );
    if (!seguro) return;

    setEliminando(true);
    try {
      await reauthenticateWithCredential(
        auth.currentUser,
        EmailAuthProvider.credential(user.email, password)
      );

      const eliminarMiCuenta = httpsCallable(functions, "eliminarMiCuenta");
      const { data } = await eliminarMiCuenta();

      await logout();
      showNotif("success", data.message);
      navigate("/ViewLogin", { replace: true });
    } catch (err) {
      console.error("Error al eliminar la cuenta:", err.code, err.message);
      const errorMessages = {
        "auth/invalid-credential": "La contraseña no es correcta.",
        "auth/wrong-password": "La contraseña no es correcta.",
        "auth/missing-password": "Escribe tu contraseña.",
        "auth/too-many-requests": "Demasiados intentos. Intenta más tarde.",
        "auth/network-request-failed": "Error de conexión. Revisa tu red.",
      };
      showNotif(
        "error",
        errorMessages[err.code] ||
          err.message ||
          "No se pudo eliminar la cuenta."
      );
      setEliminando(false);
    }
  };

  return (
    <div className="min-h-svh flex flex-col bg-linear-to-b from-gray-900 to-gray-800">
      <div className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-md space-y-4">
          <div className="text-center mb-6">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-app-main tracking-tight">
              Eliminar cuenta
            </h1>
            <p className="text-app-muted text-base sm:text-lg mt-2">
              VOXDEI
            </p>
          </div>

          <div className="w-full bg-gray-900/40 backdrop-blur-sm border border-gray-700 shadow-xl p-6 space-y-4 text-sm text-gray-300">
            {!user ? (
              <>
                <p>
                  Puedes eliminar tu cuenta de VOXDEI y sus datos en cualquier
                  momento:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-app-muted">
                  <li>Inicia sesión con tu correo y tu contraseña.</li>
                  <li>Vuelve a esta página (te traemos solos).</li>
                  <li>Escribe tu contraseña y pulsa «Eliminar».</li>
                </ol>
                <p className="text-app-muted">
                  Se borran tu cuenta, tu nombre, tu correo y tu foto. Si eres
                  quien registró la iglesia, se borra la iglesia completa: sus
                  usuarios, prédicas, mensajes, tickers, imágenes y estilos.
                  Las canciones que la iglesia aportó al catálogo común se
                  conservan sin el nombre de la iglesia.
                </p>

                <button
                  onClick={() =>
                    navigate("/ViewLogin", {
                      state: { from: { pathname: "/EliminarCuenta" } },
                    })
                  }
                  className="w-full bg-app-main text-black py-2.5 rounded-lg font-semibold hover:bg-app-main/90 transition"
                >
                  Iniciar sesión
                </button>
              </>
            ) : (
              <form onSubmit={eliminar} className="space-y-4 form-dark2">
                <div className="flex gap-3 items-start">
                  <ExclamationTriangleIcon className="w-6 h-6 shrink-0 text-app-error" />
                  {esDueno ? (
                    <p>
                      Registraste la iglesia{" "}
                      <strong className="text-app-main">
                        {userData.churchName}
                      </strong>
                      . Al eliminar tu cuenta se borra{" "}
                      <strong>la iglesia completa</strong>: todos sus usuarios,
                      prédicas, mensajes, tickers, imágenes y estilos. Las
                      canciones que aportó al catálogo se conservan sin su
                      nombre.
                    </p>
                  ) : (
                    <p>
                      Se borran tu cuenta, tu nombre, tu correo y tu foto.
                      {userData && " La iglesia y sus demás usuarios siguen igual."}
                    </p>
                  )}
                </div>

                <p className="text-app-muted">
                  Cuenta: <span className="text-gray-300">{user.email}</span>
                </p>

                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tu contraseña"
                  autoComplete="current-password"
                  className="p-2.5 sm:p-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-app-main w-full text-gray-300"
                />

                <button
                  type="submit"
                  disabled={eliminando || !password}
                  className="w-full bg-app-error text-white py-2.5 rounded-lg font-semibold hover:bg-app-error/90 transition disabled:opacity-50"
                >
                  {eliminando
                    ? "Eliminando..."
                    : esDueno
                      ? "Eliminar la iglesia y mi cuenta"
                      : "Eliminar mi cuenta"}
                </button>
              </form>
            )}

            <button
              onClick={() => navigate(user ? "/ViewUsers" : "/ViewLogin")}
              className="text-app-main hover:underline text-sm w-full text-center"
            >
              Volver
            </button>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
