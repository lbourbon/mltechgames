import { chiado, melodia, tom } from "../kit/som";

// Clique seco de interruptor.
export const somGiro = () => {
  tom({ de: 1500, ate: 700, dura: 0.03, onda: "square", volume: 0.09 });
  chiado({ dura: 0.025, filtro: 4200, volume: 0.14 });
};

export const somTravada = () => tom({ de: 180, ate: 130, dura: 0.08, onda: "square", volume: 0.09 });
export const somLigou = () => melodia([784, 1047], 0.06, "triangle", 0.2);
export const somSobrecarga = () => {
  tom({ de: 110, ate: 70, dura: 0.25, onda: "sawtooth", volume: 0.12 });
  chiado({ dura: 0.18, filtro: 3000, filtroAte: 900, volume: 0.15 });
};

export const somFaisca = (ordem: number) =>
  tom({ de: 320 * 2 ** (ordem / 18), ate: 380 * 2 ** (ordem / 18), dura: 0.05, onda: "sawtooth", volume: 0.05 });

export const somJanela = (ordem: number) => tom({ de: 523 * 2 ** (ordem / 12), dura: 0.16, onda: "triangle", volume: 0.2 });

export const somApagou = () => {
  tom({ de: 520, ate: 60, dura: 0.6, onda: "sawtooth", volume: 0.12 });
  chiado({ dura: 0.3, filtro: 1400, filtroAte: 200, volume: 0.2, atraso: 0.1 });
};
