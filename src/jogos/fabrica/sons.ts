import { chiado, melodia, tom } from "../kit/som";

function guizos(atraso = 0, quantos = 4) {
  for (let i = 0; i < quantos; i++) {
    const nota = 2093 + (i % 2) * 300;
    tom({ de: nota, ate: nota * 0.98, dura: 0.09, onda: "sine", volume: 0.12, atraso: atraso + i * 0.05 });
  }
}

// Um presente encaixou no bilhete: mais agudo a cada lugar.
export const somPor = (lugar: number) => tom({ de: 520 + lugar * 110, ate: 700 + lugar * 110, dura: 0.08, onda: "triangle", volume: 0.2 });

export const somTirar = () => tom({ de: 600, ate: 380, dura: 0.08, onda: "triangle", volume: 0.16 });

// A garça chega batendo as asas.
export function somGarca() {
  chiado({ dura: 0.12, filtro: 600, filtroAte: 1400, volume: 0.1 });
  chiado({ dura: 0.12, filtro: 600, filtroAte: 1400, volume: 0.1, atraso: 0.16 });
  tom({ de: 1200, ate: 1500, dura: 0.08, onda: "sine", volume: 0.12, atraso: 0.3 });
}

export function somCerto() {
  melodia([659, 784, 1047], 0.08, "triangle", 0.24);
  guizos(0.2, 3);
}

export function somErrou() {
  tom({ de: 440, ate: 220, dura: 0.26, onda: "triangle", volume: 0.24 });
  chiado({ dura: 0.14, filtro: 1100, filtroAte: 300, volume: 0.12 });
}

export const somFalta = () => tom({ de: 330, ate: 260, dura: 0.16, onda: "triangle", volume: 0.18 });

export function somSacoCheio() {
  melodia([523, 659, 784, 1047, 1319], 0.09, "square", 0.12);
  guizos(0.4, 6);
}

export function somEntregou() {
  tom({ de: 220, ate: 120, dura: 0.12, onda: "sine", volume: 0.25 });
  melodia([1047, 1319, 1568, 2093], 0.07, "square", 0.1);
  guizos(0.25, 3);
}

export const somNegou = () => melodia([392, 330], 0.1, "triangle", 0.2);
