import { chiado, melodia, tom } from "../kit/som";

// O elástico esticando: a nota sobe com a força.
export const somMira = (forca: number) => tom({ de: 220 + forca * 440, dura: 0.04, onda: "triangle", volume: 0.06 });

export const somLancou = (forca: number) => {
  chiado({ dura: 0.25, filtro: 1500 + forca * 3000, filtroAte: 600, volume: 0.2 });
  tom({ de: 300 + forca * 300, ate: 900 + forca * 600, dura: 0.18, onda: "sine", volume: 0.14 });
};

// Campainha de entrega: dim-dom.
export const somEntregou = () => {
  tom({ de: 988, dura: 0.35, onda: "sine", volume: 0.28 });
  tom({ de: 784, dura: 0.5, onda: "sine", volume: 0.28, atraso: 0.22 });
};

export const somBateu = () => {
  chiado({ dura: 0.3, filtro: 1200, filtroAte: 200, volume: 0.3 });
  tom({ de: 160, ate: 60, dura: 0.3, onda: "sine", volume: 0.3 });
};

export const somQueimou = () => {
  chiado({ dura: 0.6, filtro: 5000, filtroAte: 500, volume: 0.25 });
  tom({ de: 500, ate: 120, dura: 0.5, onda: "sawtooth", volume: 0.08 });
};

export const somPerdeu = () => melodia([523, 440, 349, 262], 0.08, "sine", 0.16);
