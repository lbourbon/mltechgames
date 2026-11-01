import assert from "node:assert/strict";
import { test } from "node:test";
import { comer, configDaFase, novoJogo, proximaBolha, tempoEsgotado, VIDAS_INICIAIS } from "../public/jogos/monstrinho/logica.js";

const jogo = (extra) => ({ ...novoJogo(1), alvo: 5, ...extra });

test("comer abaixo do alvo acumula sem pontuar", () => {
  const { estado, resultado } = comer(jogo(), 2);
  assert.equal(resultado, "comeu");
  assert.equal(estado.comeu, 2);
  assert.equal(estado.pontos, 0);
});

test("acertar o alvo pontua e traz uma nova refeição", () => {
  const { estado, resultado } = comer(jogo({ comeu: 3 }), 2);
  assert.equal(resultado, "satisfeito");
  assert.equal(estado.comeu, 0);
  assert.equal(estado.refeicao, 1);
  assert.equal(estado.pontos, 15);
});

test("passar do alvo tira uma vida, zera a barriga e a sequência", () => {
  const { estado, resultado } = comer(jogo({ comeu: 4, sequencia: 3 }), 2);
  assert.equal(resultado, "passou");
  assert.equal(estado.vidas, VIDAS_INICIAIS - 1);
  assert.equal(estado.comeu, 0);
  assert.equal(estado.sequencia, 0);
  assert.equal(estado.alvo, 5);
});

test("a última refeição da fase sobe de fase", () => {
  const { refeicoes } = configDaFase(1);
  const { estado, resultado } = comer(jogo({ refeicao: refeicoes - 1 }), 5);
  assert.equal(resultado, "fase");
  assert.equal(estado.fase, 2);
  assert.equal(estado.refeicao, 0);
});

test("perder a última vida encerra o jogo, por erro ou por tempo", () => {
  assert.equal(comer(jogo({ vidas: 1 }), 6).resultado, "fim");
  assert.equal(tempoEsgotado(jogo({ vidas: 1 })).resultado, "fim");
  assert.equal(tempoEsgotado(jogo()).resultado, "tempo");
});

test("sem bolha útil na tela, a próxima sempre cabe na fome", () => {
  for (let i = 0; i < 500; i++) {
    const restante = 1 + (i % 7);
    assert.ok(proximaBolha(restante, configDaFase(4), false) <= restante);
  }
});

test("toda fase tem configuração jogável", () => {
  for (let fase = 1; fase <= 200; fase++) {
    const { alvoMin, alvoMax, maiorBolha, refeicoes, tempo } = configDaFase(fase);
    assert.ok(alvoMin >= 1 && alvoMin <= alvoMax);
    assert.ok(maiorBolha >= 1 && refeicoes >= 1 && tempo > 0);
  }
});
