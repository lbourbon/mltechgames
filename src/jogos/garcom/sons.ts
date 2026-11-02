import { chiado, melodia, tom } from "../kit/som";

// Cada coisa posta na bandeja soa mais alto que a anterior: dá para ouvir o pedido crescer.
export function somColocar(quantos: number) {
  const nota = 400 * 2 ** (quantos / 6);
  tom({ de: nota * 0.7, ate: nota, dura: 0.09, onda: "triangle", volume: 0.26 });
}

export const somTirar = () => tom({ de: 520, ate: 260, dura: 0.1, onda: "triangle", volume: 0.2 });

export function somSino() {
  tom({ de: 1760, dura: 0.55, volume: 0.3 });
  tom({ de: 2637, dura: 0.4, volume: 0.14 });
}

export function somNhac() {
  tom({ de: 320, ate: 140, dura: 0.08, onda: "square", volume: 0.16 });
  chiado({ dura: 0.05, filtro: 2400, volume: 0.22, atraso: 0.05 });
}

export const somChegou = () => melodia([523, 659], 0.08, "triangle", 0.18);

// Passos pesados: o chefão se faz notar antes de pedir.
export function somChefao() {
  tom({ de: 110, ate: 50, dura: 0.22, onda: "square", volume: 0.3 });
  tom({ de: 110, ate: 50, dura: 0.22, onda: "square", volume: 0.3, atraso: 0.3 });
}

export function somCuspir() {
  chiado({ dura: 0.18, filtro: 3000, filtroAte: 500, volume: 0.3 });
  tom({ de: 240, ate: 90, dura: 0.35, onda: "sawtooth", volume: 0.18, atraso: 0.08 });
}

export const somFaltou = () => tom({ de: 300, ate: 420, dura: 0.2, onda: "triangle", volume: 0.2 });

export function somArroto() {
  tom({ de: 115, ate: 62, dura: 0.6, onda: "sawtooth", volume: 0.32 });
  tom({ de: 88, ate: 70, dura: 0.6, onda: "square", volume: 0.14 });
  chiado({ dura: 0.45, filtro: 500, filtroAte: 200, volume: 0.2 });
}

// Cada acerto seguido sobe um semitom, até o limite que os pontos da sequência também têm.
export function somSatisfeito(sequencia: number) {
  const base = 523 * 2 ** (Math.min(sequencia, 5) / 12);
  melodia([base, base * 1.25, base * 1.5, base * 2], 0.075);
}
