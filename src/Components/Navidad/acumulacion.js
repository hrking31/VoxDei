// La nieve que se acumula abajo (Navidad, 24 de noviembre de 2026, pedido del
// usuario): cada copo que aterriza suma un poco de altura en su zona, y la pila
// crece despacio hasta una capa baja con relieve. Es solo la lógica; la dibuja
// `PilaDeNieve.jsx` y los copos la consultan con `getSuelo` / `onLand` (ver
// Nieve/Snowflake.js).
export const ANCHO_COLUMNA = 4; // px que cubre cada columna de la pila
export const ALTO_MAXIMO = 20; // px: la capa nunca pasa de aquí, para no tapar lo de abajo
const ALCANCE = 3; // columnas a cada lado donde se reparte un copo
const PENDIENTE = 1.2; // desnivel máximo entre dos columnas vecinas (la nieve no se apila en pared)

/**
 * Cuánta altura suma cada copo para que la pila se llene en `segundos`. Depende
 * del ancho y de cuántos copos caen: en un celular, con menos copos y menos
 * ancho, cada uno suma menos pero igual se llena en el mismo tiempo.
 */
export function aportePorCopo({ ancho, alto = ALTO_MAXIMO, copos, altoVentana, segundos = 150, velocidadMedia = 1.4, llenado = 0.8 }) {
  const columnas = Math.ceil(ancho / ANCHO_COLUMNA);
  const total = columnas * alto * llenado;
  const aterrizajesPorSegundo = (copos * 60 * velocidadMedia) / altoVentana;
  return total / (aterrizajesPorSegundo * segundos);
}

export class Acumulacion {
  constructor({ ancho, alto = ALTO_MAXIMO, aporte = 1 }) {
    this.alto = alto;
    this.aporte = aporte;
    this.alturas = new Float32Array(0);
    this.tope = new Float32Array(0);
    /** Se llama cada vez que cambia la pila, para volver a dibujarla. */
    this.alCambiar = null;
    /** Altura promedio de la pila, en px enteros. Solo sube. Es el promedio y no el pico, para
     *  que el espacio de abajo suba con la masa de nieve que se ve y no por delante de ella. */
    this.altoActual = 0;
    /** Se llama con el nuevo `altoActual` cada vez que sube un píxel: el espacio que la
     *  nieve reserva abajo de la pantalla crece con la pila (ver `EspacioNieve`). */
    this.alCrecer = null;
    this.redimensionar(ancho);
  }

  get columnas() {
    return this.alturas.length;
  }

  // El tope de cada columna ondula suavemente, para que la capa no quede plana
  static topeEn(i, alto) {
    const onda = 0.5 + 0.5 * Math.sin(i * 0.21) * Math.cos(i * 0.07 + 1);
    return alto * (0.7 + 0.3 * onda);
  }

  /** Cambia el ancho conservando la forma que ya tenía la pila. */
  redimensionar(ancho) {
    const columnas = Math.max(1, Math.ceil(ancho / ANCHO_COLUMNA));
    if (columnas === this.columnas) return;
    const antes = this.alturas;
    const nuevas = new Float32Array(columnas);
    if (antes.length > 0) {
      for (let i = 0; i < columnas; i++) nuevas[i] = antes[Math.min(antes.length - 1, Math.round((i / columnas) * antes.length))];
    }
    this.alturas = nuevas;
    this.tope = Float32Array.from({ length: columnas }, (_, i) => Acumulacion.topeEn(i, this.alto));
    this.alCambiar?.();
  }

  /** Un copo aterrizó en `x` (px): suma altura repartida a su alrededor. */
  deposita(x) {
    const centro = Math.min(this.columnas - 1, Math.max(0, Math.floor(x / ANCHO_COLUMNA)));
    // Reparto en campana: más en el centro que en los lados
    const pesos = Array.from({ length: ALCANCE * 2 + 1 }, (_, k) => Math.exp(-(((k - ALCANCE) / 1.6) ** 2)));
    const suma = pesos.reduce((a, b) => a + b, 0);
    for (let k = -ALCANCE; k <= ALCANCE; k++) {
      const i = centro + k;
      if (i < 0 || i >= this.columnas) continue;
      this.alturas[i] = Math.min(this.tope[i], this.alturas[i] + (this.aporte * pesos[k + ALCANCE]) / suma);
    }
    this.relaja(centro - ALCANCE - 3, centro + ALCANCE + 3);
    let total = 0;
    for (let i = 0; i < this.columnas; i++) total += this.alturas[i];
    const alto = Math.round(total / this.columnas);
    if (alto > this.altoActual) {
      this.altoActual = alto;
      this.alCrecer?.(alto);
    }
    this.alCambiar?.();
  }

  // Si una columna quedó mucho más alta que su vecina, la nieve resbala hacia ella.
  // La zona revisada se ensancha en cada pasada, para que el desnivel se vaya
  // repartiendo hacia afuera y no quede una pared al borde de la zona revisada.
  relaja(desde, hasta) {
    for (let pasada = 0; pasada < 30; pasada++) {
      const a = Math.max(0, desde - pasada);
      const b = Math.min(this.columnas - 2, hasta + pasada);
      for (let i = a; i <= b; i++) {
        const desnivel = this.alturas[i] - this.alturas[i + 1];
        if (Math.abs(desnivel) > PENDIENTE) {
          const mueve = (Math.abs(desnivel) - PENDIENTE) / 2;
          const signo = Math.sign(desnivel);
          this.alturas[i] -= signo * mueve;
          this.alturas[i + 1] += signo * mueve;
        }
      }
    }
  }

  /** Altura de la pila (px) bajo `x`, interpolada entre columnas. */
  alturaEn(x) {
    const posicion = Math.min(this.columnas - 1, Math.max(0, x / ANCHO_COLUMNA - 0.5));
    const i = Math.floor(posicion);
    const fraccion = posicion - i;
    const siguiente = Math.min(this.columnas - 1, i + 1);
    return this.alturas[i] * (1 - fraccion) + this.alturas[siguiente] * fraccion;
  }
}
