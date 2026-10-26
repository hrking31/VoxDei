import { useState } from "react";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

// Campo de contraseña con un botón de ojo para ver lo que se escribe.
//
// El ojo es MOMENTÁNEO, no un interruptor (pedido del usuario): la contraseña
// se ve solo mientras se mantiene pulsado y se oculta al soltar, así no queda
// a la vista por olvido. Funciona con mouse, dedo y teclado (Espacio o Enter
// mantenidos).
//
// El ojo va FUERA del campo, a su derecha: los gestores de contraseñas
// (Bitwarden, 1Password, LastPass...) pintan su logo en el borde derecho de
// dentro del campo y, cuando el ojo iba ahí, lo tapaban y no se podía pulsar.
//
// Recibe las mismas props que un <input> (name, value, onChange, placeholder,
// autoComplete, className...). Conviene pasar siempre `autoComplete`:
// "current-password" donde se escribe la propia contraseña y "new-password"
// donde se elige una; sin eso el navegador puede rellenar una contraseña
// guardada (vieja, o la del pastor al crear a otra persona) sin que se note.
export default function CampoClave({ className = "", ...props }) {
  const [visible, setVisible] = useState(false);
  const Icono = visible ? EyeSlashIcon : EyeIcon;

  const mostrar = () => setVisible(true);
  const ocultar = () => setVisible(false);
  const esTeclaDeBoton = (e) => e.key === " " || e.key === "Enter";

  return (
    <div className="flex w-full gap-2">
      <input
        {...props}
        type={visible ? "text" : "password"}
        className={`${className} flex-1 min-w-0`}
      />
      <button
        type="button"
        onPointerDown={mostrar}
        onPointerUp={ocultar}
        onPointerLeave={ocultar}
        onPointerCancel={ocultar}
        onBlur={ocultar}
        onKeyDown={(e) => {
          if (!esTeclaDeBoton(e)) return;
          e.preventDefault(); // Enter no debe enviar el formulario
          mostrar();
        }}
        onKeyUp={(e) => esTeclaDeBoton(e) && ocultar()}
        // Sin esto, mantener el dedo abre el menú del celular y el mouse le
        // quita el foco al campo mientras se escribe.
        onContextMenu={(e) => e.preventDefault()}
        onMouseDown={(e) => e.preventDefault()}
        aria-label="Mantén pulsado para ver la contraseña"
        title="Mantén pulsado para ver la contraseña"
        className="shrink-0 flex items-center justify-center px-3 rounded-lg border border-app-border text-app-muted hover:text-app-main hover:border-app-main transition select-none touch-none"
      >
        <Icono className="w-5 h-5" />
      </button>
    </div>
  );
}
