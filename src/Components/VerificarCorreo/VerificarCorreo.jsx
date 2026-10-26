import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { EnvelopeIcon } from "@heroicons/react/24/solid";
import { useAuth } from "../Context/AuthContext";
import { useAppContext } from "../Context/AppContext";

// Pantalla para quien aún no verificó su correo: el dueño y todo su equipo.
//
// Sin verificar, cualquiera podía registrar iglesias con correos inventados (y
// sin un correo real tampoco puede recuperar la contraseña). ProtectedRoutes la
// muestra en lugar de cualquier ruta protegida; el servidor, por su parte, no
// le deja crear usuarios. /EliminarCuenta es pública y sigue a su alcance.
//
// Al dueño el enlace le llega solo al registrarse (ViewRegister). A quien da de
// alta un pastor no le llega nada, porque el SDK de administrador no envía
// correos: lo pide él mismo aquí con «Enviarme el enlace».
export default function VerificarCorreo() {
  const navigate = useNavigate();
  const { user, userData, logout, reenviarVerificacion, comprobarVerificacion } =
    useAuth();
  const { showNotif } = useAppContext();
  const [ocupado, setOcupado] = useState(false);
  const esDueno = user?.uid === userData?.groupId;
  const [enviado, setEnviado] = useState(esDueno);

  const yaVerifique = async () => {
    setOcupado(true);
    try {
      const verificado = await comprobarVerificacion();
      if (!verificado) {
        showNotif(
          "warning",
          "Todavía no aparece verificado. Pulsa el enlace del correo y vuelve a intentarlo."
        );
      }
    } catch (error) {
      console.error("Error al comprobar la verificación:", error);
      showNotif("error", "No se pudo comprobar. Revisa tu conexión.");
    } finally {
      setOcupado(false);
    }
  };

  const reenviar = async () => {
    setOcupado(true);
    try {
      await reenviarVerificacion();
      showNotif("success", `Te enviamos el enlace a ${user.email}.`);
      setEnviado(true);
    } catch (error) {
      console.error("Error al reenviar la verificación:", error);
      showNotif(
        "error",
        error.code === "auth/too-many-requests"
          ? "Ya enviamos varios correos. Espera unos minutos antes de pedir otro."
          : "No se pudo enviar el correo. Revisa tu conexión."
      );
    } finally {
      setOcupado(false);
    }
  };

  return (
    <div className="min-h-svh flex items-center justify-center px-4 bg-linear-to-b from-gray-900 to-gray-800">
      <div className="w-full max-w-md bg-gray-900/40 border border-gray-700 shadow-xl p-6 text-center space-y-4">
        <EnvelopeIcon className="w-12 h-12 text-app-main mx-auto" />

        <h1 className="text-2xl font-bold text-app-main">Verifica tu correo</h1>

        {enviado ? (
          <p className="text-app-muted">
            Te enviamos un enlace a{" "}
            <span className="text-gray-300 break-all">{user?.email}</span>.
            Ábrelo para activar {esDueno ? "tu iglesia" : "tu cuenta"} y después
            pulsa «Ya lo verifiqué». Si no lo ves, revisa la carpeta de spam.
          </p>
        ) : (
          <p className="text-app-muted">
            Para usar VOXDEI necesitas confirmar que el correo{" "}
            <span className="text-gray-300 break-all">{user?.email}</span> es
            tuyo. Pulsa «Enviarme el enlace» y ábrelo desde tu correo. Si esa
            dirección no es la tuya, pide a tu pastor que te cree de nuevo.
          </p>
        )}

        <div className="flex flex-col gap-2">
          {enviado ? (
            <>
              <button
                onClick={yaVerifique}
                disabled={ocupado}
                className="bg-app-main text-black py-2.5 rounded-lg font-semibold hover:bg-app-main/90 transition disabled:opacity-50"
              >
                Ya lo verifiqué
              </button>

              <button
                onClick={reenviar}
                disabled={ocupado}
                className="py-2.5 rounded-lg font-semibold text-app-main border border-gray-700 hover:bg-gray-800 transition disabled:opacity-50"
              >
                Reenviar correo
              </button>
            </>
          ) : (
            <button
              onClick={reenviar}
              disabled={ocupado}
              className="bg-app-main text-black py-2.5 rounded-lg font-semibold hover:bg-app-main/90 transition disabled:opacity-50"
            >
              Enviarme el enlace
            </button>
          )}

          <button
            onClick={() => logout()}
            className="py-2.5 rounded-lg font-semibold text-app-muted border border-gray-700 hover:bg-gray-800 transition"
          >
            Cerrar sesión
          </button>

          <button
            onClick={() => navigate("/EliminarCuenta")}
            className="text-xs text-app-muted hover:text-app-error hover:underline transition mt-2"
          >
            Eliminar mi cuenta
          </button>
        </div>
      </div>
    </div>
  );
}
