// Regras do jogo, sem DOM, para serem testadas com Vitest. Como na minhoca, tudo acontece a
// cada quadro, então passo muda o estado em vez de copiá-lo.
import { embaralhar, sortear, type Rng } from "../kit/sorteio";
import { CARROS, EQUIPAMENTOS, MODELOS, PINTURAS, type EquipamentoId, type ModeloId } from "./carros";
import { gerarPar, raioDaPeca, total, type Monte } from "./dinheiro";
import {
  distancia,
  LONGE_NA_VOLTA,
  MEIA_PISTA,
  maisProximo,
  montarPista,
  pontoNaPista,
  type Pista,
  type Ponto,
} from "./pistas";

export const VIDAS_INICIAIS = 3;
export const ULTIMA_FASE_MANSA = 2;
// Chegar até esta posição passa de fase.
export const PODIO = 2;
export const RAIO_DO_CARRO = 8;
export const RAIO_DO_OBSTACULO = 9;
// Distância do meio da pista até os montes e os obstáculos. Quem anda pelo meio não pega
// dinheiro nenhum, e bate nos obstáculos.
export const LADO_DO_MONTE = 32;
export const LADO_DO_OBSTACULO = 15;
export const PARES_POR_VOLTA = 2;
// Contagem antes da largada, em segundos.
export const LARGADA = 3;
const ESPACO_DAS_PECAS = 7;
const MEIO_MONTE = 22;
// A grade de largada fica até 15 amostras atrás da linha: nada de obstáculo ali.
const ZONA_DA_LARGADA = { antes: 30, depois: 22 };
const FREIO = 220;
const SOLTO = 120;
const FREIO_ACIMA = 260;
const RE = { velocidade: 0.4, aceleracao: 0.6 };
const VELOCIDADE_DO_VOLANTE = 50;
const VOLANTE_PARADO = 0.45;
const MURO = { deLado: 0.25, deFrente: 3 };
const MENOS_RASPADA_POR_PNEU = 0.2;
// Na grama entre o asfalto e o muro o carro anda mais devagar.
const GRAMA = 0.6;
const MENOS_LENTO_NA_GRAMA_POR_PNEU = 0.1;
const NO_ASFALTO = MEIA_PISTA + 2;

// O meio do carro para aqui, com a lataria encostada no muro.
export const limiteDoMuro = (pista: Pista) => pista.muro - RAIO_DO_CARRO;
// Com o muro não há atalho, mas um salto grande no meio da conta nunca vale volta.
const SALTO_MAXIMO = Math.floor(LONGE_NA_VOLTA / 4);
const TURBO = { velocidade: 1.4, aceleracao: 2.2, recarga: 6 };
const DURACAO_DO_TURBO = [0, 1, 1.5, 2];
// Nem com o ímã máximo quem anda pelo meio alcança um monte.
const ALCANCE_DO_IMA = [0, 5, 9];
const MAIS_CURVA_POR_PNEU = 0.12;
// Os rivais desviam dos obstáculos para o outro lado, e cada um corre na sua faixa.
const DESVIO_DOS_RIVAIS = 9;
const FAIXAS = [-4, 4, 0];
const PERTO_DO_OBSTACULO = 5;
const RAMPA = 8;
const OBSTACULOS_DO_MESMO_LADO = 9;
const OBSTACULOS_DE_LADOS_OPOSTOS = 2 * (PERTO_DO_OBSTACULO + RAMPA);
const CURVA_DOS_RIVAIS = 12;
const PONTOS = { monte: 2, corrida: [15, 8, 4, 0], treino: 5 };

export type Tipo = "treino" | "corrida";

export type ConfigFase = {
  tipo: Tipo;
  pista: number;
  espelhada: boolean;
  voltas: number;
  // Nível dos montes de dinheiro, em dinheiro.ts.
  nivel: number;
  obstaculos: number;
  // Velocidade de cada rival nas retas.
  rivais: number[];
  // Prêmio por posição. No treino, só o de quem chega.
  premios: number[];
  // O carro que dá conta desta fase, usado para a verba de quem continua daqui.
  carro: ModeloId;
};

