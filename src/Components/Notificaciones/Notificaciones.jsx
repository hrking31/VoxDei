import { useEffect } from "react";
import {
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/solid";
import { motion, AnimatePresence } from "framer-motion";

export default function Notificaciones({
  open,
  type = "info",
  message,
  onClose,
}) {
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => onClose(), 4000); 
      return () => clearTimeout(timer);
    }
  }, [open, onClose]);

  if (!open) return null;

  const styles = {
    success: "bg-app-success text-black",
    error: "bg-app-error text-white",
    warning: "bg-app-main text-black",
    info: "bg-app-accent text-white",
  };

  const icons = {
    success: <CheckCircleIcon className="h-6 w-6" />,
    error: <XMarkIcon className="h-6 w-6" />,
    warning: <ExclamationTriangleIcon className="h-6 w-6" />,
    info: <InformationCircleIcon className="h-6 w-6" />,
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
          transition={{ duration: 0.3 }}
          className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 ${styles[type]} z-50`}
        >
          {icons[type]}
          <span className="font-medium">{message}</span>
          <button onClick={onClose} className="ml-3 hover:opacity-70">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
