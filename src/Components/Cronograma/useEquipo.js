import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../Firebase/Firebase";
import { useAuth } from "../Context/AuthContext";
import { normalizarRol } from "../Roles/Roles.js";

// Toda la gente de la iglesia, para asignarle cargos o ensayos:
// [{ uid, nombre, rol }], en orden alfabético. Se lee una vez al abrir la pantalla;
// el equipo cambia muy poco y no vale la pena escucharlo en vivo.
export function useEquipo() {
  const { userData } = useAuth();
  const [equipo, setEquipo] = useState([]);
  const groupId = userData?.groupId;

  useEffect(() => {
    if (!groupId) return;
    let vigente = true;

    getDocs(query(collection(db, "users"), where("groupId", "==", groupId)))
      .then((snapshot) => {
        if (!vigente) return;
        setEquipo(
          snapshot.docs
            .map((d) => ({ uid: d.id, ...d.data() }))
            .map((u) => ({
              uid: u.uid,
              nombre: u.name || u.email,
              rol: normalizarRol(u.role),
            }))
            .sort((a, b) => a.nombre.localeCompare(b.nombre)),
        );
      })
      .catch((error) => console.error("Error al cargar el equipo:", error));

    return () => {
      vigente = false;
    };
  }, [groupId]);

  return equipo;
}
