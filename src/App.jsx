import { Routes, Route } from "react-router-dom";
import { ViewPanel, ViewDisplay, ViewSelector } from "./Views/index";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ViewSelector />} />
      <Route path="/viewpanel" element={<ViewPanel />} />
      <Route path="/viewdisplay" element={<ViewDisplay />} />
    </Routes>
  );
}
