import { useEffect } from "react";
import {
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/solid";
import { motion, AnimatePresence } from "framer-motion";
import { useAppContext } from "../Context/AppContext";

export default function Notificaciones() {
  const { notif, setNotif } = useAppContext();

  useEffect(() => {
    if (notif.open && notif.type !== "confirm") {
      const timer = setTimeout(() => setNotif({ ...notif, open: false }), 4000);
      return () => clearTimeout(timer);
    }
  }, [notif.open, notif.type, setNotif]);

  if (!notif.open) return null;

  const styles = {
    success: "bg-app-success text-black",
    error: "bg-red-600 text-white",
    warning: "bg-app-main text-black",
    info: "bg-app-accent text-white",
    confirm: "bg-app-main text-black",
  };

  const icons = {
    success: <CheckCircleIcon className="h-6 w-6" />,
    error: <ExclamationTriangleIcon className="h-6 w-6" />,
    warning: <ExclamationTriangleIcon className="h-6 w-6" />,
    info: <InformationCircleIcon className="h-6 w-6" />,
    confirm: <ExclamationTriangleIcon className="h-6 w-6" />,
  };

  return (
    <AnimatePresence>
      {notif.open && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
          transition={{ duration: 0.3 }}
          className={`fixed px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 z-50 ${
            styles[notif.type]
          } ${
            notif.type === "confirm"
              ? "bottom-10/12 right-1/3"
              : "bottom-6 right-6 "
          } `}
        >
          {icons[notif.type]}
          <span className="font-medium">{notif.message}</span>

          {/* SOLO para confirmación  */}
          {notif.type === "confirm" && (
            <div className="flex gap-3 justify-end mt-2">
              <button
                onClick={() => {
                  notif.onConfirm?.();
                  setNotif({ ...notif, open: false });
                }}
                className="px-3 py-1 rounded-lg bg-app-success text-white hover:bg-green-700 transition"
              >
                Sí
              </button>

              <button
                onClick={() => {
                  notif.onCancel?.();
                  setNotif({ ...notif, open: false });
                }}
                className="px-3 py-1 rounded-lg bg-app-error text-white hover:bg-red-700 transition"
              >
                No
              </button>
            </div>
          )}

          {/* Cerrar solo en notificaciones normales */}
          {notif.type !== "confirm" && (
            <button
              onClick={() => setNotif({ ...notif, open: false })}
              className="ml-3 hover:opacity-70"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
