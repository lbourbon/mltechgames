// Dinheiro de brinquedo, com as moedas e notas do real. Tudo em centavos.
import { sortear, type Rng } from "../kit/sorteio";

export type Monte = number[];

export const MOEDAS = [5, 10, 25, 50, 100];
export const NOTAS = [200, 500, 1000, 2000, 5000];

// Raio de cada moeda na pista, proporcional ao diâmetro de verdade. A de 10 é menor que a de 5,
// e a de 25 é maior que a de 50: a maior nem sempre vale mais, como no bolso.
export const RAIO_DA_MOEDA: Record<number, number> = { 5: 11.4, 10: 10.4, 25: 13, 50: 12, 100: 14 };
export const NOTA = { largura: 34, altura: 19 };
export const ehNota = (valor: number) => valor >= 200;
export const raioDaPeca = (valor: number) => (ehNota(valor) ? NOTA.altura / 2 + 3 : RAIO_DA_MOEDA[valor]);

export const total = (monte: Monte) => monte.reduce((soma, valor) => soma + valor, 0);

export function formatar(centavos: number) {
  const reais = Math.floor(centavos / 100);
  const resto = String(centavos % 100).padStart(2, "0");
  // Espaço que não quebra: o R$ nunca fica sozinho no fim da linha.
  return `R$\u00a0${reais.toLocaleString("pt-BR")},${resto}`;
}

type Nivel = {
  pecas: number[];
  min: number;
  max: number;
  // Montes de uma moeda só: 4 de 10 contra 1 de 50.
  iguais?: boolean;
  teto: number;
  // Diferença mínima entre os montes, para nunca empatar e nem exigir conta impossível.
  diferenca: number;
};

const NIVEIS: Nivel[] = [
  { pecas: MOEDAS, min: 1, max: 1, teto: 100, diferenca: 5 },
  { pecas: [5, 10, 25, 50], min: 1, max: 4, iguais: true, teto: 200, diferenca: 5 },
  { pecas: MOEDAS, min: 2, max: 4, teto: 300, diferenca: 5 },
  { pecas: [10, 25, 50, 100, 200], min: 2, max: 4, teto: 600, diferenca: 10 },
  { pecas: [50, 100, 200, 500, 1000], min: 2, max: 4, teto: 2000, diferenca: 50 },
  { pecas: [100, 200, 500, 1000, 2000, 5000], min: 2, max: 5, teto: 10000, diferenca: 100 },
];

export const QUANTOS_NIVEIS = NIVEIS.length;
const TENTATIVAS = 600;
const PERTO = 0.45;

function sortearMonte(nivel: Nivel, rng: Rng): Monte {
  const quantas = sortear(nivel.min, nivel.max, rng);
  if (nivel.iguais) {
    const valor = nivel.pecas[sortear(0, nivel.pecas.length - 1, rng)];
    return Array(quantas).fill(valor);
  }
  const monte = Array.from({ length: quantas }, () => nivel.pecas[sortear(0, nivel.pecas.length - 1, rng)]);
  return monte.sort((a, b) => b - a);
}

const maior = (monte: Monte) => Math.max(...monte);
const tamanho = (valor: number) => (ehNota(valor) ? 100 + valor : RAIO_DA_MOEDA[valor]);

// O que um chute olharia: mais peças, a peça mais valiosa ou a moeda que parece maior.
export const ATALHOS = {
  maisPecas: (a: Monte, b: Monte) => a.length - b.length,
  maiorPeca: (a: Monte, b: Monte) => maior(a) - maior(b),
  pareceMaior: (a: Monte, b: Monte) => Math.max(...a.map(tamanho)) - Math.max(...b.map(tamanho)),
};

// Tipos de par, do ponto de vista do monte mais rico. Com as moedas e notas do real, o rico
// nunca tem menos peças e a menor peça mais valiosa ao mesmo tempo, então só sobram estes.
// Sorteados nesta medida, nem "mais peças" nem "a nota mais alta" acertam muito mais que metade.
const TIPOS_DE_PAR = [
  // Mais peças, mas a peça mais valiosa está no outro: 4 de 25 contra 1 de 50.
  { peso: 0.4, maisPecas: 1, maiorPeca: false },
  // Menos peças, e com a mais valiosa: 1 de 50 contra 3 de 10.
  { peso: 0.4, maisPecas: -1, maiorPeca: true },
  // O mesmo número de peças.
  { peso: 0.2, maisPecas: 0, maiorPeca: null },
];

function sortearTipo(rng: Rng) {
  let sorte = rng();
  for (const tipo of TIPOS_DE_PAR) {
    sorte -= tipo.peso;
    if (sorte < 0) return tipo;
  }
  return TIPOS_DE_PAR[TIPOS_DE_PAR.length - 1];
}

function combina(rico: Monte, pobre: Monte, nivel: Nivel, desejo: { tipo: (typeof TIPOS_DE_PAR)[number]; pareceMaior: boolean }) {
  // Com uma moeda só, a peça mais valiosa é o monte mais rico: a armadilha é o tamanho.
  if (nivel.max === 1) return ATALHOS.pareceMaior(rico, pobre) > 0 === desejo.pareceMaior;
  const { maisPecas, maiorPeca } = desejo.tipo;
  if (Math.sign(ATALHOS.maisPecas(rico, pobre)) !== maisPecas) return false;
  if (maiorPeca === null) return true;
  // Empate na peça mais valiosa não engana ninguém: ela precisa estar de um lado só.
  const diferenca = ATALHOS.maiorPeca(rico, pobre);
  return maiorPeca ? diferenca > 0 : diferenca < 0;
}

// Dois montes de valores diferentes. Um some quando o outro é pego, então só contar vale a pena.
export function gerarPar(numeroDoNivel: number, rng: Rng): [Monte, Monte] {
  const nivel = NIVEIS[Math.min(numeroDoNivel, NIVEIS.length) - 1];
  const desejo = { tipo: sortearTipo(rng), pareceMaior: rng() < 0.5 };
  let reserva: [Monte, Monte] | null = null;
  for (let i = 0; i < TENTATIVAS; i++) {
    const a = sortearMonte(nivel, rng);
    const b = sortearMonte(nivel, rng);
    const [ta, tb] = [total(a), total(b)];
    if (ta > nivel.teto || tb > nivel.teto || Math.abs(ta - tb) < nivel.diferenca) continue;
    // Montes de valor parecido: com um muito maior, bastaria olhar por cima.
    if (nivel.max > 1 && Math.abs(ta - tb) > PERTO * Math.max(ta, tb)) continue;
    const [rico, pobre] = ta > tb ? [a, b] : [b, a];
    reserva ??= [a, b];
    if (combina(rico, pobre, nivel, desejo)) return rng() < 0.5 ? [a, b] : [b, a];
  }
  return reserva ?? [[nivel.pecas[0]], [nivel.pecas[1]]];
}
