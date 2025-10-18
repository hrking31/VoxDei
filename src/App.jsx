import { Routes, Route } from "react-router-dom";
import {
  ViewTicker,
  ViewMessage,
  ViewVersiculo,
  ViewVersiculos,
  ViewDisplay,
  ViewSelector,
  ViewPredica,
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
        <Route path="/viewTicker" element={<ViewTicker />} />
        <Route path="/ViewMessage" element={<ViewMessage />} />
        <Route path="/ViewVersiculo" element={<ViewVersiculo />} />
        <Route path="/ViewVersiculos" element={<ViewVersiculos />} />
        <Route path="/ViewPredica" element={<ViewPredica />} />
      </Routes>
    </AppProvider>
  );
}
