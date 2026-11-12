import { useAppContext } from "../Context/AppContext";
import { useAuth } from "../Context/AuthContext";
import { VERSIONES, versionValida } from "./versionesBiblia";
import { guardarVersionBiblia } from "./elegirBiblia";

// TEMPORAL DHH (10-11-2026): botón para elegir entre la RVR1960 y la Dios Habla
// Hoy (pedida solo para el domingo 15-11-2026). Vale para toda la iglesia: si
// el pastor elige DHH en el computador, el operador también la usa en el
// celular, y nunca salen dos versiones en el mismo culto. Está en la sección
// Biblia (ControlVersiculo) y, desde el 11-11-2026, en Prédica (ControlPredica:
// columna de la vista previa en el computador, arriba de «Mis prédicas» en el
// celular), pedido del usuario. El Orden del culto sigue siempre con la
// RVR1960. Debajo va el aviso de derechos de la versión elegida.
export default function SelectorBiblia() {
  const { versionBiblia, setVersionBiblia, showNotif } = useAppContext();
  const { userData } = useAuth();
  const actual = versionValida(versionBiblia);

  const elegir = async (version) => {
    if (version === actual) return;
    setVersionBiblia(version); // se ve al instante; Firestore lo confirma
    try {
      await guardarVersionBiblia(userData.groupId, version);
    } catch (error) {
      console.error("No se pudo guardar la Biblia elegida:", error);
      setVersionBiblia(actual);
      showNotif("error", "No se pudo cambiar la Biblia. Inténtalo de nuevo.");
    }
  };

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div role="group" aria-label="Biblia" className="inline-flex rounded-lg border border-app-border p-0.5">
        {Object.values(VERSIONES).map(({ clave, corto, nombre }) => (
          <button
            key={clave}
            type="button"
            title={nombre}
            aria-pressed={clave === actual}
            onClick={() => elegir(clave)}
            className={`rounded-md px-3 py-1 text-sm font-semibold transition ${
              clave === actual ? "bg-app-main text-app-dark" : "text-app-muted hover:text-app-main"
            }`}
          >
            {corto}
          </button>
        ))}
      </div>
      <p className="max-w-md text-center text-xs text-app-muted">{VERSIONES[actual].aviso}</p>
    </div>
  );
}
