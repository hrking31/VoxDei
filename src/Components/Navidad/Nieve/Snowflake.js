// Copia de react-snowfall 2.4.0 (MIT, © 2018 Cahil Foley), portada a JavaScript.
// Ver LICENCIA.txt. Diferencia: `igualProfundo` en lugar de `react-fast-compare`.
import { igualProfundo, lerp, random, randomElement, twoPi } from "./utils.js";

// Valores de cada copo (todos opcionales al pasarlos):
//  color            color del copo, cualquier color CSS.
//  radius           [mín, máx] del radio; se elige al azar dentro del rango. [0.5, 3.0]
//  speed            [mín, máx] de la velocidad vertical. [1.0, 3.0]
//  wind             [mín, máx] de la velocidad horizontal. [-0.5, 2.0]
//  changeFrequency  cada cuántos cuadros cambian el viento y la velocidad. 200
//  images           imágenes que se dibujan como copos en lugar de círculos.
//  rotationSpeed    [mín, máx] de grados por cuadro (solo con imágenes). [-1.0, 1.0]
//  opacity          [mín, máx] de la opacidad (solo con imágenes). [1, 1]
//  enable3DRotation giro en X e Y además de Z, como hojas que caen. false
//  getSuelo, onLand AÑADIDAS (no existen en react-snowfall): `getSuelo(x)` da la altura
//                   de la nieve acumulada bajo ese x, y `onLand(x, radio, ancho)` avisa
//                   cuando un copo aterriza. Ver Navidad/acumulacion.js.
export const defaultConfig = {
  color: "#dee4fd",
  radius: [0.5, 3.0],
  speed: [1.0, 3.0],
  wind: [-0.5, 2.0],
  changeFrequency: 200,
  rotationSpeed: [-1.0, 1.0],
  opacity: [1, 1],
  enable3DRotation: false,
};

/**
 * Un copo individual: cambia de lugar en cada `update` y se dibuja en cada
 * `draw`.
 */
class Snowflake {
  static offscreenCanvases = new WeakMap();

  /** Crea una colección de copos. */
  static createSnowflakes(canvas, amount, config) {
    if (!canvas) return [];

    const snowflakes = [];

    for (let i = 0; i < amount; i++) {
      snowflakes.push(new Snowflake(canvas, config));
    }

    return snowflakes;
  }

  constructor(canvas, config = {}) {
    // Configuración propia
    this.updateConfig(config);

    // Parámetros iniciales
    const { radius, wind, speed, rotationSpeed, opacity, enable3DRotation } = this.config;

    this.params = {
      x: random(0, canvas.offsetWidth),
      y: random(-canvas.offsetHeight, 0),
      rotation: random(0, 360),
      radius: random(...radius),
      speed: random(...speed),
      wind: random(...wind),
      rotationSpeed: random(...rotationSpeed),
      nextSpeed: random(...speed),
      nextWind: random(...wind),
      nextRotationSpeed: random(...rotationSpeed),
      opacity: random(...opacity),
      hasNextOpacity: false,
      // Parámetros del giro en 3D
      rotationX: enable3DRotation ? random(0, 360) : 0,
      rotationY: enable3DRotation ? random(0, 360) : 0,
      rotationSpeedX: enable3DRotation ? random(-2.0, 2.0) : 0,
      rotationSpeedY: enable3DRotation ? random(-2.0, 2.0) : 0,
      nextRotationSpeedX: enable3DRotation ? random(-2.0, 2.0) : 0,
      nextRotationSpeedY: enable3DRotation ? random(-2.0, 2.0) : 0,
    };

    this.framesSinceLastUpdate = 0;
  }

  selectImage() {
    if (this.config.images && this.config.images.length > 0) {
      this.image = randomElement(this.config.images);
    } else {
      this.image = undefined;
    }
  }

  updateConfig(config) {
    const previousConfig = this.config;
    this.config = { ...defaultConfig, ...config };
    this.config.changeFrequency = random(this.config.changeFrequency, this.config.changeFrequency * 1.5);

    // El radio no cambia solo poco a poco: si la configuración cambió, se vuelve a elegir
    if (this.params && !igualProfundo(this.config.radius, previousConfig?.radius)) {
      this.params.radius = random(...this.config.radius);
    }

    if (!igualProfundo(this.config.images, previousConfig?.images)) {
      this.selectImage();
    }

    if (previousConfig?.opacity && !igualProfundo(this.config.opacity, previousConfig?.opacity)) {
      this.params.hasNextOpacity = true;
    }
  }

  updateTargetParams() {
    this.params.nextSpeed = random(...this.config.speed);
    this.params.nextWind = random(...this.config.wind);
    if (this.image) {
      this.params.nextRotationSpeed = random(...this.config.rotationSpeed);
    }
    if (this.config.enable3DRotation) {
      this.params.nextRotationSpeedX = random(-2.0, 2.0);
      this.params.nextRotationSpeedY = random(-2.0, 2.0);
    }
  }

