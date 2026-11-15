import { chiado, melodia, tom } from "../kit/som";

// Guizos: notas agudas e curtas, como sininhos de trenó.
function guizos(atraso = 0, quantos = 4) {
  for (let i = 0; i < quantos; i++) {
    const nota = 2093 + (i % 2) * 300;
    tom({ de: nota, ate: nota * 0.98, dura: 0.09, onda: "sine", volume: 0.12, atraso: atraso + i * 0.05 });
  }
}

// A rena certa entrou no time: um pedacinho de melodia e guizos.
export function somRena() {
  melodia([659, 784, 988], 0.08, "triangle", 0.24);
  guizos(0.15);
}

export function somErrou() {
  tom({ de: 520, ate: 200, dura: 0.28, onda: "triangle", volume: 0.24 });
  chiado({ dura: 0.18, filtro: 1200, filtroAte: 300, volume: 0.15 });
}

export const somFugiu = () => melodia([523, 440, 349], 0.11, "triangle", 0.2);

export const somSoltou = () => chiado({ dura: 0.16, filtro: 900, filtroAte: 2600, volume: 0.14 });

// O presente caiu na chaminé e a criança da casa comemora.
export function somEntregou() {
  tom({ de: 220, ate: 120, dura: 0.12, onda: "sine", volume: 0.25 });
  melodia([1047, 1319, 1568, 2093], 0.07, "square", 0.1);
  guizos(0.25, 3);
}

export const somCaiu = () => chiado({ dura: 0.2, filtro: 700, filtroAte: 200, volume: 0.22 });

export function somAmanheceu() {
  melodia([523, 659, 784, 1047], 0.18, "sine", 0.22);
}

export function somCompra() {
  guizos(0, 5);
  melodia([784, 1047, 1319, 1568], 0.07, "square", 0.12);
}

export const somFalta = () => tom({ de: 330, ate: 220, dura: 0.22, onda: "triangle", volume: 0.2 });
