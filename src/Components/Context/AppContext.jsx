import { createContext, useContext, useState } from "react";

const AppContext = createContext();

export function AppProvider({ children }) {
  // Estados globales iniciales
  const [slots, setSlots] = useState([false, false, false, false, false]);
  const [tickerItems, setTickerItems] = useState([]);
  const [messageItems, setMessageItems] = useState([]);
  const [velocidadTicker, setVelocidadTicker] = useState(2);
  const [visibleTitulo, setVisibleTitulo] = useState("");
  const [visibleTexto, setVisibleTexto] = useState("");
  const [visibleTicker, setVisibleTicker] = useState("");
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
