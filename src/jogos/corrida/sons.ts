import { chiado, melodia, tom } from "../kit/som";

// Um plim por peça do monte, cada um mais agudo.
export function somDinheiro(pecas: number) {
  for (let i = 0; i < Math.min(pecas, 5); i++) {
    const nota = 1046 * 2 ** (i / 6);
    tom({ de: nota, ate: nota * 1.02, dura: 0.12, onda: "square", volume: 0.1, atraso: i * 0.06 });
    tom({ de: nota * 1.5, dura: 0.16, onda: "sine", volume: 0.14, atraso: i * 0.06 + 0.03 });
  }
}

// Caixa registradora: só para o monte que valia mais.
export function somMelhor() {
  chiado({ dura: 0.06, filtro: 5000, volume: 0.16, atraso: 0.2 });
  melodia([1568, 2093], 0.08, "sine", 0.22);
}

export function somBateu() {
  tom({ de: 180, ate: 70, dura: 0.18, onda: "sine", volume: 0.32 });
  chiado({ dura: 0.1, filtro: 1400, filtroAte: 300, volume: 0.22 });
}

export function somTurbo() {
  chiado({ dura: 0.7, filtro: 600, filtroAte: 4000, volume: 0.26 });
  tom({ de: 120, ate: 480, dura: 0.6, onda: "sawtooth", volume: 0.1 });
}

// Bipes da largada: três iguais e o último mais agudo.
export const somContagem = (ultimo: boolean) =>
  tom({ de: ultimo ? 1175 : 587, dura: ultimo ? 0.4 : 0.18, onda: "square", volume: 0.14 });

export const somVolta = () => melodia([988, 1319], 0.1, "triangle", 0.24);

export function somCompra() {
  chiado({ dura: 0.05, filtro: 6000, volume: 0.18 });
  melodia([784, 1047, 1319, 1568], 0.07, "square", 0.12);
}

export const somFalta = () => tom({ de: 330, ate: 220, dura: 0.22, onda: "triangle", volume: 0.2 });

export const somPerdeu = () => melodia([523, 466, 392], 0.15, "triangle", 0.2);
