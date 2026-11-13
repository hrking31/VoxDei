import { useEffect } from "react";
import { onSnapshot } from "firebase/firestore";
import { database } from "../../Components/Firebase/Firebase";
import {
  colIglesia,
  docIglesia,
  TICKERS,
  MESSAGES,
  CONFIGURACION,
  ESTILOS,
  CRONOGRAMA,
  PERFIL,
  PERFIL_DATOS,
  BIBLIA_ELEGIDA,
} from "../../Components/Firebase/RutasIglesia";
import { VERSION_POR_DEFECTO, versionValida } from "../../Components/Biblia/versionesBiblia";
import { combinarEstilos } from "../../Components/Estilos/EstilosProyeccion";
import {
  NODO_PANTALLA,
  avisoDeCambio,
  estadoPantalla,
} from "../../Components/PantallaTemplo/presencia.js";
import { ref, onValue } from "firebase/database";
import { useAppContext } from "../../Components/Context/AppContext";
import { useAuth } from "../../Components/Context/AuthContext";
import { esBaja, formatoDe } from "../Hooks/formatoPantalla";

export default function InicializarEstados() {
  const { user, userData, loading } = useAuth();
  const {
    setIsDesktop,
    setFormatoPantalla,
    setPantallaBaja,
    setTickerItems,
    setMessageItems,
    setVisibleTitulo,
    setVisibleTexto,
    setVisibleTicker,
    setVisibleImagen,
    setVisibleVideo,
    setVisibleEspera,
    setPantallaTemplo,
    setAvisoPantalla,
    setIglesia,
    setVersionBiblia,
    setVelocidadTicker,
    setEstilos,
    setServicios,
    setEnsayo,
    setDesfaseReloj,
  } = useAppContext();

  // Detectar tamaño de pantalla
  useEffect(() => {
    const handler = () => {
      setIsDesktop(window.innerWidth >= 1024);
      setFormatoPantalla?.(formatoDe(window.innerWidth));
      setPantallaBaja?.(esBaja(window.innerWidth, window.innerHeight));
    };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  useEffect(() => {
    if (loading || !user || !userData?.groupId) return;

    const { groupId } = userData;

    // Actualiza tickers en tiempo real
    const loadTickers = onSnapshot(
      colIglesia(groupId, TICKERS),
      (snapshot) => {
        const data = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((item) => item.num >= 1 && item.num <= 6)
          .sort((a, b) => a.num - b.num);
        setTickerItems(data);
      }
    );

    // Actualiza message en tiempo real
    const loadMessage = onSnapshot(
      colIglesia(groupId, MESSAGES),
      (snapshot) => {
        const data = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((item) => item.num >= 1 && item.num <= 6)
          .sort((a, b) => a.num - b.num);
        setMessageItems(data);
      }
    );

    // Display Visible Titulo
    const visibleTitulo = onValue(
      ref(database, `displayVisibleTitulo/${userData.groupId}`),
      (snapshot) => {
        const data = snapshot.val();
        if (data?.visibleTitulo !== undefined) {
          setVisibleTitulo(data.visibleTitulo);
        }
      }
    );

    // Display Visible Texto
    const visibleTexto = onValue(
      ref(database, `displayVisibleTexto/${userData.groupId}`),
      (snapshot) => {
        const data = snapshot.val();
        // Sin nodo (iglesia nueva que nunca tocó el interruptor) el texto
        // arranca encendido: si no, nada de lo que se envía se ve en pantalla.
        setVisibleTexto(data?.visibleTexto ?? true);
      }
    );

    // Display Visible Ticker
    const visibleTicker = onValue(
      ref(database, `displayVisibleTicker/${userData.groupId}`),
      (snapshot) => {
        const data = snapshot.val();
        if (data?.visibleTicker !== undefined) {
          setVisibleTicker(data.visibleTicker);
        }
      }
    );

    // Display Visible Video
    const visibleVideo = onValue(
      ref(database, `displayVisibleVideo/${userData.groupId}`),
      (snapshot) => {
        const data = snapshot.val();
        if (data?.visibleVideo !== undefined) {
          setVisibleVideo(data.visibleVideo);
        }
      }
    );

    // Apariencia de la proyección, en vivo: al guardar desde el panel de
    // estilos, la pantalla del templo se actualiza sola.
    const estilosIglesia = onSnapshot(
      docIglesia(groupId, CONFIGURACION, ESTILOS),
      (snapshot) => {
        setEstilos(combinarEstilos(snapshot.data()));
      },
      (error) => {
        console.error("Error al cargar los estilos:", error);
      }
    );

    // Display Visible Imagen
    const visibleImagen = onValue(
      ref(database, `displayVisibleImagen/${userData.groupId}`),
      (snapshot) => {
        const data = snapshot.val();
        if (data?.visibleImagen !== undefined) {
          setVisibleImagen(data.visibleImagen);
        }
      }
    );

    // Cómo está la pantalla del templo (presencia de /VOXDEI). Al cambiar,
    // AvisoPantalla lo cuenta 2 s en todos los equipos, salvo en la propia
    // pantalla del templo, que se proyecta, y salvo al cargar (no es un cambio).
    let estadoAnterior = null;
    const enProyector = window.location.pathname.toUpperCase().startsWith("/VOXDEI");
    const pantalla = onValue(
      ref(database, `${NODO_PANTALLA}/${userData.groupId}`),
      (snapshot) => {
        const ahora = estadoPantalla(snapshot.val());
        const aviso = avisoDeCambio(estadoAnterior, ahora);
        if (aviso && !enProyector) setAvisoPantalla({ ...aviso, id: Date.now() });
        estadoAnterior = ahora;
        setPantallaTemplo(ahora);
      }
    );

    // Datos de la iglesia: nombre, sigla y logo.
    const datosIglesia = onSnapshot(
      docIglesia(userData.groupId, PERFIL, PERFIL_DATOS),
      (snapshot) => setIglesia(snapshot.data() || null),
      (error) => console.error("Error al cargar los datos de la iglesia:", error)
    );

    // Biblia elegida por la iglesia (TEMPORAL DHH). Sin ajuste, la RVR1960.
    const bibliaElegida = onSnapshot(
      docIglesia(userData.groupId, CONFIGURACION, BIBLIA_ELEGIDA),
      (snapshot) => setVersionBiblia(versionValida(snapshot.data()?.version)),
      (error) => console.error("Error al cargar la Biblia elegida:", error)
    );

    // Pantalla de espera antes del servicio. Sin nodo, apagada.
    const visibleEspera = onValue(
      ref(database, `displayEspera/${userData.groupId}`),
      (snapshot) => setVisibleEspera(snapshot.val()?.activa === true)
    );

    // Speed Ticker
    const speedTicker = onValue(
      ref(database, `speedTicker/${userData.groupId}`),
      (snapshot) => {
        const data = snapshot.val();
        if (data?.velocidad !== undefined) {
          setVelocidadTicker(data.velocidad);
        }
      }
    );

    // Cronograma: servicios, ensayo en curso y la hora del servidor. Con los
    // tres, useTurno decide quién puede proyectar en cada momento.
    const cronograma = onSnapshot(
      colIglesia(groupId, CRONOGRAMA),
      (snapshot) => {
        setServicios(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      (error) => {
        console.error("Error al cargar el cronograma:", error);
      }
    );

    const turnoEnsayo = onValue(
      ref(database, `turnoEnsayo/${groupId}`),
      (snapshot) => setEnsayo(snapshot.val())
    );

    // Diferencia entre el reloj de este dispositivo y el del servidor: así
    // todos cambian de turno a la vez aunque un celular esté adelantado.
    const desfase = onValue(ref(database, ".info/serverTimeOffset"), (snap) =>
      setDesfaseReloj(snap.val() || 0)
    );

    return () => {
      cronograma();
      turnoEnsayo();
      desfase();
      setServicios([]);
      setEnsayo(null);
      loadTickers();
      loadMessage();
      visibleTitulo();
      visibleTexto();
      visibleTicker();
      visibleImagen();
      visibleVideo();
      visibleEspera();
      pantalla();
      datosIglesia();
      bibliaElegida();
      setVersionBiblia(VERSION_POR_DEFECTO);
      setPantallaTemplo(null);
      setAvisoPantalla(null);
      setIglesia(null);
      estilosIglesia();
      speedTicker();
    };
  }, [loading, user, userData?.groupId]);

  return null;
}
