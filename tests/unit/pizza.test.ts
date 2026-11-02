import { expect, test } from "vitest";
import { sortear, type Rng } from "../../src/jogos/kit/sorteio";
import {
  cobrir,
  conferir,
  configDaFase,
  CORTES,
  cortar,
  cortesQueServem,
  dica,
  gerarPedidos,
  INTEIRO,
  medida,
  medidas,
  novaFase,
  novoJogo,
  pedidoAtual,
  servir,
  ULTIMA_FASE_MANSA,
  VIDAS_INICIAIS,
  type Estado,
  type Pedido,
} from "../../src/jogos/pizza/logica";

function semente(valor: number): Rng {
  return () => {
    valor = (valor + 0x6d2b79f5) | 0;
    let t = Math.imul(valor ^ (valor >>> 15), 1 | valor);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FASES_TESTADAS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 20];
const MEIO_MAIS_QUARTO: Pedido = {
  partes: [
    { sabor: "verde", n: 1, d: 2 },
    { sabor: "vermelha", n: 1, d: 4 },
  ],
  resto: null,
};

function jogo(extra: Partial<Estado> = {}): Estado {
  return {
    fase: 5,
    vidas: VIDAS_INICIAIS,
    pontos: 0,
    config: configDaFase(5),
    pedidos: [MEIO_MAIS_QUARTO, MEIO_MAIS_QUARTO],
    atual: 0,
    corte: 4,
    fatias: [null, null, null, null],
    errosNoPedido: 0,
    limpa: true,
    ...extra,
  };
}

// Corta no primeiro corte que serve e cobre cada sabor na medida.
function resolver(estado: Estado) {
  const pedido = pedidoAtual(estado);
  const corte = estado.corte ?? cortesQueServem(pedido, estado.config.cortes)[0];
  let pronto = estado.corte ? estado : cortar(estado, corte);
  let fatia = 0;
  for (const [sabor, valor] of medidas(pedido)) {
    for (let i = 0; i < valor / (INTEIRO / corte); i++) pronto = cobrir(pronto, fatia++, sabor);
  }
  return pronto;
}

test("as medidas somam o resto do pedido", () => {
  expect(medida({ n: 3, d: 8 })).toBe(9);
  const comResto = medidas({ partes: [{ sabor: "azul", n: 1, d: 4 }], resto: "verde" });
  expect(comResto.get("azul")).toBe(6);
  expect(comResto.get("verde")).toBe(18);
});

test("só serve o corte em que todas as frações viram fatias inteiras", () => {
  expect(cortesQueServem(MEIO_MAIS_QUARTO)).toEqual([4, 8, 12]);
  const meioMaisTerco: Pedido = {
    partes: [
      { sabor: "verde", n: 1, d: 2 },
      { sabor: "azul", n: 1, d: 3 },
    ],
    resto: null,
  };
  expect(cortesQueServem(meioMaisTerco)).toEqual([6, 12]);
});

test.each(FASES_TESTADAS)("todo pedido da fase %i cabe na pizza e tem um corte que serve", (fase) => {
  const rng = semente(fase);
  const config = configDaFase(fase);
  for (let i = 0; i < 80; i++) {
    const pedidos = gerarPedidos(config, rng);
    expect(pedidos).toHaveLength(config.pedidos);
    expect(new Set(pedidos.map((pedido) => JSON.stringify(pedido))).size).toBe(config.pedidos);
    for (const pedido of pedidos) {
      const quer = [...medidas(pedido).values()];
      expect(quer.reduce((soma, valor) => soma + valor, 0)).toBeLessThanOrEqual(INTEIRO);
      expect(quer.every((valor) => valor > 0)).toBe(true);
      expect(cortesQueServem(pedido, config.cortes).length).toBeGreaterThan(0);
      expect(new Set(pedido.partes.map(({ sabor }) => sabor)).size).toBe(pedido.partes.length);
    }
  }
});

test("a pizza vem cortada nas duas primeiras fases, e depois o corte é da criança", () => {
  expect(novoJogo(1, semente(1)).corte).not.toBeNull();
  expect(novoJogo(2, semente(1)).corte).not.toBeNull();
  expect(novoJogo(3, semente(1)).corte).toBeNull();
  expect(novoJogo(9, semente(1)).corte).toBe(8);
  expect(novoJogo(10, semente(1)).corte).toBe(6);
});

test("cortar de novo limpa a pizza, de graça", () => {
  const coberta = cobrir(jogo(), 0, "verde");
  const cortada = cortar(coberta, 8);
  expect(cortada.fatias).toEqual(Array(8).fill(null));
  expect(cortada.vidas).toBe(VIDAS_INICIAIS);
  expect(cortada.limpa).toBe(true);
});

test("servir sem cobrir nada não custa coração", () => {
  const estado = jogo();
  expect(servir(estado).resultado).toBe("vazia");
  expect(servir(jogo({ corte: null, fatias: [] })).resultado).toBe("vazia");
});

test("pizza certa passa para o próximo pedido, com pizza nova", () => {
  const jogada = servir(resolver(jogo()));
  expect(jogada.resultado).toBe("certo");
  expect(jogada.ganhou).toBe(15);
  expect(jogada.estado.atual).toBe(1);
  expect(jogada.estado.pontos).toBe(15);
  expect(jogada.estado.corte).toBeNull();
  expect(jogada.estado.fatias).toEqual([]);
});

test("a medida vale em qualquer corte: 1/2 é igual a 4 fatias de 8", () => {
  const estado = cortar(jogo(), 8);
  const pronta = [0, 1, 2, 3].reduce((atual, i) => cobrir(atual, i, "verde"), cobrir(cobrir(estado, 4, "vermelha"), 5, "vermelha"));
  expect(conferir(pronta)).toBeNull();
});

test("o lugar das fatias não importa", () => {
  const pronta = cobrir(cobrir(cobrir(jogo(), 3, "verde"), 1, "verde"), 0, "vermelha");
  expect(conferir(pronta)).toBeNull();
});

test("a conferência diz o que deu errado", () => {
  expect(conferir(cobrir(jogo(), 0, "azul"))).toEqual({ sabor: "azul", problema: "nao-pediu" });
  expect(conferir(cobrir(jogo(), 0, "verde"))).toEqual({ sabor: "verde", problema: "faltou" });
  const demais = [0, 1, 2].reduce((estado, i) => cobrir(estado, i, "verde"), jogo());
  expect(conferir(demais)).toEqual({ sabor: "verde", problema: "sobrou" });
});

test("servir errado custa um coração e mantém a pizza para consertar", () => {
  const estado = cobrir(jogo(), 0, "verde");
  const jogada = servir(estado);
  expect(jogada.resultado).toBe("errado");
  expect(jogada.estado.vidas).toBe(VIDAS_INICIAIS - 1);
  expect(jogada.estado.fatias).toEqual(estado.fatias);
  expect(jogada.estado.atual).toBe(0);
  expect(jogada.estado.limpa).toBe(false);
});

test("nas fases mansas servir errado não custa coração", () => {
  const jogada = servir(cobrir(jogo({ fase: ULTIMA_FASE_MANSA }), 0, "verde"));
  expect(jogada.resultado).toBe("errado");
  expect(jogada.estado.vidas).toBe(VIDAS_INICIAIS);
});

test("o último coração termina a partida", () => {
  const jogada = servir(cobrir(jogo({ vidas: 1 }), 0, "verde"));
  expect(jogada.resultado).toBe("fim");
  expect(jogada.estado.vidas).toBe(0);
});

test("acertar depois de errar vale menos", () => {
  const errou = servir(cobrir(jogo(), 0, "verde")).estado;
  expect(servir(resolver({ ...errou, fatias: [null, null, null, null] })).ganhou).toBe(5);
});

test("o último pedido passa de fase, com bônus e um coração de volta", () => {
  const rng = semente(1);
  const jogada = servir(resolver(jogo({ atual: 1, vidas: 2 })), rng);
  expect(jogada.resultado).toBe("fase");
  expect(jogada.estado.fase).toBe(6);
  expect(jogada.estado.vidas).toBe(3);
  expect(jogada.estado.pontos).toBe(15 + 5 * 15);
  expect(jogada.estado.atual).toBe(0);
});

test("errar na fase tira o bônus", () => {
  const jogada = servir(resolver(jogo({ atual: 1, limpa: false })), semente(1));
  expect(jogada.estado.pontos).toBe(15 + 5 * 10);
});

test.each(FASES_TESTADAS)("na fase %i, quem faz a conta passa sem perder coração", (fase) => {
  const rng = semente(fase * 3);
  for (let i = 0; i < 40; i++) {
    let estado = novaFase(fase, VIDAS_INICIAIS, 0, rng);
    for (;;) {
      const jogada = servir(resolver(estado), rng);
      expect(["certo", "fase"]).toContain(jogada.resultado);
      if (jogada.resultado === "fase") {
        expect(jogada.estado.vidas).toBe(VIDAS_INICIAIS);
        break;
      }
      estado = jogada.estado;
    }
  }
});

test.each(FASES_TESTADAS)("na fase %i, dicas sempre chegam à pizza certa, partindo de qualquer bagunça", (fase) => {
  const rng = semente(fase * 5);
  for (let i = 0; i < 60; i++) {
    let estado = novaFase(fase, VIDAS_INICIAIS, 0, rng);
    if (estado.config.cortes.length > 1) estado = cortar(estado, CORTES[sortear(0, CORTES.length - 1, rng)]);
    if (estado.corte) {
      for (let f = 0; f < estado.fatias.length; f++) {
        const sabor = ["verde", "vermelha", "azul", "roxa", null][sortear(0, 4, rng)] as Estado["fatias"][number];
        estado = cobrir(estado, f, sabor);
      }
    }
    for (let passo = 0; ; passo++) {
      const certo = cortesQueServem(pedidoAtual(estado), estado.config.cortes).includes(estado.corte ?? 0);
      if (certo && !conferir(estado)) break;
      expect(passo).toBeLessThan(30);
      estado = dica(estado);
    }
    expect(estado.fatias.some(Boolean)).toBe(true);
  }
});

test("a dica não mexe em pizza certa", () => {
  const pronta = resolver(jogo());
  expect(dica(pronta)).toBe(pronta);
});

// Corta em qualquer lugar e cobre um pedaço qualquer de cada sabor pedido.
function chute(estado: Estado, rng: Rng) {
  const corte = estado.corte ?? CORTES[sortear(0, CORTES.length - 1, rng)];
  let pronto = estado.corte ? estado : cortar(estado, corte);
  let fatia = 0;
  for (const sabor of medidas(pedidoAtual(estado)).keys()) {
    const quantas = sortear(1, Math.max(1, Math.floor(corte / 2)), rng);
    for (let i = 0; i < quantas && fatia < corte; i++) pronto = cobrir(pronto, fatia++, sabor);
  }
  return pronto;
}

test("sem fazer a conta, a fase não termina", () => {
  const rng = semente(8);
  const taxa = (fase: number) => {
    let venceu = 0;
    for (let i = 0; i < 300; i++) {
      let estado = novaFase(fase, VIDAS_INICIAIS, 0, rng);
      for (;;) {
        const jogada = servir(chute(estado, rng), rng);
        if (jogada.resultado === "fase") venceu++;
        if (jogada.resultado === "fase" || jogada.resultado === "fim") break;
        estado = jogada.estado;
      }
    }
    return venceu / 300;
  };
  expect(taxa(3)).toBeLessThan(0.1);
  expect(taxa(5)).toBeLessThan(0.05);
  expect(taxa(8)).toBeLessThan(0.02);
});

test("nas fases do meio, um corte só não resolve tudo", () => {
  const rng = semente(4);
  for (const corte of CORTES) {
    const pedidos = [...gerarPedidos(configDaFase(6), rng), ...gerarPedidos(configDaFase(11), rng)];
    const servem = pedidos.filter((pedido) => cortesQueServem(pedido, [corte]).length > 0);
    if (corte !== 12) expect(servem.length).toBeLessThan(pedidos.length);
  }
});
