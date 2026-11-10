import { useEffect, useState } from "react";
import { useAuth } from "../Context/AuthContext";
import { useAppContext } from "../Context/AppContext";
import CampoLogoIglesia from "./CampoLogoIglesia.jsx";
import { guardarDatosIglesia } from "./accionesIglesia.js";
import { LARGO_SIGLA, datosDeIglesia, normalizarSigla } from "./datosIglesia.js";

// Editar nombre, sigla y logo de la iglesia. Va en Usuarios, solo para pastor
// y pastora (la regla de Firestore también lo exige). Sirve sobre todo a las
// iglesias registradas antes del 9 de noviembre de 2026, que no los tenían.
export default function DatosIglesia() {
  const { userData } = useAuth();
  const { iglesia, showNotif } = useAppContext();
  const actuales = datosDeIglesia(iglesia, userData);

  const [nombre, setNombre] = useState(actuales.nombre);
  const [sigla, setSigla] = useState(actuales.sigla);
  const [logoArchivo, setLogoArchivo] = useState(null);
  const [vista, setVista] = useState(null);
  const [editado, setEditado] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Los datos llegan de Firestore después de montar: se copian a los campos
  // mientras nadie haya empezado a escribir.
  useEffect(() => {
    if (editado) return;
    setNombre(actuales.nombre);
    setSigla(actuales.sigla);
  }, [editado, actuales.nombre, actuales.sigla]);

  const guardar = async () => {
    if (!nombre.trim()) {
      showNotif("warning", "Escribe el nombre de la iglesia.");
      return;
    }
    setGuardando(true);
    try {
      await guardarDatosIglesia(userData.groupId, { nombre, sigla, logoArchivo });
      showNotif("success", "Datos de la iglesia guardados");
      setLogoArchivo(null);
      setEditado(false);
    } catch (error) {
      console.error("Error al guardar los datos de la iglesia:", error);
      showNotif("error", "No se pudieron guardar los datos de la iglesia. Revisa tu conexión.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <section aria-labelledby="datos-iglesia" className="w-full max-w-3xl rounded-lg border border-app-border bg-app-light p-3">
      <h2 id="datos-iglesia" className="mb-2 text-sm font-bold text-app-main">
        Datos de la iglesia
      </h2>
      <div className="flex items-start gap-3">
        <CampoLogoIglesia
          vista={vista || actuales.logo}
          onElegir={(archivo) => {
            setLogoArchivo(archivo);
            setVista(URL.createObjectURL(archivo));
            setEditado(true);
          }}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <label className="flex flex-col gap-1 text-xs text-app-muted">
            Nombre de la iglesia
            <input
              value={nombre}
              onChange={(e) => {
                setNombre(e.target.value);
                setEditado(true);
              }}
              className="rounded-lg border border-app-border bg-app-dark p-2 text-sm text-app-texto"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-app-muted">
            Nombre corto o sigla
            <input
              value={sigla}
              maxLength={LARGO_SIGLA}
              placeholder="Por ejemplo CDP"
              onChange={(e) => {
                setSigla(normalizarSigla(e.target.value));
                setEditado(true);
              }}
              className="rounded-lg border border-app-border bg-app-dark p-2 text-sm text-app-texto placeholder:text-app-muted"
            />
          </label>
          <button
            type="button"
            onClick={guardar}
            disabled={guardando || !editado}
            className="self-start rounded-lg bg-app-main px-4 py-1.5 text-sm font-bold text-app-dark disabled:opacity-40"
          >
            {guardando ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </section>
  );
}
