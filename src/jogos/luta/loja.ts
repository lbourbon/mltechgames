// O que se compra com o dinheiro das lutas: equipamentos de treino, que deixam o lutador mais
// forte em toda luta, e o vestiário, que só muda o visual. Sem DOM.

export type Atributo = "forca" | "velocidade" | "tecnica" | "resistencia";
export const ATRIBUTOS: Atributo[] = ["forca", "velocidade", "tecnica", "resistencia"];
export type Atributos = Record<Atributo, number>;

// Cada atributo tem um aparelho na academia, onde se treina para a próxima luta.
export const ATRIBUTO: Record<Atributo, { nome: string; icone: string; aparelho: string }> = {
  forca: { nome: "Força", icone: "💪", aparelho: "Halteres" },
  velocidade: { nome: "Velocidade", icone: "💨", aparelho: "Corda" },
  tecnica: { nome: "Técnica", icone: "🥋", aparelho: "Saco de pancada" },
  resistencia: { nome: "Resistência", icone: "🔋", aparelho: "Esteira" },
};

export type Equipamento = { nome: string; texto: string; precos: number[] };

// Cada nível soma 1 ao atributo em todas as lutas.
export const EQUIPAMENTOS: Record<Atributo, Equipamento> = {
  forca: { nome: "Anilhas pesadas", texto: "+1 de força em toda luta", precos: [60, 140, 260] },
  velocidade: { nome: "Escada de agilidade", texto: "+1 de velocidade em toda luta", precos: [60, 140, 260] },
  tecnica: { nome: "Boneco de treino", texto: "+1 de técnica em toda luta", precos: [60, 140, 260] },
  resistencia: { nome: "Bicicleta", texto: "+1 de resistência em toda luta", precos: [60, 140, 260] },
};

export type PoderId = "fogo" | "gelo" | "raio";
export const PODERES: PoderId[] = ["fogo", "gelo", "raio"];

// Os poderes chegam com as fases, e antes de cada luta a criança escolhe qual leva.
export const PODER: Record<PoderId, { nome: string; icone: string; texto: string; fase: number }> = {
  fogo: { nome: "Bola de fogo", icone: "🔥", texto: "Acerta todos os adversários e passa pela técnica deles.", fase: 2 },
  gelo: { nome: "Gelo", icone: "❄️", texto: "Congela todos os adversários por duas rodadas.", fase: 6 },
  raio: { nome: "Raio", icone: "⚡", texto: "Uma rajada de socos num adversário só, que passa pela técnica dele.", fase: 9 },
};

export type Item = { id: string; nome: string; preco: number; cor: string; cor2?: string };

export const LUVAS: Item[] = [
  { id: "vermelha", nome: "Vermelha", preco: 0, cor: "#e23b3b" },
  { id: "azul", nome: "Azul", preco: 30, cor: "#2f7bff" },
  { id: "verde", nome: "Verde", preco: 30, cor: "#18b67e" },
  { id: "rosa", nome: "Rosa", preco: 40, cor: "#ff6fae" },
  { id: "preta", nome: "Preta", preco: 50, cor: "#3a3350" },
  { id: "dourada", nome: "Dourada", preco: 120, cor: "#ffc933", cor2: "#fff3b0" },
];

// cor2 é a estampa do calção.
export const ROUPAS: Item[] = [
  { id: "azul", nome: "Azul", preco: 0, cor: "#2f7bff" },
  { id: "vermelha", nome: "Vermelha", preco: 25, cor: "#e23b3b" },
  { id: "preta", nome: "Preta", preco: 25, cor: "#3a3350" },
  { id: "tigre", nome: "Tigre", preco: 70, cor: "#ff9a2e", cor2: "#2b2140" },
  { id: "raio", nome: "Raio", preco: 90, cor: "#a45cff", cor2: "#ffc933" },
  { id: "estrelas", nome: "Estrelas", preco: 90, cor: "#1d2f66", cor2: "#fff" },
];

export const FAIXAS: Item[] = [
  { id: "branca", nome: "Branca", preco: 0, cor: "#ffffff" },
  { id: "amarela", nome: "Amarela", preco: 30, cor: "#ffc933" },
  { id: "verde", nome: "Verde", preco: 50, cor: "#18b67e" },
  { id: "azul", nome: "Azul", preco: 70, cor: "#2f7bff" },
  { id: "roxa", nome: "Roxa", preco: 100, cor: "#a45cff" },
  { id: "marrom", nome: "Marrom", preco: 140, cor: "#8a4b2a" },
  { id: "preta", nome: "Preta", preco: 200, cor: "#2b2140" },
];

export type Peca = "luvas" | "roupa" | "faixa";
export const PECAS: Record<Peca, { nome: string; itens: Item[] }> = {
  luvas: { nome: "Luvas", itens: LUVAS },
  roupa: { nome: "Calção", itens: ROUPAS },
  faixa: { nome: "Faixa", itens: FAIXAS },
};

export const itemDe = (peca: Peca, id: string) => PECAS[peca].itens.find((item) => item.id === id) ?? PECAS[peca].itens[0];
