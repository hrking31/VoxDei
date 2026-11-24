// Copia de react-snowfall 2.4.0 (MIT, © 2018 Cahil Foley), portada a JavaScript.
// Ver LICENCIA.txt.
import { useEffect, useRef } from "react";
import { SnowfallCanvas } from "./SnowfallCanvas.js";
import { defaultConfig } from "./Snowflake.js";
import { useComponentSize, useDeepMemo, useSnowfallStyle } from "./hooks.js";

// Propiedades: las de `defaultConfig` (color, changeFrequency, radius, speed,
// wind, rotationSpeed, opacity, enable3DRotation, images), `snowflakeCount` y
// `style` (estilo extra para el elemento canvas).
export const Snowfall = ({
  color = defaultConfig.color,
  changeFrequency = defaultConfig.changeFrequency,
  radius = defaultConfig.radius,
  speed = defaultConfig.speed,
  wind = defaultConfig.wind,
  rotationSpeed = defaultConfig.rotationSpeed,
  opacity = defaultConfig.opacity,
  snowflakeCount = 150,
  images,
  enable3DRotation = defaultConfig.enable3DRotation,
  getSuelo, // añadida: altura de la nieve acumulada bajo cada x (ver Snowflake.js)
  onLand, // añadida: avisa cuando un copo aterriza
  style,
} = {}) => {
  const mergedStyle = useSnowfallStyle(style);

  const canvasRef = useRef(null);
  const canvasSize = useComponentSize(canvasRef);

  const config = useDeepMemo({
    color,
    changeFrequency,
    radius,
    speed,
    wind,
    rotationSpeed,
    images,
    snowflakeCount,
    opacity,
    enable3DRotation,
    getSuelo,
    onLand,
  });

  // La configuración con la que se crea la primera instancia
  const configRef = useRef(config);

  const snowfallCanvasRef = useRef();

  useEffect(() => {
    if (!snowfallCanvasRef.current && canvasRef.current) {
      snowfallCanvasRef.current = new SnowfallCanvas(canvasRef.current, configRef.current);
    }

    return () => {
      snowfallCanvasRef.current?.pause();
      snowfallCanvasRef.current = undefined;
    };
  }, []);

  useEffect(() => {
    if (snowfallCanvasRef.current) {
      snowfallCanvasRef.current.updateConfig(config);
    }
  }, [config]);

  return <canvas ref={canvasRef} height={canvasSize.height} width={canvasSize.width} style={mergedStyle} data-testid="SnowfallCanvas" />;
};

export default Snowfall;
