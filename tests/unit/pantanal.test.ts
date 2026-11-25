import { expect, test } from "vitest";
import { embaralhar, type Rng } from "../../src/jogos/kit/sorteio";
import {
  cartaDaDica,
  configDaFase,
  contarOrdens,
  deBaixoParaCima,
  deCimaParaBaixo,
  estacaoDoMes,
  gerarFase,
  jogar,
  jogarOrdem,
  MAXIMO,
  novaFase,
  novoJogo,
  passarMes,
  resolver,
  semVolta,
  ULTIMA_FASE_MANSA,
  VIDAS_INICIAIS,
  vazio,
  type Bando,
  type Estado,
} from "../../src/jogos/pantanal/logica";

function semente(valor: number): Rng {
  return () => {
    valor = (valor + 0x6d2b79f5) | 0;
    let t = Math.imul(valor ^ (valor >>> 15), 1 | valor);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FASES_TESTADAS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const bando = (parte: Partial<Bando>): Bando => ({ ...vazio(), ...parte });

// Joga o ano inteiro escolhendo a carta de cada mês, como a tela faz.
function jogarAno(estado: Estado, escolher: (estado: Estado) => number, rng: Rng) {
  for (;;) {
    const jogada = jogar(estado, escolher(estado), rng);
    if (jogada.resultado !== "mes") return jogada;
    estado = jogada.estado;
  }
}

test("a cheia vai de novembro a abril, e a seca de maio a outubro", () => {
  expect([0, 3, 4, 9, 10, 11].map(estacaoDoMes)).toEqual(["cheia", "cheia", "seca", "seca", "cheia", "cheia"]);
});

test("cada capivara come um capim, e quem fica sem vai embora", () => {
  const { bando: depois, eventos } = passarMes(bando({ capim: 1, capivara: 4 }), "seca", null);
  // O capim cresce 1 na seca: 2 capins para 4 capivaras.
  expect(depois.capim).toBe(0);
  expect(eventos).toContainEqual({ tipo: "saiu", especie: "capivara", quantos: 2 });
  // As 2 que ficaram têm um filhote.
  expect(depois.capivara).toBe(3);
});

test("a onça come capivara antes de jacaré, e sem os dois vai embora", () => {
  expect(passarMes(bando({ capim: 12, capivara: 1, onca: 1, jacare: 1, peixe: 5 }), "cheia", null).bando).toMatchObject({ capivara: 0, jacare: 1, onca: 1 });
  expect(passarMes(bando({ onca: 1, jacare: 1, peixe: 5 }), "cheia", null).bando).toMatchObject({ jacare: 0, onca: 1 });
  expect(passarMes(bando({ onca: 2 }), "cheia", null).bando.onca).toBe(0);
});

test("o jacaré come antes da garça", () => {
  const { bando: depois } = passarMes(bando({ peixe: 0, jacare: 1, garca: 2 }), "cheia", null);
  // Nascem 3 peixes na cheia: 1 para o jacaré e 2 para as garças.
  expect(depois).toMatchObject({ peixe: 0, jacare: 1, garca: 2 });
  const seca = passarMes(bando({ peixe: 2, jacare: 1, garca: 2 }), "seca", null).bando;
  expect(seca).toMatchObject({ peixe: 0, jacare: 1, garca: 1 });
});

test("a carta chega antes de todo mundo comer, e capim e peixe têm teto", () => {
  const { bando: depois } = passarMes(bando({ capim: 11 }), "cheia", { especie: "capim", quantos: 4 });
  expect(depois.capim).toBe(MAXIMO.capim);
  expect(passarMes(bando({ capim: 0 }), "seca", { especie: "capivara", quantos: 2 }).bando.capivara).toBe(1);
});

test.each(FASES_TESTADAS)("fase %i tem solução e chutar a ordem raramente fecha o ano", (fase) => {
  const rng = semente(fase);
  const config = configDaFase(fase);
  for (let i = 0; i < (fase >= 7 ? 3 : 15); i++) {
    const mapa = gerarFase(fase, rng);
    expect(resolver(mapa)).not.toBeNull();
    expect(jogarOrdem(mapa, resolver(mapa)!).venceu).toBe(true);
    if (config.ingenua) {
      expect(jogarOrdem(mapa, deBaixoParaCima(mapa.mao)).venceu).toBe(false);
      expect(jogarOrdem(mapa, deCimaParaBaixo(mapa.mao)).venceu).toBe(false);
    }
    // A amostra que aceitou a fase erra por pouco a parte exata.
    if (fase <= 6) {
      const { vencem, total } = contarOrdens(mapa);
      expect(vencem / total).toBeLessThanOrEqual(config.vencem[1] + 0.1);
    }
  }
});

test("quem prevê os próximos meses fecha todos os anos sem perder coração", () => {
  const rng = semente(31);
  let estado = novoJogo(1, rng);
  while (estado.fase <= 9) {
    const ordem = resolver(estado.mapa)!;
    const jogada = jogarAno(
      estado,
      (agora) => agora.mao.findIndex((carta) => carta.especie === ordem[agora.mes].especie),
      rng,
    );
    expect(jogada.resultado).toBe("fase");
    estado = jogada.estado;
  }
  expect(estado.vidas).toBe(VIDAS_INICIAIS);
});

test("chutar a carta de cada mês quase nunca fecha o ano depois das fases mansas", () => {
  const rng = semente(41);
  let vencidas = 0;
  let anos = 0;
  for (let fase = ULTIMA_FASE_MANSA + 1; fase <= 8; fase++) {
    for (let i = 0; i < 25; i++) {
      const estado = novaFase(fase, VIDAS_INICIAIS, 0, rng);
      anos++;
      if (jogarAno(estado, (agora) => Math.floor(rng() * agora.mao.length), rng).resultado === "fase") vencidas++;
    }
  }
  expect(vencidas / anos).toBeLessThan(0.3);
});

test("comida primeiro e caçador por último não basta depois das fases mansas", () => {
  const rng = semente(43);
  for (let fase = ULTIMA_FASE_MANSA + 1; fase <= 9; fase++) {
    const estado = novaFase(fase, VIDAS_INICIAIS, 0, rng);
    const ordem = deBaixoParaCima(estado.mapa.mao);
    const jogada = jogarAno(estado, (agora) => agora.mao.findIndex((carta) => carta.especie === ordem[agora.mes].especie), rng);
    expect(jogada.resultado).not.toBe("fase");
  }
});

test("um ano perdido volta igual, com o gráfico da tentativa, e só custa coração depois das fases mansas", () => {
  const rng = semente(47);
  const perder = (estado: Estado) => {
    // Joga ordens sorteadas até achar uma que não fecha.
    for (;;) {
      const ordem = embaralhar(estado.mapa.mao, rng);
      if (jogarOrdem(estado.mapa, ordem).venceu) continue;
      return jogarAno(estado, (agora) => agora.mao.findIndex((carta) => carta.especie === ordem[agora.mes].especie), rng);
    }
  };
  const mansa = novaFase(ULTIMA_FASE_MANSA, VIDAS_INICIAIS, 0, rng);
  const tentativa = perder(mansa);
  expect(tentativa.resultado).toBe("perdeu");
  expect(tentativa.estado.vidas).toBe(VIDAS_INICIAIS);
  expect(tentativa.estado.mapa).toBe(mansa.mapa);
  expect(tentativa.estado.mes).toBe(0);
  expect(tentativa.estado.mao).toEqual(mansa.mapa.mao);
  expect(tentativa.estado.anterior!.length).toBeGreaterThan(1);
  expect(tentativa.estado.limpa).toBe(false);

  const dura = novaFase(ULTIMA_FASE_MANSA + 1, 2, 0, rng);
  expect(perder(dura).estado.vidas).toBe(1);
  expect(perder({ ...dura, vidas: 1 }).resultado).toBe("fim");
});

test("o ano acaba antes quando um bicho do alvo saiu e não tem carta para voltar", () => {
  const rng = semente(53);
  const estado = novaFase(2, VIDAS_INICIAIS, 0, rng);
  // A onça sozinha, sem capivara, vai embora no primeiro mês.
  const semCapivara: Estado = { ...estado, bando: bando({ capim: 4 }), mao: [{ especie: "onca", quantos: 1 }, { especie: "capim", quantos: 4 }] };
  const jogada = jogar(semCapivara, 0, rng);
  expect(jogada.resultado).toBe("perdeu");
  expect(jogada.faltam).toEqual(["capivara", "onca"]);
  expect(semVolta(estado.mapa, bando({}), [{ especie: "capivara", quantos: 2 }])).toEqual(["onca"]);
});

test("seguir a dica fecha o ano", () => {
  const rng = semente(59);
  for (const fase of FASES_TESTADAS) {
    const estado = novaFase(fase, VIDAS_INICIAIS, 0, rng);
    expect(jogarAno(estado, (agora) => cartaDaDica(agora), rng).resultado).toBe("fase");
  }
});

test("gerar a fase do ano inteiro é rápido", () => {
  const rng = semente(61);
  const inicio = performance.now();
  for (let i = 0; i < 10; i++) gerarFase(9, rng);
  expect((performance.now() - inicio) / 10).toBeLessThan(250);
});
