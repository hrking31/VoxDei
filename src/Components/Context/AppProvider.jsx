import { useRef, useState } from "react";
import { ESTILOS_POR_DEFECTO } from "../Estilos/EstilosProyeccion";
import { AppContext } from "./AppContext";

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
  // Pantalla de espera antes del servicio (logo + cuenta regresiva). Nodo
  // displayEspera de RTDB; se enciende desde Cronograma.
  const [visibleEspera, setVisibleEspera] = useState(false);
  // Pantalla del templo: "apagada" | "sin-completa" | "encendida"; null
  // mientras no se sabe. La llena InicializarEstados con la presencia.
  const [pantallaTemplo, setPantallaTemplo] = useState(null);
  // Datos de la iglesia: { nombre, sigla, logo } (iglesias/{g}/perfil/datos)
  const [iglesia, setIglesia] = useState(null);
  // Apariencia de la pantalla de proyección
  const [estilos, setEstilos] = useState(ESTILOS_POR_DEFECTO);
  const [authUser, setAuthUser] = useState(null);
  // Cronograma: servicios (Firestore), ensayo en curso (RTDB) y diferencia
  // entre el reloj del dispositivo y el del servidor. Los llena
  // InicializarEstados; useTurno los combina.
  const [servicios, setServicios] = useState([]);
  const [ensayo, setEnsayo] = useState(null);
  const [desfaseReloj, setDesfaseReloj] = useState(0);
  const [notif, setNotif] = useState({
    open: false,
    type: "info",
    message: "",
  });

  // Respuesta de la pregunta que está en pantalla, si la hay. Hay un solo
  // recuadro de avisos: si llega otro aviso u otra pregunta mientras una espera
  // respuesta, la tapa, y su promesa quedaba sin resolver para siempre (la
  // acción ni se hacía ni se cancelaba). Ahora la pregunta tapada cuenta como
  // «No», que es lo seguro: nada se borra sin un «Sí» explícito.
  const preguntaPendiente = useRef(null);

  const responderPendiente = (respuesta) => {
    preguntaPendiente.current?.(respuesta);
    preguntaPendiente.current = null;
  };

  // `duracion` en milisegundos; los avisos de la pantalla del templo usan 2 s.
  const showNotif = (type, message, duracion = 4000) => {
    responderPendiente(false);
    setNotif({ open: true, type, message, duracion });
  };

  const confirmAction = (message) => {
    responderPendiente(false);
    return new Promise((resolve) => {
      preguntaPendiente.current = resolve;
      setNotif({
        open: true,
        type: "confirm",
        message,
        onConfirm: () => responderPendiente(true),
        onCancel: () => responderPendiente(false),
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
        visibleEspera,
        setVisibleEspera,
        pantallaTemplo,
        setPantallaTemplo,
        iglesia,
        setIglesia,
        estilos,
        setEstilos,
        authUser,
        setAuthUser,
        servicios,
        setServicios,
        ensayo,
        setEnsayo,
        desfaseReloj,
        setDesfaseReloj,
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
