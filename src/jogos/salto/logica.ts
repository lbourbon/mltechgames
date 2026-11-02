// Regras do jogo, sem DOM, para serem testadas com Vitest.
import { embaralhar, type Rng } from "../kit/sorteio";

export const VIDAS_INICIAIS = 3;
// Tudo o que é distância vale em pedaços da régua, de 0 a 1: assim a mesma mira serve para
// a régua de 0 a 1000 e para a de −10 a 10.
export const DISTANCIA_MINIMA = 0.14;
const TENTATIVAS = 60;
const PONTOS = { centro: 10, pedra: 5, beirada: 2 };

type Numero = { valor: number; texto: string };
export type Pedra = Numero & { pos: number };
export type Regua = { min: number; max: number; rotulos: Pedra[]; tracos: number[] };
export type Config = { min: number; max: number; passoDoTraco: number; numeros: Numero[]; pedras: number };
export type Mapa = { regua: Regua; base: Pedra; rota: Pedra[]; pedra: number; centro: number; beirada: number };
export type Estado = {
  fase: number;
  vidas: number;
  pontos: number;
  mapa: Mapa;
  // Quantas pedras da rota o astronauta já alcançou.
  feitas: number;
  em: Pedra;
  // Depois de cair, a pedra procurada fica à vista até ele chegar nela.
  revelada: boolean;
};
export type Pouso = "centro" | "pedra" | "beirada" | "outra" | "cratera" | "parado";
export type Resultado = "seguiu" | "fase" | "fim";
export type Jogada = { estado: Estado; pouso: Pouso; resultado: Resultado; ganhou: number; pedra: Pedra | null };

const escrever = (valor: number) => String(valor).replace(".", ",").replace("-", "−");
const numero = (valor: number): Numero => ({ valor, texto: escrever(valor) });

function inteiros(de: number, ate: number, passo = 1) {
  return Array.from({ length: Math.round((ate - de) / passo) + 1 }, (_, i) => numero(de + i * passo));
}

// Conta em inteiros e só divide no fim, porque somar 0,1 várias vezes dá 0,30000000000000004.
function decimais(de: number, ate: number, divisor: number) {
  return inteiros(de, ate).map(({ valor }) => numero(valor / divisor));
}

function fracoes(...lista: [number, number][]) {
  return lista.map(([cima, baixo]): Numero => ({ valor: cima / baixo, texto: `${cima}/${baixo}` }));
}

const FRACOES_FACEIS = fracoes([1, 4], [1, 2], [3, 4], [1, 3], [2, 3]);
const FRACOES_DIFICEIS = [
  ...FRACOES_FACEIS,
  ...fracoes([1, 5], [2, 5], [3, 5], [4, 5], [1, 8], [3, 8], [5, 8], [7, 8]),
];

const regua = (min: number, max: number, passoDoTraco: number, numeros: Numero[], pedras: number): Config => ({
  min,
  max,
  passoDoTraco,
  numeros,
  pedras,
});

// A régua mostra só as pontas e o zero. Os tracinhos sem número ajudam no começo e somem aos
// poucos: quem fica para guiar a criança são as pedras que ela mesma já acendeu.
const FASES = [
  regua(0, 100, 10, inteiros(10, 90, 10), 4),
  regua(0, 100, 10, inteiros(10, 90, 5), 5),
  regua(0, 100, 50, inteiros(10, 90), 5),
  regua(0, 100, 0, inteiros(10, 90), 5),
  regua(0, 1000, 100, inteiros(100, 900, 100), 4),
  regua(0, 1000, 500, inteiros(100, 900, 50), 5),
  regua(0, 1, 0.25, FRACOES_FACEIS, 3),
  regua(0, 1, 0, FRACOES_DIFICEIS, 4),
  regua(0, 10, 1, decimais(2, 18, 2), 4),
  regua(0, 1, 0.1, decimais(1, 9, 10), 4),
  regua(-10, 10, 1, inteiros(-8, 8).filter(({ valor }) => valor !== 0), 4),
  regua(-100, 100, 50, inteiros(-80, 80, 5).filter(({ valor }) => valor !== 0), 4),
];

// Depois das estreias, as réguas se revezam, já sem tracinhos.
const VARIADAS = [
  regua(0, 100, 0, inteiros(10, 90), 5),
  regua(0, 1000, 0, inteiros(10, 90).map(({ valor }) => numero(valor * 10)), 5),
  regua(-100, 100, 0, inteiros(-82, 82).filter(({ valor }) => Math.abs(valor) >= 28), 4),
  regua(0, 1, 0, decimais(10, 90, 100), 5),
  regua(0, 1, 0, FRACOES_DIFICEIS, 4),
];

export const configDaFase = (fase: number) =>
  fase <= FASES.length ? FASES[fase - 1] : VARIADAS[(fase - FASES.length - 1) % VARIADAS.length];

