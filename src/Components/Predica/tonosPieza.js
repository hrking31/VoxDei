// Un color por tipo de ítem del bosquejo (11 de noviembre de 2026, pedido del
// usuario: en el tapete cada recuadro sale con su color y se distingue a
// simple vista). Los cuatro de una paleta que mandó el usuario (sin el rosa),
// en neón para el fondo oscuro, con el color de adentro difuminado y un brillo
// suave en el borde:
//
//   Punto      violeta     (app-violeta, también los números I, II, III)
//   Versículo  aguamarina  (app-agua, con el ícono de la Biblia)
//   Imagen     rojo neón   (app-rojo-neon; lo pidió el usuario)
//   Mensaje    plata       (app-plata)
//
// El texto del contenido es igual en todos (app-texto); el color va en el
// borde, el brillo, el fondo, los números, la cita y los íconos. Nada de
// dorado (el usuario pidió no usarlo: ya está en muchas partes) ni verde (el
// tapete). El rojo de la imagen lo pidió el usuario; es más rosado que el de
// los errores (app-error) para no confundirse con un aviso. Fondos `fondo-pieza-*` y brillos `shadow-neon-*`
// en index.css. Las clases van completas para que Tailwind las vea.
const TONOS = {
  titulo: {
    caja: "border-app-violeta/60 fondo-pieza-punto shadow-neon-punto hover:border-app-violeta",
    elegida: "border-app-violeta fondo-pieza-punto shadow-neon-punto ring-2 ring-app-violeta/45",
    acento: "text-app-violeta",
    contorno: "border-app-violeta text-app-violeta hover:bg-app-violeta hover:text-app-dark",
    boton: "bg-app-violeta text-app-dark",
  },
  mensaje: {
    caja: "border-app-plata/40 fondo-pieza-mensaje shadow-neon-mensaje hover:border-app-plata",
    elegida: "border-app-plata fondo-pieza-mensaje shadow-neon-mensaje ring-2 ring-app-plata/35",
    acento: "text-app-plata",
    contorno: "border-app-plata text-app-plata hover:bg-app-plata hover:text-app-dark",
    boton: "bg-app-plata text-app-dark",
  },
  versiculo: {
    caja: "border-app-agua/60 fondo-pieza-versiculo shadow-neon-versiculo hover:border-app-agua",
    elegida: "border-app-agua fondo-pieza-versiculo shadow-neon-versiculo ring-2 ring-app-agua/45",
    acento: "text-app-agua",
    contorno: "border-app-agua text-app-agua hover:bg-app-agua hover:text-app-dark",
    boton: "bg-app-agua text-app-dark",
  },
  imagen: {
    caja: "border-app-rojo-neon/60 fondo-pieza-imagen shadow-neon-imagen hover:border-app-rojo-neon",
    elegida: "border-app-rojo-neon fondo-pieza-imagen shadow-neon-imagen ring-2 ring-app-rojo-neon/45",
    acento: "text-app-rojo-neon",
    contorno: "border-app-rojo-neon text-app-rojo-neon hover:bg-app-rojo-neon hover:text-app-dark",
    boton: "bg-app-rojo-neon text-app-dark",
  },
};

export const tonoPieza = (tipo) => TONOS[tipo] || TONOS.mensaje;
