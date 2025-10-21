import { createContext, useContext, useState } from "react";

const AppContext = createContext();

export function AppProvider({ children }) {
  // Estados globales iniciales
  const [slots, setSlots] = useState([false, false, false, false, false]);
  const [tickerItems, setTickerItems] = useState([]);
  const [messageItems, setMessageItems] = useState([]);
  const [visiblePredica, setVisiblePredica] = useState("");
  const [visibleTitulo, setVisibleTitulo] = useState("");
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
        messageItems,
        setMessageItems,
        visiblePredica,
        setVisiblePredica,
        visibleTitulo,
        setVisibleTitulo,
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
