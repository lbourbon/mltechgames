import { expect, test } from "vitest";
import type { Rng } from "../../src/jogos/kit/sorteio";
import {
  atacar,
  configDaFase,
  gerarFase,
  novaFase,
  novoJogo,
  PODERES,
  poderGuardado,
  VIDAS_INICIAIS,
  type Estado,
} from "../../src/jogos/robo/logica";

// Sequência fixa: as simulações dão sempre o mesmo resultado.
function semente(valor: number): Rng {
  return () => {
    valor = (valor + 0x6d2b79f5) | 0;
    let t = Math.imul(valor ^ (valor >>> 15), 1 | valor);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const jogo = (extra: Partial<Estado> = {}): Estado => ({
  fase: 1,
  vidas: VIDAS_INICIAIS,
  pontos: 0,
  cargas: [5, 3],
  inimigos: [
    { defesa: 7, chefe: false },
    { defesa: 6, chefe: true },
  ],
  restante: 7,
  ...extra,
});

// Procura um jeito de vencer todos os inimigos gastando exatamente a defesa de cada um.
function temSolucao(cargas: number[], defesas: number[]): boolean {
  if (defesas.length === 0) return true;
  const [defesa, ...resto] = defesas;
  const montar = (restante: number, poder: number): boolean => {
    if (restante === 0) return temSolucao(cargas, resto);
    for (let i = poder; i < cargas.length; i++) {
      if (cargas[i] === 0 || PODERES[i].forca > restante) continue;
      cargas[i]--;
      const achou = montar(restante - PODERES[i].forca, i);
      cargas[i]++;
      if (achou) return true;
    }
    return false;
  };
  return montar(defesa, 0);
}

function venceSemErrar(fase: number, escolher: (estado: Estado) => number, rng: Rng) {
  let estado = novaFase(fase, 99, 0, rng);
  for (;;) {
    const jogada = atacar(estado, escolher(estado), rng);
    if (jogada.resultado === "fase") return true;
    if (jogada.resultado === "sem-forca" || jogada.resultado === "fim") return false;
    estado = jogada.estado;
  }
}

const disponiveis = (estado: Estado) => estado.cargas.flatMap((quantidade, i) => (quantidade > 0 ? [i] : []));

const maiorQueCabe = (estado: Estado) => {
  const lista = disponiveis(estado);
  return lista.filter((i) => PODERES[i].forca <= estado.restante).at(-1) ?? lista[0];
};

const taxaDeVitoria = (fase: number, escolher: (estado: Estado) => number) => {
  const rng = semente(fase);
  let vitorias = 0;
  for (let i = 0; i < 400; i++) if (venceSemErrar(fase, escolher, rng)) vitorias++;
  return vitorias / 400;
};

test("golpe abaixo da defesa gasta a carga e reduz a defesa", () => {
  const { estado, resultado } = atacar(jogo(), 0);
  expect(resultado).toBe("golpe");
  expect(estado.restante).toBe(4);
  expect(estado.cargas).toEqual([4, 3]);
  expect(estado.pontos).toBe(0);
});

test("golpe exato vale mais pontos que golpe com desperdício, sem devolver carga", () => {
  const exato = atacar(jogo(), 1);
  expect(exato.resultado).toBe("exato");
  expect(exato.estado.pontos).toBe(15);
  expect(exato.estado.cargas).toEqual([5, 2]);

  const comSobra = atacar(jogo({ restante: 6 }), 1);
  expect(comSobra.resultado).toBe("derrotou");
  expect(comSobra.estado.pontos).toBe(10);
});

test("derrotar o inimigo traz o próximo da fila", () => {
  const { estado } = atacar(jogo(), 1);
  expect(estado.inimigos).toHaveLength(1);
  expect(estado.restante).toBe(6);
});

test("vencer o chefe sobe de fase, soma o poder guardado e traz um poder novo", () => {
  const ultimo = jogo({ inimigos: [{ defesa: 3, chefe: true }], restante: 3, cargas: [2, 1] });
  const { estado, resultado } = atacar(ultimo, 0);
  expect(resultado).toBe("fase");
  expect(estado.fase).toBe(2);
  expect(estado.pontos).toBe(15 + 3 + 7);
  expect(estado.cargas).toHaveLength(ultimo.cargas.length + 1);
});

test("gastar a última carga sem vencer perde uma vida e recomeça a fase", () => {
  const { estado, resultado } = atacar(jogo({ cargas: [1, 0], restante: 7, pontos: 40 }), 0);
  expect(resultado).toBe("sem-forca");
  expect(estado.vidas).toBe(VIDAS_INICIAIS - 1);
  expect(estado.fase).toBe(1);
  expect(estado.pontos).toBe(40);
  expect(poderGuardado(estado.cargas)).toBeGreaterThan(0);
});

test("derrotar um inimigo com a última carga, sem acabar a fase, também conta como falha", () => {
  const { resultado } = atacar(jogo({ cargas: [0, 1], restante: 7 }), 1);
  expect(resultado).toBe("sem-forca");
});

test("com carga sobrando o jogo continua, mesmo sem força para vencer o monstro", () => {
  const { estado, resultado } = atacar(jogo({ vidas: 1, cargas: [3, 0], restante: 40 }), 0);
  expect(resultado).toBe("golpe");
  expect(estado.vidas).toBe(1);
  expect(estado.cargas).toEqual([2, 0]);
});

test("derrotar um monstro com carga sobrando traz o próximo, mesmo que ele seja forte demais", () => {
  const forte = [
    { defesa: 7, chefe: false },
    { defesa: 300, chefe: true },
  ];
  const { estado, resultado } = atacar(jogo({ vidas: 1, cargas: [2, 1], inimigos: forte }), 1);
  expect(resultado).toBe("exato");
  expect(estado.restante).toBe(300);
});

test("perder a última vida encerra o jogo", () => {
  const { estado, resultado } = atacar(jogo({ vidas: 1, cargas: [1, 0] }), 0);
  expect(resultado).toBe("fim");
  expect(estado.cargas).toEqual([0, 0]);
});

test("cada fase traz um poder novo e mais forte até completar os seis", () => {
  for (let fase = 1; fase <= 4; fase++) {
    expect(configDaFase(fase + 1).poderes).toBe(configDaFase(fase).poderes + 1);
    expect(novoJogo(fase).cargas).toHaveLength(fase + 1);
  }
  const forcas = PODERES.map((poder) => poder.forca);
  expect(forcas).toEqual([...forcas].sort((a, b) => a - b));
});

test("a sobra de poder de toda fase é exatamente a folga de socos", () => {
  const rng = semente(1);
  for (let fase = 1; fase <= 30; fase++) {
    const { cargas, inimigos } = gerarFase(fase, rng);
    const defesas = inimigos.reduce((total, inimigo) => total + inimigo.defesa, 0);
    expect(poderGuardado(cargas) - defesas).toBe(configDaFase(fase).folga * PODERES[0].forca);
  }
});

test("toda fase tem solução sem desperdício", () => {
  const rng = semente(2);
  for (let fase = 1; fase <= 4; fase++) {
    for (let i = 0; i < 200; i++) {
      const { cargas, inimigos } = gerarFase(fase, rng);
      expect(temSolucao(cargas, inimigos.map((inimigo) => inimigo.defesa))).toBe(true);
    }
  }
});

test("o chefe é sempre o último e o mais forte", () => {
  const rng = semente(3);
  for (let fase = 1; fase <= 12; fase++) {
    const { inimigos } = gerarFase(fase, rng);
    const chefe = inimigos.at(-1)!;
    expect(chefe.chefe).toBe(true);
    expect(chefe.defesa).toBe(Math.max(...inimigos.map((inimigo) => inimigo.defesa)));
  }
});

test("repetir sempre o golpe mais forte quase nunca vence a partir da fase 2", () => {
  const maisForte = (estado: Estado) => disponiveis(estado).at(-1)!;
  for (const fase of [2, 3, 5]) expect(taxaDeVitoria(fase, maisForte)).toBeLessThan(0.1);
});

// Equilíbrio do jogo: o truque simples funciona no começo, mas planejar faz diferença depois.
test("usar o maior golpe que couber não basta nas fases altas", () => {
  expect(taxaDeVitoria(1, maiorQueCabe)).toBeGreaterThan(0.95);
  expect(taxaDeVitoria(2, maiorQueCabe)).toBeGreaterThan(0.9);
  for (const fase of [4, 5, 6]) {
    expect(taxaDeVitoria(fase, maiorQueCabe)).toBeLessThan(0.75);
    expect(taxaDeVitoria(fase, maiorQueCabe)).toBeGreaterThan(0.25);
  }
});
