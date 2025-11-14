import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "./../Firebase/Firebase";
import { doc, getDoc } from "firebase/firestore";
import {
  createUserWithEmailAndPassword, // registra usuario
  signInWithEmailAndPassword, // inicia sesión
  onAuthStateChanged, // observa cambios en el estado de autenticación
  signOut, // cierra la sesión
} from "firebase/auth";

export const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // Usuario Firebase
  const [userData, setUserData] = useState(null); // Datos extra de Firestore
  const [loading, setLoading] = useState(true);

  // Función para registrar un nuevo usuario
  const signup = (email, password) =>
    createUserWithEmailAndPassword(auth, email, password);

  // Función para iniciar sesión
  const login = (email, password) =>
    signInWithEmailAndPassword(auth, email, password);

  // Función para cerrar sesión
  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setUserData(null);
  };

  // Observador de estado de autenticación
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        // Cargar datos adicionales desde Firestore
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setUserData(userDoc.data());
        } else {
          setUserData(null);
        }
      } else {
        setUserData(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{ signup, login, logout, user, userData, loading, setLoading }}
    >
      {children}
    </AuthContext.Provider>
  );
}
