import { chiado, melodia, tom } from "../kit/som";

// O piu começa um pouco acima e assenta logo na nota, para a altura ficar clara.
export const somPiu = (frequencia: number) => {
  tom({ de: frequencia * 1.12, ate: frequencia, dura: 0.06, onda: "sine", volume: 0.16 });
  tom({ de: frequencia, dura: 0.34, onda: "triangle", volume: 0.3, atraso: 0.04 });
};

export const somVoou = () => chiado({ dura: 0.16, filtro: 3200, filtroAte: 900, volume: 0.14 });

export const somDesafinou = () => {
  tom({ de: 330, ate: 300, dura: 0.12, onda: "sawtooth", volume: 0.08 });
  tom({ de: 349, ate: 290, dura: 0.22, onda: "sawtooth", volume: 0.08, atraso: 0.1 });
};

export const somFixo = () => tom({ de: 1200, ate: 900, dura: 0.05, onda: "sine", volume: 0.12 });

export const somRevoada = () => {
  chiado({ dura: 0.7, filtro: 4000, filtroAte: 1200, volume: 0.18 });
  melodia([1568, 1760, 2093, 1760, 2349], 0.06, "sine", 0.1);
};
