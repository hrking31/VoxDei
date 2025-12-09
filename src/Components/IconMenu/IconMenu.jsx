import { useState, useRef, useEffect } from "react";
import { EllipsisVerticalIcon } from "@heroicons/react/24/solid";

export default function IconMenu({ options = [], className = "" }) {
  const [open, setOpen] = useState(false);
  const [alignLeft, setAlignLeft] = useState(false);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  const toggle = () => setOpen((prev) => !prev);

  // Detectar bordes de la pantalla
  useEffect(() => {
    if (open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const screenWidth = window.innerWidth;

      // Si el menú se saldría por la derecha → abrir hacia la izquierda
      setAlignLeft(rect.right + 170 > screenWidth);
    }
  }, [open]);

  // Cerrar al hacer click fuera
  useEffect(() => {
    function handleClickOutside(e) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        !buttonRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`}>
      {/* Botón 3 puntos */}
      <button
        ref={buttonRef}
        onClick={toggle}
        className="p-2 rounded-md hover:bg-app-muted transition"
      >
        <EllipsisVerticalIcon className="w-6 h-6" />
      </button>

      {/* Menu animado */}
      {open && (
        <div
          ref={menuRef}
          className={`
            absolute mt-2 shadow-xl rounded-xl p-2 flex flex-col gap-3 
            transform origin-top-right transition-all duration-150
            ${alignLeft ? "right-0" : "left-0"}
            animate-menu-open
          `}
        >
          {options.map((item, i) => (
            <button
              key={i}
              onClick={() => {
                item.onClick();
                setOpen(false);
              }}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-app-muted/10 transition"
            >
              {item.icon}
              {!!item.label && <span className="text-sm">{item.label}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}