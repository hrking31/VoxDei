import { useEffect, useState } from "react";

export default function useScreenType() {
  const [screenType, setScreenType] = useState("desktop");

  useEffect(() => {
    const detectScreen = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const minSide = Math.min(width, height);
      const isTouch = window.matchMedia("(pointer: coarse)").matches;

      // 🖥 Proyector / TV / Monitores grandes
      if (minSide >= 900 && width >= 1280 && !isTouch) {
        setScreenType("proyector");
      }
      // 📱 Teléfonos (incluye tableta pequeña)
      else if (isTouch && minSide < 820) {
        setScreenType("movil");
      }
      // 💻 Todo lo demás = desktop / laptop
      else {
        setScreenType("desktop");
      }
    };

    detectScreen();
    window.addEventListener("resize", detectScreen);

    return () => window.removeEventListener("resize", detectScreen);
  }, []);

  return screenType;
}
