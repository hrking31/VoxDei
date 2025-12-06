import { useEffect } from "react";
import { getDoc, doc, onSnapshot, collection } from "firebase/firestore";
import { database, db } from "../../Components/Firebase/Firebase";
import { ref, onValue } from "firebase/database";
import { useAppContext } from "../../Components/Context/AppContext";
import { useAuth } from "../../Components/Context/AuthContext.jsx";

export default function InicializarEstados() {
  const { user, userData, loading } = useAuth();
  const {
    setSlots,
    setTickerItems,
    setMessageItems,
    setVisibleTitulo,
    setVisibleTexto,
    setVisibleTicker,
    setVelocidadTicker,
    showNotif,
  } = useAppContext();

  useEffect(() => {
    if (loading || !user || !userData?.groupId) return;

    // Actualiza slots al iniciar
    const loadSlots = async () => {
      try {
        const estados = [];
        for (let i = 1; i <= 5; i++) {
          const snap = await getDoc(doc(db, "predicas", `predica${i}`));
          estados.push(snap.exists());
        }
        setSlots(estados);
      } catch (error) {
        console.error("Error al cargar los slots:", error);
        showNotif("error", "❌ No se pudieron cargar los slots");
      }
    };

    // Actualiza tickers en tiempo real
    const loadTickers = onSnapshot(collection(db, "tickers"), (snapshot) => {
      const data = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((item) => item.num >= 1 && item.num <= 6)
        .sort((a, b) => a.num - b.num);
      setTickerItems(data);
    });

    // Actualiza message en tiempo real
    const loadMessage = onSnapshot(collection(db, "messages"), (snapshot) => {
      const data = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((item) => item.num >= 1 && item.num <= 6)
        .sort((a, b) => a.num - b.num);
      setMessageItems(data);
    });

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
        if (data?.visibleTexto !== undefined) {
          setVisibleTexto(data.visibleTexto);
        }
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

    loadSlots();

    return () => {
      loadTickers();
      loadMessage();
      visibleTitulo();
      visibleTexto();
       visibleTicker();
      speedTicker();
    };
  }, [loading, user, userData?.groupId, setSlots]);

  return null;
}
