import { useCallback, useEffect, useState } from "react";
import { auth, db } from "./../Firebase/Firebase";
import { doc, getDoc } from "firebase/firestore";
import {
  createUserWithEmailAndPassword, // registra usuario
  signInWithEmailAndPassword, // inicia sesión
  onAuthStateChanged, // observa cambios en el estado de autenticación
  signOut, // cierra la sesión
  sendEmailVerification, // envía el correo de verificación
} from "firebase/auth";
import { AuthContext } from "./AuthContext";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // Usuario Firebase
  const [userData, setUserData] = useState(null); // Datos extra de Firestore
  const [loading, setLoading] = useState(true);
  // La ficha no se pudo leer (sin internet, casi siempre). Distingue ese caso
  // de una cuenta que de verdad no tiene ficha.
  const [errorPerfil, setErrorPerfil] = useState(false);
  // Copia en estado de `user.emailVerified`. Hace falta porque `reload()`
  // cambia ese campo dentro del mismo objeto y React no se entera.
  const [correoVerificado, setCorreoVerificado] = useState(false);

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

  // Lee la ficha users/{uid}. Antes, si la lectura fallaba, la excepción
  // escapaba, `loading` nunca volvía a false y la app quedaba para siempre en
  // "Procesando usuario...". Ahora el fallo se marca y la pantalla ofrece
  // reintentar (ver PerfilNoDisponible).
  const cargarPerfil = useCallback(async (uid) => {
    try {
      const userDoc = await getDoc(doc(db, "users", uid));
      setUserData(userDoc.exists() ? userDoc.data() : null);
      setErrorPerfil(false);
    } catch (error) {
      console.error("Error al cargar el perfil:", error);
      setUserData(null);
      setErrorPerfil(true);
    }
  }, []);

  const recargarPerfil = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    await cargarPerfil(auth.currentUser.uid);
    setLoading(false);
  };

  const reenviarVerificacion = () => sendEmailVerification(auth.currentUser);

  // Tras pulsar el enlace del correo, Firebase no avisa a la app: hay que
  // volver a leer la cuenta. Se renueva también el token, porque el servidor
  // (crearUsuarioAdmin) mira `email_verified` en él, no en la cuenta.
  const comprobarVerificacion = async () => {
    if (!auth.currentUser) return false;
    await auth.currentUser.reload();
    const verificado = auth.currentUser.emailVerified;
    if (verificado) await auth.currentUser.getIdToken(true);
    setCorreoVerificado(verificado);
    return verificado;
  };

  // Observador de estado de autenticación
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // La sesión no se da por lista hasta tener la ficha. Si `user` llegara
        // antes que `userData`, las rutas protegidas verían a alguien con
        // sesión pero sin rol y lo mandarían a /VistaNoAutorizada.
        setLoading(true);
        await cargarPerfil(currentUser.uid);
      } else {
        setUserData(null);
        setErrorPerfil(false);
      }

      setCorreoVerificado(Boolean(currentUser?.emailVerified));
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [cargarPerfil]);

  return (
    <AuthContext.Provider
      value={{
        signup,
        login,
        logout,
        user,
        setUserData,
        userData,
        loading,
        setLoading,
        errorPerfil,
        recargarPerfil,
        correoVerificado,
        reenviarVerificacion,
        comprobarVerificacion,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
