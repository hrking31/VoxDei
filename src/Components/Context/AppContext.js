import { createContext, useContext } from "react";

// El contexto y su hook viven aparte del proveedor (`AppProvider.jsx`) porque
// el refresco en caliente de Vite solo funciona si un archivo exporta
// únicamente componentes. Los imports de `useAppContext` no llevan extensión,
// así que siguen resolviendo aquí sin cambios.
export const AppContext = createContext();

export const useAppContext = () => useContext(AppContext);
