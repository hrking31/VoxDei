// Copia de react-snowfall 2.4.0 (MIT, © 2018 Cahil Foley), portada a JavaScript.
// Ver LICENCIA.txt.
import Snowflake, { defaultConfig } from "./Snowflake.js";
import { targetFrameTime } from "./config.js";

// La configuración es la de `Snowflake` más `snowflakeCount` (cantidad de
// copos, 150 si no se indica).
export class SnowfallCanvas {
  lastUpdate = Date.now();
  snowflakes = [];
  animationFrame = undefined;

  #ctx;
  get ctx() {
    return this.#ctx;
  }

  #canvas;
  get canvas() {
    return this.#canvas;
  }
  set canvas(canvas) {
    this.#canvas = canvas;
    this.#ctx = canvas.getContext("2d");
  }

  constructor(canvas, config) {
    this.#canvas = canvas;
    this.#ctx = canvas.getContext("2d");
    this.config = { snowflakeCount: 150, ...defaultConfig, ...config };
    this.snowflakes = [];
    this.snowflakes = Snowflake.createSnowflakes(canvas, config.snowflakeCount || 150, config);
    this.play();
  }

  /**
   * Actualiza la configuración. Si cambió la cantidad de copos, crea o quita los
   * necesarios conservando la posición de la mayor cantidad posible de los que ya
   * existen.
   */
  updateConfig(config) {
    this.config = { ...this.config, ...config };

    const sizeDifference = this.config.snowflakeCount - this.snowflakes.length;

    if (sizeDifference > 0) {
      this.snowflakes = [...this.snowflakes, ...Snowflake.createSnowflakes(this.canvas, sizeDifference, config)];
    }

    if (sizeDifference < 0) {
      this.snowflakes = this.snowflakes.slice(0, this.config.snowflakeCount);
    }

    for (const snowflake of this.snowflakes) {
      snowflake.updateConfig(this.config);
    }
  }

  /**
   * Mueve cada copo según los cuadros que pasaron, limpia el canvas y dibuja
   * cada copo.
   */
  render(framesPassed = 1) {
    const { ctx, canvas, snowflakes } = this;

    if (!ctx || !canvas) return;

    const { offsetWidth, offsetHeight } = canvas;

    for (const snowflake of snowflakes) {
      snowflake.update(offsetWidth, offsetHeight, framesPassed);
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, offsetWidth, offsetHeight);

    // Con imágenes, cada una se dibuja por separado
    if (this.config.images && this.config.images.length > 0) {
      for (const snowflake of snowflakes) {
        snowflake.drawImage(ctx);
      }
      return;
    }

    // Sin imágenes y con giro en 3D, cada círculo se dibuja con su transformación
    if (this.config.enable3DRotation) {
      for (const snowflake of snowflakes) {
        snowflake.drawCircle3D(ctx, this.config.color);
      }
    } else {
      // Todos los círculos en un solo trazado, que rinde más
      ctx.beginPath();
      for (const snowflake of snowflakes) {
        snowflake.drawCircle(ctx);
      }
      ctx.fillStyle = this.config.color;
      ctx.fill();
    }
  }

  /**
   * El ciclo de la animación: calcula el tiempo desde el último dibujo y mueve
   * los copos en consecuencia, para que un equipo lento no los haga caer más
   * despacio.
   */
  loop() {
    const now = Date.now();
    const msPassed = Date.now() - this.lastUpdate;
    this.lastUpdate = now;

    // Cuadros que habrían pasado a 60 por segundo
    const framesPassed = msPassed / targetFrameTime;

    this.render(framesPassed);

    this.animationFrame = requestAnimationFrame(() => this.loop());
  }

  /** Empieza la animación. */
  play() {
    this.loop();
  }

  /** Pausa la animación. */
  pause() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = undefined;
    }
  }
}

export default SnowfallCanvas;
