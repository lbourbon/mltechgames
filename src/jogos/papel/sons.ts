import { chiado, melodia, tom } from "../kit/som";

// Tesoura: duas lâminas que se fecham.
export const somCorte = () => {
  chiado({ dura: 0.05, filtro: 6000, filtroAte: 2500, volume: 0.2 });
  tom({ de: 2400, ate: 1600, dura: 0.04, onda: "triangle", volume: 0.07, atraso: 0.02 });
};

// O papel dobrando é um sopro curto que desce. Abrindo, ele sobe e demora mais.
export const somDobra = () => chiado({ dura: 0.32, filtro: 1800, filtroAte: 500, volume: 0.22 });
export const somAbre = (passo: number) => {
  chiado({ dura: 0.5, filtro: 500, filtroAte: 2200, volume: 0.2 });
  tom({ de: 392 * 2 ** (passo / 6), ate: 523 * 2 ** (passo / 6), dura: 0.4, onda: "sine", volume: 0.1 });
};

export const somNegado = () => tom({ de: 180, ate: 130, dura: 0.1, onda: "square", volume: 0.1 });
export const somIgual = () => melodia([659, 784, 988, 1319], 0.08, "triangle", 0.24);
export const somDiferente = () => melodia([392, 330, 262], 0.13, "triangle", 0.2);
export const somPapelNovo = () => chiado({ dura: 0.18, filtro: 1200, filtroAte: 3200, volume: 0.16 });
