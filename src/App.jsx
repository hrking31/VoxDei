import { Routes, Route } from "react-router-dom";
import {
  ViewSelector,
  ViewDisplay,
  ViewStylos,
  ViewTicker,
  ViewMessage,
  ViewPredica,
  ViewVersiculo,
} from "./Views/index";
import { AppProvider } from "./Components/Context/AppContext";
import InicializarEstados from "./Components/InicializarEstados/InicializarEstados";
import Notificaciones from "./Components/Notificaciones/Notificaciones";

export default function App() {

  return (
    <AppProvider>
      <InicializarEstados />
      <Notificaciones/>
      <Routes>
        <Route path="/" element={<ViewSelector />} />
        <Route path="/viewdisplay" element={<ViewDisplay />} />
        <Route path="/ViewStylos" element={<ViewStylos />} />
        <Route path="/viewTicker" element={<ViewTicker />} />
        <Route path="/ViewMessage" element={<ViewMessage />} />
        <Route path="/ViewPredica" element={<ViewPredica />} />
        <Route path="/ViewVersiculo" element={<ViewVersiculo />} />
      </Routes>
    </AppProvider>
  );
}
