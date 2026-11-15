// Regras da Fábrica do Papai Noel, sem DOM, para serem testadas com Vitest.
// Cada cor de presente vale um número, que muda a cada noite. A garça traz um bilhete com um
// número e alguns lugares, e o Papai Noel monta o pacote com presentes que somam exatamente
// aquilo. Com o saco cheio, ele sai entregando: cada casa pede um número, e vai o presente
// que vale aquilo.
import { embaralhar, sortear, type Rng } from "../kit/sorteio";

export const VIDAS_INICIAIS = 3;
// Até aqui a criança aprende o gesto, e o pacote errado não custa coração.
export const ULTIMA_FASE_MANSA = 2;
export const CORES = ["vermelho", "verde", "azul", "amarelo"] as const;

export type Cor = (typeof CORES)[number];
// Uma pista do presente misterioso, como vermelho + vermelho = 10.
export type Pista = { cores: Cor[]; total: number };
export type Carta = { alvo: number; vagas: number };
export type Config = {
  cores: number;
  min: number;
  max: number;
  // Quantos presentes cabem em cada pacote. Com o número fixo de lugares, encher de
  // presentes pequenos não resolve: as cores certas é que fecham a conta.
  vagas: number;
  cartas: number;
  // Quantas cores aparecem com "?" e uma pista no lugar do valor.
  escondidas: 0 | 1 | 2;
  pista: "dobro" | "soma" | "misto";
  casas: number;
};
export type Estado = {
  fase: number;
  vidas: number;
  pontos: number;
  config: Config;
  cores: Cor[];
  valores: Record<Cor, number>;
  escondidas: Cor[];
  pistas: Pista[];
  modo: "fabrica" | "entrega";
  cartas: Carta[];
  atual: number;
  // Os lugares do bilhete, na ordem. null é um lugar vazio.
  pacote: (Cor | null)[];
  errosNaCarta: number;
  saco: Cor[];
  // Na entrega, a cor que cada casa quer, pelo número que ela pede.
  pedidos: Cor[];
  casa: number;
  errosNaCasa: number;
  // Sem pacote errado na noite, vale a terceira estrela.
  limpa: boolean;
};
export type Problema = "passou" | "faltou";
export type Resultado =
  | "incompleto"
  | "certo"
  | "saco-cheio"
  | "errado"
  | "fim"
  | "entregou"
  | "outra-casa"
  | "fase";
export type Jogada = { estado: Estado; resultado: Resultado; ganhou?: number; problema?: Problema };

const FASES: Config[] = [
  { cores: 2, min: 1, max: 5, vagas: 2, cartas: 3, escondidas: 0, pista: "dobro", casas: 3 },
  { cores: 3, min: 1, max: 6, vagas: 2, cartas: 4, escondidas: 0, pista: "dobro", casas: 3 },
  { cores: 3, min: 2, max: 9, vagas: 2, cartas: 4, escondidas: 0, pista: "dobro", casas: 4 },
  { cores: 3, min: 2, max: 9, vagas: 3, cartas: 4, escondidas: 0, pista: "dobro", casas: 4 },
  { cores: 4, min: 2, max: 10, vagas: 3, cartas: 5, escondidas: 0, pista: "dobro", casas: 4 },
  // Daqui em diante uma cor esconde o valor, e todo pacote da noite precisa dela.
  { cores: 3, min: 2, max: 9, vagas: 2, cartas: 3, escondidas: 1, pista: "dobro", casas: 4 },
  { cores: 3, min: 2, max: 9, vagas: 3, cartas: 4, escondidas: 1, pista: "soma", casas: 5 },
  { cores: 4, min: 3, max: 12, vagas: 3, cartas: 5, escondidas: 1, pista: "misto", casas: 5 },
  { cores: 4, min: 3, max: 12, vagas: 3, cartas: 5, escondidas: 2, pista: "misto", casas: 5 },
  { cores: 4, min: 3, max: 12, vagas: 4, cartas: 5, escondidas: 2, pista: "misto", casas: 6 },
];

export const ULTIMA_FASE_NOVA = FASES.length;
export const configDaFase = (fase: number) => FASES[Math.min(fase, FASES.length) - 1];

export const somaDe = (cores: Cor[], valores: Record<Cor, number>) =>
  cores.reduce((total, cor) => total + valores[cor], 0);

