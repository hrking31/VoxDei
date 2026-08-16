import { createContext, useContext } from "react";

// El contexto y su hook viven aparte del proveedor (`AuthProvider.jsx`) porque
// el refresco en caliente de Vite solo funciona si un archivo exporta
// únicamente componentes.
export const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);