const treino = (pista: number, espelhada: boolean, nivel: number, obstaculos: number, premio: number, carro: ModeloId): ConfigFase => ({
  tipo: "treino",
  pista,
  espelhada,
  voltas: 2,
  nivel,
  obstaculos,
  rivais: [],
  premios: [premio],
  carro,
});

const corrida = (
  pista: number,
  espelhada: boolean,
  voltas: number,
  nivel: number,
  obstaculos: number,
  rivais: number[],
  premios: number[],
  carro: ModeloId,
): ConfigFase => ({ tipo: "corrida", pista, espelhada, voltas, nivel, obstaculos, rivais, premios, carro });

export const FASES: ConfigFase[] = [
  treino(0, false, 1, 0, 100, "bolinha"),
  corrida(0, false, 2, 1, 0, [60, 70, 80], [300, 200, 100, 50], "bolinha"),
  treino(1, false, 2, 3, 150, "bolinha"),
  corrida(1, false, 3, 2, 3, [80, 90, 100], [500, 300, 150, 50], "jipe"),
  treino(2, false, 3, 4, 200, "jipe"),
  corrida(2, false, 3, 3, 4, [95, 106, 117], [800, 500, 250, 100], "esportivo"),
  treino(3, false, 4, 5, 300, "esportivo"),
  corrida(3, false, 3, 4, 5, [100, 112, 121], [1500, 1000, 500, 200], "esportivo"),
  treino(4, false, 5, 5, 500, "formula"),
  corrida(4, false, 3, 5, 5, [120, 132, 144], [3000, 2000, 1000, 500], "formula"),
  treino(0, true, 5, 6, 800, "formula"),
  corrida(1, true, 3, 5, 6, [134, 148, 160], [5000, 3000, 1500, 500], "super"),
  treino(2, true, 6, 6, 1000, "super"),
  corrida(3, true, 3, 6, 6, [146, 160, 172], [8000, 5000, 2500, 1000], "voador"),
  treino(4, true, 6, 7, 1500, "voador"),
  corrida(0, false, 3, 6, 7, [156, 170, 181], [10000, 6000, 3000, 1000], "disco"),
  treino(1, true, 6, 7, 2000, "disco"),
  corrida(2, true, 3, 6, 7, [158, 172, 183], [12000, 7000, 3500, 1000], "disco"),
  treino(3, false, 6, 8, 2500, "disco"),
  corrida(4, true, 3, 6, 8, [160, 174, 185], [14000, 8000, 4000, 1500], "disco"),
  treino(0, true, 6, 8, 3000, "disco"),
  corrida(1, false, 3, 6, 8, [162, 176, 187], [16000, 9000, 4500, 1500], "disco"),
  treino(2, false, 6, 9, 3500, "disco"),
  // Semifinal e grande final, uma atrás da outra.
  corrida(3, false, 3, 6, 9, [164, 178, 189], [18000, 10000, 5000, 2000], "disco"),
  corrida(4, false, 4, 6, 9, [166, 180, 190], [30000, 15000, 7000, 2000], "disco"),
];

// Passar da última fase zera o jogo.
export const ULTIMA_FASE = FASES.length;

export const configDaFase = (fase: number): ConfigFase => FASES[Math.min(fase, ULTIMA_FASE) - 1];

export type Garagem = {
  carros: ModeloId[];
  carro: ModeloId;
  cor: string;
  // Cada carro guarda a própria pintura.
  pinturas: Partial<Record<ModeloId, string>>;
  niveis: Record<EquipamentoId, number>;
};

export type Peca = Ponto & { valor: number };
export type Par = { centro: number; lados: [Peca[], Peca[]]; ativo: boolean };
export type Obstaculo = Ponto & { indice: number; lado: number; ativo: boolean; tipo: number };
export type Rival = {
  s: number;
  lateral: number;
  largada: number;
  ritmo: number;
  faixa: number;
  chegou: boolean;
  modelo: ModeloId;
  cor: string;
};
export type Jogador = Ponto & {
  angulo: number;
  vel: number;
  indice: number;
  // Amostras andadas desde a largada: n por volta.
  progresso: number;
  voltas: number;
  turbo: number;
  recarga: number;
  naGrama: boolean;
};

