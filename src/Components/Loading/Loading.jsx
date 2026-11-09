import { Simbolo } from "../Logo/Logo.jsx";

// Pantalla de espera: el símbolo de VOXDEI se enciende y se apaga como un
// proyector que calienta. Con «reducir movimiento» queda quieto.
export default function Loading({ text = "Cargando..." }) {
  return (
    <div
      role="status"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-app-velo"
    >
      <Simbolo alt="" className="h-16 w-16 motion-safe:animate-enciende" />
      <p className="text-app-muted font-medium text-lg">{text}</p>
    </div>
  );
}
