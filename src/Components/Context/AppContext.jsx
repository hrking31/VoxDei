import { createContext, useContext, useState } from "react";
import { ESTILOS_POR_DEFECTO } from "../Estilos/EstilosProyeccion";

const AppContext = createContext();

export function AppProvider({ children }) {
  // Estados globales iniciales
  const [slots, setSlots] = useState([false, false, false, false, false]);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const [tickerItems, setTickerItems] = useState([]);
  const [messageItems, setMessageItems] = useState([]);
  const [velocidadTicker, setVelocidadTicker] = useState(2);
  const [visibleTitulo, setVisibleTitulo] = useState("");
  const [visibleTexto, setVisibleTexto] = useState("");
  const [visibleTicker, setVisibleTicker] = useState("");
  const [visibleImagen, setVisibleImagen] = useState(false);
  const [visibleVideo, setVisibleVideo] = useState(false);
  // Apariencia de la pantalla de proyección
  const [estilos, setEstilos] = useState(ESTILOS_POR_DEFECTO);
  const [authUser, setAuthUser] = useState(null);
  const [notif, setNotif] = useState({
    open: false,
    type: "info",
    message: "",
  });

  const showNotif = (type, message) => {
    setNotif({ open: true, type, message });
  };

  const confirmAction = (message) => {
    return new Promise((resolve) => {
      setNotif({
        open: true,
        type: "confirm",
        message,
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });
  };

  return (
    <AppContext.Provider
      value={{
        slots,
        setSlots,
        isDesktop,
        setIsDesktop,
        tickerItems,
        setTickerItems,
        velocidadTicker,
        setVelocidadTicker,
        messageItems,
        setMessageItems,
        visibleTitulo,
        setVisibleTitulo,
        visibleTexto,
        setVisibleTexto,
        visibleTicker,
        setVisibleTicker,
        visibleImagen,
        setVisibleImagen,
        visibleVideo,
        setVisibleVideo,
        estilos,
        setEstilos,
        authUser,
        setAuthUser,
        notif,
        setNotif,
        showNotif,
        confirmAction,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useAppContext = () => useContext(AppContext);