export type Corrida = {
  config: ConfigFase;
  pista: Pista;
  jogador: Jogador;
  rivais: Rival[];
  pares: Par[];
  obstaculos: Obstaculo[];
  // Desvio dos rivais em cada amostra, para longe dos obstáculos.
  linha: number[];
  // Quanto cada amostra freia os rivais, pela curva que vem pela frente.
  lentidao: number[];
  largada: number;
  tempo: number;
  posicao: number;
  terminou: boolean;
  ganho: number;
  acertos: number;
  escolhas: number;
};

export type Estado = {
  fase: number;
  vidas: number;
  pontos: number;
  dinheiro: number;
  garagem: Garagem;
  corrida: Corrida;
};

export type Evento =
  | { tipo: "largou" }
  | { tipo: "pegou"; par: Par; lado: number; valor: number; outro: number; melhor: boolean }
  | { tipo: "bateu"; obstaculo: Obstaculo }
  | { tipo: "volta"; volta: number }
  | { tipo: "chegou"; posicao: number };

// Setas: para cima acelera (1), para baixo freia e dá ré (-1), e os lados viram (-1 é a esquerda).
// Sem seta, o carro para aos poucos.
export type Comando = { acelera: number; vira: number } | null;

export function atributos(garagem: Garagem) {
  const carro = CARROS[garagem.carro];
  const { turbo, pneus, ima } = garagem.niveis;
  return {
    vmax: carro.vmax,
    acel: carro.acel,
    curva: carro.curva * (1 + MAIS_CURVA_POR_PNEU * pneus),
    raspar: 1 - MENOS_RASPADA_POR_PNEU * pneus,
    grama: GRAMA + MENOS_LENTO_NA_GRAMA_POR_PNEU * pneus,
    tranco: carro.tranco,
    alcance: ALCANCE_DO_IMA[ima],
    turbo: DURACAO_DO_TURBO[turbo],
    voa: Boolean(carro.voa),
  };
}

const girar = (angulo: number) => Math.atan2(Math.sin(angulo), Math.cos(angulo));
const limitar = (valor: number, min: number, max: number) => Math.min(max, Math.max(min, valor));
const anguloDe = ({ x, y }: Ponto) => Math.atan2(y, x);

// Distância em amostras, com sinal, do jeito mais curto pela volta.
function diferenca(pista: Pista, a: number, b: number) {
  const { n } = pista;
  return ((((a - b) % n) + n + n / 2) % n) - n / 2;
}

export function gerarPares(pista: Pista, nivel: number, rng: Rng): Par[] {
  return pista.montes.map((centro) => {
    const montes = gerarPar(nivel, rng);
    const lados = montes.map((monte: Monte, lado) =>
      monte.map((valor, j) => {
        const indice = centro + (j - (monte.length - 1) / 2) * ESPACO_DAS_PECAS;
        return { valor, ...pontoNaPista(pista, indice, lado === 0 ? -LADO_DO_MONTE : LADO_DO_MONTE) };
      }),
    ) as [Peca[], Peca[]];
    return { centro, lados, ativo: true };
  });
}

function longeDaLargadaEDosMontes(pista: Pista, i: number) {
  const largada = diferenca(pista, i, 0);
  if (largada > -ZONA_DA_LARGADA.antes && largada < ZONA_DA_LARGADA.depois) return false;
  return pista.montes.every((centro) => Math.abs(diferenca(pista, i, centro)) > MEIO_MONTE);
}

function gerarObstaculos(pista: Pista, quantos: number, rng: Rng): Obstaculo[] {
  const candidatos = embaralhar(
    Array.from({ length: pista.n }, (_, i) => i).filter((i) => longeDaLargadaEDosMontes(pista, i)),
    rng,
  );
  const escolhidos: Obstaculo[] = [];
  for (const indice of candidatos) {
    if (escolhidos.length >= quantos) break;
    const lado = rng() < 0.5 ? -1 : 1;
    const cabe = escolhidos.every((outro) => {
      const longe = Math.abs(diferenca(pista, indice, outro.indice));
      return longe >= (outro.lado === lado ? OBSTACULOS_DO_MESMO_LADO : OBSTACULOS_DE_LADOS_OPOSTOS);
    });
    if (!cabe) continue;
    const ponto = pontoNaPista(pista, indice, lado * LADO_DO_OBSTACULO);
    escolhidos.push({ ...ponto, indice, lado, ativo: true, tipo: sortear(0, 2, rng) });
  }
  return escolhidos.sort((a, b) => a.indice - b.indice);
}

