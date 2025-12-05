import { useEffect, useState } from "react";

export default function useScreenType() {
  const [screenType, setScreenType] = useState("desktop");

  useEffect(() => {
    const detectScreen = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isTouch = window.matchMedia("(pointer: coarse)").matches;

      // Proyector / TV / Pantalla gigante
      if (width >= 1600 && height >= 900 && !isTouch) {
        setScreenType("proyector");
      }
      // Móvil o tablet
      else if (isTouch && width < 1024) {
        setScreenType("movil");
      }
      // PC normal
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













