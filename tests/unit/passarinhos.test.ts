import { expect, test } from "vitest";
import type { Rng } from "../../src/jogos/kit/sorteio";
import {
  bonusDaFase,
  cantar,
  configDaFase,
  erradas,
  frequencias,
  gerarCancao,
  novaFase,
  cancaoMontada,
  podeCantar,
  pousar,
  ULTIMA_FASE_MANSA,
  VIDAS_INICIAIS,
  type Estado,
  type Nota,
  type Pouso,
} from "../../src/jogos/passarinhos/logica";

function semente(valor: number): Rng {
  return () => {
    valor = (valor + 0x6d2b79f5) | 0;
    let t = Math.imul(valor ^ (valor >>> 15), 1 | valor);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FASES_TESTADAS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 14];

const jogo = (notas: Nota[], extra: Partial<Estado> = {}): Estado => ({
  fase: 3,
  vidas: VIDAS_INICIAIS,
  pontos: 0,
  cancao: { notas },
  pousos: notas.map((n, i): Pouso => (i === 0 ? n : null)),
  confusos: notas.map(() => false),
  limpa: true,
  ...extra,
});

test.each(FASES_TESTADAS)("fase %i gera uma canção que sobe, desce e usa todos os fios", (fase) => {
  const { fios, colunas, pausas, salto } = configDaFase(fase);
  expect(frequencias(fios)).toHaveLength(fios);
  for (let rodada = 0; rodada < 200; rodada++) {
    const { notas } = gerarCancao(fase, semente(fase * 1000 + rodada));
    expect(notas).toHaveLength(colunas);
    expect(notas[0]).not.toBeNull();
    expect(notas.at(-1)).not.toBeNull();
    expect(notas.filter((n) => n === null)).toHaveLength(pausas);
    notas.forEach((n, i) => {
      if (n === null) expect(notas[i + 1]).not.toBeNull();
    });

    const cantadas = notas.filter((n): n is number => n !== null);
    cantadas.forEach((n) => expect(n).toBeGreaterThanOrEqual(0));
    cantadas.forEach((n) => expect(n).toBeLessThan(fios));
    expect(new Set(cantadas).size).toBe(Math.min(fios, cantadas.length));
    cantadas.slice(1).forEach((n, i) => expect(Math.abs(n - cantadas[i])).toBeLessThanOrEqual(salto));
    if (cantadas.length >= 4) {
      const passos = cantadas.slice(1).map((n, i) => Math.sign(n - cantadas[i]));
      expect(passos).toContain(1);
      expect(passos).toContain(-1);
    }
  }
});

test("as notas sobem com os fios, sem repetir oitava", () => {
  for (const fios of [2, 3, 4, 5]) {
    const notas = frequencias(fios);
    notas.slice(1).forEach((f, i) => expect(f).toBeGreaterThan(notas[i]));
    expect(notas.at(-1)! / notas[0]).toBeLessThan(2);
  }
});

test("o primeiro passarinho já vem pousado e não sai", () => {
  const estado = novaFase(4, 3, 0, semente(1));
  expect(estado.pousos[0]).toBe(estado.cancao.notas[0]);
  expect(estado.pousos.slice(1).every((n) => n === null)).toBe(true);
  expect(pousar(estado, 0, 0).resultado).toBe("fixo");
});

test("tocar em outro fio muda o passarinho de lugar, e no mesmo ele só canta", () => {
  let estado = jogo([0, 1, 2]);
  estado = pousar(estado, 1, 2).estado;
  expect(estado.pousos).toEqual([0, 2, null]);
  estado = pousar(estado, 1, 1).estado;
  expect(estado.pousos).toEqual([0, 1, null]);
  const cantou = pousar(estado, 1, 1);
  expect(cantou.resultado).toBe("cantou");
  expect(cantou.estado).toBe(estado);
  expect(pousar(estado, 2, "chao").estado.pousos).toEqual([0, 1, "chao"]);
});

test("só canta com todas as colunas decididas", () => {
  const estado = jogo([0, 1, 2]);
  expect(podeCantar(estado)).toBe(false);
  expect(podeCantar(pousar(pousar(estado, 1, 0).estado, 2, 0).estado)).toBe(true);
});

test("passarinho no chão é a pausa", () => {
  const estado = jogo([0, null, 2], { fase: 5, pousos: [0, "chao", 2] });
  expect(cancaoMontada(estado)).toEqual([0, null, 2]);
  expect(erradas(estado)).toEqual([]);
  expect(erradas({ ...estado, pousos: [0, 1, "chao"] })).toEqual([1, 2]);
});

test("cantar certo passa de fase com bônus e devolve um coração", () => {
  const estado = jogo([0, 1, 2], { vidas: 2, pousos: [0, 1, 2] });
  const jogada = cantar(estado, semente(2));
  expect(jogada.resultado).toBe("fase");
  expect(jogada.estado.fase).toBe(4);
  expect(jogada.estado.vidas).toBe(3);
  expect(jogada.estado.pontos).toBe(bonusDaFase(3, true));
});

test("cantar errado custa um coração e mostra quem desafinou, sem dizer o certo", () => {
  const estado = jogo([0, 1, null, 2], { fase: 5, pousos: [0, 2, 1, 2] });
  const jogada = cantar(estado);
  expect(jogada.resultado).toBe("errou");
  expect(jogada.estado.vidas).toBe(VIDAS_INICIAIS - 1);
  expect(jogada.estado.confusos).toEqual([false, true, true, false]);
  expect(jogada.estado.pousos).toEqual(estado.pousos);
  expect(jogada.estado.limpa).toBe(false);

  // Mexer na coluna tira a dúvida dela.
  expect(pousar(jogada.estado, 1, 1).estado.confusos).toEqual([false, false, true, false]);
  expect(cantar({ ...estado, vidas: 1 }).resultado).toBe("fim");
});

test("nas fases mansas cantar errado é de graça", () => {
  const estado = jogo([0, 1, 0], { fase: ULTIMA_FASE_MANSA, pousos: [0, 0, 0] });
  const jogada = cantar(estado);
  expect(jogada.resultado).toBe("errou");
  expect(jogada.estado.vidas).toBe(VIDAS_INICIAIS);
  expect(erradas(jogada.estado)).toEqual([1]);
});

// Chuta e, a cada erro, troca só as colunas erradas por algo que ainda não tentou ali.
// É a melhor estratégia possível sem ouvir a canção.
function chutar(estado: Estado, tentadas: Set<string>[], rng: Rng) {
  const { fios, pausas } = configDaFase(estado.fase);
  const opcoes: (number | "chao")[] = [...Array.from({ length: fios }, (_, i) => i), ...(pausas > 0 ? ["chao" as const] : [])];
  let atual = estado;
  atual.pousos.forEach((pouso, coluna) => {
    if (coluna === 0 || (pouso !== null && !atual.confusos[coluna])) return;
    const novas = opcoes.filter((o) => !tentadas[coluna].has(String(o)));
    const escolha = novas[Math.floor(rng() * novas.length)];
    tentadas[coluna].add(String(escolha));
    atual = pousar(atual, coluna, escolha).estado;
  });
  return atual;
}

function partidaDoChutador(fase: number, fases: number, rng: Rng) {
  let estado = novaFase(fase, VIDAS_INICIAIS, 0, rng);
  let tentadas = estado.pousos.map(() => new Set<string>());
  let vencidas = 0;
  while (vencidas < fases) {
    estado = chutar(estado, tentadas, rng);
    const { estado: depois, resultado } = cantar(estado, rng);
    if (resultado === "fim") return vencidas;
    if (resultado === "fase") {
      vencidas++;
      tentadas = depois.pousos.map(() => new Set<string>());
    }
    estado = depois;
  }
  return vencidas;
}

test("quem acerta de ouvido passa todas as fases sem errar", () => {
  let estado = novaFase(1, VIDAS_INICIAIS, 0, semente(3));
  for (let i = 0; i < 12; i++) {
    estado = { ...estado, pousos: estado.cancao.notas.map((n) => (n === null ? "chao" : n)) };
    const jogada = cantar(estado, semente(i));
    expect(jogada.resultado).toBe("fase");
    estado = jogada.estado;
  }
  expect(estado.vidas).toBe(VIDAS_INICIAIS);
});

test("chutar sem ouvir não passa das primeiras fases de verdade", () => {
  const rodadas = 400;
  let passouTres = 0;
  let passouUmaDificil = 0;
  for (let rodada = 0; rodada < rodadas; rodada++) {
    if (partidaDoChutador(ULTIMA_FASE_MANSA + 1, 3, semente(100 + rodada)) >= 3) passouTres++;
    if (partidaDoChutador(6, 1, semente(900 + rodada)) >= 1) passouUmaDificil++;
  }
  expect(passouTres / rodadas).toBeLessThan(0.1);
  expect(passouUmaDificil / rodadas).toBeLessThan(0.2);
});