function tracarLinha(pista: Pista, obstaculos: Obstaculo[]) {
  const linha = Array<number>(pista.n).fill(0);
  for (const { indice, lado } of obstaculos) {
    for (let d = -(PERTO_DO_OBSTACULO + RAMPA); d <= PERTO_DO_OBSTACULO + RAMPA; d++) {
      const i = (((indice + d) % pista.n) + pista.n) % pista.n;
      const fora = Math.max(0, Math.abs(d) - PERTO_DO_OBSTACULO) / RAMPA;
      const peso = 1 - fora * fora * (3 - 2 * fora);
      const desvio = -lado * DESVIO_DOS_RIVAIS * peso;
      if (Math.abs(desvio) > Math.abs(linha[i])) linha[i] = desvio;
    }
  }
  return linha;
}

function medirLentidao(pista: Pista) {
  return pista.curvas.map((_, i) => {
    let maior = 0;
    for (let d = -3; d <= 8; d++) maior = Math.max(maior, pista.curvas[(i + d + pista.n) % pista.n]);
    return 1 / (1 + CURVA_DOS_RIVAIS * maior);
  });
}

// O carro de cada rival combina com a velocidade dele, e voa se quem joga voa.
function modeloDoRival(ritmo: number, voa: boolean): ModeloId {
  const possiveis = MODELOS.filter((id) => Boolean(CARROS[id].voa) === voa && id !== "bolinha");
  return possiveis.find((id) => CARROS[id].vmax >= ritmo + 10) ?? possiveis[possiveis.length - 1];
}

export function montarCorrida(fase: number, garagem: Garagem, rng: Rng): Corrida {
  const config = configDaFase(fase);
  const pista = montarPista(config.pista, config.espelhada);
  const obstaculos = gerarObstaculos(pista, config.obstaculos, rng);
  const voa = atributos(garagem).voa;
  const cores = embaralhar(
    PINTURAS.filter((cor) => cor !== garagem.cor),
    rng,
  );
  // Grade de largada em duas filas: quem joga sai na frente, à esquerda.
  const grade = [
    { atras: 4, lado: 12 },
    { atras: 15, lado: -12 },
    { atras: 15, lado: 12 },
  ];
  const rivais = config.rivais.map((ritmo, i) => ({
    s: -grade[i].atras * pista.passo,
    lateral: grade[i].lado,
    largada: grade[i].lado,
    ritmo,
    faixa: FAIXAS[i],
    chegou: false,
    modelo: modeloDoRival(ritmo, voa),
    cor: cores[i],
  }));
  const lado = config.rivais.length ? -12 : 0;
  const inicio = pontoNaPista(pista, -4, lado);
  return {
    config,
    pista,
    jogador: {
      ...inicio,
      angulo: anguloDe(pista.tangentes[0]),
      vel: 0,
      indice: pista.n - 4,
      progresso: -4,
      voltas: 0,
      turbo: 0,
      recarga: 0,
      naGrama: false,
    },
    rivais,
    pares: gerarPares(pista, config.nivel, rng),
    obstaculos,
    linha: tracarLinha(pista, obstaculos),
    lentidao: medirLentidao(pista),
    largada: LARGADA,
    tempo: 0,
    posicao: 0,
    terminou: false,
    ganho: 0,
    acertos: 0,
    escolhas: 0,
  };
}

const garagemInicial = (): Garagem => ({
  carros: ["bolinha"],
  carro: "bolinha",
  cor: CARROS.bolinha.cor,
  pinturas: {},
  niveis: { turbo: 0, pneus: 0, ima: 0 },
});

