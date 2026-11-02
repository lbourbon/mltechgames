import { chiado, melodia, tom } from "../kit/som";

// O elástico fica mais agudo quanto mais longe o dedo vai.
export function somEsticar(tensao: number) {
  const nota = 180 + tensao * 620;
  tom({ de: nota, ate: nota * 1.04, dura: 0.05, onda: "triangle", volume: 0.09 });
}

export const somSoltar = () => {
  tom({ de: 140, ate: 620, dura: 0.14, onda: "sine", volume: 0.3 });
  chiado({ dura: 0.14, filtro: 900, filtroAte: 3200, volume: 0.14 });
};

// Sobe e desce devagar, como um apito de escorrega: é o voo em câmera lenta.
export function somVoo(segundos: number) {
  tom({ de: 320, ate: 880, dura: segundos / 2, onda: "sine", volume: 0.08 });
  tom({ de: 880, ate: 300, dura: segundos / 2, onda: "sine", volume: 0.08, atraso: segundos / 2 });
}

export const somRevelou = () => tom({ de: 1180, ate: 1568, dura: 0.12, onda: "triangle", volume: 0.14 });

export const somPouso = () => {
  chiado({ dura: 0.16, filtro: 600, filtroAte: 200, volume: 0.32 });
  tom({ de: 150, ate: 80, dura: 0.12, onda: "sine", volume: 0.3 });
};

// Só o pouso no centro toca este sino.
export const somCentro = () => {
  melodia([1047, 1319, 1568, 2093], 0.06, "sine", 0.28);
  tom({ de: 2093, dura: 0.7, onda: "sine", volume: 0.12, atraso: 0.24 });
};

export const somBeirada = () => {
  for (let i = 0; i < 4; i++) tom({ de: 520 - i * 60, ate: 380 - i * 60, dura: 0.08, onda: "square", volume: 0.07, atraso: i * 0.1 });
};

export const somOutra = () => tom({ de: 330, ate: 440, dura: 0.14, onda: "triangle", volume: 0.18 });

export const somCratera = () => {
  tom({ de: 700, ate: 70, dura: 0.6, onda: "triangle", volume: 0.26 });
  chiado({ dura: 0.4, filtro: 500, filtroAte: 120, volume: 0.36, atraso: 0.42 });
};

export const somMochila = () => chiado({ dura: 0.5, filtro: 3000, filtroAte: 900, volume: 0.14 });

// Cada pedra acende uma nota acima da anterior.
export const somAcendeu = (ordem: number) =>
  tom({ de: 392 * 2 ** (ordem / 6), dura: 0.18, onda: "triangle", volume: 0.2 });

export const somFoguete = () => {
  chiado({ dura: 1.3, filtro: 400, filtroAte: 3600, volume: 0.32 });
  tom({ de: 70, ate: 280, dura: 1.3, onda: "sawtooth", volume: 0.08 });
};
