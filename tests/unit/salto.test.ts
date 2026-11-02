import { expect, test } from "vitest";
import type { Rng } from "../../src/jogos/kit/sorteio";
import {
  acesas,
  alvoDe,
  configDaFase,
  DISTANCIA_MINIMA,
  folgasDaFase,
  gerarFase,
  novaFase,
  novoJogo,
  saltar,
  VIDAS_INICIAIS,
  type Estado,
} from "../../src/jogos/salto/logica";

function semente(valor: number): Rng {
  return () => {
    valor = (valor + 0x6d2b79f5) | 0;
    let t = Math.imul(valor ^ (valor >>> 15), 1 | valor);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FASES = Array.from({ length: 30 }, (_, i) => i + 1);
const SEMENTES = Array.from({ length: 40 }, (_, i) => i);
const jogo = (fase = 1, semeado = 1) => novoJogo(fase, semente(semeado));

// Do lado de lá da régua, onde não há pedra acesa nem a procurada por perto.
function longeDe(estado: Estado) {
  const pontos = Array.from({ length: 101 }, (_, i) => i / 100);
  const { beirada, pedra } = estado.mapa;
  return pontos.find(
    (p) => Math.abs(p - alvoDe(estado).pos) > beirada && acesas(estado).every(({ pos }) => Math.abs(p - pos) > pedra),
  )!;
}

test.each(FASES)("fase %i tem todas as pedras, espalhadas e dentro da régua", (fase) => {
  for (const s of SEMENTES) {
    const { rota, base } = gerarFase(fase, semente(s));
    expect(rota).toHaveLength(configDaFase(fase).pedras);
    expect(new Set(rota.map(({ valor }) => valor)).size).toBe(rota.length);
    rota.forEach(({ pos }) => expect(pos).toBeGreaterThanOrEqual(0.09));
    rota.forEach(({ pos }) => expect(pos).toBeLessThanOrEqual(0.91));
    const todas = [base, ...rota].map(({ pos }) => pos).sort((a, b) => a - b);
    todas.slice(1).forEach((pos, i) => expect(pos - todas[i]).toBeGreaterThanOrEqual(DISTANCIA_MINIMA - 1e-9));
  }
});

test.each(FASES)("fase %i não deixa uma pedra encostar na outra nem o acerto sair da pedra", (fase) => {
  const { pedra, centro, beirada } = folgasDaFase(fase);
  expect(pedra * 2).toBeLessThanOrEqual(DISTANCIA_MINIMA);
  expect(centro).toBeLessThan(pedra);
  expect(pedra).toBeLessThan(beirada);
});

test("as pedras ficam mais difíceis, sem nunca virar um alvo impossível", () => {
  FASES.slice(1).forEach((fase) => {
    expect(folgasDaFase(fase).pedra).toBeLessThanOrEqual(folgasDaFase(fase - 1).pedra);
  });
  expect(folgasDaFase(1000).pedra).toBeGreaterThanOrEqual(0.03);
});

test("a régua mostra só as pontas, e o zero quando ele fica no meio", () => {
  expect(gerarFase(1, semente(1)).regua.rotulos.map(({ texto }) => texto)).toEqual(["0", "100"]);
  expect(gerarFase(5, semente(1)).regua.rotulos.map(({ texto }) => texto)).toEqual(["0", "1000"]);
  expect(gerarFase(7, semente(1)).regua.rotulos.map(({ texto }) => texto)).toEqual(["0", "1"]);
  expect(gerarFase(12, semente(1)).regua.rotulos.map(({ texto }) => texto)).toEqual(["−100", "0", "100"]);
});

test("os tracinhos ajudam no começo e somem depois", () => {
  expect(gerarFase(1, semente(1)).regua.tracos).toHaveLength(9);
  expect(gerarFase(3, semente(1)).regua.tracos).toEqual([0.5]);
  expect(gerarFase(4, semente(1)).regua.tracos).toEqual([]);
  expect(gerarFase(13, semente(1)).regua.tracos).toEqual([]);
});

test("números aparecem escritos em português, sem sobras de conta", () => {
  const textos = (fase: number) => configDaFase(fase).numeros.map(({ texto }) => texto);
  expect(textos(7)).toContain("3/4");
  expect(textos(9)).toContain("2,5");
  expect(textos(10)).toContain("0,3");
  expect(textos(11)).toContain("−3");
  expect(textos(11)).not.toContain("0");
  for (const fase of FASES) textos(fase).forEach((texto) => expect(texto.length).toBeLessThanOrEqual(4));
});

test("fase negativa começa no zero, no meio da régua", () => {
  const { base, regua } = gerarFase(11, semente(1));
  expect(base.pos).toBe(0.5);
  expect(regua.min).toBe(-10);
});

test("cair bem no centro vale mais que na pedra, e a beirada vale pouco mas chega", () => {
  const estado = jogo();
  const { pos } = alvoDe(estado);
  const { centro, pedra, beirada } = estado.mapa;
  const lado = pos > 0.5 ? -1 : 1;

  const noCentro = saltar(estado, pos);
  const naPedra = saltar(estado, pos + lado * (centro + pedra) / 2);
  const naBeirada = saltar(estado, pos + lado * (pedra + beirada) / 2);

  expect([noCentro.pouso, naPedra.pouso, naBeirada.pouso]).toEqual(["centro", "pedra", "beirada"]);
  expect(noCentro.ganhou).toBeGreaterThan(naPedra.ganhou);
  expect(naPedra.ganhou).toBeGreaterThan(naBeirada.ganhou);
  [noCentro, naPedra, naBeirada].forEach(({ estado: depois }) => {
    expect(depois.feitas).toBe(1);
    expect(depois.vidas).toBe(VIDAS_INICIAIS);
    expect(depois.em.valor).toBe(alvoDe(estado).valor);
  });
});

test("errar muito cai na cratera, custa uma vida e deixa a pedra à vista", () => {
  const estado = jogo();
  const jogada = saltar(estado, longeDe(estado));
  expect(jogada.pouso).toBe("cratera");
  expect(jogada.resultado).toBe("seguiu");
  expect(jogada.estado.vidas).toBe(VIDAS_INICIAIS - 1);
  expect(jogada.estado.feitas).toBe(0);
  expect(jogada.estado.em).toEqual(estado.em);
  expect(acesas(jogada.estado)).toContainEqual(alvoDe(estado));
});

test("a pedra revelada leva o astronauta até ela, mas não rende pontos", () => {
  const estado = jogo();
  const caiu = saltar(estado, longeDe(estado)).estado;
  const voltou = saltar(caiu, alvoDe(caiu).pos);
  expect(voltou.pouso).toBe("centro");
  expect(voltou.ganhou).toBe(0);
  expect(voltou.estado.pontos).toBe(0);
  expect(voltou.estado.feitas).toBe(1);
  expect(voltou.estado.revelada).toBe(false);
});

test("as vidas acabam na cratera", () => {
  let estado = jogo();
  for (let i = 1; i < VIDAS_INICIAIS; i++) estado = saltar(estado, longeDe(estado)).estado;
  const jogada = saltar(estado, longeDe(estado));
  expect(jogada.resultado).toBe("fim");
  expect(jogada.estado.vidas).toBe(0);
});

test("soltar em cima do astronauta desiste sem gastar nada", () => {
  const estado = jogo();
  const jogada = saltar(estado, estado.em.pos);
  expect(jogada.pouso).toBe("parado");
  expect(jogada.estado).toBe(estado);
});

test("cair em outra pedra acesa é seguro e leva o astronauta para lá", () => {
  let estado = jogo();
  const primeira = alvoDe(estado);
  estado = saltar(estado, primeira.pos).estado;
  estado = saltar(estado, alvoDe(estado).pos).estado;
  const jogada = saltar(estado, primeira.pos);
  expect(jogada.pouso).toBe("outra");
  expect(jogada.estado.em).toEqual(primeira);
  expect(jogada.estado.vidas).toBe(VIDAS_INICIAIS);
  expect(jogada.estado.feitas).toBe(estado.feitas);
  expect(jogada.ganhou).toBe(0);
});

test("alcançar a última pedra passa de fase e devolve uma vida", () => {
  const inicio = jogo();
  let estado: Estado = { ...inicio, vidas: 2 };
  let ultima = saltar(estado, alvoDe(estado).pos, semente(9));
  while (ultima.resultado !== "fase") {
    estado = ultima.estado;
    ultima = saltar(estado, alvoDe(estado).pos, semente(9));
  }
  expect(ultima.estado.fase).toBe(2);
  expect(ultima.estado.vidas).toBe(3);
  expect(ultima.estado.feitas).toBe(0);
  expect(ultima.ganhou).toBe(20);
  expect(ultima.estado.pontos).toBe(estado.pontos + 20);
});

test("vidas nunca passam do máximo", () => {
  let estado = jogo();
  for (let i = 0; i < 6; i++) {
    const jogada = saltar(estado, alvoDe(estado).pos, semente(i));
    estado = jogada.estado;
    expect(estado.vidas).toBeLessThanOrEqual(VIDAS_INICIAIS);
  }
});

// Joga uma fase inteira com uma mira. Devolve se passou com as 3 vidas iniciais.
function jogar(fase: number, s: number, escolher: (estado: Estado, rng: Rng) => number) {
  const rng = semente(s);
  let estado = novaFase(fase, VIDAS_INICIAIS, 0, rng);
  for (let salto = 0; salto < 60; salto++) {
    const jogada = saltar(estado, Math.min(1, Math.max(0, escolher(estado, rng))), rng);
    if (jogada.resultado === "fase") return true;
    if (jogada.resultado === "fim") return false;
    estado = jogada.estado;
  }
  return false;
}

const taxa = (fase: number, escolher: (estado: Estado, rng: Rng) => number) =>
  SEMENTES.filter((s) => jogar(fase, s, escolher)).length / SEMENTES.length;

// Errar até um tanto da régua, para qualquer lado.
const estimar = (erro: number) => (estado: Estado, rng: Rng) => alvoDe(estado).pos + (rng() * 2 - 1) * erro;

test.each(FASES)("fase %i: quem sabe mais ou menos onde fica o número vence", (fase) => {
  expect(taxa(fase, estimar(folgasDaFase(fase).beirada))).toBe(1);
});

test.each(FASES)("fase %i: mirar sempre no meio da régua não basta", (fase) => {
  expect(taxa(fase, () => 0.5)).toBeLessThan(0.2);
});

test.each(FASES)("fase %i: chutar qualquer lugar perde quase sempre", (fase) => {
  expect(taxa(fase, (_, rng) => rng())).toBeLessThan(0.25);
});

test("a estimativa das fases finais pede mais que a das primeiras", () => {
  expect(taxa(1, estimar(0.12))).toBeGreaterThan(0.95);
  expect(taxa(14, estimar(0.12))).toBeLessThan(0.9);
});
