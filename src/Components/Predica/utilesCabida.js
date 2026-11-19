import { numerosDePuntos, piezaCompleta, textoDePunto } from "./utilesPredica.js";

// El semáforo de cabida de los ítems del bosquejo (18-11-2026, pedido del usuario):
// qué ítems no caben en la pantalla del templo, de un vistazo. Lógica pura.

// El aviso de cada estado (el «bien» no lleva aviso).
export const TEXTO_CABIDA = {
  justo: "Va muy justo en la pantalla del templo",
  "no-cabe": "No cabe en la pantalla del templo: se cortaría",
};

// Lo que hay que medir de una prédica: cada ítem con texto, tal como se
// proyecta en el púlpito. Un punto sale como mensaje con su número («I. La fe…»),
// un versículo con su cita y la versión de su Biblia, un mensaje tal cual. Las
// imágenes no se miden (ocupan todo el centro sin texto) ni los recuadros vacíos.
export function elementosParaMedir(piezas, numeracion, numeracionNiveles) {
  const numeros = numerosDePuntos(piezas, numeracion, numeracionNiveles);
  return piezas.filter(piezaCompleta).flatMap((pieza) => {
    if (pieza.tipo === "imagen") return [];
    if (pieza.tipo === "versiculo") {
      return [
        {
          id: pieza.id,
          centro: {
            tipo: "versiculo",
            contenido: {
              cita: pieza.contenido?.cita || "",
              texto: pieza.contenido?.texto || "",
              // El púlpito no manda título con el versículo
              titulo: "",
              version: pieza.contenido?.version || "RVR1960",
            },
          },
        },
      ];
    }
    const texto = pieza.tipo === "titulo" ? textoDePunto(numeros[pieza.id], pieza.contenido) : String(pieza.contenido || "");
    return [{ id: pieza.id, centro: { tipo: "mensaje", contenido: texto } }];
  });
}
