import { useRef, useState } from "react";
import { ESTILOS_POR_DEFECTO } from "../Estilos/EstilosProyeccion";
import { AppContext } from "./AppContext";
import { VERSION_POR_DEFECTO } from "../Biblia/versionesBiblia";
import { esBaja, formatoDe } from "../Hooks/formatoPantalla";

export function AppProvider({ children }) {
  // Estados globales iniciales
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  // celular | tableta | escritorio, y si el escritorio es bajo (Hooks/formatoPantalla.js).
  const [formatoPantalla, setFormatoPantalla] = useState(() => formatoDe(window.innerWidth));
  const [pantallaBaja, setPantallaBaja] = useState(() => esBaja(window.innerWidth, window.innerHeight));
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
  // Pantalla del templo: "apagada" | "oculta" | "ventana" | "maximizada" |
  // "encendida" (ver PantallaTemplo/presencia.js); null
  // mientras no se sabe. La llena InicializarEstados con la presencia.
  const [pantallaTemplo, setPantallaTemplo] = useState(null);
  // Aviso de un cambio de la pantalla del templo que se está mostrando:
  // { id, antes, ahora } o null. Lo pinta AvisoPantalla.
  const [avisoPantalla, setAvisoPantalla] = useState(null);
  // Datos de la iglesia: { nombre, sigla, logo } (iglesias/{g}/perfil/datos)
  const [iglesia, setIglesia] = useState(null);
  // Biblia elegida por la iglesia: "RVR1960" | "DHHS94" (TEMPORAL DHH). La
  // llena InicializarEstados desde iglesias/{g}/configuracion/biblia. Solo la
  // usa la sección Biblia; Prédica y Orden del culto leen siempre la RVR1960.
  const [versionBiblia, setVersionBiblia] = useState(VERSION_POR_DEFECTO);
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

  // `duracion` en milisegundos (4 s de fábrica).
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
        isDesktop,
        setIsDesktop,
        formatoPantalla,
        setFormatoPantalla,
        pantallaBaja,
        setPantallaBaja,
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
        avisoPantalla,
        setAvisoPantalla,
        iglesia,
        setIglesia,
        versionBiblia,
        setVersionBiblia,
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
