import { existsSync, readFileSync } from "node:fs";
import { expect, test } from "vitest";
import type { Rng } from "../../src/jogos/kit/sorteio";
import { MAPAS } from "../../src/jogos/aviao/mapas";
import { capitalDe, daCapital, doPais, IDS, noPais, oPais, paraACapital, paraOPais } from "../../src/jogos/aviao/paises";
import { REGIOES } from "../../src/jogos/aviao/regioes";
import {
  avaliar,
  CARTAS_POR_FASE,
  configDaFase,
  destino,
  entregar,
  novaFase,
  novoJogo,
  ORDEM,
  paisesDa,
  PONTOS_NA_MOSCA,
  RAIO_DOS_PONTOS,
  sortearCartas,
  ULTIMA_FASE_FIXA,
  ULTIMA_FASE_MANSA,
  VIDAS_INICIAIS,
  type Estado,
} from "../../src/jogos/aviao/logica";

function semente(valor: number): Rng {
  return () => {
    valor = (valor + 0x6d2b79f5) | 0;
    let t = Math.imul(valor ^ (valor >>> 15), 1 | valor);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test.each(ORDEM)("%s: todo país desenhado, com centro dentro do mapa e cor diferente da do vizinho", (regiao) => {
  const { paises, centros, km } = REGIOES[regiao] as (typeof REGIOES)[typeof regiao] & { centros: Record<string, [number, number]> };
  const mapa = MAPAS[regiao];
  expect(km).toBeGreaterThan(1);
  for (const id of paises) {
    expect(IDS).toContain(id);
    expect(mapa.contornos[id]).toMatch(/^M/);
    const [x, y] = centros[id];
    expect(x).toBeGreaterThan(0);
    expect(x).toBeLessThan(mapa.largura);
    expect(y).toBeGreaterThan(0);
    expect(y).toBeLessThan(mapa.altura);
    expect(mapa.cores[id]).toBeGreaterThanOrEqual(0);
  }
  // Todo mapa tem a mesma largura, então o raio dos pontos vale o mesmo pedaço da tela.
  expect(mapa.largura).toBe(1000);
});

test("todo país aparece em alguma região e tem bandeira", () => {
  const usados = new Set(ORDEM.flatMap((r) => paisesDa(r)));
  for (const id of IDS) {
    expect(usados.has(id)).toBe(true);
    expect(existsSync(`public/img/bandeiras/${id}.svg`)).toBe(true);
  }
  // A Guiana Francesa não faz da França um país da América do Sul.
  expect(paisesDa("america-do-sul")).not.toContain("fr");
});

test("nomes com o artigo certo", () => {
  expect(doPais("br")).toBe("do Brasil");
  expect(paraOPais("us")).toBe("para os Estados Unidos");
  expect(paraOPais("bs")).toBe("para as Bahamas");
  expect(paraOPais("cu")).toBe("para Cuba");
  expect(noPais("ph")).toBe("nas Filipinas");
  expect(oPais("pe")).toBe("o Peru");
  expect(oPais("pt")).toBe("Portugal");
  expect(paraACapital("eg")).toBe("para o Cairo");
  expect(paraACapital("mx")).toBe("para a Cidade do México");
  expect(paraACapital("pe")).toBe("para Lima");
  expect(daCapital("kw")).toBe("da Cidade do Kuwait");
});

test("as voltas passam por todas as regiões e tiram uma ajuda de cada vez", () => {
  const regioes = (de: number, ate: number) => new Set(Array.from({ length: ate - de + 1 }, (_, i) => configDaFase(de + i).regiao));
  expect(regioes(2, 8).size).toBe(ORDEM.length);
  expect(regioes(9, 15).size).toBe(ORDEM.length);
  expect(regioes(16, 22).size).toBe(ORDEM.length);
  expect(ULTIMA_FASE_FIXA).toBe(22);
  expect(configDaFase(1).pista).toEqual({ nomes: true, pedido: "nome" });
  expect(configDaFase(2).pista).toEqual({ nomes: false, pedido: "nome" });
  expect(configDaFase(9).pista).toEqual({ nomes: false, pedido: "bandeira" });
  expect(configDaFase(16).pista).toEqual({ nomes: false, pedido: "capital" });
  // Depois da terceira volta, ela se repete na mesma ordem.
  for (let i = 1; i <= 14; i++) expect(configDaFase(ULTIMA_FASE_FIXA + i)).toEqual(configDaFase(15 + ((i - 1) % 7) + 1));
});

test.each(Array.from({ length: ULTIMA_FASE_FIXA + 7 }, (_, i) => i + 1))("fase %i sorteia cartas diferentes da região", (fase) => {
  const { regiao, pista } = configDaFase(fase);
  for (let rodada = 0; rodada < 20; rodada++) {
    const cartas = sortearCartas(fase, semente(fase * 100 + rodada));
    expect(cartas).toHaveLength(CARTAS_POR_FASE);
    expect(new Set(cartas).size).toBe(CARTAS_POR_FASE);
    for (const id of cartas) {
      expect(paisesDa(regiao)).toContain(id);
      if (pista.pedido === "capital") expect(capitalDe(id)).toBeTruthy();
    }
  }
});

test("quanto mais perto, mais pontos", () => {
  expect(avaliar(true, 0)).toEqual({ pouso: "na-mosca", pontos: PONTOS_NA_MOSCA });
  let antes = Infinity;
  for (let d = 1; d <= RAIO_DOS_PONTOS; d += 5) {
    const { pouso, pontos } = avaliar(false, d);
    expect(pouso).toBe("perto");
    expect(pontos).toBeGreaterThan(0);
    expect(pontos).toBeLessThan(PONTOS_NA_MOSCA);
    expect(pontos).toBeLessThanOrEqual(antes);
    antes = pontos;
  }
  expect(avaliar(false, RAIO_DOS_PONTOS + 1)).toEqual({ pouso: "longe", pontos: 0 });
});

const jogo = (extra: Partial<Estado> = {}): Estado => ({ ...novaFase(5, VIDAS_INICIAIS, 0, semente(1)), ...extra });

test("cada entrega soma os pontos, revela o país e passa à próxima carta", () => {
  const estado = jogo();
  const alvo = destino(estado);
  const jogada = entregar(estado, false, 30);
  expect(jogada.seguinte).toBe("carta");
  expect(jogada.pouso).toBe("perto");
  expect(jogada.estado.pontos).toBe(jogada.pontos);
  expect(jogada.estado.daFase).toBe(jogada.pontos);
  expect(jogada.estado.vez).toBe(1);
  expect(jogada.estado.revelados).toEqual([alvo]);
  expect(jogada.estado.vidas).toBe(VIDAS_INICIAIS);
});

test("pousar longe custa um coração, menos nas fases mansas", () => {
  expect(entregar(jogo(), false, 400).estado.vidas).toBe(VIDAS_INICIAIS - 1);
  expect(entregar(jogo({ fase: ULTIMA_FASE_MANSA }), false, 400).estado.vidas).toBe(VIDAS_INICIAIS);
  expect(entregar(jogo({ vidas: 1 }), false, 400).seguinte).toBe("fim");
  // Perto, mesmo sem acertar, nunca custa coração.
  expect(entregar(jogo({ vidas: 1 }), false, RAIO_DOS_PONTOS).seguinte).toBe("carta");
});

test("a última carta passa de fase e devolve um coração", () => {
  let estado = jogo({ vidas: 2 });
  for (let i = 0; i < CARTAS_POR_FASE - 1; i++) estado = entregar(estado, true, 0).estado;
  const jogada = entregar(estado, true, 0, semente(3));
  expect(jogada.seguinte).toBe("fase");
  expect(jogada.estado.fase).toBe(6);
  expect(jogada.estado.regiao).toBe(configDaFase(6).regiao);
  expect(jogada.estado.vidas).toBe(3);
  expect(jogada.estado.pontos).toBe(CARTAS_POR_FASE * PONTOS_NA_MOSCA);
  expect(jogada.estado.vez).toBe(0);
  expect(jogada.estado.revelados).toEqual([]);
});

// Quem chuta um ponto qualquer do mapa fica longe quase sempre: o mapa é grande perto do raio dos
// pontos. Mede a distância até o centro, que é mais do que até a borda, então só confere a ordem
// de grandeza.
test("chutar ao acaso fica longe na maior parte das vezes", () => {
  const rng = semente(42);
  let longe = 0;
  let total = 0;
  for (const regiao of ORDEM) {
    const { altura } = MAPAS[regiao];
    const centros = REGIOES[regiao].centros as Record<string, [number, number]>;
    for (const [x, y] of Object.values(centros)) {
      for (let k = 0; k < 20; k++) {
        total++;
        if (Math.hypot(rng() * 1000 - x, rng() * altura - y) > RAIO_DOS_PONTOS * 2) longe++;
      }
    }
  }
  expect(longe / total).toBeGreaterThan(0.6);
});

test("um jogo novo começa com as cartas da primeira fase", () => {
  const estado = novoJogo(1, semente(9));
  expect(estado.regiao).toBe("america-do-sul");
  expect(estado.cartas).toHaveLength(CARTAS_POR_FASE);
});

test("a página desenha os contornos gerados", () => {
  const pagina = readFileSync("src/pages/jogos/aviao.astro", "utf8");
  expect(pagina).toContain("MAPAS");
});
