import { useEffect } from "react";
import {
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/solid";
import { motion, AnimatePresence } from "framer-motion";
import { useAppContext } from "../Context/AppContext";

// Único aviso de toda la aplicación.
//
// Nadie más debe pintar mensajes de error o de éxito: las vistas llaman a
// showNotif(tipo, texto) o a confirmAction(texto) desde AppContext y este
// componente los muestra siempre igual, centrado en la parte inferior.
export default function Notificaciones() {
  const { notif, setNotif } = useAppContext();

  useEffect(() => {
    if (notif.open && notif.type !== "confirm") {
      const timer = setTimeout(
        () => setNotif((prev) => ({ ...prev, open: false })),
        4000
      );
      return () => clearTimeout(timer);
    }
  }, [notif.open, notif.type, setNotif]);

  const styles = {
    success: "bg-app-success text-black",
    error: "bg-red-600 text-white",
    warning: "bg-app-main text-black",
    info: "bg-app-accent text-white",
    confirm: "bg-app-main text-black",
  };

  const icons = {
    success: <CheckCircleIcon className="h-6 w-6 shrink-0" />,
    error: <ExclamationTriangleIcon className="h-6 w-6 shrink-0" />,
    warning: <ExclamationTriangleIcon className="h-6 w-6 shrink-0" />,
    info: <InformationCircleIcon className="h-6 w-6 shrink-0" />,
    confirm: <ExclamationTriangleIcon className="h-6 w-6 shrink-0" />,
  };

  const cerrar = () => setNotif((prev) => ({ ...prev, open: false }));

  return (
    <AnimatePresence>
      {notif.open && (
        // La franja fija va aparte de la tarjeta: framer-motion escribe su
        // propio transform y pisaría un centrado hecho con -translate-x-1/2.
        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4 pointer-events-none">
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            role="status"
            aria-live="polite"
            className={`pointer-events-auto w-full max-w-md rounded-xl shadow-lg px-4 py-3 ${
              styles[notif.type] || styles.info
            }`}
          >
            <div className="flex items-center gap-3">
              {icons[notif.type] || icons.info}
              <span className="flex-1 text-sm sm:text-base font-medium break-words">
                {notif.message}
              </span>

              {/* Cerrar solo en avisos normales: una confirmación se responde */}
              {notif.type !== "confirm" && (
                <button
                  onClick={cerrar}
                  aria-label="Cerrar aviso"
                  className="shrink-0 hover:opacity-70"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              )}
            </div>

            {notif.type === "confirm" && (
              <div className="flex gap-3 justify-end mt-3">
                <button
                  onClick={() => {
                    notif.onConfirm?.();
                    cerrar();
                  }}
                  className="px-4 py-1 rounded-lg bg-app-success text-white hover:bg-green-700 transition"
                >
                  Sí
                </button>

                <button
                  onClick={() => {
                    notif.onCancel?.();
                    cerrar();
                  }}
                  className="px-4 py-1 rounded-lg bg-app-error text-white hover:bg-red-700 transition"
                >
                  No
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