// O tamanho desenhado da pedra é o tamanho real do acerto, então a tela nunca engana.
export function folgasDaFase(fase: number) {
  const pedra = Math.max(0.035, 0.07 - 0.003 * (fase - 1));
  return { pedra, centro: pedra * 0.35, beirada: pedra * 1.7 };
}

const posicao = (valor: number, { min, max }: Pick<Config, "min" | "max">) => (valor - min) / (max - min);
const naRegua = (n: Numero, limites: Pick<Config, "min" | "max">): Pedra => ({ ...n, pos: posicao(n.valor, limites) });

function montarRegua(config: Config): Regua {
  const { min, max, passoDoTraco } = config;
  const partes = passoDoTraco ? Math.round((max - min) / passoDoTraco) : 0;
  const pontas = min < 0 ? [min, 0, max] : [min, max];
  return {
    min,
    max,
    rotulos: pontas.map((valor) => naRegua(numero(valor), config)),
    tracos: Array.from({ length: Math.max(partes - 1, 0) }, (_, i) => (i + 1) / partes),
  };
}

// Pedras espalhadas: nenhuma encosta em outra nem na base, e todo salto é um salto de verdade.
function sortearRota(config: Config, base: Pedra, rng: Rng) {
  let rota: Pedra[] = [];
  for (let tentativa = 0; tentativa < TENTATIVAS && rota.length < config.pedras; tentativa++) {
    rota = [];
    for (const candidato of embaralhar(config.numeros, rng)) {
      const pedra = naRegua(candidato, config);
      const cabe = [base, ...rota].every(({ pos }) => Math.abs(pos - pedra.pos) >= DISTANCIA_MINIMA);
      if (cabe && rota.length < config.pedras) rota.push(pedra);
    }
  }
  return rota;
}

export function gerarFase(fase: number, rng: Rng = Math.random): Mapa {
  const config = configDaFase(fase);
  const base = naRegua(numero(0), config);
  return { regua: montarRegua(config), base, rota: sortearRota(config, base, rng), ...folgasDaFase(fase) };
}

export function novaFase(fase: number, vidas: number, pontos: number, rng: Rng = Math.random): Estado {
  const mapa = gerarFase(fase, rng);
  return { fase, vidas, pontos, mapa, feitas: 0, em: mapa.base, revelada: false };
}

export const novoJogo = (fase = 1, rng: Rng = Math.random) => novaFase(fase, VIDAS_INICIAIS, 0, rng);

export const alvoDe = ({ mapa, feitas }: Estado) => mapa.rota[feitas];

// As pedras visitadas continuam acesas: são elas que servem de referência para os próximos saltos.
export function acesas(estado: Estado) {
  const { mapa, feitas, revelada } = estado;
  return [mapa.base, ...mapa.rota.slice(0, feitas), ...(revelada ? [alvoDe(estado)] : [])];
}

function alcancar(estado: Estado, pouso: "centro" | "pedra" | "beirada", rng: Rng): Jogada {
  const alvo = alvoDe(estado);
  // Com a pedra à vista não há o que estimar, então a volta não rende pontos.
  const ganhou = estado.revelada ? 0 : PONTOS[pouso];
  const feitas = estado.feitas + 1;
  const pontos = estado.pontos + ganhou;
  if (feitas < estado.mapa.rota.length) {
    return {
      estado: { ...estado, feitas, pontos, em: alvo, revelada: false },
      pouso,
      resultado: "seguiu",
      ganhou,
      pedra: alvo,
    };
  }
  const bonus = estado.fase * 10;
  const vidas = Math.min(estado.vidas + 1, VIDAS_INICIAIS);
  return {
    estado: novaFase(estado.fase + 1, vidas, pontos + bonus, rng),
    pouso,
    resultado: "fase",
    ganhou: ganhou + bonus,
    pedra: alvo,
  };
}

// mira é o ponto da régua onde ele vai cair, de 0 a 1.
export function saltar(estado: Estado, mira: number, rng: Rng = Math.random): Jogada {
  const { pedra, centro, beirada } = estado.mapa;
  const erro = Math.abs(mira - alvoDe(estado).pos);
  if (erro <= centro) return alcancar(estado, "centro", rng);
  if (erro <= pedra) return alcancar(estado, "pedra", rng);

  const nao = { ganhou: 0, resultado: "seguiu" as const };
  const perto = (outra: Pedra) => Math.abs(mira - outra.pos) <= pedra;
  // Soltar em cima dele mesmo desiste do salto.
  if (perto(estado.em)) return { ...nao, estado, pouso: "parado", pedra: null };
  // Cair em pedra acesa é seguro: não é a procurada, mas chão é chão.
  const outra = acesas(estado).find(perto);
  if (outra) return { ...nao, estado: { ...estado, em: outra }, pouso: "outra", pedra: outra };

  if (erro <= beirada) return alcancar(estado, "beirada", rng);

  const vidas = estado.vidas - 1;
  return {
    ...nao,
    estado: { ...estado, vidas, revelada: true },
    pouso: "cratera",
    resultado: vidas <= 0 ? "fim" : "seguiu",
    pedra: null,
  };
}
