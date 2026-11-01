// Regras do jogo, sem DOM, para poderem ser testadas com node --test.
export const VIDAS_INICIAIS = 3;

const FASES = [
  { alvoMin: 3, alvoMax: 6, maiorBolha: 3, refeicoes: 3, tempo: 30 },
  { alvoMin: 5, alvoMax: 10, maiorBolha: 5, refeicoes: 3, tempo: 30 },
  { alvoMin: 10, alvoMax: 15, maiorBolha: 6, refeicoes: 4, tempo: 28 },
  { alvoMin: 12, alvoMax: 20, maiorBolha: 9, refeicoes: 4, tempo: 26 },
];

const sortear = (min, max, rng) => min + Math.floor(rng() * (max - min + 1));

export function configDaFase(fase) {
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

function novoAlvo(fase, rng) {
  const { alvoMin, alvoMax } = configDaFase(fase);
  return sortear(alvoMin, alvoMax, rng);
}

export function novoJogo(fase = 1, rng = Math.random) {
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

function perderVida(estado, resultado) {
  const vidas = estado.vidas - 1;
  return {
    estado: { ...estado, vidas, comeu: 0, sequencia: 0 },
    resultado: vidas > 0 ? resultado : "fim",
  };
}

export const tempoEsgotado = (estado) => perderVida(estado, "tempo");

// resultado: "comeu" | "satisfeito" | "fase" | "passou" | "tempo" | "fim"
export function comer(estado, valor, rng = Math.random) {
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
export function proximaBolha(restante, config, temUtil, rng = Math.random) {
  const util = !temUtil || rng() < 0.6;
  return sortear(1, util ? Math.min(restante, config.maiorBolha) : config.maiorBolha, rng);
}
