// A garagem: carros, equipamentos e pinturas. Preços em centavos, velocidades em unidades da
// pista por segundo e curva em radianos por segundo.
export type Carro = {
  nome: string;
  preco: number;
  vmax: number;
  acel: number;
  curva: number;
  // Fração da velocidade que sobra depois de bater num obstáculo.
  tranco: number;
  // Aparece na garagem, como o "Voa!".
  forte?: boolean;
  voa?: boolean;
  cor: string;
};

const LISTA = {
  bolinha: { nome: "Bolinha", preco: 0, vmax: 95, acel: 110, curva: 3.6, tranco: 0.55, cor: "#ffc933" },
  jipe: { nome: "Jipe", preco: 800, vmax: 108, acel: 130, curva: 3.6, tranco: 0.85, forte: true, cor: "#18b67e" },
  esportivo: { nome: "Esportivo", preco: 1800, vmax: 125, acel: 150, curva: 3.8, tranco: 0.55, cor: "#ff5a5f" },
  formula: { nome: "Fórmula", preco: 6000, vmax: 145, acel: 180, curva: 4.2, tranco: 0.5, cor: "#2f7bff" },
  super: { nome: "Supercarro", preco: 15000, vmax: 165, acel: 200, curva: 4.4, tranco: 0.55, cor: "#a45cff" },
  voador: { nome: "Carro Voador", preco: 30000, vmax: 178, acel: 220, curva: 4.6, tranco: 0.6, voa: true, cor: "#ff8a3d" },
  disco: { nome: "Disco Voador", preco: 60000, vmax: 195, acel: 250, curva: 5.2, tranco: 0.65, voa: true, cor: "#3fd0c9" },
} satisfies Record<string, Carro>;

export type ModeloId = keyof typeof LISTA;
export const CARROS: Record<ModeloId, Carro> = LISTA;
export const MODELOS = Object.keys(CARROS) as ModeloId[];

export type Equipamento = { nome: string; precos: number[]; texto: string };

export const EQUIPAMENTOS = {
  turbo: { nome: "Turbo", precos: [800, 3000, 9000], texto: "Um empurrão de foguete. Cada nível dura mais." },
  pneus: { nome: "Pneus de corrida", precos: [600, 2000, 6000], texto: "Curvas mais fechadas, menos lentidão na grama e menos raspadas no muro." },
  ima: { nome: "Ímã de dinheiro", precos: [500, 2500], texto: "Pega o dinheiro de mais longe." },
} satisfies Record<string, Equipamento>;

export type EquipamentoId = keyof typeof EQUIPAMENTOS;
export const EQUIPAMENTOS_IDS = Object.keys(EQUIPAMENTOS) as EquipamentoId[];

// Pintar é de graça: é só para deixar o carro com a cara de quem dirige.
export const PINTURAS = ["#ffc933", "#ff5a5f", "#2f7bff", "#18b67e", "#a45cff", "#ff8a3d", "#3fd0c9", "#f4f1ff", "#3a3350"];
