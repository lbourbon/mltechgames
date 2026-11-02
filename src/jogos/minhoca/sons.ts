import { chiado, melodia, tom } from "../kit/som";

// Cada letra da palavra morde um pouco mais agudo: dá para ouvir a palavra crescer.
export function somNham(ordem: number) {
  const nota = 300 * 2 ** (ordem / 8);
  tom({ de: nota, ate: nota * 0.6, dura: 0.09, onda: "square", volume: 0.14 });
  chiado({ dura: 0.05, filtro: 2600, volume: 0.2, atraso: 0.07 });
  tom({ de: nota * 1.5, ate: nota, dura: 0.09, onda: "square", volume: 0.12, atraso: 0.12 });
}

export function somBleh() {
  chiado({ dura: 0.16, filtro: 3000, filtroAte: 500, volume: 0.26 });
  tom({ de: 260, ate: 110, dura: 0.3, onda: "sawtooth", volume: 0.16, atraso: 0.06 });
}

export const somMordeu = () => {
  tom({ de: 900, ate: 300, dura: 0.16, onda: "triangle", volume: 0.26 });
  tom({ de: 700, ate: 200, dura: 0.2, onda: "triangle", volume: 0.18, atraso: 0.1 });
};

// A dança passa pelo corpo uma nota por letra.
export const somDanca = (ordem: number) => tom({ de: 440 * 2 ** (ordem / 7), dura: 0.12, onda: "triangle", volume: 0.2 });

export function somEstouro() {
  chiado({ dura: 0.22, filtro: 4000, filtroAte: 700, volume: 0.28 });
  tom({ de: 220, ate: 90, dura: 0.18, onda: "sine", volume: 0.26 });
}

// Só a palavra sem nenhum erro toca este final.
export const somPerfeita = () => melodia([784, 988, 1175, 1568], 0.07, "sine", 0.26);
