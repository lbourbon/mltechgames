import { expect, test } from "vitest";
import { sortear, type Rng } from "../../src/jogos/kit/sorteio";
import {
  abrirCerca,
  areaDe,
  bichoDaCerca,
  cercar,
  configDaFase,
  cruzam,
  dica,
  entre,
  gerarFase,
  novaFase,
  novoJogo,
  opcoes,
  resolverSemChute,
  semLugar,
  ULTIMA_FASE_MANSA,
  VIDAS_INICIAIS,
  type Estado,
  type Mapa,
  type Retangulo,
} from "../../src/jogos/cerca/logica";

function semente(valor: number): Rng {
  return () => {
    valor = (valor + 0x6d2b79f5) | 0;
    let t = Math.imul(valor ^ (valor >>> 15), 1 | valor);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FASES_TESTADAS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 15];

// 4×2, com uma cerca 2×2 de cada lado.
const MAPA: Mapa = {
  colunas: 4,
  linhas: 2,
  bichos: [
    { x: 0, y: 0, area: 4 },
    { x: 3, y: 1, area: 4 },
  ],
  solucao: [
    { x: 0, y: 0, largura: 2, altura: 2 },
    { x: 2, y: 0, largura: 2, altura: 2 },
  ],
};

const jogo = (extra: Partial<Estado> = {}): Estado => ({
  fase: 3,
  vidas: VIDAS_INICIAIS,
  pontos: 0,
  mapa: MAPA,
  cercas: [null, null],
  limpa: true,
  ...extra,
});

test.each(FASES_TESTADAS)("fase %i cobre o pasto todo e tem solução sem chute", (fase) => {
  const rng = semente(fase);
  for (let i = 0; i < 40; i++) {
    const mapa = gerarFase(fase, rng);
    const { colunas, linhas, menor, maior } = configDaFase(fase);
    expect(mapa.bichos.reduce((soma, bicho) => soma + bicho.area, 0)).toBe(colunas * linhas);
    mapa.solucao.forEach((cerca, i) => {
      expect(areaDe(cerca)).toBe(mapa.bichos[i].area);
      expect(areaDe(cerca)).toBeGreaterThanOrEqual(menor);
      expect(areaDe(cerca)).toBeLessThanOrEqual(maior);
      mapa.solucao.forEach((outra, j) => {
        if (i !== j) expect(cruzam(cerca, outra)).toBe(false);
      });
    });
    expect(resolverSemChute(mapa)).not.toBeNull();
  }
});

test("gerar as fases mais difíceis é rápido", () => {
  const rng = semente(7);
  const inicio = performance.now();
  for (let i = 0; i < 100; i++) gerarFase(9, rng);
  expect((performance.now() - inicio) / 100).toBeLessThan(20);
});

test("opções só listam lugares inteiros no pasto, sem outro bicho e sem cercas alheias", () => {
  expect(opcoes(MAPA, 0, [null, null])).toEqual(
    expect.arrayContaining([
      { x: 0, y: 0, largura: 2, altura: 2 },
      { x: 0, y: 0, largura: 4, altura: 1 },
    ]),
  );
  expect(opcoes(MAPA, 0, [null, null])).toHaveLength(2);
  expect(opcoes(MAPA, 0, [null, { x: 2, y: 1, largura: 2, altura: 1 }])).toHaveLength(2);
  expect(opcoes(MAPA, 0, [null, { x: 1, y: 0, largura: 2, altura: 1 }])).toHaveLength(0);
});

test("o retângulo do arraste vale em qualquer direção", () => {
  expect(entre({ x: 3, y: 1 }, { x: 1, y: 2 })).toEqual({ x: 1, y: 1, largura: 3, altura: 2 });
  expect(entre({ x: 2, y: 2 }, { x: 2, y: 2 })).toEqual({ x: 2, y: 2, largura: 1, altura: 1 });
});

test("cerca do tamanho certo fica de pé", () => {
  const jogada = cercar(jogo(), MAPA.solucao[0]);
  expect(jogada.resultado).toBe("cercou");
  expect(jogada.bicho).toBe(0);
  expect(jogada.estado.cercas[0]).toEqual(MAPA.solucao[0]);
  expect(jogada.estado.vidas).toBe(VIDAS_INICIAIS);
});

test("qualquer formato de área certa fica de pé: quem diz se serve é o resto do pasto", () => {
  const jogada = cercar(jogo(), { x: 0, y: 0, largura: 4, altura: 1 });
  expect(jogada.resultado).toBe("cercou");
  expect(semLugar(jogada.estado)).toEqual([]);
});

test("tamanho errado custa um coração e não deixa cerca", () => {
  const jogada = cercar(jogo(), { x: 0, y: 0, largura: 3, altura: 2 });
  expect(jogada.resultado).toBe("errada");
  expect(jogada.bicho).toBe(0);
  expect(jogada.estado.vidas).toBe(VIDAS_INICIAIS - 1);
  expect(jogada.estado.cercas).toEqual([null, null]);
  expect(jogada.estado.limpa).toBe(false);
});

test("nas fases mansas o tamanho errado não custa coração", () => {
  const jogada = cercar(jogo({ fase: ULTIMA_FASE_MANSA }), { x: 0, y: 0, largura: 3, altura: 2 });
  expect(jogada.resultado).toBe("errada");
  expect(jogada.estado.vidas).toBe(VIDAS_INICIAIS);
  expect(jogada.estado.limpa).toBe(false);
});

test("o último coração termina a partida", () => {
  const jogada = cercar(jogo({ vidas: 1 }), { x: 0, y: 0, largura: 1, altura: 2 });
  expect(jogada.resultado).toBe("fim");
  expect(jogada.estado.vidas).toBe(0);
});

test("arrastar sem bicho, com dois bichos ou por cima de outra cerca é de graça", () => {
  expect(cercar(jogo(), { x: 1, y: 0, largura: 2, altura: 2 }).resultado).toBe("vazia");
  expect(cercar(jogo(), { x: 0, y: 0, largura: 4, altura: 2 }).resultado).toBe("dois");
  const cercado = cercar(jogo(), MAPA.solucao[0]).estado;
  expect(cercar(cercado, { x: 1, y: 0, largura: 3, altura: 2 }).resultado).toBe("encostou");
  for (const resultado of [
    cercar(jogo(), { x: 1, y: 0, largura: 2, altura: 2 }),
    cercar(jogo(), { x: 0, y: 0, largura: 4, altura: 2 }),
  ]) {
    expect(resultado.estado.vidas).toBe(VIDAS_INICIAIS);
    expect(resultado.estado.limpa).toBe(true);
  }
});

test("abrir uma cerca é de graça e devolve o lugar", () => {
  const cercado = cercar(jogo(), MAPA.solucao[0]).estado;
  expect(bichoDaCerca(cercado, { x: 1, y: 1 })).toBe(0);
  expect(bichoDaCerca(cercado, { x: 2, y: 1 })).toBe(-1);
  const aberto = abrirCerca(cercado, 0);
  expect(aberto.cercas).toEqual([null, null]);
  expect(aberto.limpa).toBe(true);
  expect(aberto.vidas).toBe(VIDAS_INICIAIS);
});

test("fechar o pasto passa de fase, com bônus e um coração de volta", () => {
  const rng = semente(1);
  const primeira = cercar(jogo({ vidas: 2 }), MAPA.solucao[0], rng).estado;
  const jogada = cercar(primeira, MAPA.solucao[1], rng);
  expect(jogada.resultado).toBe("fase");
  expect(jogada.estado.fase).toBe(4);
  expect(jogada.estado.pontos).toBe(3 * 15);
  expect(jogada.estado.vidas).toBe(3);
  expect(jogada.estado.limpa).toBe(true);
});

test("abrir e fechar a mesma cerca não rende pontos", () => {
  let estado = jogo();
  for (let i = 0; i < 5; i++) estado = abrirCerca(cercar(estado, MAPA.solucao[0]).estado, 0);
  expect(estado.pontos).toBe(0);
});

test("errar antes tira o bônus da fase", () => {
  const rng = semente(1);
  const errou = cercar(jogo(), { x: 0, y: 0, largura: 1, altura: 2 }, rng).estado;
  const primeira = cercar(errou, MAPA.solucao[0], rng).estado;
  expect(cercar(primeira, MAPA.solucao[1], rng).estado.pontos).toBe(3 * 10);
});

test("cerca no lugar errado acaba deixando um bicho sem lugar", () => {
  const mapa: Mapa = {
    colunas: 3,
    linhas: 2,
    bichos: [
      { x: 0, y: 0, area: 2 },
      { x: 1, y: 1, area: 4 },
    ],
    solucao: [
      { x: 0, y: 0, largura: 1, altura: 2 },
      { x: 1, y: 0, largura: 2, altura: 2 },
    ],
  };
  const estado = cercar(jogo({ mapa, cercas: [null, null] }), { x: 0, y: 0, largura: 2, altura: 1 }).estado;
  expect(semLugar(estado)).toEqual([1]);
});

test("a dica tira a cerca do caminho, resolve a fase aos poucos e custa só o bônus", () => {
  const rng = semente(2);
  const mapa: Mapa = {
    colunas: 3,
    linhas: 2,
    bichos: [
      { x: 0, y: 0, area: 2 },
      { x: 1, y: 1, area: 4 },
    ],
    solucao: [
      { x: 0, y: 0, largura: 1, altura: 2 },
      { x: 1, y: 0, largura: 2, altura: 2 },
    ],
  };
  const torta = cercar(jogo({ mapa }), { x: 0, y: 0, largura: 2, altura: 1 }).estado;
  const primeira = dica(torta, rng);
  expect(primeira.resultado).toBe("cercou");
  expect(primeira.estado.cercas[0]).toEqual(mapa.solucao[0]);
  expect(primeira.estado.vidas).toBe(VIDAS_INICIAIS);
  const segunda = dica(primeira.estado, rng);
  expect(segunda.resultado).toBe("fase");
  expect(segunda.estado.pontos).toBe(3 * 10);
});

test.each(FASES_TESTADAS)("na fase %i, dicas sempre terminam o pasto, mesmo depois de cercas tortas", (fase) => {
  const rng = semente(fase * 31);
  for (let i = 0; i < 30; i++) {
    let estado = novoJogo(fase, rng);
    const { mapa } = estado;
    // Cerca o que der no primeiro lugar que couber, sem pensar.
    mapa.bichos.forEach((_, bicho) => {
      const [lugar] = opcoes(mapa, bicho, estado.cercas);
      const sobrou = estado.cercas.filter((cerca) => !cerca).length;
      if (lugar && sobrou > 1) estado = cercar(estado, lugar, rng).estado;
    });
    let passos = 0;
    for (;;) {
      const jogada = dica(estado, rng);
      if (jogada.resultado === "fase") break;
      estado = jogada.estado;
      expect(++passos).toBeLessThan(mapa.bichos.length * 2);
    }
  }
});

// Cerca cada bicho, um por um, em um lugar que caiba, sem olhar o resto do pasto.
function terminaSemPensar(estado: Estado, escolher: (lugares: Retangulo[]) => Retangulo) {
  for (let i = 0; i < estado.mapa.bichos.length; i++) {
    const lugares = opcoes(estado.mapa, i, estado.cercas);
    if (lugares.length === 0) return false;
    estado = { ...estado, cercas: estado.cercas.map((cerca, j) => (j === i ? escolher(lugares) : cerca)) };
  }
  return true;
}

test("nas fases altas, cercar em qualquer lugar que couber quase nunca fecha o pasto", () => {
  const rng = semente(11);
  const taxa = (fase: number) => {
    let venceu = 0;
    for (let i = 0; i < 300; i++) {
      if (terminaSemPensar(novaFase(fase, 3, 0, rng), (lugares) => lugares[sortear(0, lugares.length - 1, rng)])) venceu++;
    }
    return venceu / 300;
  };
  expect(taxa(1)).toBeGreaterThan(0.5);
  expect(taxa(5)).toBeLessThan(taxa(1));
  expect(taxa(8)).toBeLessThan(0.25);
});
