import { createContext, useContext, useState } from "react";

const AppContext = createContext();

export function AppProvider({ children }) {
  // Estados globales iniciales
  const [slots, setSlots] = useState([false, false, false, false, false]);
  const [tickerItems, setTickerItems] = useState([]);
  const [mensajes, setMensajes] = useState([]);
  const [authUser, setAuthUser] = useState(null);
  const [notif, setNotif] = useState({
    open: false,
    type: "info",
    message: "",
  });

  const showNotif = (type, message) => {
    setNotif({ open: true, type, message });
  };

  return (
    <AppContext.Provider
      value={{
        slots,
        setSlots,
        tickerItems,
        setTickerItems,
        mensajes,
        setMensajes,
        authUser,
        setAuthUser,
        notif,
        setNotif,
        showNotif,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useAppContext = () => useContext(AppContext);
