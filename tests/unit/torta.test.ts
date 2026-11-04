import { expect, test } from "vitest";
import type { Rng } from "../../src/jogos/kit/sorteio";
import {
  bonusDaFase,
  confere,
  configDaFase,
  faltamSoltar,
  gerarCaso,
  inocentado,
  novaFase,
  novoJogo,
  soltar,
  textoDaPista,
  tipoDaPista,
  ULTIMA_FASE_MANSA,
  vale,
  VIDAS_INICIAIS,
  type Caso,
  type Estado,
  type Pista,
  type Suspeito,
} from "../../src/jogos/torta/logica";

function semente(valor: number): Rng {
  return () => {
    valor = (valor + 0x6d2b79f5) | 0;
    let t = Math.imul(valor ^ (valor >>> 15), 1 | valor);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FASES_TESTADAS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 14];

const s = (extra: Partial<Suspeito> = {}): Suspeito => ({
  bicho: "gato",
  roupa: "azul",
  chapeu: false,
  oculos: false,
  lenco: false,
  alto: false,
  ...extra,
});

// Gato de chapéu, coelho de óculos, urso alto de roupa verde.
const FILA = [s({ chapeu: true }), s({ bicho: "coelho", oculos: true }), s({ bicho: "urso", alto: true, roupa: "verde" })];

const CASO: Caso = {
  fila: FILA,
  culpado: 1,
  etapas: [
    [{ tipo: "simples", atomo: { tipo: "acessorio", valor: "chapeu" }, nao: true }],
    [{ tipo: "simples", atomo: { tipo: "altura", alto: false }, nao: false }],
  ],
};

const jogo = (extra: Partial<Estado> = {}): Estado => ({
  fase: 3,
  vidas: VIDAS_INICIAIS,
  pontos: 0,
  caso: CASO,
  etapa: 0,
  soltos: [false, false, false],
  limpa: true,
  ...extra,
});

test("as pistas viram frases de gente", () => {
  const chapeu = { tipo: "acessorio", valor: "chapeu" } as const;
  const oculos = { tipo: "acessorio", valor: "oculos" } as const;
  const gato = { tipo: "bicho", valor: "gato" } as const;
  const azul = { tipo: "roupa", valor: "azul" } as const;
  const textos = ([
    { tipo: "simples", atomo: chapeu, nao: false },
    { tipo: "simples", atomo: gato, nao: true },
    { tipo: "simples", atomo: { tipo: "altura", alto: false }, nao: false },
    { tipo: "e", a: chapeu, b: oculos, naoB: false },
    { tipo: "e", a: gato, b: chapeu, naoB: true },
    { tipo: "ou", a: gato, b: { tipo: "bicho", valor: "coelho" } },
    { tipo: "ou", a: azul, b: oculos },
    { tipo: "ponta", nao: true },
    { tipo: "vizinho", atomo: gato, nao: true },
    { tipo: "vizinho", atomo: azul, nao: false },
  ] satisfies Pista[]).map(textoDaPista);
  expect(textos).toEqual([
    "Quem comeu a torta usa chapéu.",
    "Quem comeu a torta não é um gato.",
    "Quem comeu a torta é baixinho.",
    "Quem comeu a torta usa chapéu e óculos.",
    "Quem comeu a torta é um gato, mas não usa chapéu.",
    "Quem comeu a torta é um gato ou um coelho.",
    "Quem comeu a torta está de roupa azul ou usa óculos.",
    "Quem comeu a torta não estava em nenhuma ponta da fila.",
    "Quem comeu a torta não estava ao lado de nenhum gato.",
    "Quem comeu a torta estava ao lado de alguém de roupa azul.",
  ]);
});

test("ponta e vizinho olham a posição na fila", () => {
  expect([0, 1, 2].map((i) => confere({ tipo: "ponta", nao: false }, FILA, i))).toEqual([true, false, true]);
  const aoLadoDoUrso: Pista = { tipo: "vizinho", atomo: { tipo: "bicho", valor: "urso" }, nao: false };
  expect([0, 1, 2].map((i) => confere(aoLadoDoUrso, FILA, i))).toEqual([false, true, false]);
  const longeDeChapeu: Pista = { tipo: "vizinho", atomo: { tipo: "acessorio", valor: "chapeu" }, nao: true };
  expect([0, 1, 2].map((i) => confere(longeDeChapeu, FILA, i))).toEqual([true, false, true]);
});

test.each(FASES_TESTADAS)("fase %i sempre tem um culpado só, e cada pista serve", (fase) => {
  const config = configDaFase(fase);
  for (let rodada = 0; rodada < 40; rodada++) {
    const { fila, culpado, etapas } = gerarCaso(fase, semente(fase * 1000 + rodada));
    expect(fila).toHaveLength(config.suspeitos);
    expect(new Set(fila.map((x) => JSON.stringify(x))).size).toBe(fila.length);
    expect(etapas.map((etapa) => etapa.length)).toEqual(config.etapas);

    const todas = etapas.flat();
    todas.forEach((pista) => {
      expect(confere(pista, fila, culpado)).toBe(true);
      expect(config.tipos).toContain(tipoDaPista(pista));
      // "ou" só aparece quando ninguém tem as duas coisas, então ler como "um ou outro" também acerta.
      if (pista.tipo === "ou") expect(fila.some((x) => vale(pista.a, x) && vale(pista.b, x))).toBe(false);
    });
    if (config.novidade) expect(todas.some((p) => tipoDaPista(p) === config.novidade)).toBe(true);

    let restantes = fila.map((_, i) => i).filter((i) => i !== culpado);
    etapas.forEach((etapa, e) => {
      // Nenhuma pista é enfeite: cada uma livra alguém que ainda está na fila.
      etapa.forEach((pista) => expect(restantes.some((i) => !confere(pista, fila, i))).toBe(true));
      if (config.dificeis) expect(etapa.some((p) => config.dificeis!.includes(tipoDaPista(p)))).toBe(true);
      restantes = restantes.filter((i) => etapa.every((p) => confere(p, fila, i)));
      // Só a última etapa fecha o caso: antes dela ainda há quem as pistas não livram.
      expect(restantes.length === 0).toBe(e === etapas.length - 1);
    });
  }
});

test("solta quem as pistas livram, e a próxima pista chega quando não sobra ninguém", () => {
  let estado = jogo();
  expect(inocentado(estado, 0)).toBe(true);
  expect(inocentado(estado, 2)).toBe(false);

  const primeiro = soltar(estado, 0);
  expect(primeiro.resultado).toBe("etapa");
  estado = primeiro.estado;
  expect(estado.etapa).toBe(1);
  expect(faltamSoltar(estado)).toEqual([2]);

  expect(soltar(estado, 0).resultado).toBe("parado");
  const fim = soltar(estado, 2, semente(1));
  expect(fim.resultado).toBe("fase");
  expect(fim.estado.fase).toBe(4);
  expect(fim.estado.pontos).toBe(bonusDaFase(3, true));
  expect(fim.estado.soltos.every((solto) => !solto)).toBe(true);
});

test("soltar quem as pistas ainda não livram custa um coração, seja ou não o culpado", () => {
  for (const i of [1, 2]) {
    const jogada = soltar(jogo(), i);
    expect(jogada.resultado).toBe("errou");
    expect(jogada.estado.vidas).toBe(VIDAS_INICIAIS - 1);
    expect(jogada.estado.soltos[i]).toBe(false);
    expect(jogada.estado.limpa).toBe(false);
  }
  expect(soltar(jogo({ vidas: 1 }), 1).resultado).toBe("fim");
});

test("nas fases mansas o erro é de graça, mas tira o bônus", () => {
  const jogada = soltar(jogo({ fase: ULTIMA_FASE_MANSA }), 2);
  expect(jogada.resultado).toBe("cedo");
  expect(jogada.estado.vidas).toBe(VIDAS_INICIAIS);
  expect(jogada.estado.limpa).toBe(false);
});

test("passar de fase devolve um coração, até o máximo", () => {
  const estado = soltar(jogo({ vidas: 1 }), 0).estado;
  const fim = soltar(estado, 2, semente(2));
  expect(fim.estado.vidas).toBe(2);
  expect(fim.estado.pontos).toBe(bonusDaFase(3, true));
});

type Robo = (estado: Estado, recusados: Set<number>, rng: Rng) => number;

// Lê as pistas direitinho: só solta quem elas livram.
const detetive: Robo = (estado) => faltamSoltar(estado)[0];

// Toca em qualquer um da fila e não repete quem já disse "não fui eu" nesta pista.
const chutador: Robo = (estado, recusados, rng) => {
  const fila = estado.soltos.flatMap((solto, i) => (solto || recusados.has(i) ? [] : [i]));
  return fila[Math.floor(rng() * fila.length)];
};

function partida(robo: Robo, fase: number, fases: number, rng: Rng) {
  let estado = novaFase(fase, VIDAS_INICIAIS, 0, rng);
  let recusados = new Set<number>();
  let vencidas = 0;
  let erros = 0;
  while (vencidas < fases) {
    const i = robo(estado, recusados, rng);
    const { estado: depois, resultado } = soltar(estado, i, rng);
    if (resultado === "fim") return { vencidas, erros: erros + 1 };
    if (resultado === "errou" || resultado === "cedo") {
      erros++;
      recusados.add(i);
    }
    if (resultado === "etapa" || resultado === "fase") recusados = new Set();
    if (resultado === "fase") vencidas++;
    estado = depois;
  }
  return { vencidas, erros };
}

test("quem lê as pistas vence sem errar", () => {
  for (let rodada = 0; rodada < 20; rodada++) {
    expect(partida(detetive, 1, 10, semente(rodada))).toEqual({ vencidas: 10, erros: 0 });
  }
});

test("chutar quem sai da fila não leva longe", () => {
  const rodadas = 300;
  let longe = 0;
  let errosNaFaseMansa = 0;
  for (let rodada = 0; rodada < rodadas; rodada++) {
    if (partida(chutador, ULTIMA_FASE_MANSA + 1, 4, semente(500 + rodada)).vencidas >= 4) longe++;
    errosNaFaseMansa += partida(chutador, 1, 1, semente(900 + rodada)).erros;
  }
  expect(longe / rodadas).toBeLessThan(0.05);
  // Até na primeira fase chutar erra bastante, então o jogo não é só tocar em todo mundo.
  expect(errosNaFaseMansa / rodadas).toBeGreaterThan(1);
});

test("gerar um caso é rápido em todas as fases", () => {
  for (const fase of FASES_TESTADAS) {
    const inicio = performance.now();
    for (let i = 0; i < 20; i++) gerarCaso(fase, semente(fase * 77 + i));
    expect((performance.now() - inicio) / 20).toBeLessThan(30);
  }
});

test("um caso novo a cada fase", () => {
  const rng = semente(7);
  const vistos = new Set(Array.from({ length: 30 }, () => JSON.stringify(novoJogo(5, rng).caso)));
  expect(vistos.size).toBe(30);
});
