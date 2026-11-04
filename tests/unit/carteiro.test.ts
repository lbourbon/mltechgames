import { expect, test } from "vitest";
import type { Rng } from "../../src/jogos/kit/sorteio";
import {
  acertaReto,
  acertosPorAlvo,
  ALTURA,
  bonusDaFase,
  configDaFase,
  faltam,
  gerarFase,
  lancar,
  novaFase,
  passarDeFase,
  PLANETAS,
  ULTIMA_FASE_MANSA,
  VIDAS_INICIAIS,
  voar,
  type Corpo,
  type Estado,
  type Mapa,
  type Planeta,
} from "../../src/jogos/carteiro/logica";

function semente(valor: number): Rng {
  return () => {
    valor = (valor + 0x6d2b79f5) | 0;
    let t = Math.imul(valor ^ (valor >>> 15), 1 | valor);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FASES_TESTADAS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 13];
const CIMA = -Math.PI / 2;

const corpo = (planeta: Planeta, x: number, y: number, alvo = false): Corpo => ({ planeta, x, y, ...PLANETAS[planeta], alvo });

// Um alvo bem em cima do lançador e um planeta grande do lado.
const MAPA: Mapa = {
  lancador: { x: 0.5, y: 1.2 },
  corpos: [corpo("terra", 0.5, 0.3, true), corpo("jupiter", 0.85, 0.75)],
  pedras: [],
};

const jogo = (mapa: Mapa, extra: Partial<Estado> = {}): Estado => ({
  fase: 3,
  vidas: VIDAS_INICIAIS,
  pontos: 0,
  mapa,
  concluida: false,
  entregues: mapa.corpos.map(() => false),
  pacotes: 3,
  limpa: true,
  ...extra,
});

const angulo = (de: { x: number; y: number }, para: { x: number; y: number }) => Math.atan2(para.y - de.y, para.x - de.x);

test("o mesmo lançamento sempre faz o mesmo caminho", () => {
  expect(voar(MAPA, -1.2, 0.7)).toEqual(voar(MAPA, -1.2, 0.7));
});

test("sem planetas o pacote vai reto e se perde", () => {
  const vazio: Mapa = { lancador: { x: 0.5, y: 1 }, corpos: [], pedras: [] };
  const { pontos, fim } = voar(vazio, CIMA, 1);
  expect(fim.tipo).toBe("perdeu");
  pontos.forEach((p) => expect(p.x).toBeCloseTo(0.5, 6));
});

test("a gravidade entorta o caminho na direção do planeta, e o maior puxa mais", () => {
  const desvio = (planeta: Planeta) => {
    const mapa: Mapa = { lancador: { x: 0.5, y: 1.2 }, corpos: [corpo(planeta, 0.75, 0.6)], pedras: [] };
    const { pontos } = voar(mapa, CIMA, 0.8);
    return pontos[Math.floor(pontos.length * 0.6)].x - 0.5;
  };
  expect(desvio("marte")).toBeGreaterThan(0);
  expect(desvio("jupiter")).toBeGreaterThan(desvio("terra"));
  expect(desvio("terra")).toBeGreaterThan(desvio("marte"));
});

test("chegar no alvo entrega, bater em outro planeta, no Sol ou numa pedra perde o pacote", () => {
  expect(voar(MAPA, CIMA, 1).fim).toEqual({ tipo: "entregou", corpo: 0 });
  expect(voar(MAPA, CIMA, 1, [true, false]).fim).toEqual({ tipo: "bateu", corpo: 0 });
  const sol: Mapa = { ...MAPA, corpos: [corpo("sol", 0.5, 0.6)] };
  expect(voar(sol, CIMA, 1).fim).toEqual({ tipo: "bateu", corpo: 0 });
  const pedra: Mapa = { ...MAPA, pedras: [{ x: 0.5, y: 0.8, raio: 0.03 }] };
  expect(voar(pedra, CIMA, 1).fim).toEqual({ tipo: "pedra", pedra: 0 });
});

test.each(FASES_TESTADAS)("fase %i: todo alvo pode ser acertado, com folga de mira", { timeout: 30_000 }, (fase) => {
  const config = configDaFase(fase);
  for (let rodada = 0; rodada < 3; rodada++) {
    const mapa = gerarFase(fase, semente(fase * 100 + rodada));
    const alvos = mapa.corpos.flatMap((c, i) => (c.alvo ? [i] : []));
    expect(alvos).toHaveLength(config.alvos);
    expect(mapa.corpos.some((c) => c.planeta === "sol")).toBe(config.sol);
    expect(mapa.pedras).toHaveLength(config.pedras);

    // Nada se encosta nem sai da tela.
    const tudo = [...mapa.corpos, ...mapa.pedras, { ...mapa.lancador, raio: 0.05 }];
    tudo.forEach((a, i) => {
      expect(a.x - a.raio).toBeGreaterThan(0);
      expect(a.x + a.raio).toBeLessThan(1);
      expect(a.y - a.raio).toBeGreaterThan(0);
      expect(a.y + a.raio).toBeLessThan(ALTURA);
      tudo.slice(i + 1).forEach((b) => expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(a.raio + b.raio));
    });

    const acertos = acertosPorAlvo(mapa);
    for (const alvo of alvos) {
      expect(acertos[alvo]).toBeGreaterThanOrEqual(config.acerto[0]);
      expect(acertos[alvo]).toBeLessThanOrEqual(config.acerto[1]);
      if (config.curva) expect(acertaReto(mapa, alvo)).toBe(false);
      expect(temFolga(mapa, alvo)).toBe(true);
    }
  }
});

// Existe uma mira que acerta mesmo errando 1 grau para qualquer lado: o dedo não precisa ser perfeito.
function temFolga(mapa: Mapa, alvo: number) {
  const grau = Math.PI / 180;
  for (let forca = 0.3; forca <= 1; forca += 0.1) {
    const acerta = (angulo: number) => {
      const { fim } = voar(mapa, angulo, forca);
      return fim.tipo === "entregou" && fim.corpo === alvo;
    };
    let seguidos = 0;
    for (let a = 0; a < 360; a++) {
      seguidos = acerta(a * grau) ? seguidos + 1 : 0;
      if (seguidos === 3) return true;
    }
  }
  return false;
}

test("entregar em todos os alvos conclui a fase, e a próxima vem com bônus e um coração", () => {
  const jogada = lancar(jogo(MAPA, { vidas: 2 }), CIMA, 1);
  expect(jogada.resultado).toBe("fase");
  expect(jogada.estado.concluida).toBe(true);
  expect(() => lancar(jogada.estado, CIMA, 1)).toThrow();

  const proxima = passarDeFase(jogada.estado, semente(1));
  expect(proxima.fase).toBe(4);
  expect(proxima.vidas).toBe(3);
  expect(proxima.pontos).toBe(bonusDaFase(3, true));
  expect(proxima.concluida).toBe(false);
});

test("com dois alvos, o primeiro acerto só marca a entrega", () => {
  const dois: Mapa = { ...MAPA, corpos: [...MAPA.corpos, corpo("marte", 0.15, 0.3, true)] };
  const jogada = lancar(jogo(dois), CIMA, 1);
  expect(jogada.resultado).toBe("entregou");
  expect(jogada.estado.entregues).toEqual([true, false, false]);
  expect(jogada.estado.pacotes).toBe(2);
  expect(faltam(jogada.estado)).toBe(1);
});

test("errar gasta o pacote, e quando não sobram pacotes para os alvos o céu recomeça com um coração a menos", () => {
  const errou = lancar(jogo(MAPA, { pacotes: 2 }), Math.PI / 2, 1);
  expect(errou.resultado).toBe("errou");
  expect(errou.estado.pacotes).toBe(1);
  expect(errou.estado.limpa).toBe(false);

  const acabou = lancar(errou.estado, Math.PI / 2, 1);
  expect(acabou.resultado).toBe("acabou");
  expect(acabou.estado.vidas).toBe(VIDAS_INICIAIS - 1);
  expect(acabou.estado.mapa).toBe(MAPA);
  expect(acabou.estado.pacotes).toBe(configDaFase(3).folga! + 1);

  expect(lancar(jogo(MAPA, { pacotes: 1, vidas: 1 }), Math.PI / 2, 1).resultado).toBe("fim");
});

test("nas fases mansas os pacotes não acabam", () => {
  const estado = novaFase(ULTIMA_FASE_MANSA, VIDAS_INICIAIS, 0, semente(4));
  expect(estado.pacotes).toBeNull();
  let atual = estado;
  for (let i = 0; i < 20; i++) {
    const jogada = lancar(atual, Math.PI / 2, 1);
    expect(jogada.resultado).toBe("errou");
    atual = jogada.estado;
  }
  expect(atual.vidas).toBe(VIDAS_INICIAIS);
});

// Sempre para cima, que é o mínimo que qualquer criança faz, mas sem olhar o rastro.
function partidaAEsmo(fase: number, fases: number, rng: Rng) {
  let estado = novaFase(fase, VIDAS_INICIAIS, 0, rng);
  let vencidas = 0;
  while (vencidas < fases) {
    const { resultado, estado: depois } = lancar(estado, -Math.PI * (0.1 + rng() * 0.8), 0.3 + rng() * 0.7);
    if (resultado === "fim") return vencidas;
    estado = resultado === "fase" ? passarDeFase(depois, rng) : depois;
    if (resultado === "fase") vencidas++;
  }
  return vencidas;
}

test("lançar a esmo não leva longe", () => {
  const rodadas = 120;
  let uma = 0;
  let tres = 0;
  for (let rodada = 0; rodada < rodadas; rodada++) {
    if (partidaAEsmo(ULTIMA_FASE_MANSA + 1, 1, semente(3000 + rodada)) >= 1) uma++;
    if (partidaAEsmo(ULTIMA_FASE_MANSA + 1, 3, semente(5000 + rodada)) >= 3) tres++;
  }
  // Uma fase pode sair na sorte, gastando corações, mas três seguidas não.
  expect(uma / rodadas).toBeLessThan(0.5);
  expect(tres / rodadas).toBeLessThan(0.05);
}, 60_000);

test("quem ajusta a mira pelo rastro acaba acertando", () => {
  // Varre a mira aos poucos a partir da direção do alvo, como quem corrige pelo rastro anterior.
  for (const fase of [3, 6, 9]) {
    const mapa = gerarFase(fase, semente(fase));
    mapa.corpos.forEach((c, i) => {
      if (!c.alvo) return;
      const base = angulo(mapa.lancador, c);
      let achou = false;
      for (let passo = 0; passo < 90 && !achou; passo++) {
        const desvio = (passo % 2 ? 1 : -1) * Math.ceil(passo / 2) * (Math.PI / 180);
        for (const forca of [0.4, 0.55, 0.7, 0.85, 1]) {
          const { fim } = voar(mapa, base + desvio, forca);
          if (fim.tipo === "entregou" && fim.corpo === i) achou = true;
        }
      }
      expect(achou).toBe(true);
    });
  }
});
