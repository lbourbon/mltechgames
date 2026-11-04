import { chiado, melodia, tom } from "../kit/som";

// O inocente sai aliviado: um "ufa" que sobe e desce.
export const somSolto = (ordem: number) => {
  const base = 523 * 2 ** (Math.min(ordem, 6) / 12);
  tom({ de: base, ate: base * 1.5, dura: 0.09, onda: "triangle", volume: 0.2 });
  tom({ de: base * 1.5, ate: base * 1.2, dura: 0.12, onda: "triangle", volume: 0.16, atraso: 0.08 });
};

export const somNaoFui = () => {
  tom({ de: 220, ate: 170, dura: 0.18, onda: "square", volume: 0.1 });
  tom({ de: 200, ate: 150, dura: 0.2, onda: "square", volume: 0.1, atraso: 0.16 });
};

// Papel do caderninho do xerife virando.
export const somPista = () => {
  chiado({ dura: 0.14, filtro: 5000, filtroAte: 1800, volume: 0.12 });
  melodia([784, 1175], 0.07, "sine", 0.18);
};

// Tchan, tchan, tchaaan!
export const somFlagra = () => {
  melodia([392, 392, 311], 0.18, "square", 0.12);
  tom({ de: 262, ate: 247, dura: 0.6, onda: "square", volume: 0.12, atraso: 0.55 });
};

export const somLambuzou = () => {
  chiado({ dura: 0.2, filtro: 900, volume: 0.25 });
  tom({ de: 180, ate: 90, dura: 0.25, onda: "sine", volume: 0.3 });
};
