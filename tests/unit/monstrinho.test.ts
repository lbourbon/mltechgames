import { expect, test } from "vitest";
import {
  comer,
  configDaFase,
  novoJogo,
  proximaBolha,
  tempoEsgotado,
  VIDAS_INICIAIS,
  type Estado,
} from "../../src/jogos/monstrinho/logica";

const jogo = (extra: Partial<Estado> = {}): Estado => ({ ...novoJogo(1), alvo: 5, ...extra });

test("comer abaixo do alvo acumula sem pontuar", () => {
  const { estado, resultado } = comer(jogo(), 2);
  expect(resultado).toBe("comeu");
  expect(estado.comeu).toBe(2);
  expect(estado.pontos).toBe(0);
});

test("acertar o alvo pontua e traz uma nova refeição", () => {
  const { estado, resultado } = comer(jogo({ comeu: 3 }), 2);
  expect(resultado).toBe("satisfeito");
  expect(estado.comeu).toBe(0);
  expect(estado.refeicao).toBe(1);
  expect(estado.pontos).toBe(15);
});

test("passar do alvo tira uma vida, zera a barriga e a sequência", () => {
  const { estado, resultado } = comer(jogo({ comeu: 4, sequencia: 3 }), 2);
  expect(resultado).toBe("passou");
  expect(estado.vidas).toBe(VIDAS_INICIAIS - 1);
  expect(estado.comeu).toBe(0);
  expect(estado.sequencia).toBe(0);
  expect(estado.alvo).toBe(5);
});

test("a última refeição da fase sobe de fase", () => {
  const { estado, resultado } = comer(jogo({ refeicao: configDaFase(1).refeicoes - 1 }), 5);
  expect(resultado).toBe("fase");
  expect(estado.fase).toBe(2);
  expect(estado.refeicao).toBe(0);
});

test("perder a última vida encerra o jogo, por erro ou por tempo", () => {
  expect(comer(jogo({ vidas: 1 }), 6).resultado).toBe("fim");
  expect(tempoEsgotado(jogo({ vidas: 1 })).resultado).toBe("fim");
  expect(tempoEsgotado(jogo()).resultado).toBe("tempo");
});

test("sem bolha útil na tela, a próxima sempre cabe na fome", () => {
  for (let i = 0; i < 500; i++) {
    const restante = 1 + (i % 7);
    expect(proximaBolha(restante, configDaFase(4), false)).toBeLessThanOrEqual(restante);
  }
});

test("toda fase tem configuração jogável", () => {
  for (let fase = 1; fase <= 200; fase++) {
    const { alvoMin, alvoMax, maiorBolha, refeicoes, tempo } = configDaFase(fase);
    expect(alvoMin).toBeGreaterThanOrEqual(1);
    expect(alvoMin).toBeLessThanOrEqual(alvoMax);
    expect(maiorBolha).toBeGreaterThanOrEqual(1);
    expect(refeicoes).toBeGreaterThanOrEqual(1);
    expect(tempo).toBeGreaterThan(0);
  }
});
