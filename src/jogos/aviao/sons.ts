import { chiado, melodia, tom } from "../kit/som";

// O motor ronca e o vento sobe na decolagem.
export const somDecolar = () => {
  chiado({ dura: 0.5, filtro: 300, filtroAte: 1800, volume: 0.2 });
  tom({ de: 110, ate: 190, dura: 0.45, onda: "sawtooth", volume: 0.05 });
};

export const somPousar = () => chiado({ dura: 0.18, filtro: 900, filtroAte: 300, volume: 0.16 });

// Plim-plom de campainha do correio, mais cheio quando o pouso é bem no país.
export const somEntregou = () => {
  melodia([1047, 784, 1047, 1319], 0.09, "sine", 0.24);
  chiado({ dura: 0.08, filtro: 6000, volume: 0.1, atraso: 0.36 });
};

export const somNaMosca = () => {
  melodia([784, 988, 1175, 1568], 0.07, "triangle", 0.22);
  somEntregou();
};

export const somPerto = () => melodia([523, 659], 0.09, "triangle", 0.18);

export const somLonge = () => tom({ de: 300, ate: 150, dura: 0.35, onda: "triangle", volume: 0.14 });
