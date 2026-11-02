import { chiado, melodia, tom } from "../kit/som";

export const somRisco = () => tom({ de: 520, dura: 0.04, onda: "triangle", volume: 0.1 });
export const somInvalida = () => tom({ de: 170, ate: 120, dura: 0.14, onda: "square", volume: 0.13 });

// A cerca sobe poste por poste: um tac para cada um.
export function somCerca(postes: number, passo: number) {
  for (let i = 0; i < postes; i++) {
    tom({ de: 700 + i * 22, ate: 340, dura: 0.05, onda: "square", volume: 0.1, atraso: i * passo });
  }
}

export const somMedida = () => melodia([659, 880, 1175], 0.07, "triangle", 0.22);

export const somCaiu = () => {
  tom({ de: 380, ate: 90, dura: 0.42, onda: "sawtooth", volume: 0.12 });
  chiado({ dura: 0.2, filtro: 900, volume: 0.25, atraso: 0.22 });
};

export const somAbriu = () => tom({ de: 300, ate: 520, dura: 0.12, onda: "triangle", volume: 0.2 });
export const somPulo = (ordem: number) => tom({ de: 392 * 2 ** (ordem / 12), ate: 784 * 2 ** (ordem / 12), dura: 0.13, volume: 0.24 });
