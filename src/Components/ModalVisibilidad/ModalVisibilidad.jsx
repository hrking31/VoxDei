import {
  TagIcon,
  BookmarkIcon,
  ChatBubbleLeftRightIcon,
  TvIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/solid";
import { useState, useRef, useEffect } from "react";
import { useAppContext } from "../Context/AppContext";

export default function ModalVisibilidad({
  toggleVisibleTicker,
  toggleVisibleTitulo,
  toggleVisibleTexto,
  setAllVisible,
  setOffVisible,
  colorClass,
}) {
  const [open, setOpen] = useState(false);
  const [alignLeft, setAlignLeft] = useState(false);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const { visibleTicker, visibleTitulo, visibleTexto } =
    useAppContext();

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

  const options = [
    {
      icon: (
        <TagIcon
          className={`w-7 h-7 ${
            visibleTicker ? "text-app-success" : "text-app-muted"
          }`}
        />
      ),
      onClick: toggleVisibleTicker,
    },
    {
      icon: (
        <BookmarkIcon
          className={`w-7 h-7 ${
            visibleTitulo ? "text-app-accent" : "text-app-muted"
          }`}
        />
      ),
      onClick: toggleVisibleTitulo,
    },
    {
      icon: (
        <ChatBubbleLeftRightIcon
          className={`w-7 h-7 ${
            visibleTexto ? "text-app-main" : "text-app-muted"
          }`}
        />
      ),
      onClick: toggleVisibleTexto,
    },
    {
      icon: (
        <TvIcon
          className={`w-7 h-7 ${colorClass}`}
        />
      ),
      onClick: setAllVisible,
    },
    {
      icon: (
        <EyeSlashIcon
          className="w-7 h-7 text-app-muted"
        />
      ),
      onClick: setOffVisible,
    },
  ];

  return (
    <>
      {/* Botón que abre el modal */}
      <button
        ref={buttonRef}
        onClick={() => setOpen((prev) => !prev)}
        className="w-full h-full flex items-center justify-center text-center text-xs sm:text-sm md:text-base font-bold text-app-main rounded inset-shadow-sm inset-shadow-app-main active:bg-app-main transition"
      >
        <EyeIcon className="w-4 h-4" />
      </button>

      {/* Modal */}
      {open && (
        <div
          ref={menuRef}
          className={`
          absolute mt-10 sm:mt-11 shadow-xl rounded-xl p-2 flex flex-col gap-3 
          transform-gpu origin-top-right transition-all duration-150
          ${alignLeft ? "right-0" : "left-0"}
          animate-menu-open
          z-50
`}
        >
          {/* Botones menú */}
          {options.map((item, i) => (
            <button
              key={i}
              onClick={() => {
                item.onClick();
                setOpen(false);
              }}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-app-muted/10 transition"
            >
              {item.icon}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