// Gerador próprio e fixo: a verba não pode mudar de uma visita para outra.
function sementeFixa(valor: number): Rng {
  let s = valor;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const medias = new Map<number, number>();

// Quanto vale, em média, um monte escolhido ao acaso.
export function mediaDoNivel(nivel: number) {
  if (!medias.has(nivel)) {
    const rng = sementeFixa(nivel);
    let soma = 0;
    const amostras = 300;
    for (let i = 0; i < amostras; i++) {
      const [a, b] = gerarPar(nivel, rng);
      soma += (total(a) + total(b)) / 2;
    }
    medias.set(nivel, Math.round(soma / amostras / 5) * 5);
  }
  return medias.get(nivel)!;
}

// O que um jogador que escolhe montes ao acaso e chega em segundo ganha na fase.
export function rendaDaFase(fase: number) {
  const config = configDaFase(fase);
  const premio = config.tipo === "corrida" ? config.premios[PODIO - 1] : config.premios[0];
  return mediaDoNivel(config.nivel) * PARES_POR_VOLTA * config.voltas + premio;
}

// Quem continua de uma fase adiantada chega com o dinheiro que teria juntado até ali.
export function verbaDaFase(fase: number) {
  let soma = 0;
  for (let f = 1; f < fase; f++) soma += rendaDaFase(f);
  return Math.floor(soma / 50) * 50;
}

export function novoJogo(fase: number, rng: Rng = Math.random): Estado {
  const garagem = garagemInicial();
  return {
    fase,
    vidas: VIDAS_INICIAIS,
    pontos: 0,
    dinheiro: verbaDaFase(fase),
    garagem,
    corrida: montarCorrida(fase, garagem, rng),
  };
}

// Prepara a corrida da fase atual: a próxima, ou a mesma de novo.
export function prepararCorrida(estado: Estado, rng: Rng = Math.random) {
  estado.corrida = montarCorrida(estado.fase, estado.garagem, rng);
}

export function posicaoDoRival({ pista }: Corrida, rival: Rival) {
  const i = rival.s / pista.passo;
  const ponto = pontoNaPista(pista, i, rival.lateral);
  const t = pista.tangentes[(((Math.round(i) % pista.n) + pista.n) % pista.n)];
  return { ...ponto, angulo: anguloDe(t) };
}

function moverRivais(corrida: Corrida, dt: number) {
  const { pista, linha, lentidao, config } = corrida;
  const final = config.voltas * pista.comprimento;
  for (const rival of corrida.rivais) {
    const i = (((Math.round(rival.s / pista.passo) % pista.n) + pista.n) % pista.n);
    rival.s += rival.ritmo * lentidao[i] * dt;
    // Sai da grade de largada para a própria faixa aos poucos.
    const saida = limitar((rival.s + 60) / 120, 0, 1);
    rival.lateral = rival.largada + (linha[i] + rival.faixa - rival.largada) * saida;
    if (!rival.chegou && rival.s >= final) rival.chegou = true;
  }
}

function moverJogador(corrida: Corrida, garagem: Garagem, comando: Comando, dt: number) {
  const carro = atributos(garagem);
  const j = corrida.jogador;
  let limite = carro.vmax * (j.naGrama ? carro.grama : 1);
  let acel = carro.acel;
  if (j.turbo > 0) {
    j.turbo = Math.max(0, j.turbo - dt);
    limite *= TURBO.velocidade;
    acel *= TURBO.aceleracao;
  }
  j.recarga = Math.max(0, j.recarga - dt);

  // Como um carro de verdade: as setas dos lados giram o volante, e de ré o carro vira ao contrário.
  // Parado ele ainda gira um pouco, para quem encostou no muro conseguir sair.
  const acelera = limitar(comando?.acelera ?? 0, -1, 1);
  const vira = limitar(comando?.vira ?? 0, -1, 1);
  const firmeza = limitar(Math.abs(j.vel) / VELOCIDADE_DO_VOLANTE, VOLANTE_PARADO, 1);
  const sentido = j.vel < -1 ? -1 : 1;
  j.angulo = girar(j.angulo + vira * carro.curva * firmeza * sentido * dt);

  if (acelera > 0) j.vel += (j.vel < 0 ? FREIO : acel) * acelera * dt;
  else if (acelera < 0) j.vel += (j.vel > 0 ? FREIO : acel * RE.aceleracao) * acelera * dt;
  else j.vel = Math.sign(j.vel) * Math.max(0, Math.abs(j.vel) - SOLTO * dt);
  // Acima do limite só depois do turbo: perde o excesso aos poucos.
  if (j.vel > limite) j.vel = Math.max(limite, j.vel - FREIO_ACIMA * dt);
  j.vel = Math.max(j.vel, -carro.vmax * RE.velocidade);

  j.x += Math.cos(j.angulo) * j.vel * dt;
  j.y += Math.sin(j.angulo) * j.vel * dt;

  // O muro na beira da pista segura o carro, que desliza junto dele. Raspa mais quem bate de frente.
  const { pontos } = corrida.pista;
  const perto = maisProximo(corrida.pista, j);
  const limiteMuro = limiteDoMuro(corrida.pista);
  if (perto.distancia > limiteMuro) {
    const centro = pontos[perto.indice];
    const fora = { x: (j.x - centro.x) / perto.distancia, y: (j.y - centro.y) / perto.distancia };
    j.x = centro.x + fora.x * limiteMuro;
    j.y = centro.y + fora.y * limiteMuro;
    const deFrente = Math.max(0, Math.sign(j.vel) * (Math.cos(j.angulo) * fora.x + Math.sin(j.angulo) * fora.y));
    j.vel *= Math.max(0, 1 - carro.raspar * (MURO.deLado + MURO.deFrente * deFrente) * dt);
  }
  j.naGrama = Math.min(perto.distancia, limiteMuro) > NO_ASFALTO;

  const { indice } = maisProximo(corrida.pista, j);
  const salto = diferenca(corrida.pista, indice, j.indice);
  if (Math.abs(salto) <= SALTO_MAXIMO) j.progresso += salto;
  j.indice = indice;
}

// Bater tira um pouco da velocidade e mais nada: atrapalha o mínimo.
function bater(corrida: Corrida, garagem: Garagem, eventos: Evento[]) {
  const j = corrida.jogador;
  const { tranco } = atributos(garagem);
  for (const obstaculo of corrida.obstaculos) {
    if (!obstaculo.ativo || distancia(j, obstaculo) >= RAIO_DO_CARRO + RAIO_DO_OBSTACULO) continue;
    obstaculo.ativo = false;
    j.vel *= tranco;
    eventos.push({ tipo: "bateu", obstaculo });
  }
}

// Encostar em qualquer peça leva o monte inteiro, e o outro lado some.
function pegar(estado: Estado, eventos: Evento[]) {
  const corrida = estado.corrida;
  const j = corrida.jogador;
  const { alcance } = atributos(estado.garagem);
  for (const par of corrida.pares) {
    if (!par.ativo || Math.abs(diferenca(corrida.pista, j.indice, par.centro)) > MEIO_MONTE + 4) continue;
    let escolhido = -1;
    let menor = Infinity;
    par.lados.forEach((pecas, lado) => {
      for (const peca of pecas) {
        const folga = distancia(j, peca) - (RAIO_DO_CARRO + raioDaPeca(peca.valor) + alcance);
        if (folga < 0 && folga < menor) {
          menor = folga;
          escolhido = lado;
        }
      }
    });
    if (escolhido < 0) continue;
    par.ativo = false;
    const valor = total(par.lados[escolhido].map((peca) => peca.valor));
    const outro = total(par.lados[1 - escolhido].map((peca) => peca.valor));
    const melhor = valor > outro;
    estado.dinheiro += valor;
    corrida.ganho += valor;
    corrida.escolhas++;
    if (melhor) {
      corrida.acertos++;
      estado.pontos += PONTOS.monte;
    }
    eventos.push({ tipo: "pegou", par, lado: escolhido, valor, outro, melhor });
  }
}

function contarVoltas(estado: Estado, rng: Rng, eventos: Evento[]) {
  const corrida = estado.corrida;
  const { jogador: j, pista, config } = corrida;
  if (j.progresso < (j.voltas + 1) * pista.n) return;
  j.voltas++;
  if (j.voltas < config.voltas) {
    // Volta nova, dinheiro novo, e os obstáculos derrubados voltam para o lugar.
    corrida.pares = gerarPares(pista, config.nivel, rng);
    corrida.obstaculos.forEach((obstaculo) => (obstaculo.ativo = true));
    eventos.push({ tipo: "volta", volta: j.voltas + 1 });
    return;
  }
  corrida.terminou = true;
  corrida.posicao = 1 + corrida.rivais.filter((rival) => rival.chegou).length;
  eventos.push({ tipo: "chegou", posicao: corrida.posicao });
}

export function passo(estado: Estado, comando: Comando, dt: number, rng: Rng = Math.random): Evento[] {
  const corrida = estado.corrida;
  const eventos: Evento[] = [];
  if (corrida.terminou) return eventos;
  if (corrida.largada > 0) {
    corrida.largada -= dt;
    if (corrida.largada > 0) return eventos;
    eventos.push({ tipo: "largou" });
  }
  corrida.tempo += dt;
  moverRivais(corrida, dt);
  moverJogador(corrida, estado.garagem, comando, dt);
  bater(corrida, estado.garagem, eventos);
  pegar(estado, eventos);
  contarVoltas(estado, rng, eventos);
  return eventos;
}

export const turboPronto = (estado: Estado) =>
  estado.garagem.niveis.turbo > 0 && estado.corrida.jogador.recarga <= 0 && estado.corrida.largada <= 0;

export function ligarTurbo(estado: Estado) {
  if (!turboPronto(estado) || estado.corrida.terminou) return false;
  const j = estado.corrida.jogador;
  j.turbo = atributos(estado.garagem).turbo;
  j.recarga = TURBO.recarga;
  return true;
}

export const TEMPO_DE_RECARGA = TURBO.recarga;

export type Resultado = {
  passou: boolean;
  posicao: number;
  premio: number;
  perdeuVida: boolean;
  bonus: number;
  // Passou da última fase: o jogo acabou, e a fase salva continua sendo a última.
  zerou: boolean;
};

// Fecha a fase depois da chegada: prêmio, pontos e, se for o caso, um coração a menos.
export function encerrar(estado: Estado): Resultado {
  const { config, posicao } = estado.corrida;
  const corridaDeVerdade = config.tipo === "corrida";
  const premio = corridaDeVerdade ? (config.premios[posicao - 1] ?? 0) : config.premios[0];
  const bonus = corridaDeVerdade ? (PONTOS.corrida[posicao - 1] ?? 0) : PONTOS.treino;
  const passou = !corridaDeVerdade || posicao <= PODIO;
  const perdeuVida = !passou && estado.fase > ULTIMA_FASE_MANSA;
  estado.dinheiro += premio;
  estado.pontos += bonus;
  const zerou = passou && estado.fase >= ULTIMA_FASE;
  if (passou && !zerou) estado.fase++;
  if (perdeuVida) estado.vidas--;
  return { passou, posicao, premio, perdeuVida, bonus, zerou };
}

export type Compra = { tipo: "carro"; id: ModeloId } | { tipo: "equipamento"; id: EquipamentoId };

// Preço do que ainda dá para comprar, ou null para o que já é seu.
export function precoDe(garagem: Garagem, compra: Compra) {
  if (compra.tipo === "carro") return garagem.carros.includes(compra.id) ? null : CARROS[compra.id].preco;
  return EQUIPAMENTOS[compra.id].precos[garagem.niveis[compra.id]] ?? null;
}

export function comprar(estado: Estado, compra: Compra): "comprou" | "falta" | "nada" {
  const preco = precoDe(estado.garagem, compra);
  if (preco === null) return "nada";
  if (preco > estado.dinheiro) return "falta";
  estado.dinheiro -= preco;
  if (compra.tipo === "carro") {
    estado.garagem.carros.push(compra.id);
    usarCarro(estado, compra.id);
  } else {
    estado.garagem.niveis[compra.id]++;
  }
  return "comprou";
}

export function usarCarro(estado: Estado, id: ModeloId) {
  if (!estado.garagem.carros.includes(id)) return;
  estado.garagem.carro = id;
  estado.garagem.cor = estado.garagem.pinturas[id] ?? CARROS[id].cor;
}

export function pintar(estado: Estado, cor: string) {
  if (!PINTURAS.includes(cor)) return;
  estado.garagem.cor = cor;
  estado.garagem.pinturas[estado.garagem.carro] = cor;
}
