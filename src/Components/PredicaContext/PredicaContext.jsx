import { createContext, useContext, useEffect, useState } from "react";
import { db } from "../Firebase/Firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

// Crear el contexto
const PredicaContext = createContext();

// Proveedor del contexto
export function PredicaProvider({ children }) {
  const [slots, setSlots] = useState([false, false, false, false, false]);

  // 🔹 Cargar estado inicial de los botones desde Firestore
  useEffect(() => {
    const loadSlots = async () => {
      const estados = [];
      for (let i = 1; i <= 5; i++) {
        const snap = await getDoc(doc(db, "predicas", `predica${i}`));
        estados.push(snap.exists()); // true = ocupado (verde), false = vacío (rojo)
      }
      setSlots(estados);
    };
    loadSlots();
  }, []);

  // 🔹 Guardar o sobrescribir una prédica en Firestore
  const guardarPredica = async (index, predicaItems) => {
    await setDoc(doc(db, "predicas", `predica${index + 1}`), {
      items: predicaItems,
      updatedAt: new Date().toISOString(),
    });

    // Actualizar el estado local
    setSlots((prev) => {
      const nuevo = [...prev];
      nuevo[index] = true; // lo marcamos como ocupado
      return nuevo;
    });
  };

  return (
    <PredicaContext.Provider value={{ slots, guardarPredica }}>
      {children}
    </PredicaContext.Provider>
  );
}

// Hook personalizado para consumir el contexto
export const usePredica = () => useContext(PredicaContext);
