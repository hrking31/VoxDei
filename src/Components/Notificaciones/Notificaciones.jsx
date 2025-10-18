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
    if (notif.open) {
      const timer = setTimeout(() => setNotif({ ...notif, open: false }), 4000);
      return () => clearTimeout(timer);
    }
  }, [notif.open, setNotif]);

  if (!notif.open) return null;

  const styles = {
    success: "bg-app-success text-black",
    error: "bg-red-600 text-white",
    warning: "bg-app-main text-black",
    info: "bg-app-accent text-white",
  };

  const icons = {
    success: <CheckCircleIcon className="h-6 w-6" />,
    error: <ExclamationTriangleIcon className="h-6 w-6" />,
    warning: <ExclamationTriangleIcon className="h-6 w-6" />,
    info: <InformationCircleIcon className="h-6 w-6" />,
  };

  return (
    <AnimatePresence>
      {notif.open && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
          transition={{ duration: 0.3 }}
          className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 ${styles[notif.type]} z-50`}
        >
          {icons[notif.type]}
          <span className="font-medium">{notif.message}</span>
          <button
            onClick={() => setNotif({ ...notif, open: false })}
            className="ml-3 hover:opacity-70"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
