import { chiado, melodia, tom } from "../kit/som";

// A mordida sobe de tom conforme a barriga enche: dá para ouvir que a medida está perto.
export function somNhac(cheio: number) {
  const nota = 180 + cheio * 360;
  tom({ de: nota * 1.8, ate: nota * 0.7, dura: 0.08, onda: "square", volume: 0.16 });
  chiado({ dura: 0.05, filtro: 2400, volume: 0.22, atraso: 0.05 });
  tom({ de: nota * 1.5, ate: nota * 0.6, dura: 0.08, onda: "square", volume: 0.14, atraso: 0.11 });
}

// Cada acerto seguido sobe um semitom, até o limite que os pontos da sequência também têm.
export function somSatisfeito(sequencia: number) {
  const base = 523 * 2 ** (Math.min(sequencia, 5) / 12);
  melodia([base, base * 1.25, base * 1.5, base * 2], 0.075);
}

export function somPassou() {
  tom({ de: 170, ate: 70, dura: 0.5, onda: "sawtooth", volume: 0.2 });
  tom({ de: 120, ate: 55, dura: 0.5, onda: "square", volume: 0.1, atraso: 0.04 });
}

export const somDemorou = () => tom({ de: 440, ate: 180, dura: 0.4, onda: "triangle", volume: 0.25 });