// Todos os pacotes de `vagas` presentes que somam `alvo`, sem repetir a mesma mistura em outra ordem.
export function solucoes(cores: readonly Cor[], valores: Record<Cor, number>, vagas: number, alvo: number) {
  const achadas: Cor[][] = [];
  const montar = (de: number, pacote: Cor[], soma: number) => {
    if (pacote.length === vagas) {
      if (soma === alvo) achadas.push(pacote);
      return;
    }
    for (let i = de; i < cores.length; i++) montar(i, [...pacote, cores[i]], soma + valores[cores[i]]);
  };
  montar(0, [], 0);
  return achadas;
}

function sortearValores(config: Config, cores: Cor[], rng: Rng) {
  const possiveis = embaralhar(
    Array.from({ length: config.max - config.min + 1 }, (_, i) => config.min + i),
    rng,
  );
  const valores = { vermelho: 0, verde: 0, azul: 0, amarelo: 0 } as Record<Cor, number>;
  cores.forEach((cor, i) => (valores[cor] = possiveis[i]));
  return valores;
}

// A primeira escondida se descobre com as cores que se veem; a segunda, com a primeira.
function gerarPistas(config: Config, cores: Cor[], escondidas: Cor[], valores: Record<Cor, number>, rng: Rng) {
  const conhecidas = cores.filter((cor) => !escondidas.includes(cor));
  const pistas: Pista[] = [];
  const [primeira, segunda] = escondidas;
  if (primeira) {
    const dobro = config.pista === "dobro" || (config.pista === "misto" && rng() < 0.5);
    const par = dobro ? primeira : conhecidas[sortear(0, conhecidas.length - 1, rng)];
    pistas.push({ cores: [primeira, par], total: valores[primeira] + valores[par] });
  }
  if (segunda) pistas.push({ cores: [primeira, segunda], total: valores[primeira] + valores[segunda] });
  return pistas;
}

function gerarCartas(config: Config, cores: Cor[], escondidas: Cor[], valores: Record<Cor, number>, rng: Rng) {
  const conhecidas = cores.filter((cor) => !escondidas.includes(cor));
  const cartas: Carta[] = [];
  for (let tentativa = 0; cartas.length < config.cartas; tentativa++) {
    // Valores que não rendem bilhetes diferentes o bastante: a noite é sorteada de novo.
    if (tentativa > 300) return null;
    const pacote = Array.from({ length: config.vagas }, () => cores[sortear(0, cores.length - 1, rng)]);
    const alvo = somaDe(pacote, valores);
    if (cartas.some((carta) => carta.alvo === alvo)) continue;
    if (escondidas.length > 0) {
      if (!pacote.some((cor) => escondidas.includes(cor))) continue;
      // O misterioso precisa fazer falta: se as cores à vista resolvem, a pista é ignorada.
      if (solucoes(conhecidas, valores, config.vagas, alvo).length > 0) continue;
    }
    cartas.push({ alvo, vagas: config.vagas });
  }
  return cartas;
}

export function novaFase(fase: number, vidas: number, pontos: number, rng: Rng = Math.random): Estado {
  const config = configDaFase(fase);
  const cores = CORES.slice(0, config.cores);
  for (;;) {
    const valores = sortearValores(config, cores, rng);
    const escondidas = embaralhar(cores, rng).slice(0, config.escondidas);
    const cartas = gerarCartas(config, cores, escondidas, valores, rng);
    if (cartas) return noite(fase, vidas, pontos, config, cores, valores, escondidas, cartas, rng);
  }
}

function noite(
  fase: number,
  vidas: number,
  pontos: number,
  config: Config,
  cores: Cor[],
  valores: Record<Cor, number>,
  escondidas: Cor[],
  cartas: Carta[],
  rng: Rng,
): Estado {
  return {
    fase,
    vidas,
    pontos,
    config,
    cores,
    valores,
    escondidas,
    pistas: gerarPistas(config, cores, escondidas, valores, rng),
    modo: "fabrica",
    cartas,
    atual: 0,
    pacote: Array.from({ length: config.vagas }, () => null),
    errosNaCarta: 0,
    saco: [],
    pedidos: [],
    casa: 0,
    errosNaCasa: 0,
    limpa: true,
  };
}

export const novoJogo = (fase = 1, rng: Rng = Math.random) => novaFase(fase, VIDAS_INICIAIS, 0, rng);

export const cartaAtual = ({ cartas, atual }: Estado) => cartas[atual];
export const pacoteCheio = ({ pacote }: Estado) => pacote.every((cor) => cor !== null);
// A cor que a casa da vez quer e o número que ela mostra.
export const pedidoAtual = ({ pedidos, casa, valores }: Estado) => ({ cor: pedidos[casa], numero: valores[pedidos[casa]] });