  update(offsetWidth, offsetHeight, framesPassed = 1) {
    const { x, y, rotation, rotationSpeed, nextRotationSpeed, wind, speed, nextWind, nextSpeed, radius } = this.params;

    // Nueva posición; si sale del canvas, vuelve a entrar por el otro lado
    this.params.x = (x + wind * framesPassed) % (offsetWidth + radius * 2);
    if (this.params.x > offsetWidth + radius) this.params.x = -radius;
    this.params.y = (y + speed * framesPassed) % (offsetHeight + radius * 2);
    // DIFERENCIA CON react-snowfall (24 de noviembre de 2026, nieve acumulada): con
    // `getSuelo(x)` el copo aterriza donde empieza la pila de nieve, y avisa con
    // `onLand`. Sin esas dos opciones (suelo 0) funciona exactamente como el original.
    const suelo = this.config.getSuelo ? this.config.getSuelo(this.params.x) : 0;
    if (this.params.y > offsetHeight + radius - suelo) {
      this.config.onLand?.(this.params.x, radius, offsetWidth);
      if (this.params.hasNextOpacity) {
        this.params.opacity = random(...this.config.opacity);
        this.params.hasNextOpacity = false;
      }
      this.params.y = -radius;
    }

    // Giro
    if (this.image || this.config.enable3DRotation) {
      this.params.rotation = (rotation + rotationSpeed) % 360;
    }

    // Giro en 3D
    if (this.config.enable3DRotation) {
      this.params.rotationX = (this.params.rotationX + this.params.rotationSpeedX * framesPassed) % 360;
      this.params.rotationY = (this.params.rotationY + this.params.rotationSpeedY * framesPassed) % 360;
    }

    // El viento, la velocidad y el giro se acercan poco a poco a los valores deseados
    this.params.speed = lerp(speed, nextSpeed, 0.01);
    this.params.wind = lerp(wind, nextWind, 0.01);
    this.params.rotationSpeed = lerp(rotationSpeed, nextRotationSpeed, 0.01);

    if (this.config.enable3DRotation) {
      this.params.rotationSpeedX = lerp(this.params.rotationSpeedX, this.params.nextRotationSpeedX, 0.01);
      this.params.rotationSpeedY = lerp(this.params.rotationSpeedY, this.params.nextRotationSpeedY, 0.01);
    }

    if (this.framesSinceLastUpdate++ > this.config.changeFrequency) {
      this.updateTargetParams();
      this.framesSinceLastUpdate = 0;
    }
  }

  getImageOffscreenCanvas(image, size) {
    if (image instanceof HTMLImageElement && image.loading) return image;
    let sizes = Snowflake.offscreenCanvases.get(image);

    if (!sizes) {
      sizes = {};
      Snowflake.offscreenCanvases.set(image, sizes);
    }

    if (!(size in sizes)) {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      canvas.getContext("2d")?.drawImage(image, 0, 0, size, size);
      sizes[size] = canvas;
    }

    return sizes[size] ?? image;
  }

  /**
   * Aplica al canvas la transformación del giro (en 3D o solo en 2D).
   * `setTransform` recibe: a (escala X), b (inclinación Y), c (inclinación X),
   * d (escala Y), e (traslado X) y f (traslado Y).
   */
  apply3DTransform(ctx, x, y) {
    if (this.config.enable3DRotation) {
      const { rotationX, rotationY } = this.params;
      const rotation = this.params.rotation || 0;

      // De grados a radianes
      const radX = (rotationX * Math.PI) / 180;
      const radY = (rotationY * Math.PI) / 180;
      const radZ = (rotation * Math.PI) / 180;

      const cosX = Math.cos(radX);
      const sinX = Math.sin(radX);
      const cosY = Math.cos(radY);
      const sinY = Math.sin(radY);
      const cosZ = Math.cos(radZ);
      const sinZ = Math.sin(radZ);

      // Matriz combinada (Z * Y * X): el efecto de caer dando vueltas
      const a = cosZ * cosY;
      const b = cosZ * sinY * sinX - sinZ * cosX;
      const c = cosZ * sinY * cosX + sinZ * sinX;
      const d = sinZ * cosY;

      ctx.setTransform(a, b, c, d, x, y);
    } else {
      // Giro normal en 2D (solo con imágenes)
      const rotation = this.params.rotation || 0;
      const radian = (rotation * Math.PI) / 180;
      const cos = Math.cos(radian);
      const sin = Math.sin(radian);

      ctx.setTransform(cos, sin, -sin, cos, x, y);
    }
  }

  /**
   * Dibuja un copo circular. Solo sin imágenes. Supone que ya se empezó un
   * trazado (`ctx.beginPath()`); después hay que poner el `fillStyle` y llamar a
   * `ctx.fill()`, que pinta todos los copos desde el último `beginPath()`.
   */
  drawCircle(ctx) {
    ctx.moveTo(this.params.x, this.params.y);
    ctx.arc(this.params.x, this.params.y, this.params.radius, 0, twoPi);
  }

  /** Dibuja un copo circular con giro en 3D (con `enable3DRotation` y sin imágenes). */
  drawCircle3D(ctx, color) {
    const { x, y, radius } = this.params;

    ctx.save();

    if (this.config.enable3DRotation) {
      this.apply3DTransform(ctx, x, y);
    } else {
      ctx.translate(x, y);
    }

    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, twoPi);
    ctx.fillStyle = color;
    ctx.fill();

    ctx.restore();
  }

  /** Dibuja un copo con imagen. Solo si la configuración trae imágenes. */
  drawImage(ctx) {
    const { x, y, radius } = this.params;

    // Se guarda el estado para no afectar los demás dibujos
    ctx.save();

    if (this.params.opacity !== 1) {
      ctx.globalAlpha = this.params.opacity;
    }

    this.apply3DTransform(ctx, x, y);

    // La imagen se dibuja con su centro en el centro del lugar actual
    const image = this.getImageOffscreenCanvas(this.image, radius);
    ctx.drawImage(image, -(radius / 2), -(radius / 2), radius, radius);

    ctx.restore();
  }
}

export default Snowflake;
