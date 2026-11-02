import { chiado, melodia, tom } from "../kit/som";

// Quanto maior a boiada, mais vozes no mugido: o tamanho também se ouve.
export function somMugido(boiada: number) {
  const vozes = Math.min(1 + Math.floor(Math.log2(boiada + 1) / 1.6), 6);
  for (let i = 0; i < vozes; i++) {
    const grave = 165 - i * 11;
    tom({ de: grave, ate: grave * 0.62, dura: 0.55, onda: "sawtooth", volume: 0.07, atraso: i * 0.07 });
  }
}

export const somPorteira = () => {
  tom({ de: 240, ate: 120, dura: 0.08, onda: "square", volume: 0.14 });
  chiado({ dura: 0.06, filtro: 1800, volume: 0.2 });
};

export const somTrote = () => {
  for (let i = 0; i < 6; i++) chiado({ dura: 0.05, filtro: 700, volume: 0.22, atraso: i * 0.13 });
};

export const somCresceu = () => melodia([523, 659, 784], 0.07, "triangle", 0.2);
export const somEncolheu = () => tom({ de: 440, ate: 160, dura: 0.32, onda: "triangle", volume: 0.2 });
export const somTrancada = () => tom({ de: 160, ate: 110, dura: 0.14, onda: "square", volume: 0.14 });
export const somCarroca = () => tom({ de: 90, ate: 150, dura: 0.5, onda: "sawtooth", volume: 0.08 });
export const somForca = () => tom({ de: 70, ate: 190, dura: 0.9, onda: "sawtooth", volume: 0.1 });

export const somSaiu = () => {
  tom({ de: 180, ate: 900, dura: 0.16, onda: "sine", volume: 0.4 });
  chiado({ dura: 0.3, filtro: 2400, filtroAte: 300, volume: 0.3 });
};

export const somPerfeita = () => melodia([784, 1047, 1319, 1568, 2093], 0.07, "square", 0.13);
export const somFaltou = () => tom({ de: 500, ate: 90, dura: 0.5, onda: "triangle", volume: 0.25 });
