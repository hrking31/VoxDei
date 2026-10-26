import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../Firebase/Firebase";
import { useAuth } from "../Context/AuthContext";
import { ROL_OPERADOR, normalizarRol } from "../Roles/Roles.js";

// Operadores de la iglesia, para asignarles servicios o ensayos:
// [{ uid, nombre }], en orden alfabético. Se lee una vez al abrir la pantalla;
// el equipo cambia muy poco y no vale la pena escucharlo en vivo.
export function useOperadores() {
  const { userData } = useAuth();
  const [operadores, setOperadores] = useState([]);
  const groupId = userData?.groupId;

  useEffect(() => {
    if (!groupId) return;
    let vigente = true;

    getDocs(query(collection(db, "users"), where("groupId", "==", groupId)))
      .then((snapshot) => {
        if (!vigente) return;
        setOperadores(
          snapshot.docs
            .map((d) => ({ uid: d.id, ...d.data() }))
            .filter((u) => normalizarRol(u.role) === ROL_OPERADOR)
            .map((u) => ({ uid: u.uid, nombre: u.name || u.email }))
            .sort((a, b) => a.nombre.localeCompare(b.nombre))
        );
      })
      .catch((error) => console.error("Error al cargar el equipo:", error));

    return () => {
      vigente = false;
    };
  }, [groupId]);

  return operadores;
}
