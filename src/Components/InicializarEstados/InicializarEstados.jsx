import { useEffect } from "react";
import { onSnapshot, collection } from "firebase/firestore";
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
    showNotif,
    setVisibleTitulo,
    setVisibleTexto,
    setVelocidadTicker,
  } = useAppContext();

  useEffect(() => {
    if (loading || !user || !userData?.groupId) return;

    // const loadSlots = async () => {
    //   try {
    //     const estados = [];
    //     for (let i = 1; i <= 5; i++) {
    //       const snap = await getDoc(doc(db, "predicas", `predica${i}`));
    //       estados.push(snap.exists());
    //     }
    //     setSlots(estados);
    //     // Notificación de éxito
    //   } catch (error) {
    //     console.error("Error al cargar los slots:", error);
    //     showNotif("error", "❌ No se pudieron cargar los slots");
    //   }
    // };

    // const loadTickers = async () => {
    //   try {
    //     const docs = await Promise.all(
    //       Array.from({ length: 6 }, (_, i) =>
    //         getDoc(doc(db, "tickers", `ticker${i + 1}`))
    //       )
    //     );

    //     const data = docs
    //       .filter((snap) => snap.exists())
    //       .map((snap) => snap.data());

    //     setTickerItems(data);
    //   } catch (error) {
    //     console.error("Error al cargar los tickers:", error);
    //     showNotif("error", "❌ No se pudieron cargar los tickers");
    //   }
    // };

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

    return () => {
      // loadSlots();
      loadTickers();
      loadMessage();
      visibleTitulo();
      visibleTexto();
      speedTicker();
    };
  }, [loading, user, userData?.groupId]);

  return null;
}
