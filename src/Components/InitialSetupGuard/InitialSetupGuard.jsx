// import { useEffect, useState } from "react";
// import { collection, getDocs } from "firebase/firestore";
// import { db } from "../../Components/Firebase/Firebase";
// import { Navigate } from "react-router-dom";
// import Loading from "../Loading/Loading.jsx";

// export default function InitialSetupGuard() {
//   const [loading, setLoading] = useState(true);
//   const [firstUserExists, setFirstUserExists] = useState(null);

//   useEffect(() => {
//     const checkUsers = async () => {
//       try {
//         const snapshot = await getDocs(collection(db, "users"));
//         const hasUsers = snapshot.size > 0;
//         setFirstUserExists(hasUsers);
//       } catch (err) {
//         console.error("Error verificando usuarios:", err);
//       } finally {
//         setLoading(false);
//       }
//     };

//     checkUsers();
//   }, []);

//   if (loading) return <Loading text="Iniciando..." />;

//   // Si ya hay usuarios ir a login
//   if (firstUserExists) return <Navigate to="/ViewLogin" replace />;

//   // Si no hay usuarios ir a la pagina inicial
//   return <Navigate to="/ViewInitialSetup" replace />;
// }