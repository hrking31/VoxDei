import { Routes, Route } from "react-router-dom";
import { ViewTicker, ViewMessage, ViewVersiculo, ViewVersiculos, ViewDisplay, ViewSelector } from "./Views/index";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ViewSelector />} />
      <Route path="/viewdisplay" element={<ViewDisplay />} />
      <Route path="/viewTicker" element={<ViewTicker />} />
      <Route path="/ViewMessage" element={<ViewMessage />} />
      <Route path="/ViewVersiculo" element={<ViewVersiculo />} />
      <Route path="/ViewVersiculos" element={<ViewVersiculos />} />
    </Routes>
  );
}
