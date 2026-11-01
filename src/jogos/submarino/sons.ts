import { chiado, melodia, tom } from "../kit/som";

export const somPorCarta = () => tom({ de: 520, ate: 780, dura: 0.08, onda: "triangle", volume: 0.22 });
export const somTirarCarta = () => tom({ de: 520, ate: 300, dura: 0.08, onda: "triangle", volume: 0.18 });
export const somVai = () => melodia([392, 523, 659], 0.07, "square", 0.1);
export const somMotor = () => chiado({ dura: 0.18, filtro: 500, filtroAte: 250, volume: 0.2 });
export const somVirar = () => tom({ de: 300, ate: 420, dura: 0.1, volume: 0.14 });
export const somSensor = () => melodia([1400, 1400], 0.05, "sine", 0.14);
export const somTesouro = () => melodia([988, 1319, 1568], 0.06, "triangle", 0.22);
export const somFaltou = () => tom({ de: 440, ate: 300, dura: 0.3, onda: "triangle", volume: 0.2 });

export const somBateu = () => {
  tom({ de: 150, ate: 50, dura: 0.3, volume: 0.45 });
  chiado({ dura: 0.25, filtro: 1800, filtroAte: 200, volume: 0.3 });
};
