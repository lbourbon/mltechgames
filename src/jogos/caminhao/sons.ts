import { chiado, melodia, tom } from "../kit/som";

// Fon-fon!
export const somBuzina = () => {
  tom({ de: 392, dura: 0.12, onda: "square", volume: 0.08 });
  tom({ de: 494, dura: 0.12, onda: "square", volume: 0.06 });
  tom({ de: 392, dura: 0.16, onda: "square", volume: 0.08, atraso: 0.16 });
  tom({ de: 494, dura: 0.16, onda: "square", volume: 0.06, atraso: 0.16 });
};

export const somMotor = () => chiado({ dura: 0.28, filtro: 500, filtroAte: 260, volume: 0.22 });

export const somPegou = () => melodia([659, 880], 0.07, "triangle", 0.22);

export const somEntregou = () => {
  melodia([784, 988, 1175, 1568], 0.07, "triangle", 0.22);
  chiado({ dura: 0.08, filtro: 6000, volume: 0.1, atraso: 0.28 });
};

export const somLonge = () => tom({ de: 200, ate: 150, dura: 0.12, onda: "square", volume: 0.08 });

// O motor engasga e morre.
export const somSeco = () => {
  [0, 0.2, 0.45].forEach((atraso, i) => chiado({ dura: 0.14, filtro: 700 - i * 150, volume: 0.25, atraso }));
  tom({ de: 140, ate: 50, dura: 0.6, onda: "sawtooth", volume: 0.1, atraso: 0.5 });
};
