import { chiado, melodia, tom } from "../kit/som";

export const somChegou = () => melodia([523, 659, 784], 0.07, "triangle", 0.2);
export const somCresceu = () => melodia([784, 988, 1175], 0.05, "sine", 0.12);
export const somComeu = () => {
  tom({ de: 300, ate: 220, dura: 0.08, onda: "square", volume: 0.08 });
  tom({ de: 300, ate: 220, dura: 0.08, onda: "square", volume: 0.08, atraso: 0.12 });
};
export const somSaiu = () => tom({ de: 660, ate: 260, dura: 0.45, onda: "triangle", volume: 0.16 });
export const somNasceu = () => melodia([1047, 1319], 0.06, "sine", 0.18);
export const somChuva = () => chiado({ dura: 0.7, filtro: 5000, filtroAte: 2500, volume: 0.1 });
export const somSol = () => tom({ de: 440, ate: 660, dura: 0.3, onda: "sine", volume: 0.08 });
export const somAnoPerdido = () => melodia([392, 349, 294], 0.15, "triangle", 0.2);
