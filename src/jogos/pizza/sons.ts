import { chiado, melodia, tom } from "../kit/som";

export const somSabor = () => tom({ de: 520, ate: 700, dura: 0.06, onda: "triangle", volume: 0.14 });

export function somCorte(fatias: number) {
  for (let i = 0; i < Math.min(fatias, 6); i++) {
    chiado({ dura: 0.05, filtro: 3200, filtroAte: 1200, volume: 0.2, atraso: i * 0.05 });
  }
}

// A nota sobe a cada fatia coberta: dá para ouvir a conta.
export const somCobriu = (quantas: number) => tom({ de: 330 * 2 ** (quantas / 12), dura: 0.09, onda: "triangle", volume: 0.2 });
export const somTirou = () => tom({ de: 300, ate: 180, dura: 0.08, onda: "triangle", volume: 0.14 });

export const somSino = () => {
  tom({ de: 1568, dura: 0.5, onda: "sine", volume: 0.26 });
  tom({ de: 2349, dura: 0.35, onda: "sine", volume: 0.11 });
};

export const somForno = () => chiado({ dura: 0.3, filtro: 700, filtroAte: 1800, volume: 0.2 });
export const somEntrega = () => melodia([659, 784, 1047], 0.07, "triangle", 0.2);
export const somNegou = () => tom({ de: 240, ate: 120, dura: 0.3, onda: "sawtooth", volume: 0.12 });
export const somVazia = () => tom({ de: 200, ate: 150, dura: 0.12, onda: "square", volume: 0.11 });
