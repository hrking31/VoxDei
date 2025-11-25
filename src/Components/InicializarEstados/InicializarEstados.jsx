import { useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { database, db } from "../../Components/Firebase/Firebase";
import { ref, set, onValue } from "firebase/database";
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
    if (loading || !user) return;
    const loadSlots = async () => {
      try {
        const estados = [];
        for (let i = 1; i <= 5; i++) {
          const snap = await getDoc(doc(db, "predicas", `predica${i}`));
          estados.push(snap.exists());
        }
        setSlots(estados);
        // Notificación de éxito
      } catch (error) {
        console.error("Error al cargar los slots:", error);
        showNotif("error", "❌ No se pudieron cargar los slots");
      }
    };

    const loadTickers = async () => {
      try {
        const docs = await Promise.all(
          Array.from({ length: 6 }, (_, i) =>
            getDoc(doc(db, "tickers", `ticker${i + 1}`))
          )
        );

        const data = docs
          .filter((snap) => snap.exists())
          .map((snap) => snap.data());

        setTickerItems(data);
      } catch (error) {
        console.error("Error al cargar los tickers:", error);
        showNotif("error", "❌ No se pudieron cargar los tickers");
      }
    };

    const loadMessage = async () => {
      try {
        const docs = await Promise.all(
          Array.from({ length: 6 }, (_, i) =>
            getDoc(doc(db, "messages", `message${i + 1}`))
          )
        );

        const data = docs
          .filter((snap) => snap.exists())
          .map((snap) => snap.data());

        setMessageItems(data);
      } catch (error) {
        console.error("Error al cargar los mensajess:", error);
        showNotif("error", "❌ No se pudieron cargar los mensajes");
      }
    };

    // Display Visible Titulo
    // const visibleTitulo = async () => {
    //   const visibleRef = ref(database, `displayVisibleTitulo/${user.uid}`);
    //   const unsubscribe = onValue(visibleRef, (snapshot) => {
    //     const data = snapshot.val();

    //     if (data && typeof data.visibleTitulo === "boolean") {
    //       setVisibleTitulo(data.visibleTitulo);
    //     }
    //   });
    //   return () => unsubscribe();
    // };

    const visibleTitulo = async () => {
       if (!userData || !userData.groupId) return;
      const visibleRef = ref(
        database,
        `displayVisibleTitulo/${userData.groupId}`
      );

      // Escribe el valor inicial false si no existe
      set(visibleRef, { visibleTitulo: false, timestamp: Date.now() });

      const unsubscribe = onValue(visibleRef, (snapshot) => {
        const data = snapshot.val();
        if (data && typeof data.visibleTitulo === "boolean") {
          setVisibleTitulo(data.visibleTitulo);
        }
      });
      return () => unsubscribe();
    };

    //Display Visible Texto
    // const visibleTexto = async () => {
    //   const visibleRef = ref(database, `displayVisibleTexto/${user.uid}`);
    //   const unsubscribe = onValue(visibleRef, (snapshot) => {
    //     const data = snapshot.val();

    //     if (data && typeof data.visibleTexto === "boolean") {
    //       setVisibleTexto(data.visibleTexto);
    //     }
    //   });
    //   return () => unsubscribe();
    // };

    const visibleTexto = async () => {
       if (!userData || !userData.groupId) return;
      const visibleRef = ref(
        database,
        `displayVisibleTexto/${userData.groupId}`
      );

      set(visibleRef, { visibleTexto: false, timestamp: Date.now() });

      const unsubscribe = onValue(visibleRef, (snapshot) => {
        const data = snapshot.val();
        if (data && typeof data.visibleTexto === "boolean") {
          setVisibleTexto(data.visibleTexto);
        }
      });
      return () => unsubscribe();
    };

    // Speed Ticker
    const speedTicker = async () => {
       if (!userData || !userData.groupId) return;
      const speedRef = ref(
        database,
        `speedTicker/${userData.groupId}}`
      );
      const unsubscribe = onValue(speedRef, (snapshot) => {
        const data = snapshot.val();

        if (data && typeof data.velocidad !== undefined) {
          setVelocidadTicker(data.velocidad);
        }
      });
      return () => unsubscribe();
    };

    loadSlots();
    loadTickers();
    loadMessage();
    visibleTitulo();
    visibleTexto();
    speedTicker();
  }, [
    loading,
    user,
    setSlots,
    setTickerItems,
    setMessageItems,
    setVisibleTitulo,
    setVisibleTexto,
    setVelocidadTicker,
  ]);

  return null;
}
