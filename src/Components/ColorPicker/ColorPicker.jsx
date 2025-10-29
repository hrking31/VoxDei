import { useState, useEffect } from "react";
import { HexColorPicker } from "react-colorful";

export default function ColorPicker() {
  const [color, setColor] = useState("app-black");

  // Cargar color guardado al iniciar
  useEffect(() => {
    const saved = localStorage.getItem("selectedColor");
    if (saved) setColor(saved);
  }, []);

  // Guardar color cada vez que cambia
  useEffect(() => {
    localStorage.setItem("selectedColor", color);
  }, [color]);

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen transition-colors duration-300"
      style={{ backgroundColor: color }}
    >
      <h2 className="text-white text-2xl font-semibold mb-6 text-center">
        🎨 Selecciona un color de fondo
      </h2>

      <div className="bg-white rounded-xl p-6 shadow-lg flex flex-col items-center gap-3">
        <HexColorPicker color={color} onChange={setColor} />
      </div>

      <p className="text-white mt-6 text-lg">
        Color actual: <strong>{color}</strong>
      </p>
    </div>
  );
}
