import { chiado, melodia, tom } from "../kit/som";

// Quanto mais forte o poder, mais grave e longo o som: a força também se ouve.
export const SOM_DO_PODER: Record<string, () => void> = {
  soco: () => {
    tom({ de: 220, ate: 90, dura: 0.12, onda: "square", volume: 0.2 });
    chiado({ dura: 0.08, filtro: 900, volume: 0.25 });
  },
  laser: () => tom({ de: 1600, ate: 220, dura: 0.22, onda: "square", volume: 0.14 }),
  canhao: () => {
    tom({ de: 160, ate: 45, dura: 0.3, onda: "sine", volume: 0.45 });
    chiado({ dura: 0.2, filtro: 1400, filtroAte: 200, volume: 0.3 });
  },
  missil: () => {
    chiado({ dura: 0.32, filtro: 500, filtroAte: 4000, volume: 0.3 });
    tom({ de: 300, ate: 900, dura: 0.3, onda: "sawtooth", volume: 0.08 });
  },
  raio: () => {
    chiado({ dura: 0.3, filtro: 6000, filtroAte: 1500, volume: 0.3 });
    tom({ de: 1200, ate: 120, dura: 0.28, onda: "sawtooth", volume: 0.14 });
  },
  supernova: () => {
    tom({ de: 200, ate: 1800, dura: 0.3, onda: "sawtooth", volume: 0.14 });
    tom({ de: 300, ate: 2400, dura: 0.3, onda: "triangle", volume: 0.2 });
  },
};

// peso vai de 0 (soco) a 1 (supernova).
export function somImpacto(peso: number) {
  tom({ de: 140 - peso * 80, ate: 40, dura: 0.16 + peso * 0.3, onda: "sine", volume: 0.3 + peso * 0.25 });
  chiado({ dura: 0.1 + peso * 0.3, filtro: 2400, filtroAte: 300, volume: 0.2 + peso * 0.2 });
}

export const somDerrubou = () => {
  chiado({ dura: 0.4, filtro: 3000, filtroAte: 200, volume: 0.32 });
  melodia([392, 523], 0.08, "square", 0.1);
};

export const somExato = () => melodia([784, 1047, 1319, 1568], 0.07, "square", 0.13);
export const somCorrida = () => tom({ de: 110, ate: 240, dura: 0.7, onda: "sawtooth", volume: 0.05 });
export const somChegou = () => tom({ de: 180, ate: 90, dura: 0.1, volume: 0.22 });

export const somChefe = () => {
  tom({ de: 70, ate: 55, dura: 0.7, onda: "sawtooth", volume: 0.2 });
  melodia([196, 185, 175], 0.16, "square", 0.1);
};

export const somSemForca = () => tom({ de: 500, ate: 90, dura: 0.5, onda: "triangle", volume: 0.25 });
