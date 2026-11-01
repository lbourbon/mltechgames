// Regras do jogo, sem DOM, para serem testadas com Vitest.
export const VIDAS_INICIAIS = 3;

export type Rng = () => number;
export type ConfigFase = {
  alvoMin: number;
  alvoMax: number;
  maiorBolha: number;
  refeicoes: number;
  tempo: number;
};
export type Estado = {
  fase: number;
  refeicao: number;
  alvo: number;
  comeu: number;
  vidas: number;
  pontos: number;
  sequencia: number;
};
export type Resultado = "comeu" | "satisfeito" | "fase" | "passou" | "tempo" | "fim";
export type Jogada = { estado: Estado; resultado: Resultado };

const FASES: ConfigFase[] = [
  { alvoMin: 3, alvoMax: 6, maiorBolha: 3, refeicoes: 3, tempo: 30 },
  { alvoMin: 5, alvoMax: 10, maiorBolha: 5, refeicoes: 3, tempo: 30 },
  { alvoMin: 10, alvoMax: 15, maiorBolha: 6, refeicoes: 4, tempo: 28 },
  { alvoMin: 12, alvoMax: 20, maiorBolha: 9, refeicoes: 4, tempo: 26 },
];

const sortear = (min: number, max: number, rng: Rng) => min + Math.floor(rng() * (max - min + 1));

export function configDaFase(fase: number): ConfigFase {
  const extra = fase - FASES.length;
  if (extra <= 0) return FASES[fase - 1];
  return {
    alvoMin: 20 + extra * 2,
    alvoMax: 30 + extra * 3,
    maiorBolha: 9 + extra,
    refeicoes: 5,
    tempo: Math.max(14, 25 - extra),
  };
}

function novoAlvo(fase: number, rng: Rng) {
  const { alvoMin, alvoMax } = configDaFase(fase);
  return sortear(alvoMin, alvoMax, rng);
}

export function novoJogo(fase = 1, rng: Rng = Math.random): Estado {
  return {
    fase,
    refeicao: 0,
    alvo: novoAlvo(fase, rng),
    comeu: 0,
    vidas: VIDAS_INICIAIS,
    pontos: 0,
    sequencia: 0,
  };
}

function perderVida(estado: Estado, resultado: Resultado): Jogada {
  const vidas = estado.vidas - 1;
  return {
    estado: { ...estado, vidas, comeu: 0, sequencia: 0 },
    resultado: vidas > 0 ? resultado : "fim",
  };
}

export const tempoEsgotado = (estado: Estado) => perderVida(estado, "tempo");

export function comer(estado: Estado, valor: number, rng: Rng = Math.random): Jogada {
  const comeu = estado.comeu + valor;
  if (comeu > estado.alvo) return perderVida(estado, "passou");
  if (comeu < estado.alvo) return { estado: { ...estado, comeu }, resultado: "comeu" };

  const sequencia = estado.sequencia + 1;
  const pontos = estado.pontos + estado.fase * 10 + Math.min(sequencia, 5) * 5;
  const refeicao = estado.refeicao + 1;
  const subiu = refeicao >= configDaFase(estado.fase).refeicoes;
  const fase = subiu ? estado.fase + 1 : estado.fase;

  return {
    estado: {
      ...estado,
      fase,
      refeicao: subiu ? 0 : refeicao,
      alvo: novoAlvo(fase, rng),
      comeu: 0,
      pontos,
      sequencia,
    },
    resultado: subiu ? "fase" : "satisfeito",
  };
}

// temUtil diz se já há na tela alguma bolha que cabe na fome, para nunca travar a criança.
export function proximaBolha(restante: number, config: ConfigFase, temUtil: boolean, rng: Rng = Math.random) {
  const util = !temUtil || rng() < 0.6;
  return sortear(1, util ? Math.min(restante, config.maiorBolha) : config.maiorBolha, rng);
}