// O presente vai para o primeiro lugar vazio. Com tudo cheio, não cabe mais nada.
export function por(estado: Estado, cor: Cor): Estado {
  const vazio = estado.pacote.indexOf(null);
  if (estado.modo !== "fabrica" || vazio < 0) return estado;
  return { ...estado, pacote: estado.pacote.map((atual, i) => (i === vazio ? cor : atual)) };
}

// Tirar do pacote é de graça, e os outros não saem do lugar.
export const tirar = (estado: Estado, indice: number): Estado => ({
  ...estado,
  pacote: estado.pacote.map((atual, i) => (i === indice ? null : atual)),
});

// Com tudo entregue, a próxima noite já vem pronta: quem chama salva o progresso dela.
function proximaNoite(estado: Estado, rng: Rng): Estado {
  return novaFase(estado.fase + 1, estado.vidas, estado.pontos, rng);
}

function pedidosDaEntrega({ saco, config }: Estado, rng: Rng) {
  // Primeiro uma casa para cada cor do saco, para nenhuma cor sobrar sem uso, depois ao acaso.
  const cores = embaralhar([...new Set(saco)], rng);
  const resto = embaralhar(saco, rng);
  const pedidos: Cor[] = [];
  for (const cor of [...cores, ...resto]) {
    if (pedidos.length === config.casas) break;
    const usadas = pedidos.filter((outra) => outra === cor).length;
    if (usadas < saco.filter((outra) => outra === cor).length) pedidos.push(cor);
  }
  return pedidos;
}

// Manda o pacote para o saco. Passar ou faltar não diz por quanto, só para que lado.
export function entregar(estado: Estado, rng: Rng = Math.random): Jogada {
  if (estado.modo !== "fabrica" || !pacoteCheio(estado)) return { estado, resultado: "incompleto" };
  const { alvo } = cartaAtual(estado);
  const soma = somaDe(estado.pacote as Cor[], estado.valores);

  if (soma !== alvo) {
    const custa = estado.fase > ULTIMA_FASE_MANSA;
    const vidas = estado.vidas - (custa ? 1 : 0);
    const novo = { ...estado, vidas, errosNaCarta: estado.errosNaCarta + 1, limpa: false };
    return { estado: novo, resultado: vidas <= 0 ? "fim" : "errado", problema: soma > alvo ? "passou" : "faltou" };
  }

  const ganhou = 10 * estado.config.vagas + (estado.errosNaCarta === 0 ? 5 : 0);
  const saco = [...estado.saco, ...(estado.pacote as Cor[])];
  const atual = estado.atual + 1;
  const base = {
    ...estado,
    pontos: estado.pontos + ganhou,
    saco,
    atual,
    errosNaCarta: 0,
    pacote: estado.pacote.map(() => null),
  };
  if (atual < estado.cartas.length) return { estado: base, resultado: "certo", ganhou };
  return {
    estado: { ...base, modo: "entrega", pedidos: pedidosDaEntrega(base, rng), casa: 0, errosNaCasa: 0 },
    resultado: "saco-cheio",
    ganhou,
  };
}

// Na entrega, errar a cor não custa coração: a casa só não dá os pontos de primeira.
export function escolherNaCasa(estado: Estado, cor: Cor, rng: Rng = Math.random): Jogada {
  if (estado.modo !== "entrega") return { estado, resultado: "incompleto" };
  if (estado.valores[cor] !== pedidoAtual(estado).numero) {
    return { estado: { ...estado, errosNaCasa: estado.errosNaCasa + 1 }, resultado: "outra-casa" };
  }
  const ganhou = estado.errosNaCasa === 0 ? 10 : 2;
  const indice = estado.saco.indexOf(cor);
  const saco = estado.saco.filter((_, i) => i !== indice);
  const casa = estado.casa + 1;
  const base = { ...estado, pontos: estado.pontos + ganhou, saco, casa, errosNaCasa: 0 };
  if (casa < estado.pedidos.length) return { estado: base, resultado: "entregou", ganhou };
  return { estado: proximaNoite(base, rng), resultado: "fase", ganhou };
}

// Quanto o saco já tem, de 0 a 1, para desenhar ele enchendo.
export const cheioDoSaco = ({ atual, cartas, modo }: Estado) => (modo === "entrega" ? 1 : atual / cartas.length);
