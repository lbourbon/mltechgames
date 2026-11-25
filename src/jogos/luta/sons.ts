import { chiado, melodia, tom } from "../kit/som";

// O sino do octógono: três batidas metálicas.
export function somSino() {
  for (let i = 0; i < 3; i++) {
    tom({ de: 1568, ate: 1520, dura: 0.5, onda: "sine", volume: 0.18, atraso: i * 0.22 });
    tom({ de: 2350, ate: 2300, dura: 0.3, onda: "sine", volume: 0.08, atraso: i * 0.22 });
  }
}

// Um soco que entra: um baque grave com um estalo.
export function somSoco(forte = false) {
  tom({ de: forte ? 180 : 240, ate: 60, dura: forte ? 0.22 : 0.13, onda: "sine", volume: forte ? 0.5 : 0.38 });
  chiado({ dura: forte ? 0.14 : 0.08, filtro: 1800, filtroAte: 400, volume: forte ? 0.3 : 0.2 });
}

// Um soco que a guarda segurou quase todo: mais abafado.
export const somBloqueio = () => chiado({ dura: 0.08, filtro: 700, filtroAte: 250, volume: 0.2 });

export function somDefesa() {
  tom({ de: 520, ate: 480, dura: 0.12, onda: "square", volume: 0.08 });
  chiado({ dura: 0.1, filtro: 3000, filtroAte: 1200, volume: 0.12 });
}

export function somFogo() {
  chiado({ dura: 0.5, filtro: 600, filtroAte: 3200, volume: 0.3 });
  tom({ de: 110, ate: 70, dura: 0.4, onda: "sawtooth", volume: 0.12, atraso: 0.3 });
}

export function somGelo() {
  melodia([2093, 2637, 3136, 2637, 3520], 0.05, "sine", 0.12);
  chiado({ dura: 0.3, filtro: 6000, filtroAte: 4000, volume: 0.08 });
}

export function somRaio() {
  tom({ de: 1800, ate: 120, dura: 0.25, onda: "sawtooth", volume: 0.16 });
  chiado({ dura: 0.3, filtro: 5000, filtroAte: 500, volume: 0.25 });
}

export function somNocaute() {
  tom({ de: 300, ate: 80, dura: 0.5, onda: "triangle", volume: 0.3 });
  melodia([1319, 1047, 1319, 1047], 0.12, "sine", 0.12);
}

export const somPerdeu = () => melodia([392, 330, 262, 196], 0.18, "triangle", 0.24);

// Cada aparelho da academia tem o seu barulho.
export const SONS_DO_TREINO = {
  forca: () => {
    tom({ de: 160, ate: 110, dura: 0.3, onda: "triangle", volume: 0.25 });
    tom({ de: 880, ate: 860, dura: 0.15, onda: "square", volume: 0.05, atraso: 0.3 });
  },
  velocidade: () => {
    for (let i = 0; i < 3; i++) chiado({ dura: 0.08, filtro: 4000, filtroAte: 1500, volume: 0.15, atraso: i * 0.22 });
  },
  tecnica: () => {
    for (let i = 0; i < 3; i++) tom({ de: 200, ate: 70, dura: 0.12, onda: "sine", volume: 0.35, atraso: i * 0.2 });
  },
  resistencia: () => {
    for (let i = 0; i < 4; i++) tom({ de: 140, ate: 90, dura: 0.07, onda: "sine", volume: 0.2, atraso: i * 0.16 });
  },
};

export function somCompra() {
  melodia([784, 1047, 1319, 1568], 0.07, "square", 0.12);
}

export const somFalta = () => tom({ de: 330, ate: 220, dura: 0.22, onda: "triangle", volume: 0.2 });
