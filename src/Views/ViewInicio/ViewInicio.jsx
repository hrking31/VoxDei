import Footer from "../../Components/Footer/Footer.jsx";
import FranjaTurno from "../../Components/Cronograma/FranjaTurno.jsx";
import ResumenDia from "../../Components/ResumenDia/ResumenDia.jsx";

// Inicio del panel (9 de noviembre de 2026): el resumen del día. Reemplazó a
// /ViewGestion, una cuadrícula con todas las secciones que, con la barra
// lateral y la inferior, ya sobraba. Ahora responde «¿qué toca hoy?».
//
// No lleva ficha de usuario: tu foto y «Cerrar sesión» están en la barra
// lateral (computador) y en «Más» (celular).
export default function ViewInicio() {
  return (
    <div className="min-h-pantalla flex flex-col bg-linear-to-b from-app-dark/50 to-app-light/50">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-3 py-4">
        <h1 className="text-2xl font-bold text-app-main">Hoy</h1>
        <FranjaTurno />
        <ResumenDia />
      </div>
      <Footer />
    </div>
  );
}
